// Origins that represent the deployed site. Submissions from these origins
// trigger notification emails; submissions from DEV_ORIGINS do not.
var PROD_ORIGINS = [
  'https://pgoslatara.github.io'
];
// Local dev origins — Astro defaults. Astro picks a free port if 4321 is taken,
// so 4322 is included for the next-port-up case.
var DEV_ORIGINS = [
  'http://127.0.0.1:4321',
  'http://localhost:4321',
  'http://127.0.0.1:4322',
  'http://localhost:4322'
];
var ALLOWED_ORIGINS = PROD_ORIGINS.concat(DEV_ORIGINS);
var THROTTLE_WINDOW_MS = 10000;
var SUBMISSIONS_TAB = 'submissions';
// Recipients of the per-submission notification email. MailApp has a daily
// quota (~100 messages/day for consumer Google accounts); each recipient
// counts separately against it.
var NOTIFY_EMAILS = [
  'padraicslattery@gmail.com',
  'b.apeksha.91@gmail.com'
];

function doPost(e) {
  var rawBody = e && e.postData && e.postData.contents;
  var parsed = parsePayload(rawBody);
  if (!parsed.ok) {
    return jsonResponse({ status: 'error', code: parsed.code });
  }
  var data = parsed.value;

  // Origin is read from the body — Apps Script web apps don't expose request
  // headers, so the client (src/components/rsvp/client.ts) sends location.origin.
  if (!isAllowedOrigin(data.origin || '', ALLOWED_ORIGINS)) {
    return jsonResponse({ status: 'error', code: 'invalid_origin' });
  }

  var lock = LockService.getScriptLock();
  try { lock.waitLock(5000); } catch (lockErr) {
    return jsonResponse({ status: 'error', code: 'internal' });
  }
  var nowMs;
  var wroteRow = false;
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SUBMISSIONS_TAB);
    if (!sheet) sheet = createSubmissionsSheet();
    nowMs = new Date().getTime();
    var lastMs = lookupLastSubmissionMs(sheet, data.whatsapp);
    if (isThrottled(nowMs, lastMs, THROTTLE_WINDOW_MS)) {
      return jsonResponse({ status: 'error', code: 'throttled' });
    }
    appendRow(sheet, nowMs, data);
    wroteRow = true;
  } finally {
    lock.releaseLock();
  }
  if (wroteRow && isAllowedOrigin(data.origin || '', PROD_ORIGINS)) {
    // Mail failure must not break the RSVP write — the row is already saved.
    try { sendNotification(data, nowMs); } catch (mailErr) {
      // console.error surfaces in the Executions panel; Logger.log does not.
      console.error('Notification email failed: ' + mailErr);
    }
  }
  return jsonResponse({ status: 'ok' });
}

function sendNotification(data, nowMs) {
  if (!NOTIFY_EMAILS || NOTIFY_EMAILS.length === 0) return;
  var msg = formatNotification(data, nowMs);
  MailApp.sendEmail({
    to: NOTIFY_EMAILS.join(','),
    subject: msg.subject,
    body: msg.body
  });
}

/**
 * Manual diagnostic — run from the Apps Script editor (function dropdown →
 * runNotificationTest → Run). First run triggers the MailApp scope consent
 * prompt; subsequent runs send a test email to NOTIFY_EMAILS and report the
 * remaining daily quota. Delete or ignore once notifications are confirmed.
 */
function runNotificationTest() {
  var quota = MailApp.getRemainingDailyQuota();
  console.log('MailApp remaining daily quota: ' + quota);
  sendNotification(
    {
      leadName: 'Test Notification',
      whatsapp: '+353000000000',
      weddingAttending: 'yes',
      accommodation: 'sorted',
      requiresVisa: 'no',
      additionalGuests: [],
      dietary: [],
      dietaryOther: '',
      arrival: '',
      departure: '',
      notes: 'Sent from runNotificationTest() in the Apps Script editor.'
    },
    new Date().getTime()
  );
  console.log('Test email dispatched to: ' + NOTIFY_EMAILS.join(', '));
}

function doGet() {
  // ContentService has no HTTP status-code setter — Apps Script web apps
  // always respond 200 unless they throw. Returning an error code in the
  // body is the closest we can get for "method not allowed".
  return jsonResponse({ status: 'error', code: 'invalid_origin' });
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function createSubmissionsSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.insertSheet(SUBMISSIONS_TAB);
  sheet.appendRow([
    'timestamp', 'lead_name', 'additional_guests', 'wedding_attending',
    'dietary', 'dietary_other', 'arrival', 'departure', 'accommodation', 'whatsapp', 'notes', 'raw_json',
    'requires_visa'
  ]);
  return sheet;
}

function lookupLastSubmissionMs(sheet, whatsapp) {
  var rows = sheet.getDataRange().getValues();
  var target = normalizeWhatsapp(whatsapp);
  var lastMs = null;
  for (var i = 1; i < rows.length; i++) {
    // Old rows store the WhatsApp value as a Number (Sheets coerces "+\d+"
    // strings on write); new rows store text with a leading "+". Normalise
    // both sides so dedup works regardless of when the row was written.
    if (normalizeWhatsapp(rows[i][9]) === target) {
      var ts = rows[i][0];
      var ms = ts instanceof Date ? ts.getTime() : Number(ts);
      if (!lastMs || ms > lastMs) lastMs = ms;
    }
  }
  return lastMs;
}

function appendRow(sheet, nowMs, d) {
  sheet.appendRow([
    new Date(nowMs).toISOString(),
    d.leadName,
    JSON.stringify(d.additionalGuests || []),
    d.weddingAttending,
    JSON.stringify(d.dietary || []),
    d.dietaryOther || '',
    d.arrival || '',
    d.departure || '',
    d.accommodation,
    // Leading apostrophe forces Sheets to store the value as text — without
    // it, Sheets parses "+\d+" as a formula and stores the bare number,
    // breaking dedup against the original "+\d+" payload value.
    "'" + d.whatsapp,
    d.notes || '',
    JSON.stringify(d),
    d.requiresVisa || ''
  ]);
}
