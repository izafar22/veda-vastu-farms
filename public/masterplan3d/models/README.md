# Premium ArchViz model slots

The Three.js viewer loads these files automatically:

- `clubhouse.glb`
- `entrance-gate.glb`

They are intentionally local-space assets. Placement, source anchors and orientation remain controlled by `../app.js`.

## Important

Do not bake masterplan coordinates into these GLBs. For future Blender edits:

- model around origin `(0,0,0)`
- use real positive Y for height
- preserve approximately the current local footprint
- apply transforms before export
- export as glTF Binary (`.glb`)
- avoid high-resolution textures unless optimized
- keep filenames unchanged

If either asset is absent, the viewer keeps the V4 procedural fallback.
