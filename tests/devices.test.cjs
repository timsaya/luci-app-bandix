// Run with: node --test tests/devices.test.cjs (no npm dependencies).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../luci-app-bandix/htdocs/luci-static/resources/bandix/devices.js'), 'utf8');

class Element {
    constructor(tag, attributes = {}, children = []) {
        this.tag = tag; this.attributes = attributes; this.listeners = {};
        this.children = (Array.isArray(children) ? children : [children]).filter(child => child != null);
        // LuCI E() uses setAttribute(). HTML boolean attributes are enabled by
        // their presence, including checked="false" and disabled="false".
        this.checked = attributes.checked != null; this.disabled = attributes.disabled != null;
    }
    get textContent() { return this.children.map(child => typeof child === 'string' ? child : child.textContent).join(''); }
    set textContent(value) { this.children = [String(value)]; }
    addEventListener(name, callback) { this.listeners[name] = callback; }
    click() { if (!this.disabled) return this.listeners.click?.({ stopPropagation() {} }); }
    change(checked) { if (!this.disabled) { this.checked = checked; return this.listeners.change?.(); } }
}
const device = index => ({ mac: '02:00:00:00:' + Math.floor(index / 256).toString(16).padStart(2, '0') + ':' + (index % 256).toString(16).padStart(2, '0'), host: 'Device ' + index });
const success = data => ({ status: 'success', data });
function harness(options = {}) {
    const h = { calls: [], notifications: [], refreshes: 0 };
    const context = vm.createContext({
        E: (tag, attributes, children) => new Element(tag, attributes, children), _: text => text
    });
    vm.runInContext("String.prototype.format = function(...args) { let i = 0; return this.replace(/%d/g, () => args[i++]); };", context);
    const module = vm.runInContext('(function(baseclass,rpc,ui){' + source + '\n})', context)(
        { extend: value => value },
        { declare: declaration => {
            assert.equal(declaration.method, 'deleteDevices');
            return async json => {
                const macs = JSON.parse(json); h.calls.push(macs);
                return h.reply ? h.reply(macs) : success({ deleted: macs, not_found: [], failed: [] });
            };
        } },
        { addNotification: (_, message, kind) => h.notifications.push({ text: message.textContent, kind }) }
    );
    h.control = module.create({
        writable: options.writable,
        confirm: (title, message, confirm) => { h.confirmation = { title, message, confirm }; },
        refresh: () => { h.refreshes++; }
    });
    h.all = h.control.toolbar.children[0].children[0]; h.remove = h.control.toolbar.children[1];
    h.render = devices => { h.control.setDevices(devices); return devices.map(item => h.control.checkbox(item)); };
    return h;
}

test('devices start unchecked and writable on first render and unselected polling redraws', () => {
    const h = harness();
    for (let poll = 0; poll < 2; poll++) {
        const inputs = h.render([device(1), device(2)]);
        const mobile = h.control.checkbox(device(1));
        assert.ok([...inputs, mobile].every(input => !input.checked));
        assert.ok([...inputs, mobile].every(input => !input.disabled));
        assert.equal(h.all.checked, false); assert.equal(h.all.disabled, false);
        assert.equal(h.remove.disabled, true);
    }
});

test('desktop and mobile selections stay in sync across polling, sorting and filtering', () => {
    const h = harness(); const devices = [device(1), device(2)];
    let inputs = h.render(devices); const mobile = h.control.checkbox(devices[0]);
    inputs[0].change(true);
    assert.equal(mobile.checked, true); assert.equal(h.all.indeterminate, true);
    assert.match(h.remove.textContent, /\(1\)/);
    inputs = h.render([...devices].reverse());
    assert.equal(inputs[1].checked, true); assert.equal(inputs[0].checked, false);
    h.all.change(true); assert.ok(inputs.every(input => input.checked));
    inputs = h.render([devices[1]]);
    h.remove.click(); assert.equal(h.calls.length, 0); // Confirmation is mandatory.
    assert.match(h.confirmation.message, /Delete selected devices \(1\)/);
    h.all.change(false); assert.equal(h.remove.disabled, true);
    assert.ok(inputs.every(input => !input.checked));
});

