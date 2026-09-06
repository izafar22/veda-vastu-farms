# V8 — Premium ArchViz Milestones 4–13

This build starts from the validated V7 Milestones 1–3 build. The supplied PDF-derived geometry remains the source of truth. All V8 work is presentation/interaction layered on top of those source-derived assets.

## Implemented

### M3A — Entrance road connection
- Added a continuous asphalt arrival apron from the internal-road side into the source-anchored gate.
- Landscaping is kept outside the travel path.

### M4 — Premium internal roads
- Darker procedural asphalt with subtle surface grain/bump.
- Flush road-edge delineation sampled from existing road boundaries.
- No new road polygons or asserted lane counts.

### M5 — Development-wide landscaping
- Added flowering accent planting to the existing conceptual landscape anchors.
- Retains the existing source-derived green-area vegetation and instanced trees/palms.

### M6 — Enhanced Central Park
- Retains the source-anchored Central Park asset.
- Adds focal plaza, shallow fountain/basin, seating and warm park accent lighting inside the same park block.

### M7 — Entrance arrival experience
- Connected arrival road, landscaped shoulders and warm arrival lighting around the exact ENTRY anchor.
- Keeps the V7 nature-inspired entrance GLB.

### M8 — Realistic plot presentation
- Reduced the exaggerated vertical plot extrusion.
- Added subtle natural earth/sand surface texture and higher roughness.
- Plot polygons, IDs, areas and exact PDF dimension associations are unchanged.

### M9 — Architectural lighting
- Existing street lights, garden bollards, perimeter reveal, clubhouse lighting and dusk/night modes retained.
- Added Central Park and entrance focal lighting integrated with Day/Dusk/Night and the Lights toggle.

### M10 — Surrounding landscape context
- Added a low-detail conceptual outer terrain/tree belt beyond the masterplan slab.
- This context is outside the mapped plan and is not represented as surveyed site data.

### M11 — Cinematic camera views
- Added Hero View.
- Added Entrance View.
- Added Central Park View.
- Existing 3D, Top, Reset, pan/orbit and unrestricted zoom remain.

### M12 — PBR/rendering pass
- Improved asphalt roughness/bump response.
- Improved plot surface response.
- Increased shadow-map resolution on capable devices while retaining a lower-memory fallback.
- Existing ACES tone mapping, physical glass/water and Day/Dusk/Night atmosphere remain.

### M13 — Premium viewer UI
- Expanded the top toolbar with Hero, Entrance and Central Park views.
- Added clickable Central Park and Main Entrance information targets in the existing side panel.
- Existing plot search and source-fidelity controls remain intact.

## Source-fidelity rules preserved
The following files are intentionally not edited by V8:
- `public/masterplan3d/assets/masterplan.json`
- `public/masterplan3d/assets/roads.json`
- `public/masterplan3d/assets/greenareas.json`
- `public/masterplan3d/assets/exact-annotations.svg`
- `public/masterplan3d/assets/source-annotations.json`

V8 does not add houses, lakes, invented plot dimensions, new plot boundaries, or new surveyed roads based on the visual inspiration image.
