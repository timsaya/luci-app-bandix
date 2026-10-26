// Run with: node --test tests/host.test.cjs (requires POSIX sh, no npm dependencies).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const source = fs.readFileSync(path.join(__dirname, '../luci-app-bandix/root/usr/libexec/rpcd/luci.bandix'), 'utf8');
// Execute the production URL setup with a stub UCI function; no router is required.
const setup = source.slice(source.indexOf('BANDIX_HOST='), source.indexOf('# 通用函数'));

function apiBase(host, port) {
    const script = `
uci() {
    case "$3" in
        bandix.general.host) [ "\${TEST_HOST+x}" ] || return 1; printf '%s' "$TEST_HOST" ;;
        bandix.general.port) [ "\${TEST_PORT+x}" ] || return 1; printf '%s' "$TEST_PORT" ;;
        *) return 1 ;;
    esac
}
${setup}
printf '%s\\n%s\\n' "$BANDIX_API_BASE" "$BANDIX_CONNECTION_FLOWS_API"
`;
    const env = { ...process.env };
    delete env.TEST_HOST;
    delete env.TEST_PORT;
    if (host !== undefined) env.TEST_HOST = host;
    if (port !== undefined) env.TEST_PORT = port;
    const result = spawnSync('/bin/sh', ['-c', script], { env, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim().split('\n');
}

test('missing and empty UCI values retain loopback and port defaults', () => {
    for (const [host, port] of [[undefined, undefined], ['', '']]) {
        assert.deepEqual(apiBase(host, port), [
            'http://127.0.0.1:8686', 'http://127.0.0.1:8686/api/connection/flows'
        ]);
    }
});

test('RPC follows explicit IPv4 and IPv6 hosts and custom ports', () => {
    for (const [host, authority] of [
        ['192.168.2.1', '192.168.2.1'], ['::1', '[::1]'], ['fd00::1', '[fd00::1]']
    ]) {
        assert.deepEqual(apiBase(host, '8080'), [
            `http://${authority}:8080`, `http://${authority}:8080/api/connection/flows`
        ]);
    }
});

test('wildcard listeners are accessed through the corresponding loopback family', () => {
    assert.equal(apiBase('0.0.0.0')[0], 'http://127.0.0.1:8686');
    assert.equal(apiBase('::')[0], 'http://[::1]:8686');
});
