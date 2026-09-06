# Integration V3 — Lead Generation Funnel

This version builds the Process section as a real lead-capture funnel.

## Added
- Premium lead form: name, phone, email, city, interest, callback preference, message and consent.
- Lead reference generated in the browser and shown after submission.
- UTM/referrer/device/source capture.
- Honeypot anti-spam field.
- Google Apps Script backend writes a structured `Leads` sheet.
- Apps Script sends a Meta WhatsApp Cloud API notification to the configured admin/sales number.
- Duplicate lead-reference protection.
- Google Sheet is written before WhatsApp dispatch, so a WhatsApp failure does not lose the lead.
- `LEAD-FUNNEL-SETUP.md` contains deployment/configuration steps.

## Preserved
`public/masterplan3d/**` is unchanged from the approved V2 integration build.

## Validation
- `src/main.jsx` parsed successfully with Babel JSX parser.
- `backend/google-apps-script.gs` passes JavaScript syntax checking.
- Full Vite build could not be executed in this Linux work container because the source project's installed Rollup optional binary is macOS-specific. The delivery intentionally excludes `node_modules`; run `npm install` on the target Mac before `npm run dev` / `npm run build`.
