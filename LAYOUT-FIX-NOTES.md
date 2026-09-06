# Integration V2 — React shell layout fix

Scope of this build is intentionally limited to the surrounding React website shell.

## Fixed
- Header partner lockup and `VEDA Farms` wordmark now sit in one horizontal row instead of stacking vertically outside the fixed nav height.
- Desktop navigation spacing is responsive and no longer pushes items off-screen at compact desktop/browser-zoom widths.
- Partner lockup hides at <=1250px while the primary Veda Farms brand remains visible.
- Header CTA hides only in the narrow desktop range (901–1050px) before the existing hamburger breakpoint.
- Hero headline/container sizing now stays inside the viewport and cannot create horizontal page overflow.
- Page shell clips accidental horizontal overflow.

## Preserved
`public/masterplan3d/**` is byte-for-byte unchanged from Integration V1. No masterplan geometry, annotations, labels, camera controls, lighting, roads, green areas, entry, clubhouse, zoom behavior, or interaction code was modified.
