# Crops every rendered sprite, writes content-hashed WebP files into the game, points the
# manifest at them, and removes artwork the manifest no longer references.
import json, hashlib, io, pathlib, sys
from PIL import Image
FS = pathlib.Path('/home/claude/pieces'); GAME = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else '/home/claude/infinity20')
ASSETS = GAME/'web-assets'; manifest = json.loads((ASSETS/'manifest.json').read_text())
def save(png):
    im = Image.open(png).convert('RGBA'); bb = im.getbbox()
    if not bb: raise SystemExit(f'empty sprite {png}')
    pad = 4; im = im.crop((max(0, bb[0]-pad), max(0, bb[1]-pad), min(512, bb[2]+pad), min(512, bb[3]+pad)))
    buf = io.BytesIO(); im.save(buf, 'WEBP', quality=90, method=4, exact=True); data = buf.getvalue()
    name = f'web-assets/{hashlib.sha1(data).hexdigest()[:20]}.webp'; (GAME/name).write_bytes(data)
    return {'file': name, 'w': im.width, 'h': im.height}
done = []
for section in ['heroes', 'common']:
    for key in list(manifest[section]):
        n = key.split('/')[1]; png = FS/'out'/f'{n}.png'
        if png.exists(): manifest[section][key] = save(png); done.append(key)
for region, table in manifest['regions'].items():
    for key in list(table):
        n = key.split('/')[1]
        for png in [FS/'out'/region/f'{n}.png', FS/'out'/f'{n}.png']:
            if png.exists(): table[key] = save(png); done.append(f'{region}:{key}'); break
(ASSETS/'manifest.json').write_text(json.dumps(manifest))
used = set()
def walk(v):
    if isinstance(v, dict):
        if 'file' in v: used.add(pathlib.Path(v['file']).name)
        for x in v.values(): walk(x)
    elif isinstance(v, str) and v.startswith('web-assets/'): used.add(pathlib.Path(v).name)
walk(manifest)
removed = 0
for f in ASSETS.glob('*.webp'):
    if f.name not in used and not f.name.startswith('logo'): f.unlink(); removed += 1
missing = [k for s in ['heroes','common'] for k in manifest[s] if 'terrain-tiles/meadow' not in k and k not in done and not any(t in k for t in ['water','path','river-bank','meadow'])]
print('replaced', len(done), 'entries; removed', removed, 'old files; still old art:', missing)
