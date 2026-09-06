# Veda Farms Lead Funnel — Setup

The React form sends one lead payload to a Google Apps Script Web App. Apps Script is the server-side integration layer: it appends the lead to the `Leads` sheet and calls Meta WhatsApp Cloud API using credentials stored in Apps Script **Script Properties**. No WhatsApp token is exposed in React.

## Google Sheet + Apps Script

1. Create/open the Google Sheet that should receive Veda Farms leads.
2. Extensions → Apps Script.
3. Replace the editor contents with `backend/google-apps-script.gs`.
4. Deploy → New deployment → **Web app**.
5. Execute as **Me**; access **Anyone**.
6. Copy the `/exec` deployment URL into `.env` as `VITE_GOOGLE_SHEETS_WEBHOOK_URL`.

The script creates a `Leads` tab automatically and writes timestamp, lead reference, contact details, interest, callback preference, message, consent, referrer/device and UTM attribution. Duplicate lead IDs are ignored.

## WhatsApp Cloud API

In Apps Script → Project Settings → Script Properties add:

- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_ADMIN_NUMBER` — digits only with country code, e.g. `9198XXXXXXXX`
- `WHATSAPP_GRAPH_VERSION` — optional; defaults to `v23.0`

For production, use an approved WhatsApp template and also set:

- `WHATSAPP_TEMPLATE_NAME`
- `WHATSAPP_TEMPLATE_LANGUAGE` — for example `en_US`

The template payload expects seven body variables, in order: lead reference, name, phone, city, interest, preferred callback, message.

If no template is configured, the script tries a normal text message. For production business-initiated notifications outside an active service window, Meta normally requires an approved template.

## Run React

```bash
cp .env.example .env
npm install
npm run dev
```

Lead flow: `React form → Apps Script endpoint → Google Sheet + Meta WhatsApp Cloud API`.

The browser uses `mode: no-cors` for the Apps Script Web App. That means the UI can confirm dispatch to the endpoint but cannot inspect the Apps Script response. The Google Sheet is the operational receipt. If strict end-to-end acknowledgement/retries are required later, add a same-origin serverless API in front of the integrations.
