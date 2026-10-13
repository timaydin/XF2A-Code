"""Release static checks. Run from the repository root after npm ci."""
from pathlib import Path
import json
import re
import subprocess
import xml.etree.ElementTree as ET
from hash_manifest import xenforo_sha256
root = Path(__file__).resolve().parent.parent
for file in sorted((root / '_data').glob('*.xml')):
    ET.parse(file)
for file in [root / 'addon.json', root / 'build.json', root / 'hashes.json']:
    json.loads(file.read_text())
manifest = json.loads((root / 'hashes.json').read_text())
for relpath, digest in manifest.items():
    if relpath.startswith('src/addons/CMTV/Code/'):
        file = root / relpath.removeprefix('src/addons/CMTV/Code/')
    else:
        file = root / '_files' / relpath
    if relpath.endswith('.min.js'):
        source = root / '_files' / (relpath.removesuffix('.min.js') + '.js')
        if source.is_file():
            generated = subprocess.run(
                ['node', '-e', "const fs=require('fs');require('terser').minify(fs.readFileSync(process.argv[1],'utf8')).then(r=>process.stdout.write(r.code+'\\n'))", str(source)],
                check=True, capture_output=True).stdout
            assert xenforo_sha256(generated) == digest, relpath
        else:
            shipped = root / '_files' / relpath
            assert shipped.is_file(), relpath
            assert xenforo_sha256(shipped.read_bytes()) == digest, relpath
        continue
    assert file.is_file(), relpath
    assert xenforo_sha256(file.read_bytes()) == digest, relpath
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
