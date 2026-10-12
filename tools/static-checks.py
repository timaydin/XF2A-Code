"""Release static checks. Run from the repository root after npm ci."""
from pathlib import Path
import json
import re
import subprocess
import xml.etree.ElementTree as ET
root = Path(__file__).resolve().parent.parent
for file in sorted((root / '_data').glob('*.xml')):
    ET.parse(file)
for file in [root / 'addon.json', root / 'build.json', root / 'hashes.json']:
    json.loads(file.read_text())
for file in sorted((root / '_files').rglob('*.js')):
    subprocess.run(['node', '--check', str(file)], check=True)
    assert not re.search(r'\bjQuery\b|\$target|\$container|XF\.proxy|XF\.Click|new Clipboard\b|\$\s*\(', file.read_text()), file
# Every add-on JS reference in the release templates has a source asset.
for file in (root / '_data').glob('*.xml'):
    for asset in re.findall(r'<xf:js[^>]+src="(CMTV/Code/[^"]+)"', file.read_text()):
        assert (root / '_files/js' / asset).is_file(), asset
for template in ET.parse(root / '_data/templates.xml').getroot():
    title = template.attrib['title']
    if title not in ('CMTV_Code_bb_code_tag_code', 'CMTV_Code_code_block.less'): continue
    suffix = '' if title.endswith('.less') else '.html'
    assert (root / '_output/templates/public' / (title + suffix)).read_text() == template.text
subprocess.run(['git', '-c', 'core.whitespace=cr-at-eol', 'diff', '--check'], cwd=root, check=True)
print('PASS: XML, JSON, JS syntax, dependency scan, asset references, changed template exports, diff whitespace')
