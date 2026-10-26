// Run with: node --test tests/quota.test.cjs (no npm dependencies).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const resources = path.join(__dirname, '../luci-app-bandix/htdocs/luci-static/resources');
const source = fs.readFileSync(path.join(resources, 'bandix/quota.js'), 'utf8');
const indexSource = fs.readFileSync(path.join(resources, 'view/bandix/index.js'), 'utf8');
const periods = ['minute', 'hourly', 'daily', 'weekly', 'monthly', 'total'];
const mac = '02:11:22:33:44:55';
class Element {
    constructor(tag, attributes = {}, children = []) {
        this.tag = tag; this.attributes = attributes; this.listeners = {}; this.style = {};
        this.hidden = attributes.hidden != null; this.disabled = attributes.disabled != null; this.value = attributes.value || ''; this.open = attributes.open != null;
        this.children = (Array.isArray(children) ? children : [children]).map(child => child instanceof Element ? child : String(child));
        const classes = new Set((attributes.class || '').split(/\s+/));
        this.classList = { add: value => classes.add(value), remove: value => classes.delete(value), contains: value => classes.has(value), toggle: (value, enabled) => enabled ? classes.add(value) : classes.delete(value) };
    }
    get textContent() { return this.children.map(child => typeof child === 'string' ? child : child.textContent).join(''); }
    set textContent(value) { this.children = [String(value)]; }
    setAttribute(name, value) { this.attributes[name] = value; }
    replaceChildren(...children) { this.children = children; }
    focus() { this.focused = true; }
    appendChild(child) { this.children.push(child); }
    addEventListener(name, fn) { this.listeners[name] = fn; }
    click() { if (!this.disabled) return this.listeners.click?.call(this); }
    input(value) { this.value = String(value); this.listeners.input?.(); }
}
function nodes(root) { return [root, ...root.children.flatMap(child => child instanceof Element ? nodes(child) : [])]; }
function quota() { return { mac, mode: 'directional', daily_bytes: 1000, daily_used_bytes: 150, blocked: true, exceeded_periods: [],
    upload: { daily_bytes: 100, daily_used_bytes: 100, blocked: true },
    download: { daily_bytes: 200, daily_used_bytes: 50, blocked: false } }; }
function harness(writable = true) {
    const h = { calls: [], changes: 0, notifications: [], refreshes: 0 };
    const ctx = vm.createContext({ E: (tag, attrs, children) => new Element(tag, attrs, children), _: text => text });
    const module = vm.runInContext('(function(baseclass,rpc){' + source + '\n})', ctx)(
        { extend: value => value }, { declare: declaration => {
            assert.equal(declaration.method, 'setTrafficQuotaConfig');
            assert.equal(String(declaration.params), 'quota');
            return payload => { h.calls.push(JSON.parse(payload)); return h.saveReply ? h.saveReply(payload) : Promise.resolve({ success: true }); };
        } }
    );
    const form = module.create({ formatSize: bytes => bytes + ' B', writable, changed: () => { h.changes++; ctx.quotaFormDirty = true; } });
    h.module = module; h.form = form;
    h.find = predicate => nodes(form.root).find(predicate);
    h.input = (direction, period) => h.find(node => node.attributes.id === `traffic-quota-${direction}-${period}`);
    h.unit = (direction, period) => h.find(node => node.tag === 'select' && node.attributes['aria-label'] === `${direction[0].toUpperCase() + direction.slice(1)} · ${ { minute: 'Minute', hourly: 'Hourly', daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', total: 'Lifetime' }[period]} · Unit`);
    h.render = (value = null, extra = {}) => form.render(value, { ready: true, supported: true, resetExpanded: true, ...extra });
    h.mode = value => { const select = h.find(n => n.attributes.id === 'traffic-quota-mode'); select.value = value; select.listeners.change(); };
    h.ctx = ctx;
    h.settle = async () => { await new Promise(setImmediate); await new Promise(setImmediate); };
    return h;
}

test('upload and download fields save separate limits and preserve byte precision beyond 32 bits', async () => {
    const h = harness(); h.render(); h.mode('directional');
    assert.equal(h.form.canSave(), true);
    assert.equal(nodes(h.form.root).filter(n => n.tag === 'input').length, 18);
    h.input('upload', 'daily').input('1.5'); h.unit('upload', 'daily').value = '1073741824';
    h.input('download', 'daily').input('5'); h.unit('download', 'daily').value = '1073741824';
    const payload = h.form.read(mac);
    assert.equal(payload.upload.daily_bytes, 1610612736);
    assert.equal(payload.download.daily_bytes, 5368709120);
    for (const period of periods) assert.equal(payload[period + '_bytes'], 0);
    await h.module.save(payload);
    assert.equal(h.calls[0].download.daily_bytes, 5368709120);
    assert.equal(h.calls[0].mac, mac);
});

