# FELT & PLUSH — sprite style rulebook

Everything looks like a hand-sewn stuffed toy or a felt craft piece: pillowy forms, running-stitch seams, button and appliqué details, a cosy muted palette. All helpers live in `draw.js` (`plush`, `outline`, `stitch`, `cloud`, `safetyEye`, `button`, `cheek`, `thread`).

## Canvas & framing
- Author in a 512-unit space through `begin(ctx,size)`. The base line is y=504, so feet or the base land about 8px above the canvas bottom. Content is centred on x=256.
- `begin` clips just below the base, so part drop shadows never form a ground shadow (the game adds its own).
- Fill 85–95% of the height. Characters should be about as wide as a head.

## Palette (only these, plus mixes of them)
| role | hex | role | hex |
|---|---|---|---|
| outline (cocoa) | `#4a3226` | cream / cream shade | `#f0e2c4` / `#d8c09a` |
| sage / dark / light | `#93ad76` / `#6f8c5c` / `#a9c08a` | foliage base | `#7fa656` |
| rust / dark | `#c0613f` / `#933f2b` | dusty blue / dark | `#7f9cb6` / `#5d7891` |
| mustard / dark | `#d8a73c` / `#a97b25` | brown / dark | `#8c5e40` / `#6a432d` |
| felt "metal" | `#bcc5cc` | goblin green / dark | `#a8b862` / `#7f9145` |
| skin / blush | `#f4cfb1` / `#e99485` | thread (light) | `#fbf1dc` |
- Highlights: `lt(c,t)` mixes toward `#fff7e8`. Shadows: `dk(c,t)` mixes toward `#2a1c24`. Never use pure white or pure black, except the eye sparkles.
- Each sprite has 1–2 dominant hues, plus mustard or cream as an accent. Rust is the "hero colour" (plumes, roofs, apples).

## Proportions
- Characters: the head is about 50% of the total height (2-head chibi). The body is a short pear shape, there are no visible legs, and the feet or boots are fat ovals.
- Hands are round mittens with no fingers. Props are oversized: sword length is about 0.45H, shield diameter about 0.3H.
- 3/4 view: shift the face about 12 units toward the viewer's right. Put a side detail (rivet, ear) on the far side.

## The plush recipe (`plush(ctx, pts, colour, opts)`)
1. **Outline + cast shadow:** stroke 9 units wide in `mix(dk(c,.55), #4a3226, .55)`, which is a tinted cocoa and never flat black. Soft drop shadow `rgba(52,32,28,.32)`, blur 14, offset (4,7). This shadow is what makes the parts look stacked and stuffed.
2. **Base fill**, then a radial body light centred at (32%, 26%) of the bbox: lt .42 → clear → dk .42.
3. **Inner shading** (cast inward from an even-odd frame): bottom-right tuck (blur .2m, offset −.05m/−.07m), all-round pillow rim (blur .07m), top-left sheen (blur .12m, light). Here m is the shape's smaller dimension.
4. **Felt fibres:** about w·h/70 random 2–6 unit hairlines at 8–10% alpha, light and dark mixed.
5. **Running stitch:** a dashed line inset 10% of m (clamped 5–13). Dash 8/6 at width 3, or 5/4 at width 2.2 for small parts. Each dash has an offset shadow so it sinks into the fabric. Thread is `dk(c,.42)` by default, or cream or mustard thread on contrast pieces (door, shield, club, trunk).
6. **Fuzzy edge:** fibres every 2.2 units cross the outline. Use the outline tone at 24% alpha outward, and the fabric tone at 55% alpha inward, lighter on top-left-facing edges. Keep it at this strength so it disappears at 45px.
- Small decorative bits (face parts, panes, leaves) use `outline:false` or `ow` 2.5–5, `stitch:false`, `fuzz:false`.
- Several lobes sharing one silhouette: run `outline()` for all of them first, then `plush(..., {ow:4, hide})`. The `hide` predicate cuts seams where a front lobe covers them.

## Lighting
Light always comes from the top-left. The light spot is at 30% / 25% of each part. The shade gathers bottom-right and on undersides. Drop shadows fall down-right.

## Faces (spend time here)
- Eyes are glossy plastic "safety eyes" (`safetyEye`): about 0.07× head width, set low on the face, with a wide gap between them. Each has one large sparkle (top-left) and one tiny sparkle (bottom-right).
- Cheeks are felt circles in blush with a tiny cream stitch, plus a soft blush glow.
- Mouth: an embroidered satin-stitch smile (`thread`, width 4.5) or a felt mouth piece with cream felt fangs for monsters.
- Monsters get felt brow strips and cream felt eye-whites behind the safety eyes.

## Buildings
- Shape: a front gable seen slightly from above. A cream wall pentagon sits under a thick, puffy inverted-V roof (about 60 units deep) with rounded tips that overhang the wall by about 70.
- Roof: courses of scalloped felt shingles run down each slope (semicircles facing the eave, each with a small drop shadow and a tiny stitched arc). A mustard button sits on the ridge.
- Openings: brown felt frames, glowing mustard panes, and a cream cross mullion. The door is an arched dusty-blue felt panel with plank lines, cream thread and a button knob. Add sage felt flower boxes with button flowers.
- Chimney: a cream-shade stitched column with dashed brick courses, a brown cap and a cotton-ball smoke puff (`cloud`).
- Variants: swap the wall colour (cream, sage, dusty blue) and the roof (rust, mustard, blue). Keep the same thickness and stitching. Towers are tall rounded rectangles with a felt cone roof.

## Trees & foliage
- Canopy: one `cloud()` silhouette (11 bumps, amp .16) in `#7fa656`. Inside it, 3 overlapping "pillow" panels with soft drop shadows and their own stitched seams. A diagonal pass on top adds warm sheen above and a cool shade below.
- Decorate with 4–6 felt leaf appliqués (veined stitch) and 4–6 rust felt apples with sage leaves.
- Trunk: corduroy. Use a tapered flared shape with vertical ridges (dark 3.5px + light 2px pairs that fan out toward the roots) and mustard thread.
- Bushes = a small canopy with no trunk. Pines = 3 stacked rounded triangles of the same felt.

## Readability checks
At 45–48px the outline, the 1–2 big colour masses and the eyes must survive. Test with a LANCZOS thumbnail to 48px. If a prop merges into the body, increase its angle or contrast rather than adding detail.
