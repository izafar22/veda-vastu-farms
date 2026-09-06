/**
 * Veda Farms lead intake endpoint.
 * Deploy as a Google Apps Script Web App (execute as: Me, access: Anyone).
 *
 * Script Properties used for WhatsApp notifications:
 *   WHATSAPP_ACCESS_TOKEN
 *   WHATSAPP_PHONE_NUMBER_ID
 *   WHATSAPP_ADMIN_NUMBER      e.g. 9198XXXXXXXX (digits only, country code included)
 *   WHATSAPP_GRAPH_VERSION     optional, e.g. v23.0
 * Optional production template mode:
 *   WHATSAPP_TEMPLATE_NAME
 *   WHATSAPP_TEMPLATE_LANGUAGE e.g. en_US (defaults to en_US)
 */
const SHEET_NAME = 'Leads';
const HEADERS = [
  'Timestamp','Lead ID','Name','Phone','Email','City','Interest','Preferred Callback','Message',
  'Consent','Source','Page','Landing URL','Referrer','Device','UTM Source','UTM Medium','UTM Campaign',
  'UTM Content','UTM Term','Client Timestamp','WhatsApp Status'
];

function doPost(e){
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (body.company) return json_({ok:true});

    ['leadId','name','phone','interest'].forEach(k => {
      if (!String(body[k] || '').trim()) throw new Error('Missing required field: ' + k);
    });

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
    if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS);

    if (leadExists_(sheet, body.leadId)) return json_({ok:true, leadId:body.leadId, duplicate:true});

    sheet.appendRow([
      new Date(), body.leadId, clean_(body.name), clean_(body.phone), clean_(body.email), clean_(body.city),
      clean_(body.interest), clean_(body.callback), clean_(body.message), clean_(body.consent), clean_(body.source),
      clean_(body.page), clean_(body.landingUrl), clean_(body.referrer), clean_(body.device), clean_(body.utmSource),
      clean_(body.utmMedium), clean_(body.utmCampaign), clean_(body.utmContent), clean_(body.utmTerm),
      clean_(body.clientTimestamp), 'PENDING'
    ]);
    const row = sheet.getLastRow();
    let whatsapp = 'FAILED';
    try { whatsapp = sendWhatsAppLead_(body); } catch (waErr) {
      whatsapp = 'ERROR';
      console.error('WhatsApp dispatch error: ' + waErr);
    }
    sheet.getRange(row, HEADERS.length).setValue(whatsapp);
    return json_({ok:true, leadId:body.leadId, whatsapp});
  } catch (err) {
    console.error(err);
    return json_({ok:false, error:String(err && err.message || err)});
  }
}

function leadExists_(sheet, leadId){
  if (sheet.getLastRow() < 2) return false;
  const values = sheet.getRange(2,2,sheet.getLastRow()-1,1).getDisplayValues().flat();
  return values.includes(String(leadId));
}

function sendWhatsAppLead_(lead){
  const props = PropertiesService.getScriptProperties();
  const token = props.getProperty('WHATSAPP_ACCESS_TOKEN');
  const phoneId = props.getProperty('WHATSAPP_PHONE_NUMBER_ID');
  const to = props.getProperty('WHATSAPP_ADMIN_NUMBER');
  if (!token || !phoneId || !to) return 'NOT_CONFIGURED';

  const graphVersion = props.getProperty('WHATSAPP_GRAPH_VERSION') || 'v23.0';
  const templateName = props.getProperty('WHATSAPP_TEMPLATE_NAME');
  const language = props.getProperty('WHATSAPP_TEMPLATE_LANGUAGE') || 'en_US';
  let payload;

  if (templateName) {
    payload = {
      messaging_product:'whatsapp', to, type:'template',
      template:{name:templateName,language:{code:language},components:[{type:'body',parameters:[
        textParam_(lead.leadId), textParam_(lead.name), textParam_(lead.phone), textParam_(lead.city || '-'),
        textParam_(lead.interest), textParam_(lead.callback || 'Anytime'), textParam_(lead.message || '-')
      ]}]}
    };
  } else {
    payload = {
      messaging_product:'whatsapp', to, type:'text',
      text:{preview_url:false,body:[
        'New Veda Farms Lead',
        'Ref: ' + lead.leadId,
        'Name: ' + lead.name,
        'Phone: ' + lead.phone,
        'City: ' + (lead.city || '-'),
        'Interest: ' + lead.interest,
        'Callback: ' + (lead.callback || 'Anytime'),
        'Message: ' + (lead.message || '-')
      ].join('\\n')}
    };
  }

  const response = UrlFetchApp.fetch('https://graph.facebook.com/' + graphVersion + '/' + phoneId + '/messages', {
    method:'post', contentType:'application/json', payload:JSON.stringify(payload),
    headers:{Authorization:'Bearer ' + token}, muteHttpExceptions:true
  });
  const code = response.getResponseCode();
  if (code >= 200 && code < 300) return 'SENT';
  console.error('WhatsApp error ' + code + ': ' + response.getContentText());
  return 'FAILED_' + code;
}

function textParam_(value){ return {type:'text',text:String(value || '-').slice(0,1024)}; }
function clean_(value){ return String(value || '').trim().slice(0,5000); }
function json_(obj){ return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
