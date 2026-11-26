# Usage: python3 render-set.py <part.js> [more parts...] [--keys a,b] [--regions]
# Loads plush-lib.js then each part file; every key in window.SPRITES (or --keys) is rendered
# at 512x512 into out/<key>.png. Nature keys listed in REGIONAL are also rendered per region
# into out/<region>/<key>.png when --regions is given. A labelled contact sheet with a 48px
# readability strip goes to sheets/<first-part-name>.png.
import asyncio, base64, sys, pathlib, json
from playwright.async_api import async_playwright
from PIL import Image, ImageDraw, ImageFont
ROOT = pathlib.Path(__file__).parent.resolve()
args = sys.argv[1:]; regions = '--regions' in args; keys = None
if '--keys' in args: keys = args[args.index('--keys') + 1].split(','); 
parts = [a for a in args if a.endswith('.js')]
REGIONAL = ['tree-small','tree-large','tree-conifer-large','tree-crooked-large','rock-small','rock-large','rock-layered-large','bush','flower','mushroom','house','house-small','inn','inn-small','tower','tower-small','ruins','ruins-small','crystal']
REGIONS = ['fresh','dry','cool','lush','desert','volcanic','twilight']
async def main():
    js = (ROOT/'plush-lib.js').read_text() + '\n' + '\n'.join((ROOT/p).read_text() for p in parts)
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome'); pg = await b.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.set_content('<body></body>'); await pg.add_script_tag(content=js)
        if errs: print('ERRORS', errs); sys.exit(1)
        names = keys or await pg.evaluate('Object.keys(window.SPRITES)')
        if not keys and parts: names = await pg.evaluate("(()=>{const before=new Set(['knight','goblin','house','tree-small']);return Object.keys(window.SPRITES)})()")
        jobs = [('fresh', n) for n in names] + ([(r, n) for n in names if n in REGIONAL for r in REGIONS] if regions else [])
        for reg, n in jobs:
            data = await pg.evaluate("""([n,reg])=>{PL.setRegion(reg);const c=document.createElement('canvas');c.width=c.height=512;
              try{window.SPRITES[n](c.getContext('2d'),512);}catch(e){return 'ERR '+e.message+' '+e.stack}PL.setRegion('fresh');return c.toDataURL('image/png');}""", [n, reg])
            if data.startswith('ERR'): print(n, data); errs.append(n); continue
            out = ROOT/'out'/(reg if (regions and n in REGIONAL) else '')
            out.mkdir(parents=True, exist_ok=True); (out/f'{n}.png').write_bytes(base64.b64decode(data.split(',')[1]))
        await b.close()
    if errs: print('ERRORS', errs)
    # contact sheet: big row + 48px strip on grass
    try: f = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 18)
    except: f = None
    cols = 6; cell = 220; rows = (len(names) + cols - 1) // cols
    sheet = Image.new('RGBA', (cols*cell, rows*(cell+24) + 90), (110, 150, 64, 255)); d = ImageDraw.Draw(sheet)
    for i, n in enumerate(names):
        pth = ROOT/'out'/f'{n}.png'
        if not pth.exists(): continue
        im = Image.open(pth); bb = im.getbbox() or (0,0,512,512); im = im.crop(bb); im.thumbnail((cell-12, cell-12), Image.LANCZOS)
        x, y = (i%cols)*cell, (i//cols)*(cell+24); sheet.alpha_composite(im, (x+(cell-im.width)//2, y+cell-im.height-4)); d.text((x+6, y+cell), n, fill=(255,255,235), font=f)
        sm = Image.open(pth).crop(bb); sm.thumbnail((46, 46), Image.LANCZOS)
        sheet.alpha_composite(sm, (8 + i*52 if i*52 < cols*cell-56 else 8 + (i*52) % (cols*cell-56), rows*(cell+24) + 20 + 50*((i*52)//(cols*cell-56))) if False else (8 + i*52, rows*(cell+24) + 30)) if 8+i*52+46 < cols*cell else None
    name = pathlib.Path(parts[0]).stem if parts else 'base'
    (ROOT/'sheets').mkdir(exist_ok=True); sheet.save(ROOT/'sheets'/f'{name}.png'); print('sheet', ROOT/'sheets'/f'{name}.png', 'rendered', len(jobs))
asyncio.run(main())
