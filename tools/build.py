"""Build upload-layout ZIP and fresh XF SHA256 manifest; no XF installation needed."""
from pathlib import Path
import hashlib
import json
import subprocess
import sys
import tempfile
import zipfile

root = Path(__file__).resolve().parent.parent
out = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else root / 'dist'
out.mkdir(parents=True, exist_ok=True)
files = {}
for folder in ('XF', '_data'):
    for file in sorted((root / folder).rglob('*')):
        if file.is_file():
            files['src/addons/CMTV/Code/' + file.relative_to(root).as_posix()] = file.read_bytes()
for name in ('addon.json', 'EventsListener.php', 'LICENSE'):
    files['src/addons/CMTV/Code/' + name] = (root / name).read_bytes()
for file in sorted((root / '_files').rglob('*')):
    if file.is_file():
        files[file.relative_to(root / '_files').as_posix()] = file.read_bytes()
# Use a real minifier; never ship old minified versions beside new sources.
for path in json.loads((root / 'build.json').read_text())['minify']:
    source = root / '_files' / path
    result = subprocess.run(['node', '-e', '''
const fs = require('fs');
require('terser').minify(fs.readFileSync(process.argv[1], 'utf8')).then(r => {
    if (r.error) throw r.error;
    process.stdout.write(r.code + '\\n');
}).catch(e => { console.error(e); process.exit(1); });
''', str(source)], check=True, capture_output=True)
    files[path[:-3] + '.min.js'] = result.stdout
hashes = {name: hashlib.sha256(data).hexdigest() for name, data in sorted(files.items())}
manifest = (json.dumps(hashes, indent=4) + '\n').encode()
(root / 'hashes.json').write_bytes(manifest)
files['src/addons/CMTV/Code/hashes.json'] = manifest
version = json.loads((root / 'addon.json').read_text())['version_string']
archive = out / ('CMTV-Code-' + version + '-XF2.3.4.zip')
with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as z:
    for name, data in sorted(files.items()):
        info = zipfile.ZipInfo('upload/' + name, date_time=(2026, 10, 12, 0, 0, 0))
        info.compress_type = zipfile.ZIP_DEFLATED
        info.external_attr = 0o100644 << 16
        z.writestr(info, data)
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None
    for name, digest in hashes.items():
        assert hashlib.sha256(z.read('upload/' + name)).hexdigest() == digest
    assert len(z.namelist()) == len(hashes) + 1
print(f'{archive}: {len(files)} files; every manifest hash verified')
