// Run with: node --test tests/flows.test.cjs (no npm dependencies).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const resources = path.join(__dirname, '../luci-app-bandix/htdocs/luci-static/resources');
const geoSource = fs.readFileSync(path.join(resources, 'bandix/geoip.js'), 'utf8');
const searchSource = fs.readFileSync(path.join(resources, 'bandix/flows.js'), 'utf8');
const viewSource = fs.readFileSync(path.join(resources, 'view/bandix/connection.js'), 'utf8');

function modules(context) {
    const baseclass = { extend: value => value };
    const geoip = vm.runInContext('(function(baseclass,rpc){' + geoSource + '\n})', context)(baseclass, { declare: () => () => {} });
    const search = vm.runInContext('(function(baseclass,geoip){' + searchSource + '\n})', context)(baseclass, geoip);
    return { geoip, search };
}
const items = [
    { id: 1, protocol: 'tcp', state: 'ESTABLISHED', flags: ['ASSURED', 'SEEN_REPLY'],
      orig: { src: '192.168.1.2', sport: 50000, dst: '203.0.113.10', dport: 443 },
      repl: { src: '198.51.100.8', sport: 8443, dst: '2001:db8::5', dport: 55002 } },
    { id: 2, protocol: 'udp', state: 'UNREPLIED', flags: ['UNREPLIED'],
      orig: { src: '192.168.1.2', sport: 50001, dst: '192.0.2.53', dport: 53 } },
    { id: 3, protocol: 'tcp', state: 'TIME_WAIT', flags: [],
      orig: { src: '2001:db8::5', sport: 0, dst: '2001:db8::9', dport: 80 } }
];
const information = {
    '203.0.113.10': { scope: 'public', country_code: 'CN', country_names: { en: 'China' },
        region_names: { en: 'Zhejiang', 'zh-CN': '浙江' }, city_names: { en: 'Hangzhou', 'zh-CN': '杭州' },
        asn: 64512, organization: 'Example Transit' },
    '198.51.100.8': { scope: 'public', country_code: 'DE', country_names: { en: 'Germany' },
        city_names: { en: 'Berlin', 'zh-CN': '柏林' }, asn: 64513, organization: 'Reply Network' },
    '192.168.1.2': { scope: 'local' }
};
function context(extra = {}) {
    return vm.createContext({ Intl, _: value => value, L: { env: { lang: 'zh-Hans' } },
        document: { documentElement: { lang: 'zh-Hans' } }, ...extra });
}

test('search covers protocol, state, both endpoint directions, flags and all GeoIP fields', () => {
    const { search } = modules(context()); const index = search.index(items, information);
    for (const [query, expected] of [
        ['TCP', [1, 3]], ['established', [1]], ['unreplied', [2]], ['seen_reply', [1]],
        ['192.168.1.2:50000', [1]], ['203.0.113.10:443', [1]], ['198.51.100.8:8443', [1]], ['55002', [1]],
        ['[2001:db8::5]:0', [3]], ['2001:db8::9', [3]], ['CN', [1]], ['中国', [1]], ['china', [1]],
        ['浙江', [1]], ['Zhejiang', [1]], ['杭州', [1]], ['Hangzhou', [1]], ['Berlin', [1]],
        ['AS64512', [1]], ['64512', [1]], ['EXAMPLE TRANSIT', [1]], ['reply network', [1]], ['Local network', [1, 2]]
    ]) {
        assert.deepEqual(Array.from(search.filter(index, query), flow => flow.id), expected, query);
    }
});

test('whitespace-separated terms combine across fields; queries are literal, case-insensitive and Unicode-normalized', () => {
    const { search } = modules(context()); const index = search.index(items, information);
    for (const query of ['tcp 443 浙江 AS64512', '  ＴＣＰ　４４３\tExample  ']) {
        assert.deepEqual(Array.from(search.filter(index, query), flow => flow.id), [1]);
    }
    assert.deepEqual(Array.from(search.filter(index, 'tcp 53')), []);
    assert.deepEqual(Array.from(search.filter(index, '[.*]')), []);
    assert.deepEqual(Array.from(search.filter(index, ' \t ')), items);
    assert.equal(search.index([{ protocol: 'udp' }], null).length, 1);
});

