# Board-game piece sprites

Every sprite is a small 3D model built from simple shapes (engine.js = tiny WebGL renderer, models.js = all pieces and regional colours), rendered from a diagonal top-down camera.

- `python3 render-pieces.py all` renders out/<key>.png plus regional versions and sheet.png
- `python3 integrate.py` puts them into web-assets and the manifest

The previous Felt & Plush source stays in art-source/felt.
