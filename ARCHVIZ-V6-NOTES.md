# V6 Premium ArchViz — Landscape, Roads & Night Pass

V6 builds on the approved V5 GLB integration. It does not modify the extracted plot, road, green-area, annotation, ENTRY, or amenity anchor data.

## Visual upgrades in V6

- **Road material pass** — subtle procedural asphalt grain applied to the existing exact `roads.json` geometry; no road vertices or widths are changed.
- **Road-edge reflectors** — low-profile emissive studs sampled from the existing road boundary rings. They are decorative presentation details and do not indicate surveyed lane markings or lane counts.
- **Landscape understory** — additional ornamental shrubs and flowering accents layered along the existing conceptual landscape traces.
- **Green-area bollards** — garden lights sampled only from the boundaries of the PDF-derived green-area polygons.
- **Presentation-edge architecture** — a low stone/metal frame outside the mapped masterplan slab. This is a sales-gallery presentation treatment, **not a surveyed township boundary**.
- **Night lighting pass** — stronger reflector/bollard/perimeter emissive response plus a soft cool moon-direction light while preserving Day / Dusk / Night controls.
- **Lighting toggle integration** — street lights, road reflectors, garden bollards, and presentation-edge glow switch together from the existing Lights control.

## Preserved source-faithful data

The following files are copied unchanged from V5:

- `public/masterplan3d/assets/masterplan.json`
- `public/masterplan3d/assets/roads.json`
- `public/masterplan3d/assets/greenareas.json`
- `public/masterplan3d/assets/exact-annotations.svg`
- `public/masterplan3d/assets/source-annotations.json`

The V5 GLB files are also unchanged:

- `public/masterplan3d/models/clubhouse.glb`
- `public/masterplan3d/models/entrance-gate.glb`

## Interaction preserved

- plot hover/click selection
- plot search
- left-drag pan
- right/Alt-drag orbit
- wheel/pinch zoom
- top/3D views
- Day / Dusk / Night modes
- existing layer toggles
- React lead funnel and Google Apps Script lead capture

## Accuracy note

Only the extracted masterplan geometry and annotations represent source-derived plan information. Plant species, decorative reflectors, bollards, presentation-edge architecture, materials, building elevations, and lighting are conceptual visualization treatments.