class Element {
    constructor(tag, attributes = {}, children = []) {
        this.tag = tag; this.attributes = attributes; this.children = []; this.listeners = {};
        this.value = attributes.value || ''; this.disabled = attributes.disabled != null; this.checked = attributes.checked != null;
        const classes = new Set((attributes.class || '').split(/\s+/));
        this.classList = { add: value => classes.add(value), remove: value => classes.delete(value), contains: value => classes.has(value) };
        for (const [key, value] of Object.entries(attributes)) if (typeof value === 'function') this.listeners[key] = value;
        for (const child of Array.isArray(children) ? children : [children]) this.appendChild(child);
        if (tag === 'select') this.value = (this.children.find(child => child.attributes?.selected != null) || this.children[0])?.value || '';
    }
    appendChild(child) { if (child != null) this.children.push(child); return child; }
    addEventListener(name, callback) { this.listeners[name] = callback; }
    get textContent() { return this.children.map(child => typeof child === 'string' ? child : child.textContent).join(''); }
    set textContent(value) { this.children = [String(value)]; }
    set innerHTML(value) { assert.equal(value, ''); this.children = []; }
    click() { if (!this.disabled) return this.listeners.click?.call(this, { target: this }); }
    change(value) { if (typeof value === 'boolean') this.checked = value; else this.value = value; return this.listeners.change?.call(this); }
    input(value) { this.value = value; return this.listeners.input?.call(this); }
}
function nodes(root) { return [root, ...root.children.flatMap(child => child instanceof Element ? nodes(child) : [])]; }
function response(page = 1, rows = items) {
    return { status: 'success', data: { items: rows, geoip: information, page, page_size: 100, total: 210, total_pages: 3 } };
}
function harness() {
    const h = { calls: [], reply: args => response(args[3]) };
    const body = new Element('body');
    const document = { body, documentElement: { lang: 'en' }, getElementById: id => nodes(body).find(node => node.attributes.id === id) };
    const ctx = context({ E: (tag, attrs, children) => new Element(tag, attrs, children), document,
        getThemeMode: () => 'light', formatSize: value => String(value),
        callGetConnectionFlows: (...args) => { h.calls.push(args); return Promise.resolve(h.reply(args)); } });
    const { geoip, search } = modules(ctx); ctx.geoip = geoip; ctx.flowSearch = search;
    vm.runInContext(viewSource.slice(viewSource.indexOf('function flowEndpointCell('), viewSource.indexOf('function formatDeviceName(')), ctx);
    const start = viewSource.indexOf('function showFlowsModal(');
    const end = viewSource.indexOf('\n        container.addEventListener', start);
    vm.runInContext(viewSource.slice(start, end), ctx);
    ctx.showFlowsModal('192.168.1.2', { host: 'Example device', ip4: '192.168.1.2' });
    h.find = predicate => nodes(body).find(predicate);
    h.search = document.getElementById('flows-search');
    h.tbody = h.find(node => node.classList.contains('flows-table-body'));
    h.button = text => h.find(node => node.tag === 'button' && node.textContent === text);
    h.byId = document.getElementById;
    h.pageText = () => h.find(node => node.tag === 'span' && node.textContent.startsWith('Page ')).textContent;
    h.settle = async () => { await new Promise(setImmediate); await new Promise(setImmediate); };
    return h;
}

test('modal search filters immediately without requests, shows page matches and restores rows when cleared', async () => {
    const h = harness(); await h.settle(); assert.equal(h.tbody.children.length, 3);
    h.search.input('tcp 443 杭州');
    assert.equal(h.tbody.children.length, 1); assert.match(h.tbody.textContent, /203\.0\.113\.10/);
    assert.match(h.pageText(), /Total: 210.*Matches on this page: 1\/3/);
    h.search.input('no-such-organization'); assert.match(h.tbody.textContent, /No matching connections on this page/);
    h.search.input(''); assert.equal(h.tbody.children.length, 3);
    assert.doesNotMatch(h.pageText(), /Matches on this page/); assert.equal(h.calls.length, 1);
});

test('search includes hidden reply data and persists across protocol filters, paging and refresh', async () => {
    const h = harness(); await h.settle();
    h.byId('flows-show-repl').change(false); h.search.input('Berlin');
    assert.equal(h.tbody.children.length, 1);
    h.reply = args => response(args[3], args[1] === 'udp' ? [items[1]] : items);
    h.byId('flows-protocol').change('udp'); await h.settle();
    assert.equal(h.calls.at(-1)[1], 'udp'); assert.equal(h.search.value, 'Berlin');
    assert.match(h.tbody.textContent, /No matching/);
    h.button('Next').click(); await h.settle();
    assert.equal(h.calls.at(-1)[3], 2); assert.match(h.pageText(), /Page 2\/3/);
    assert.equal(h.button('Next').disabled, false); // A zero-match page must not block navigation.
    h.button('Refresh').click(); await h.settle(); assert.equal(h.search.value, 'Berlin');
    h.search.input(''); assert.equal(h.tbody.children.length, 1); assert.match(h.tbody.textContent, /UDP/);
});

test('latest response wins; searching during loading or after failure cannot resurrect stale rows', async () => {
    const h = harness(); await h.settle(); const pending = [];
    h.reply = () => new Promise(resolve => pending.push(resolve));
    h.byId('flows-state').change('TIME_WAIT');
    h.search.input('UDP'); assert.match(h.tbody.textContent, /Loading/);
    h.byId('flows-protocol').change('udp');
    pending[1](response(1, [items[1]])); await h.settle(); assert.match(h.tbody.textContent, /UDP/);
    pending[0](response(1, [items[2]])); await h.settle(); assert.match(h.tbody.textContent, /UDP/);
    h.reply = () => ({ status: 'error', message: 'Service unavailable' });
    h.button('Refresh').click(); await h.settle();
    assert.match(h.tbody.textContent, /Service unavailable/);
    h.search.input('TCP'); assert.match(h.tbody.textContent, /Service unavailable/);
});

test('legacy array responses and missing GeoIP still allow endpoint searches', async () => {
    const h = harness(); await h.settle(); h.reply = () => ({ status: 'success', data: [items[2]] });
    h.button('Refresh').click(); await h.settle(); h.search.input('[2001:db8::5]:0');
    assert.equal(h.tbody.children.length, 1); assert.match(h.pageText(), /Total: 1.*1\/1/);
});
