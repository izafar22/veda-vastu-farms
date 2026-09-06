# V5 Premium ArchViz — GLB Asset Pass

This version builds on V4 without changing the approved PDF-derived masterplan geometry or interaction model.

## Added assets

- `public/masterplan3d/models/clubhouse.glb`
- `public/masterplan3d/models/entrance-gate.glb`

Both are web-optimized glTF Binary assets and are loaded by the existing V4 GLTFLoader replacement layer. If an asset fails to load, the V4 procedural fallback remains available automatically.

## Source-faithful elements left unchanged

- plot geometry and plot IDs
- road geometry
- green-area geometry
- exact PDF annotations
- source annotation data
- main ENTRY normalized anchor `[0.655329, 0.540730]`
- clubhouse amenity anchor
- plot hover/click selection
- left-drag pan, right/Alt-drag orbit, wheel/pinch zoom
- Day / Dusk / Night controls
- React lead funnel and Google Apps Script lead capture

## Architectural content status

The GLB building forms, materials, landscaping, gate design, pool treatment, lighting details and vertical dimensions are **conceptual visualization treatments**. They are not architectural construction drawings and must not be interpreted as dimensions supplied by the source PDF.

## Web optimization

The assets use simple geometry and embedded PBR materials, with no external texture dependency. Current sizes are intentionally small for browser delivery.

## Blender refinement

These `.glb` files can be imported directly into Blender for artistic refinement. Keep the origin at `(0,0,0)`, Y as up after export to glTF, and do not alter the site anchors in `app.js`. Re-export using glTF Binary (`.glb`) and replace the file with the same filename to preserve the Three.js integration.