test('mode switches are exclusive and polling preserves unsaved mode and inputs', () => {
    const h = harness(); h.render(quota());
    h.mode('combined'); h.input('combined', 'daily').input('250');
    // Invalid inactive drafts cannot prevent saving the active mode.
    h.input('upload', 'daily').value = '-1';
    const updated = quota(); updated.download.daily_used_bytes = 75;
    h.render(updated, { preserveInputs: true });
    const payload = h.form.read(mac);
    assert.equal(payload.mode, 'combined'); assert.equal(payload.daily_bytes, 250);
    assert.equal(payload.upload.daily_bytes, 0); assert.equal(payload.download.daily_bytes, 0);
    assert.equal(h.input('upload', 'daily').disabled, true);
    assert.match(h.form.root.textContent, /Not saved/);
    h.mode('directional'); h.input('upload', 'daily').input('100');
    assert.equal(h.form.read(mac).daily_bytes, 0);
    assert.equal(h.form.read(mac).upload.daily_bytes, 100);
    assert.equal(h.input('combined', 'daily').disabled, true);
});

test('combined is the default and remains writable with an old service', async () => {
    const h = harness(); h.render(null, { supported: false });
    assert.equal(h.form.canSave(), true);
    assert.equal(h.find(n => n.tag === 'option' && n.attributes.value === 'directional').disabled, true);
    h.input('combined', 'daily').input('5'); h.unit('combined', 'daily').value = '1073741824';
    const payload = h.form.read(mac);
    assert.equal(payload.mode, 'combined'); assert.equal(payload.daily_bytes, 5368709120);
    await h.module.save(payload);
    assert.equal(h.calls[0].daily_bytes, 5368709120);
    h.mode('directional'); assert.equal(h.form.canSave(), false);
    h.render({ daily_bytes: 123 }, { supported: false });
    assert.equal(h.form.read(mac).daily_bytes, 123);
});

test('loading, request failure, pending saves and read-only sessions cannot edit quotas', () => {
    const h = harness();
    for (const state of [{ ready: false }, { error: 'Disconnected' }]) {
        h.render(quota(), state);
        assert.equal(h.form.canSave(), false);
        assert.ok(nodes(h.form.root).filter(n => ['input', 'select', 'button'].includes(n.tag)).every(n => n.disabled));
    }
    h.render(quota(), { supported: false }); assert.match(h.form.root.textContent, /supports combined quotas only/);
    h.render(quota()); h.form.setBusy(true);
    assert.equal(h.form.canSave(), false);
    h.render(quota()); assert.equal(h.form.canSave(), false);
    h.form.setBusy(false); assert.equal(h.form.canSave(), true);
    const readonly = harness(false); readonly.render(quota()); assert.equal(readonly.form.canSave(), false);
});

test('invalid numbers cannot become zero limits and exact byte limits survive opening the form', () => {
    const h = harness(); h.render(quota());
    for (const value of ['-0.0000001', 'NaN', 'Infinity', '9007199254740992']) {
        h.input('upload', 'daily').value = value;
        assert.throws(() => h.form.read(mac), /non-negative/);
    }
    h.input('upload', 'daily').value = ''; h.input('upload', 'daily').validity = { badInput: true };
    assert.throws(() => h.form.read(mac), /non-negative/);
    h.input('upload', 'daily').validity = { badInput: false };
    const q = quota(); q.upload.daily_bytes = 5368709121;
    h.render(q); assert.equal(h.form.read(mac).upload.daily_bytes, 5368709121);
});

test('device summaries distinguish upload, download and combined blocking', () => {
    const h = harness(); const q = quota();
    assert.equal(h.module.blockedText(q), 'Upload blocked');
    const summary = h.module.summary(q, bytes => bytes + ' B');
    assert.match(summary.children[0].textContent, /Upload.*Blocked/);
    assert.doesNotMatch(summary.children[1].textContent, /Blocked/);
    assert.equal(summary.children.length, 2);
    q.upload.blocked = false; q.download.blocked = true;
    assert.equal(h.module.blockedText(q), 'Download blocked');
    q.upload.blocked = true; q.exceeded_periods = ['daily'];
    assert.equal(h.module.blockedText(q), 'Upload and download blocked');
    q.mode = 'combined';
    assert.equal(h.module.summary(q, String).children.length, 1);
    assert.match(h.module.summary(q, String).children[0].textContent, /Blocked/);
    assert.equal(h.module.blockedText({ blocked: true }), 'Upload and download blocked');
});