test('confirmation captures the reviewed devices even when the displayed filter changes', async () => {
    const h = harness(); h.render([device(1), device(2)]); h.all.change(true); h.remove.click();
    h.render([device(3)]); h.all.change(true);
    await h.confirmation.confirm();
    assert.deepEqual(h.calls, [[device(1).mac, device(2).mac]]);
    assert.match(h.remove.textContent, /\(1\)/); // Newly selected device was not part of the confirmation.
    assert.equal(h.refreshes, 1);
    assert.deepEqual(h.notifications, []); // Successful deletion refreshes silently.
});

test('partial success clears deleted and missing selections and reports failed cleanup', async () => {
    const h = harness(); const inputs = h.render([device(1), device(2), device(3)]); h.all.change(true);
    h.reply = async () => success({
        deleted: [device(1).mac.toUpperCase()], not_found: [device(2).mac],
        failed: [{ mac: device(3).mac, message: '<img src=x>' }]
    });
    h.remove.click(); await h.confirmation.confirm();
    assert.deepEqual(inputs.map(input => input.checked), [false, false, true]);
    assert.equal(h.notifications[0].kind, 'warning');
    assert.match(h.notifications[0].text, /Deleted: 1; not found: 1; failed: 1/);
    assert.match(h.notifications[0].text, /<img src=x>/); // Plain text, never HTML.
});

test('large selections are sent sequentially and stop after transport failure without retrying', async () => {
    const h = harness(); h.render(Array.from({ length: 110 }, (_, i) => device(i))); h.all.change(true);
    h.reply = async macs => {
        if (h.calls.length === 2) throw new Error('Connection lost');
        return success({ deleted: macs, not_found: [], failed: [] });
    };
    h.remove.click(); await h.confirmation.confirm();
    assert.deepEqual(h.calls.map(batch => batch.length), [50, 50]);
    assert.match(h.remove.textContent, /\(60\)/);
    assert.match(h.notifications[0].text, /Connection lost/);
    assert.match(h.notifications[0].text, /Deleted: 50/);
});

test('busy state prevents duplicate submissions and survives a polling redraw', async () => {
    const h = harness(); h.render([device(1)]); h.all.change(true); h.remove.click();
    let resolve;
    h.reply = () => new Promise(done => { resolve = done; });
    const pending = h.confirmation.confirm();
    await new Promise(setImmediate);
    const inputs = h.render([device(1)]);
    assert.equal(inputs[0].checked, true); assert.equal(inputs[0].disabled, true);
    assert.equal(h.remove.disabled, true); assert.equal(h.all.disabled, true);
    h.remove.click(); await h.confirmation.confirm(); assert.equal(h.calls.length, 1);
    resolve(success({ deleted: [device(1).mac], not_found: [], failed: [] })); await pending;
    assert.equal(inputs[0].disabled, false); assert.equal(inputs[0].checked, false);
    assert.deepEqual(h.notifications, []);
});

test('malformed or unsupported responses keep selections and show an error', async () => {
    for (const reply of [
        {}, { success: false, error: 'Batch deletion is unavailable. Update the Bandix service.' },
        success({ deleted: [], not_found: [], failed: [] }),
        success({ deleted: [device(2).mac], not_found: [], failed: [] }),
        success({ deleted: [device(1).mac], not_found: [device(1).mac], failed: [] })
    ]) {
        const h = harness(); const [input] = h.render([device(1)]); input.change(true);
        h.reply = async () => reply; h.remove.click(); await h.confirmation.confirm();
        assert.equal(input.checked, true); assert.equal(h.notifications[0].kind, 'error');
        assert.equal(h.refreshes, 1);
    }
});

test('read-only sessions cannot select or submit and the new RPC requires write ACL', () => {
    const h = harness({ writable: false }); const [input] = h.render([device(1)]);
    assert.equal(input.disabled, true); assert.equal(h.all.disabled, true); assert.equal(h.remove.disabled, true);
    input.change(true); h.all.change(true); h.remove.click(); assert.equal(h.confirmation, undefined);
    const acl = JSON.parse(fs.readFileSync(path.join(__dirname, '../luci-app-bandix/root/usr/share/rpcd/acl.d/luci-app-bandix.json')))['luci-app-bandix'];
    assert.ok(!acl.read.ubus['luci.bandix'].includes('deleteDevices'));
    assert.ok(acl.write.ubus['luci.bandix'].includes('deleteDevices'));
});
