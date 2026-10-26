// Run with: node --test tests/geoip.test.cjs (no npm dependencies).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../luci-app-bandix/htdocs/luci-static/resources/bandix/geoip.js'), 'utf8');

class Element {
    constructor(tag, attributes = {}, children = []) {
        this.tag = tag; this.attributes = attributes; this.children = []; this.listeners = {};
        this.style = {}; this.isConnected = true; this.value = attributes.value || '';
        this.disabled = !!attributes.disabled; this.checked = !!attributes.checked;
        for (const [key, value] of Object.entries(attributes)) {
            if (typeof value === 'function') this.listeners[key] = value;
        }
        for (const child of Array.isArray(children) ? children : [children]) this.appendChild(child);
        if (tag === 'select' && !this.value && this.children[0]) this.value = this.children[0].value;
    }
    appendChild(child) { if (child != null) this.children.push(child); return child; }
    addEventListener(name, callback) { this.listeners[name] = callback; }
    setAttribute(name, value) { this.attributes[name] = String(value); }
    get textContent() { return this.children.map(child => typeof child === 'string' ? child : child.textContent).join(''); }
    set textContent(value) { this.children = [String(value)]; }
    click() { if (!this.disabled) return this.listeners.click?.({ target: this }); }
    change() { return this.listeners.change?.({ target: this }); }
}
function nodes(root) {
    return [root, ...root.children.flatMap(child => child instanceof Element ? nodes(child) : [])];
}
function status() {
    return {
        enabled: false, profile: 'country', directory: '/usr/share/bandix-geoip', free_bytes: 64 * 1048576,
        installed_bytes: 0, version: '', databases: [], job: {}, load_error: null, upload_max_bytes: 8 * 1048576
    };
}
function harness(initial = status()) {
    const h = { status: initial, calls: [], modal: null, notifications: [], upload: null };
    let poll;
    const ui = {
        showModal: (title, content) => { h.modal = new Element('modal', {}, content); },
        hideModal: () => { h.modal = null; },
        addNotification: (_, message) => h.notifications.push(message.textContent)
    };
    const rpc = {
        getSessionID: () => 'test-session',
        declare: options => async (...args) => {
            if (options.method === 'manageGeoip') {
                h.calls.push(args);
                const [action, profile, enabled] = args;
                if (action === 'download') h.status.job = { busy: true, phase: 'preparing', profile };
                if (action === 'cancel') h.status.job = { busy: false, phase: 'cancelled' };
                if (action === 'enable') h.status.enabled = enabled === '1';
                if (action === 'delete') h.status = status();
                if (action === 'import') h.status.job = { busy: true, phase: 'importing' };
            }
            return { status: 'success', data: structuredClone(h.status) };
        }
    };
    class FormDataMock { constructor() { this.fields = {}; } append(key, value) { this.fields[key] = value; } }
    const request = { post: async (url, data) => { h.upload = { url, fields: data.fields }; return { ok: true, json: () => ({ size: 5000 }) }; } };
    const context = vm.createContext({
        E: (tag, attributes, children) => new Element(tag, attributes, children),
        _: value => value, L: { env: { lang: 'en', cgi_base: '/cgi-bin/luci' } },
        document: { documentElement: { lang: 'en' } },
        Intl, FormData: FormDataMock, setTimeout: () => {},
    });
    h.module = vm.runInContext('(function(baseclass,rpc,ui,poll,request){' + source + '\n})', context)(
        { extend: value => value }, rpc, ui, { add: fn => { poll = fn; } }, request
    );
    h.root = h.module.render();
    h.refresh = () => poll();
    h.find = (predicate, root = h.root) => nodes(root).find(predicate);
    h.button = (text, root = h.root) => h.find(node => node.tag === 'button' && node.textContent === text, root);
    h.settle = async () => { await new Promise(setImmediate); await new Promise(setImmediate); };
    return h;
}

