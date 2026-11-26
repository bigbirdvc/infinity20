# Felt & Plush sprite set — designer brief (read fully)

You are one of five designers building the full sprite set for "Infinite Adventure", an idle top-down fantasy game. The owner chose the **Felt & Plush** style: hand-sewn stuffed toys / craft felt, chibi proportions. Four approved samples already exist (knight, goblin, house, tree-small). Your pieces must look like they came from the same toy box.

## Files
- `/home/claude/feltset/plush-lib.js` — the shared style library. READ IT FIRST, especially `plush()`, `outline()`, `stitch()`, `safetyEye()`, `button()`, `cheek()`, `thread()`, `cloud()`, `begin()`, and the four sample functions `hero`, `enemy`, `house`, `tree` (study how they are built — copy their approach). It exposes everything on `window.PL`, including `PL.P` (palette) and `PL.R(key)` (current region colour: leaf, leafD, leafL, fruit, rock, rockD, bark, roof, snow).
- `/home/claude/feltset/STYLE.md` — the style rulebook. Follow it.
- DO NOT edit plush-lib.js, STYLE.md, or other designers' part files.

## What you write
ONE file: `/home/claude/feltset/parts/<yourname>.js`, shaped like:
```js
(function () {
  const { P, R, mix, lt, dk, al, RNG, ell, smooth, rrect, inset, bbox, resample, trace, xf, shadowOn, shadowOff, outlineCol, outline, stitch, plush, safetyEye, buttonEye, button, cheek, thread, begin, cloud } = window.PL;
  function spider(ctx, size) { begin(ctx, size); /* ... */ ctx.restore(); }
  window.SPRITES = Object.assign(window.SPRITES || {}, { spider /*, ... */ });
})();
```
Sprite keys must be EXACTLY the names in your list (they map to game files). Every function: `begin(ctx,size)` first and `ctx.restore()` last; transparent background; feet/base on the base line (y≈504 in begin's 512-unit space), centred on x=256; NO ground shadow (the game adds one). Plain Canvas2D only; deterministic (use `RNG(seed)`, never Math.random); no images or network.

## Render, look, improve
`cd /home/claude/feltset && python3 render-set.py parts/<yourname>.js` (add `--regions` if your list includes nature/building items marked [R]). PNGs go to `out/` (and `out/<region>/` for [R] items); a contact sheet goes to `sheets/<yourname>.png` with the 4 approved samples included for comparison and a 46px strip at the bottom. Use the Read tool to LOOK at the sheet and individual PNGs. Do at least 3 render-and-improve rounds. Be honest in critique: silhouette clarity, cute faces, consistent stitching/fuzz/outline with the samples.

To avoid clashing with other designers: put any scratch scripts/images under `/home/claude/feltset/scratch/<yourname>/` only (never /tmp, never other folders).

## Quality rules
- **Map readability is the #1 priority.** The game shows sprites at ~40–55px tall on green grass. Plush was the least readable test set at that size, so: give each sprite 1–2 big, clearly contrasting colour masses (stronger value contrast than the muted samples where needed — a notch richer saturation is fine), a clear silhouette, and keep fuzz subtle. Check the 46px strip every round.
- Chibi: heads ≈ 50% of height for humanoids; oversized props/weapons; round mitten hands; fat feet.
- Faces: glossy safety eyes, felt cheeks, embroidered mouths; monsters get felt brows and cream felt fangs.
- Light from top-left; shadows bottom-right; tinted cocoa outline (never black).
- Each creature/item must be instantly recognisable as what it is at small size.
- [R] items: take foliage/rock/roof/bark colours from `R('leaf')` etc. so they recolour per region (fresh, dry, cool, lush, desert, volcanic, twilight). When `R('snow')` is set (cool), add a felt snow cap. Check a couple of regional outputs.

## Finish
Final answer (short): list of keys delivered, any you're unhappy with, and anything the integrator should know (e.g. a sprite that is much wider than tall).