function integration() {
    const h = harness();
    const save = new Element('button'), remove = new Element('button');
    const ids = { 'traffic-quota-save-btn': save, 'traffic-quota-delete-btn': remove };
    const ctx = h.ctx;
    Object.assign(ctx, {
        document: { getElementById: id => ids[id] }, quotaForm: h.form, quotaUi: h.module,
        currentQuotaDevice: { mac }, quotaFormDirty: false, quotaFormBusy: false, quotaExpandedMac: null,
        L: { hasViewPermission: () => true }, formatSize: String,
        ui: { addNotification: (_, node) => h.notifications.push(node.textContent) },
        updateDeviceData: () => { h.refreshes++; },
        showConfirmDialog: (_, message, confirm) => { h.confirm = confirm; },
        callDeleteTrafficQuota: async () => ({ success: true }),
        callGetTrafficQuotas: async () => {
            if (h.loadError) throw new Error(h.loadError);
            return { status: 'success', data: { supports_quota_modes: true, quotas: [quota()] } };
        }
    });
    vm.runInContext(indexSource.slice(indexSource.indexOf('        var allTrafficQuotas ='), indexSource.indexOf('        // 获取所有定时限速规则')), ctx);
    vm.runInContext(indexSource.slice(indexSource.indexOf("        document.getElementById('traffic-quota-save-btn').addEventListener"), indexSource.indexOf('        // 绑定关闭按钮事件', indexSource.indexOf("        document.getElementById('traffic-quota-save-btn').addEventListener"))), ctx);
    h.save = save; h.remove = remove;
    h.load = () => ctx.loadTrafficQuotaForm();
    return h;
}

test('modal save rejects duplicate submissions and preserves the draft when refresh fails', async () => {
    const h = integration(); await h.load();
    h.input('upload', 'daily').input('300');
    let resolve; h.saveReply = () => new Promise(done => { resolve = done; });
    h.save.click(); h.save.click(); assert.equal(h.calls.length, 1);
    assert.equal(h.remove.disabled, true);
    await h.load(); assert.equal(h.input('upload', 'daily').value, '300');
    h.loadError = 'Disconnected'; resolve({ success: true }); await h.settle();
    assert.equal(h.input('upload', 'daily').value, '300');
    assert.equal(h.ctx.quotaFormDirty, true); assert.equal(h.save.disabled, true);
    assert.match(h.notifications[0], /Disconnected/);
    h.loadError = null; await h.load(); assert.equal(h.save.disabled, false);
    assert.equal(h.input('upload', 'daily').value, '300');
});

test('failed RPC saves are reported and successful saves reload the persisted values', async () => {
    const h = integration(); await h.load();
    h.input('upload', 'daily').input('300');
    h.saveReply = async () => ({ success: false, error: 'Unsupported' });
    h.save.click(); await h.settle();
    assert.match(h.notifications[0], /Failed to save traffic quota/); assert.equal(h.ctx.quotaFormDirty, true);
    h.saveReply = async () => ({ success: true });
    h.save.click(); await h.settle();
    assert.equal(h.ctx.quotaFormDirty, false); assert.equal(h.input('upload', 'daily').value, '100');
    assert.equal(h.refreshes, 1);
});

test('deleting clears the form only after confirmation and successful refresh', async () => {
    const h = integration(); await h.load();
    let deletions = 0;
    h.ctx.callDeleteTrafficQuota = async () => {
        deletions++;
        h.ctx.callGetTrafficQuotas = async () => ({ status: 'success', data: { supports_quota_modes: true, quotas: [] } });
        return { success: true };
    };
    h.remove.click(); assert.equal(deletions, 0);
    h.confirm(); await h.settle();
    assert.equal(deletions, 1); assert.equal(h.remove.style.display, 'none');
    assert.equal(h.input('upload', 'daily').value, '0');
    assert.equal(h.input('download', 'daily').value, '0');
    assert.equal(h.save.disabled, false);
});