test('download profile is preserved during progress and a reopened settings view', async () => {
    const h = harness(); await h.refresh();
    const select = h.find(node => node.tag === 'select');
    select.value = 'city_asn'; select.change(); h.button('Download and enable').click(); await h.settle();
    assert.equal(h.calls[0][0], 'download'); assert.equal(h.calls[0][1], 'city_asn');
    assert.equal(select.value, 'city_asn'); assert.equal(select.disabled, true);
    h.status.job = { busy: true, profile: 'city_asn', phase: 'downloading', downloaded_bytes: 10, total_bytes: 20 };
    await h.refresh();
    assert.match(h.root.textContent, /50%/);
    const progress = h.find(node => node.attributes.role === 'progressbar');
    assert.equal(progress.attributes['aria-valuenow'], '50');
    const reopened = harness(structuredClone(h.status)); await reopened.refresh();
    assert.equal(reopened.find(node => node.tag === 'select').value, 'city_asn');
    h.button('Cancel').click(); await h.settle();
    assert.equal(h.calls.at(-1)[0], 'cancel'); assert.equal(select.disabled, false);
    assert.equal(h.status.enabled, false);
});

test('completed downloads, failed updates, enable switch and deletion retain correct state', async () => {
    const initial = status(); initial.enabled = true; initial.profile = 'country_asn';
    initial.databases = [{ kind: 'country', build_epoch: 1792627200 }, { kind: 'asn', build_epoch: 1792627200 }];
    initial.installed_bytes = 12000000;
    const h = harness(initial); await h.refresh();
    assert.ok(h.button('Update database'));
    h.status.job = { busy: false, phase: 'failed', error_phase: 'verifying', error: 'checksum mismatch' };
    await h.refresh();
    assert.match(h.root.textContent, /previous database is unchanged/);
    const checkbox = h.find(node => node.tag === 'input'); checkbox.checked = false; checkbox.change(); await h.settle();
    assert.equal(h.calls.at(-1)[0], 'enable'); assert.equal(h.calls.at(-1)[2], '0');
    assert.equal(h.status.databases.length, 2);
    h.button('Delete').click(); assert.equal(h.calls.at(-1)[0], 'enable');
    h.button('Delete', h.modal).click(); await h.settle();
    assert.equal(h.calls.at(-1)[0], 'delete'); assert.equal(h.status.databases.length, 0);
});

test('upload validates extension and size before transferring to the fixed ACL path', async () => {
    const h = harness(); await h.refresh(); h.button('Upload database').click();
    const input = h.find(node => node.tag === 'input', h.modal);
    const submit = h.button('Upload and enable', h.modal);
    input.files = [{ name: 'database.zip', size: 100 }]; input.change(); assert.equal(submit.disabled, true);
    input.files = [{ name: 'City.mmdb', size: 30 * 1048576 }]; input.change(); assert.equal(submit.disabled, true);
    input.files = [{ name: 'Country.mmdb', size: 5000 }]; input.change(); assert.equal(submit.disabled, false);
    submit.click(); await h.settle();
    assert.equal(h.upload.fields.filename, '/tmp/bandix-geoip-upload.mmdb');
    assert.equal(h.upload.fields.sessionid, 'test-session');
    assert.equal(h.upload.url, '/cgi-bin/luci/cgi-upload');
    assert.equal(h.calls.at(-1)[0], 'import');
});

test('country/city/ASN details remain plain text and special address labels are distinct', () => {
    const h = harness();
    const description = h.module.describe({ scope: 'public', country_code: 'US', city_names: { en: 'Example City' }, asn: 15169, organization: '<img src=x onerror=alert(1)>' });
    assert.match(description.summary, /Example City/); assert.match(description.details, /AS15169/);
    assert.ok(description.summary.includes('<img'));
    assert.equal(h.module.describe({ scope: 'shared' }).summary, 'Shared address (CGNAT)');
    assert.equal(h.module.describe({ scope: 'local' }).summary, 'Local network');
    assert.equal(h.module.describe(null), null);
});

test('only read ACL can query status; downloads, deletion and uploads need write ACL', () => {
    const acl = JSON.parse(fs.readFileSync(path.join(__dirname, '../luci-app-bandix/root/usr/share/rpcd/acl.d/luci-app-bandix.json')))["luci-app-bandix"];
    assert.ok(acl.read.ubus['luci.bandix'].includes('getGeoipStatus'));
    assert.ok(!acl.read.ubus['luci.bandix'].includes('manageGeoip'));
    assert.ok(acl.write.ubus['luci.bandix'].includes('manageGeoip'));
    assert.deepEqual(acl.write.file['/tmp/bandix-geoip-upload.mmdb'], ['write']);
});
