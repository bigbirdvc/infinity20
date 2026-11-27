import asyncio, base64, sys, pathlib
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).parent
REGIONAL = ['tree-small','tree-large','tree-conifer-large','tree-crooked-large','rock-small','rock-large','rock-layered-large','bush','flower','crystal','house','house-small','inn','inn-small','tower','tower-small','ruins','ruins-small','well']
REGIONS = ['fresh','dry','cool','lush','desert','volcanic','twilight']
async def main():
    js = (ROOT/'engine.js').read_text() + (ROOT/'models.js').read_text()
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg = await b.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.set_content('<body></body>'); await pg.add_script_tag(content=js)
        keys = sys.argv[1].split(',') if len(sys.argv) > 1 and sys.argv[1] != 'all' else await pg.evaluate('PIECES.keys')
        jobs = [(None, k) for k in keys] + [(r, k) for k in keys if k in REGIONAL for r in REGIONS]
        for reg, k in jobs:
            data = await pg.evaluate("""([k,reg])=>{PIECES.setRegion(reg||'fresh');const c=document.createElement('canvas');c.width=c.height=512;
              try{const pt=PIECES.pitch(k);T3.render(c,PIECES.build(k),pt?{pitch:pt}:{pitch:0.55});}catch(e){return 'ERR '+e}return c.toDataURL();}""", [k, reg])
            if data.startswith('ERR'): print(k, data); continue
            out = ROOT/'out'/(reg or ''); out.mkdir(parents=True, exist_ok=True); (out/f'{k}.png').write_bytes(base64.b64decode(data.split(',')[1]))
        await b.close()
    if errs: print(errs)
    from PIL import Image, ImageDraw, ImageFont
    f = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 15)
    cols, cell = 10, 150; rows = (len(keys) + cols - 1) // cols
    s = Image.new('RGBA', (cols * cell, rows * (cell + 18)), (110, 150, 64, 255)); d = ImageDraw.Draw(s)
    for i, k in enumerate(keys):
        im = Image.open(ROOT/'out'/f'{k}.png'); im = im.crop(im.getbbox()); im.thumbnail((cell - 10, cell - 10), Image.LANCZOS)
        x, y = (i % cols) * cell, (i // cols) * (cell + 18); s.alpha_composite(im, (x + (cell - im.width) // 2, y + cell - im.height)); d.text((x + 4, y + cell), k, fill=(255, 255, 230), font=f)
    s.save(ROOT/'sheet.png'); print('ok', len(jobs))
asyncio.run(main())
