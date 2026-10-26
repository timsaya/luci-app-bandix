"""Run with JSHN_SH=/path/to/jshn.sh and the SDK host jshn on PATH. HTTP is stubbed."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

SOURCE = (Path(__file__).resolve().parents[1] / 'luci-app-bandix/root/usr/libexec/rpcd/luci.bandix').read_text()
MAC = '02:11:22:33:44:55'


@unittest.skipUnless(os.environ.get('JSHN_SH') and shutil.which('jshn'), 'Set JSHN_SH and add the SDK host jshn to PATH')
class QuotaRpcTest(unittest.TestCase):
    def invoke(self, quota, capability=True, post_reply=None, get_exit=0, positional=False):
        with tempfile.TemporaryDirectory() as directory:
            args_file = Path(directory) / 'args'
            env = dict(os.environ, ARGS_FILE=str(args_file), GET_EXIT=str(get_exit),
                       CAP_REPLY=json.dumps({'status': 'success', 'data': {'quotas': [], 'supports_quota_modes': capability}}),
                       POST_REPLY=json.dumps(post_reply if post_reply is not None else {'status': 'success', 'data': quota}))
            script = '''
uci() { :; }
curl() {
    printf '%s\\n' "$@" >> "$ARGS_FILE"
    case "$*" in
        *'-X GET'*) printf '%s' "$CAP_REPLY"; return "$GET_EXIT" ;;
        *) printf '%s' "$POST_REPLY" ;;
    esac
}
''' + SOURCE.replace('. /usr/share/libubox/jshn.sh', '. "$JSHN_SH"')
            payload = quota if isinstance(quota, str) else json.dumps(quota)
            process = subprocess.run(['bash', '-c', script, 'luci.bandix', 'call', 'setTrafficQuotaConfig'],
                                     env=env, input=json.dumps([payload] if positional else {'quota': payload}) + '\n', text=True, capture_output=True)
            self.assertEqual(process.returncode, 0, process.stderr)
            return json.loads(process.stdout), args_file.read_text().splitlines() if args_file.exists() else []

    def test_directional_limits_keep_precision_and_clear_combined_limits(self):
        for positional in [False, True]:
            quota = {'mac': MAC, 'mode': 'directional', 'total_bytes': 1099511627776, 'upload': {'daily_bytes': 1610612736}, 'download': {'daily_bytes': 5368709120}}
            response, args = self.invoke(quota, positional=positional)
            self.assertTrue(response['success'])
            body = json.loads(args[args.index('--data-binary') + 1])
            self.assertEqual(body['upload']['daily_bytes'], 1610612736)
            self.assertEqual(body['download']['daily_bytes'], 5368709120)
            self.assertEqual(body['mode'], 'directional')
            self.assertEqual(body['total_bytes'], 0)
            self.assertEqual(body['minute_bytes'], 0)
            self.assertEqual(body['download']['total_bytes'], 0)

    def test_legacy_combined_requests_work_without_capability_and_clear_directions(self):
        for mode in [None, 'combined']:
            quota = {'mac': MAC, 'daily_bytes': 5368709120, 'upload': {'daily_bytes': 123}}
            if mode:
                quota['mode'] = mode
            response, args = self.invoke(quota, capability=False)
            self.assertTrue(response['success'])
            self.assertNotIn('GET', args)
            body = json.loads(args[args.index('--data-binary') + 1])
            self.assertEqual(body['mode'], 'combined')
            self.assertEqual(body['daily_bytes'], 5368709120)
            self.assertEqual(body['upload']['daily_bytes'], 0)
            self.assertEqual(body['download']['daily_bytes'], 0)

    def test_invalid_payloads_never_reach_http(self):
        for payload in [{'mac': MAC, 'mode': 'both'}, '', 'null', '[]', '{}', '{invalid',
                        {'mac': MAC, 'mode': 'directional', 'upload': {}, 'download': {'daily_bytes': -1}},
                        {'mac': MAC, 'mode': 'directional', 'upload': {'daily_bytes': 1.2}, 'download': {}},
                        {'mac': MAC, 'mode': 'directional', 'upload': {'daily_bytes': '100'}, 'download': {}},
                        {'mac': MAC, 'mode': 'directional', 'upload': {'daily_bytes': 9007199254740992}, 'download': {}},
                        {'mac': MAC, 'mode': 'directional', 'upload': {'daliy_bytes': 1}, 'download': {}},
                        {'mac': MAC, 'mode': 'directional', 'upload': [], 'download': {}},
                        {'mac': MAC, 'mode': 'directional', 'upload': {}, 'download': {}, 'unknown': 1},
                        {'mac': '$(touch /tmp/quota-injection)', 'upload': {}, 'download': {}}]:
            with self.subTest(payload=payload):
                response, args = self.invoke(payload)
                self.assertFalse(response['success'])
                self.assertEqual(args, [])

    def test_unsupported_or_unreachable_server_never_receives_a_write(self):
        quota = {'mac': MAC, 'mode': 'directional', 'upload': {}, 'download': {}}
        for capability in [False, None, 'true']:
            response, args = self.invoke(quota, capability=capability)
            self.assertIn('Update the Bandix service', response['error'])
            self.assertNotIn('POST', args)
        response, args = self.invoke(quota, get_exit=28)
        self.assertFalse(response['success'])
        self.assertNotIn('POST', args)
        response, _ = self.invoke(quota, post_reply={'status': 'error'})
        self.assertFalse(response['success'])

    def test_rpc_schema_and_acl_require_write_access(self):
        script = 'uci() { :; }\n' + SOURCE.replace('. /usr/share/libubox/jshn.sh', '. "$JSHN_SH"')
        result = subprocess.run(['bash', '-c', script, 'luci.bandix', 'list'], env=os.environ, text=True, capture_output=True)
        self.assertEqual(json.loads(result.stdout)['setTrafficQuotaConfig'], {'quota': ''})
        acl = json.loads((Path(__file__).resolve().parents[1] / 'luci-app-bandix/root/usr/share/rpcd/acl.d/luci-app-bandix.json').read_text())['luci-app-bandix']
        self.assertIn('setTrafficQuotaConfig', acl['write']['ubus']['luci.bandix'])
        self.assertNotIn('setTrafficQuotaConfig', acl['read']['ubus']['luci.bandix'])


if __name__ == '__main__':
    unittest.main()
