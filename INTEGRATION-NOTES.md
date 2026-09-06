# Veda Farms React + Approved Three.js Masterplan — Integration Build 1

This build replaces the earlier PNG/CSS pseudo-3D masterplan inside the existing React `#masterplan` section with the approved standalone Three.js masterplan.

## Integration boundary

- React host component: `Site3D` in `src/main.jsx`
- Approved masterplan application: `public/masterplan3d/`
- Embedded at `/masterplan3d/index.html`
- The surrounding Veda Farms page, navigation, masterplan heading and four information panels remain intact.

## Fidelity rule

The contents of `public/masterplan3d/` are copied from the preserved approved build `veda-vastu-3d-visual-enhancement-final-readable`. Plot geometry, roads, green-area footprints, entry position, source annotations and approved interaction/lighting behavior were not regenerated.

## Run

```bash
npm install
npm run dev
```

The React app is Vite-based. The supplied original archive contained platform-specific `node_modules`; this integration package intentionally excludes `node_modules` so dependencies install correctly on the target machine.
