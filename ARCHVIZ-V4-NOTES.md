# Veda Farms — Premium ArchViz V4

## What this build changes

This build upgrades only the conceptual presentation layer of the already-approved Three.js masterplan.

- Added a lightweight architectural gradient sky/horizon.
- Refined site slab, road and plot material response for a less flat scale-model look.
- Upgraded clubhouse/pool presentation with physical glass/water materials, a stone feature wall, floating canopy, shaded terrace and localized warm architectural lighting.
- Upgraded the exact-entry-anchored gate with stone wings, metal fins, arrival canopy and low warm lighting.
- Added an optional Blender/glTF replacement architecture. `clubhouse.glb` and `entrance-gate.glb` can be dropped into `public/masterplan3d/models/`; if present they replace only the matching procedural vertical asset.
- Preserved render-on-demand behavior and the existing performance-oriented DPR/shadow settings.

## Explicitly unchanged

- PDF-derived plot polygons
- exact road geometry
- source-derived green-area footprints
- exact ENTRY anchor
- clubhouse source anchor
- plot IDs, areas and exact PDF annotation overlay
- plot selection/search
- pan/orbit/zoom behavior
- Day/Dusk/Night controls
- React lead funnel and Google Sheets integration

## Blender workflow

1. Model a local-origin clubhouse or entry gate in Blender.
2. Export as optimized GLB.
3. Name it `clubhouse.glb` or `entrance-gate.glb`.
4. Copy it into `public/masterplan3d/models/`.
5. Reload the site. The GLB automatically replaces the procedural fallback.

If the asset fails to load, the procedural model stays visible, so the production masterplan never depends on optional Blender files.
