# Felt & Plush sprite source

Every character, building, prop, tree and rock in the game is drawn in code from these files.

- `plush-lib.js`: the shared felt material (outline, stitching, fuzz, safety eyes, buttons) and the regional palettes.
- `parts/*.js`: one drawing function per sprite, keyed by its game name.
- `STYLE.md`: the style rulebook. `BRIEF.md`: the brief given to the designers.
- `render-set.py parts/*.js [--regions]`: renders 512×512 PNGs (regional versions for trees, rocks, roofs and so on).
- `integrate.py`: crops, converts to content-hashed WebP and updates `web-assets/manifest.json`.

To add or change a sprite: edit or add a function in a part file, render, then integrate.
