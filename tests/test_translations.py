"""Check shipped Chinese catalogs against the strings actually used by LuCI."""
import ast
import gettext
import io
from pathlib import Path
import re
import shutil
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1] / 'luci-app-bandix'


@unittest.skipUnless(shutil.which('msgfmt'), 'GNU gettext msgfmt is required')
class ChineseTranslationTest(unittest.TestCase):
    def test_all_static_ui_strings_are_translated_with_matching_placeholders(self):
        strings = set()
        pattern = r'''\b_\(\s*('(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*")'''
        for source in (ROOT / 'htdocs').rglob('*.js'):
            strings.update(ast.literal_eval(match[1]) for match in re.finditer(pattern, source.read_text()))
        for language in ['zh_Hans', 'zh_Hant']:
            with self.subTest(language=language):
                compiled = subprocess.run(
                    ['msgfmt', '--check', '-o', '-', str(ROOT / 'po' / language / 'bandix.po')],
                    check=True, capture_output=True)
                catalog = gettext.GNUTranslations(io.BytesIO(compiled.stdout))._catalog
                self.assertEqual(sorted(strings - catalog.keys()), [])
                for key in strings:
                    self.assertTrue(catalog[key].strip(), key)
                    self.assertEqual(re.findall(r'%[dsf]', key), re.findall(r'%[dsf]', catalog[key]), key)


if __name__ == '__main__':
    unittest.main()
