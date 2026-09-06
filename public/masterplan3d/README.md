# Veda Vastu Farms — 3D Masterplan Visual Enhancement Final

This build starts from the corrected source-faithful masterplan and focuses on presentation quality without changing the PDF-derived horizontal geometry.

## Visual enhancements in v1
- premium street-light layer sampled from exact PDF-derived road boundaries
- denser landscaping inside corrected PDF-derived green-area polygons
- palms and ornamental/flowering trees inside green areas
- upgraded clubhouse, pool deck, glazing, pergola and warm architectural accents
- upgraded entrance gate at the exact PDF ENTRY position with branding, planters and palms
- cleaner plot-ID labels; exact PDF annotation overlay is still available as a layer but is off by default for a cleaner presentation
- Day / Dusk / Night lighting modes; Dusk is the default reference-style presentation
- source-faithful plots, roads, green-area footprints, plot areas, nearby PDF dimensions and road-width annotations remain unchanged

## Run locally
```bash
python3 -m http.server 8080
```
Open http://localhost:8080

## Controls
- Left-drag: move/pan the masterplan (default)
- Right-drag / Alt-drag, or turn Move off: orbit
- Wheel or pinch: zoom
- Click plot: inspect
- Day / Dusk / Night: lighting presets
- Layer controls: PDF plan, exact annotations, plots, roads, base, vegetation, street lights, amenities

## Fidelity boundary
Street lights, vegetation species/heights, clubhouse elevation, entrance architecture and lighting are conceptual visual treatments. Plot geometry, road geometry, green-area footprints, PDF dimensions, area labels and the main entry location remain source-derived.


## Performance optimisation in v2
- render-on-demand instead of a permanent 60 FPS loop when the scene is idle
- lower adaptive device-pixel ratio
- 1024px shadow map instead of 2048px
- decorative instances no longer cast expensive shadows
- street PointLights reduced drastically while keeping emissive lamp bulbs
- fewer curb/lamp instances and throttled hover raycasting


## v3 interaction update
- Club House / pool visual cluster is now clickable.
- Selecting it switches the side panel from plot information to source-aware amenity information.
- The panel clearly distinguishes PDF-supported labels/location from conceptual 3D architecture and lighting.

## v4 cleanup / usability update
- Fixed annotation clutter by making the raw exact-PDF overlay and clean 3D plot labels mutually exclusive.
- Default plot labels now show the plot ID and matched PDF area in one camera-facing label.
- Reduced the opacity of the underlying raw PDF texture so duplicate source text does not fight with 3D labels.
- Removed the cream curb strips from internal road holes/plot blocks; only a subtle outer road-network curb remains.
- Street lights are spatially thinned to a realistic density (maximum 90, typically fewer) instead of hundreds around every plot boundary.
- Removed the artificial maximum zoom-out cap and greatly relaxed zoom-in; camera range is expanded for deep inspection and wide overview.

## Final cleanup

- Removed all decorative cream curb-block instances that could appear as white boundary walls beside roads.
- Removed the extruded plot wireframe/EdgesGeometry layer entirely, eliminating vertical/diagonal white outline artifacts at close zoom.
- Kept plot separation through the plot meshes themselves; no synthetic raised plot boundary walls are added.
- Street lights remain PDF-road-derived but are slightly further thinned and capped at 72 for a more realistic site-wide density.
- Unrestricted close/far zoom, map-style drag/pan, clickable clubhouse, Day/Dusk/Night modes, clean labels and all PDF-derived geometry are preserved.


Final readability pass
- Plot ID label font increased by ~29%.
- Area label font increased by ~18%.
- Stronger contrast and subtle text shadow added.
- Distance-aware scaling retained with bounded min/max scale.
- No PDF-derived geometry, roads, green areas, entry position, dimensions, or interaction behavior changed.
