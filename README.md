# Veda Farms V5 — integrated maps + plan-derived 3D

This build adds two integrated Google Maps views (satellite and road map) centered on the exact project coordinate supplied by the client: **28.3917443, 77.504711**.

The interactive 3D masterplan uses the supplied **01-Veda Vastu Farms (10-08-26)-Model.pdf** as its source for named planning elements, plot labels/sizes and road-width hierarchy. The browser scene is a presentation interpretation rather than a survey-grade CAD model; a DWG/DXF/georeferenced survey would be required for cadastral accuracy.

Plan-derived elements represented include Central Park, Club House, Pool, Organic Farming, Green Area, Gaushala, Entry, Yamuna Expressway, proposed 6-lane road and future extension areas, plus plot zones/labels and the road-width hierarchy shown in the PDF.

## Run

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Notes

- Google Maps is embedded through Google Maps web URLs; the site also provides direct Google Maps handoff buttons.
- Verify all project claims, pricing, availability, legal/title information and infrastructure timelines before public launch.
