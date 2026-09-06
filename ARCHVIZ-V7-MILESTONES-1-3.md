# V7 — Milestones 1–3

## Milestone 1 — Road continuity
The source road extraction contains knockout holes beneath the named external-road labels. V7 detects holes spatially matching the exact `YAMUNA EXPRESSWAY` and `PROPOSED 6 LANE ROAD` source annotations and refills those holes with the same asphalt material. Exact Notations remains an independent overlay.

## Milestone 2 — Central Park
Adds `public/masterplan3d/models/central-park.glb`, anchored to the exact `CENTRAL PARK` source annotation. The 3D landscaping is conceptual presentation geometry and does not modify the source plot/road files.

## Milestone 3 — Nature-inspired entrance
Replaces `entrance-gate.glb` with a web-optimized nature-inspired gate based on the approved reference direction: natural-stone feature walls, timber canopy/fins, glass security booth, boom barriers, landscaped beds and warm architectural lighting details. It remains anchored to the existing exact ENTRY coordinate.

## Preserved source geometry
No edits were made to `masterplan.json`, `roads.json`, `greenareas.json`, `exact-annotations.svg`, or `source-annotations.json`.
