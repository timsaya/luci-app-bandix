"""Run with JSHN_SH=/path/to/jshn.sh and jshn on PATH; stubs HTTP, never deletes devices."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

SOURCE = (Path(__file__).resolve().parents[1] / 'luci-app-bandix/root/usr/libexec/rpcd/luci.bandix').read_text()
HELPERS = SOURCE[SOURCE.index('make_value() {'):SOURCE.index('# 转义JSON字符串')]
DELETE = SOURCE[SOURCE.index('delete_devices() {'):SOURCE.index('# 获取设备状态')]


@unittest.skipUnless(os.environ.get('JSHN_SH') and shutil.which('jshn'), 'Set JSHN_SH and add the SDK host jshn to PATH')
class BatchRpcTest(unittest.TestCase):
    def invoke(self, macs, code=200, exit_code=0):
        with tempfile.TemporaryDirectory() as directory:
            args_file = Path(directory) / 'args'
            env = dict(os.environ, TEST_MACS=macs, ARGS_FILE=str(args_file), HTTP_CODE=str(code), CURL_EXIT=str(exit_code))
            script = '''
. "$JSHN_SH"
BANDIX_DEVICES_API=http://127.0.0.1:8686/api/traffic/devices
curl() {
    printf '%s\\n' "$@" > "$ARGS_FILE"
    printf '{"status":"success","data":{"deleted":[],"not_found":[],"failed":[]}}\\n%s' "$HTTP_CODE"
    return "$CURL_EXIT"
}
''' + HELPERS + DELETE + '\ndelete_devices "$TEST_MACS"\n'
            process = subprocess.run(['bash', '-c', script], env=env, text=True, capture_output=True)
            self.assertEqual(process.returncode, 0, process.stderr)
            return json.loads(process.stdout), args_file.read_text().splitlines() if args_file.exists() else []

    def test_valid_array_is_reencoded_and_sent_to_batch_endpoint(self):
        macs = ['02:11:22:33:44:AA', '02:11:22:33:44:bb']
        response, args = self.invoke(json.dumps(macs))
        self.assertEqual(response['status'], 'success')
        self.assertEqual(args[-1], 'http://127.0.0.1:8686/api/traffic/devices/batch')
        self.assertEqual(args[args.index('-X') + 1], 'DELETE')
        self.assertEqual(json.loads(args[args.index('--data-binary') + 1]), {'macs': macs})

    def test_invalid_input_never_reaches_http(self):
        for value in ['', 'invalid', '[]', '{}', 'null', '1', '[1]', '[null]', '["bad"]',
                      '["02:11:22:33:44:55", "invalid"]', '["$(touch /tmp/should-not-exist)"]',
                      json.dumps(['02:11:22:33:44:55'] * 1001)]:
            with self.subTest(value=value[:80]):
                response, args = self.invoke(value)
                self.assertFalse(response['success'])
                self.assertEqual(args, [])

    def test_legacy_server_errors_are_clear_and_transport_failure_is_not_success(self):
        for code in [404, 405]:
            response, _ = self.invoke('["02:11:22:33:44:55"]', code=code)
            self.assertIn('Update the Bandix service', response['error'])
        response, _ = self.invoke('["02:11:22:33:44:55"]', exit_code=28)
        self.assertFalse(response['success'])

    def test_rpc_schema_registers_a_string_parameter(self):
        # Exercise the real list branch with OpenWrt's JSON library.
        source = SOURCE.replace('. /usr/share/libubox/jshn.sh', '. "$JSHN_SH"')
        process = subprocess.run(['bash', '-c', 'uci() { :; }\n' + source, 'luci.bandix', 'list'],
                                 env=os.environ, text=True, capture_output=True)
        self.assertEqual(process.returncode, 0, process.stderr)
        self.assertEqual(json.loads(process.stdout)['deleteDevices'], {'macs': ''})


if __name__ == '__main__':
    unittest.main()
