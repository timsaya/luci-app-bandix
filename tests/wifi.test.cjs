// Run with: node --test tests/wifi.test.cjs (no npm dependencies).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../luci-app-bandix/htdocs/luci-static/resources/view/bandix/index.js'), 'utf8');
const start = source.indexOf('        function wifiBand(device) {');
const end = source.indexOf('        // 格式化最后上线时间', start);
assert.ok(start >= 0 && end > start, 'production Wi-Fi display helpers exist');
// Execute the exact helpers used by cards, tables and device detail dialogs.
const helpers = new Function('E', '_', source.slice(start, end) +
    '\nreturn { wifiBand, buildDeviceUplinkChBadges, formatDeviceUplinkCh };')(
    (tag, attributes, text) => ({ tag, attributes, text }), text => text);
const device = (channel, frequency) => ({ conn: 'wifi', uplink: 'phy2-ap0', w_ch: channel, w_freq: frequency });

test('overlapping channels are classified by primary frequency in all displays', () => {
    for (const [channel, frequency, label, css] of [
        [5, 2432, '2.4 GHz', 'g24'], [14, 2484, '2.4 GHz', 'g24'],
        [149, 5745, '5 GHz', 'g5'], [173, 5865, '5 GHz', 'g5'],
        [5, 5975, '6 GHz', 'g6'], [9, 5995, '6 GHz', 'g6'], [13, 6015, '6 GHz', 'g6'],
        [37, 6135, '6 GHz', 'g6'], [149, 6695, '6 GHz', 'g6'],
        [213, 7015, '6 GHz', 'g6'], [2, 5935, '6 GHz', 'g6'], [233, 7115, '6 GHz', 'g6']
    ]) {
        const item = device(channel, frequency);
        assert.deepEqual(helpers.wifiBand(item), { label, css });
        const badges = helpers.buildDeviceUplinkChBadges(item);
        assert.equal(badges[0].text, 'phy2-ap0');
        assert.equal(badges[1].text, label);
        assert.equal(badges[1].attributes.class, 'device-ch-badge device-ch-' + css);
        assert.equal(badges[1].attributes.title, 'WiFi Channel ' + channel + ' · ' + frequency + ' MHz');
        assert.equal(helpers.formatDeviceUplinkCh(item), 'phy2-ap0 · ' + label);
    }
});

test('old servers and invalid frequencies show a neutral channel, never a guessed band', () => {
    for (const frequency of [undefined, null, 0, '', 'invalid', NaN, Infinity, -5975, 5975.5, 3000, 60480]) {
        const item = device(5, frequency);
        if (frequency === undefined) delete item.w_freq;
        assert.equal(helpers.wifiBand(item), null);
        const badge = helpers.buildDeviceUplinkChBadges(item)[1];
        assert.equal(badge.text, 'WiFi Channel 5');
        assert.equal(badge.attributes.class, 'device-ch-badge device-uplink-badge');
        assert.equal(helpers.formatDeviceUplinkCh(item), 'phy2-ap0 · WiFi Channel 5');
    }
});

test('non-wireless devices and missing radio data never show a frequency badge', () => {
    for (const conn of ['wired', 'router', '']) {
        const item = { ...device(5, 5975), conn };
        assert.equal(helpers.wifiBand(item), null);
        assert.equal(helpers.buildDeviceUplinkChBadges(item).length, 1);
        assert.equal(helpers.formatDeviceUplinkCh(item), 'phy2-ap0');
    }
    assert.deepEqual(helpers.buildDeviceUplinkChBadges({ conn: 'wifi', w_ch: 0, w_freq: 0 }), []);
});

test('the LuCI view remains valid JavaScript', () => {
    assert.doesNotThrow(() => new Function(source));
});
