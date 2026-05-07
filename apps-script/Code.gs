var ALLOWED_ORIGINS = [
  'https://example.github.io'  // Replace with the deployed origin once known.
];
var THROTTLE_WINDOW_MS = 10000;
var SUBMISSIONS_TAB = 'submissions';

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
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SUBMISSIONS_TAB);
    if (!sheet) sheet = createSubmissionsSheet();
    var nowMs = new Date().getTime();
    var lastMs = lookupLastSubmissionMs(sheet, data.whatsapp);
    if (isThrottled(nowMs, lastMs, THROTTLE_WINDOW_MS)) {
      return jsonResponse({ status: 'error', code: 'throttled' });
    }
    appendRow(sheet, nowMs, data);
  } finally {
    lock.releaseLock();
  }
  return jsonResponse({ status: 'ok' });
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
    'timestamp', 'lead_name', 'additional_guests', 'day1_attending', 'day2_attending',
    'dietary', 'dietary_other', 'arrival', 'departure', 'accommodation', 'whatsapp', 'notes', 'raw_json'
  ]);
  return sheet;
}

function lookupLastSubmissionMs(sheet, whatsapp) {
  var rows = sheet.getDataRange().getValues();
  var lastMs = null;
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][10] === whatsapp) {
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
    d.day1Attending,
    d.day2Attending,
    JSON.stringify(d.dietary || []),
    d.dietaryOther || '',
    d.arrival || '',
    d.departure || '',
    d.accommodation,
    d.whatsapp,
    d.notes || '',
    JSON.stringify(d)
  ]);
}