test('another device cannot inherit inputs while a quota write is in flight', async () => {
    const h = integration(); await h.load();
    vm.runInContext(indexSource.slice(indexSource.indexOf('        function showDeviceSettingsModal('), indexSource.indexOf('        function hideDeviceSettingsModal(')), h.ctx);
    h.ctx.quotaFormBusy = true;
    h.ctx.currentQuotaDevice = null;
    h.ctx.showDeviceSettingsModal({ mac: '02:11:22:33:44:66' });
    assert.equal(h.ctx.currentQuotaDevice, null);
});

function settingsHarness() {
    const h = integration();
    const body = new Element('body');
    h.ctx.document = { body, getElementById: id => nodes(body).find(n => n.attributes.id === id) };
    h.element = h.ctx.document.getElementById;
    Object.assign(h.ctx, {
        currentDevice: null, buildDeviceUplinkChBadges: () => [],
        loadScheduleRules: () => {}, currentQuotaDevice: null
    });
    vm.runInContext(indexSource.slice(indexSource.indexOf('        var deviceSettingsModal ='), indexSource.indexOf('        // 创建添加规则模态框')), h.ctx);
    vm.runInContext(indexSource.slice(indexSource.indexOf('        var scheduleRulesRequestId ='), indexSource.indexOf('        // 加载定时限速规则列表\n        function loadScheduleRules')), h.ctx);
    return h;
}

test('settings tabs preserve quota drafts, show matching actions, and support keyboard navigation', async () => {
    const h = settingsHarness();
    h.ctx.showDeviceSettingsModal({ mac, host: 'Laptop', ip4: '192.168.1.2' }); await h.settle();
    assert.equal(h.element('device-settings-rate-panel').hidden, false);
    assert.equal(h.element('device-settings-quota-panel').hidden, true);
    assert.equal(h.element('device-settings-quota-footer').hidden, true);
    h.element('device-settings-quota-tab').click();
    h.input('upload', 'daily').input('333');
    h.mode('combined'); h.input('combined', 'daily').input('444');
    h.element('device-hostname-input').value = 'Unsaved name';
    h.element('device-settings-rate-tab').click();
    await h.load();
    h.element('device-settings-quota-tab').click();
    assert.equal(h.form.read(mac).mode, 'combined');
    assert.equal(h.form.read(mac).daily_bytes, 444);
    assert.equal(h.input('upload', 'daily').value, '333');
    assert.equal(h.element('device-hostname-input').value, 'Unsaved name');
    assert.equal(h.ctx.quotaFormDirty, true);
    assert.equal(h.element('device-settings-rate-footer').hidden, true);
    assert.equal(h.element('device-settings-quota-footer').hidden, false);
    let prevented = false;
    h.element('device-settings-quota-tab').listeners.keydown({ key: 'ArrowLeft', preventDefault() { prevented = true; } });
    assert.equal(prevented, true);
    assert.equal(h.element('device-settings-rate-tab').attributes['aria-selected'], 'true');
    assert.equal(h.element('device-settings-rate-tab').focused, true);
    h.ctx.hideDeviceSettingsModal();
    assert.equal(h.ctx.currentDevice, null); assert.equal(h.ctx.currentQuotaDevice, null);
    h.ctx.showDeviceSettingsModal({ mac: '02:11:22:33:44:66', host: 'Phone', ip4: '192.168.1.3' }); await h.settle();
    assert.equal(h.element('device-hostname-input').value, 'Phone');
    assert.equal(h.form.read('02:11:22:33:44:66').daily_bytes, 0);
    assert.equal(h.ctx.quotaFormDirty, false);
    assert.equal(h.element('device-settings-rate-panel').hidden, false);
});

test('late schedule responses cannot replace another device settings', async () => {
    const h = settingsHarness(); const replies = [];
    h.ctx.callGetScheduleLimits = () => new Promise(resolve => replies.push(resolve));
    h.ctx.uci = { get: () => 'bytes' };
    vm.runInContext(indexSource.slice(indexSource.indexOf('        function loadScheduleRules()'), indexSource.indexOf('        // 保存 hostname')), h.ctx);
    h.ctx.showDeviceSettingsModal({ mac, ip4: '192.168.1.2' });
    h.ctx.hideDeviceSettingsModal();
    h.ctx.showDeviceSettingsModal({ mac: '02:11:22:33:44:66', ip4: '192.168.1.3' });
    const list = h.element('schedule-rules-list');
    list.innerHTML = 'current device';
    replies[0]({ success: false, error: 'stale reply' }); await h.settle();
    assert.equal(list.innerHTML, 'current device');
    replies[1]({ success: false, error: 'current reply' }); await h.settle();
    assert.match(list.innerHTML, /current reply/);
});
