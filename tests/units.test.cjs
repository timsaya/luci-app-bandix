const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const resources = path.join(__dirname, '../luci-app-bandix/htdocs/luci-static/resources/view/bandix');
const source = fs.readFileSync(path.join(resources, 'index.js'), 'utf8');
const ctx = vm.createContext({});
vm.runInContext(source.slice(source.indexOf('function formatSize('), source.indexOf('function getConnectionTypeIcon(')), ctx);
vm.runInContext(source.slice(source.indexOf('function parseSpeed('), source.indexOf('\n}', source.indexOf('function parseSpeed(')) + 2), ctx);

test('binary byte rates and decimal bit rates round trip without changing the limit', () => {
    for (const [bytes, byteLabel, bitLabel] of [
        [0, '0 B/s', '0 bps'],
        [1024, '1 KiB/s', '8.19 kbps'],
        [1048576, '1 MiB/s', '8.39 Mbps'],
        [1073741824, '1 GiB/s', '8.59 Gbps']
    ]) {
        assert.equal(ctx.formatByterate(bytes, 'bytes'), byteLabel);
        assert.equal(ctx.parseSpeed(byteLabel), bytes);
        assert.equal(ctx.formatByterate(bytes, 'bits'), bitLabel);
    }
    for (const [label, bytes] of [['1 kbps', 125], ['1 Mbps', 125000], ['1 Gbps', 125000000], ['1.5 MiB/s', 1572864]]) {
        assert.equal(ctx.parseSpeed(label), bytes);
    }
    // Older displayed strings keep their original binary meaning when parsed.
    assert.equal(ctx.parseSpeed('1 MB/s'), 1048576);
    assert.equal(ctx.parseSpeed('1 Kbps'), 125);
});

test('device, quota usage and connection sizes use the same binary labels', () => {
    const connection = fs.readFileSync(path.join(resources, 'connection.js'), 'utf8');
    const other = vm.createContext({});
    vm.runInContext(connection.slice(connection.indexOf('function formatSize('), connection.indexOf('\n}', connection.indexOf('function formatSize(')) + 2), other);
    for (const [bytes, label] of [[0, '0 B'], [1000000, '976.56 KiB'], [1048576, '1 MiB'], [1073741824, '1 GiB']]) {
        assert.equal(ctx.formatSize(bytes), label);
        assert.equal(other.formatSize(bytes), label);
    }
});
