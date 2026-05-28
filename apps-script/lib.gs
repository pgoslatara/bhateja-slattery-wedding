// Pure logic functions — no Sheet I/O, no UrlFetchApp.
// Kept side-effect-free so they can be loaded and tested in Node via vm.runInNewContext.

/**
 * Parse and validate the raw JSON body from a POST request.
 * Mirrors the client-side validation in the RSVP form (Task 18) for defence-in-depth.
 *
 * @param {string} rawBody - JSON string from ContentService request body.
 * @returns {{ ok: true, value: object } | { ok: false, code: string }}
 */
function parsePayload(rawBody) {
  var data;
  try {
    data = JSON.parse(rawBody || '{}');
  } catch (e) {
    return { ok: false, code: 'invalid_payload' };
  }
  // Honeypot field must be empty — bots tend to fill every field.
  if (data && typeof data.honeypot === 'string' && data.honeypot.trim() !== '') {
    return { ok: false, code: 'invalid_payload' };
  }
  if (!data || typeof data.leadName !== 'string' || data.leadName.trim() === '') {
    return { ok: false, code: 'invalid_payload' };
  }
  // WhatsApp number must start with + and contain 10–15 digits (E.164 minimum is 10 incl. country code).
  if (typeof data.whatsapp !== 'string' || !/^\+\d{10,15}$/.test(data.whatsapp)) {
    return { ok: false, code: 'invalid_payload' };
  }
  if (data.weddingAttending !== 'yes' && data.weddingAttending !== 'no') {
    return { ok: false, code: 'invalid_payload' };
  }
  if (['sorted', 'recommended', 'help'].indexOf(data.accommodation) === -1) {
    return { ok: false, code: 'invalid_payload' };
  }
  if (data.requiresVisa !== 'yes' && data.requiresVisa !== 'no') {
    return { ok: false, code: 'invalid_payload' };
  }
  return { ok: true, value: data };
}

/**
 * Check whether an origin is in the configured allow-list.
 *
 * @param {string} origin - Value of the Origin header.
 * @param {string[]} allowList - Array of permitted origin strings.
 * @returns {boolean}
 */
function isAllowedOrigin(origin, allowList) {
  if (!origin) return false;
  for (var i = 0; i < allowList.length; i++) {
    if (allowList[i] === origin) return true;
  }
  return false;
}

/**
 * Determine whether a new submission should be throttled.
 * Prevents duplicate submissions within a rolling time window.
 *
 * @param {number} nowMs - Current timestamp in milliseconds.
 * @param {number|null} lastSubmissionMs - Timestamp of the last submission, or null if none.
 * @param {number} windowMs - Throttle window in milliseconds.
 * @returns {boolean} True if the submission should be blocked.
 */
function isThrottled(nowMs, lastSubmissionMs, windowMs) {
  if (lastSubmissionMs == null) return false;
  return (nowMs - lastSubmissionMs) < windowMs;
}

/**
 * Format a submission as a notification email (subject + plain-text body).
 * Kept here (rather than in Code.gs) so it can be exercised by Node tests.
 *
 * @param {object} data - Parsed payload from parsePayload().
 * @param {number} nowMs - Submission timestamp in milliseconds.
 * @returns {{ subject: string, body: string }}
 */
function formatNotification(data, nowMs) {
  var additional = Array.isArray(data.additionalGuests) ? data.additionalGuests : [];
  var partySize = 1 + additional.length;
  var leadName = String(data.leadName || '').trim();
  var subject = 'RSVP: ' + leadName + ' (party of ' + partySize + ')';

  var lines = [];
  lines.push('New RSVP received.');
  lines.push('');
  lines.push('Lead guest: ' + leadName);
  lines.push('WhatsApp: ' + (data.whatsapp || ''));
  lines.push('Party size: ' + partySize);
  if (additional.length > 0) {
    lines.push('Additional guests:');
    for (var i = 0; i < additional.length; i++) {
      var g = additional[i] || {};
      var name = String(g.name || '').trim() || '(no name)';
      var diet = formatDietary(g.dietary, g.dietaryOther);
      lines.push('  - ' + name + (diet ? ' (' + diet + ')' : ''));
    }
  }
  lines.push('');
  lines.push('Wedding: ' + (data.weddingAttending === 'yes' ? 'Yes' : 'No'));
  lines.push('Dietary (lead): ' + (formatDietary(data.dietary, data.dietaryOther) || 'None specified'));
  lines.push('Requires Indian visa: ' + (data.requiresVisa === 'yes' ? 'Yes' : 'No'));
  lines.push('Arrival: ' + (data.arrival || '(not provided)'));
  lines.push('Departure: ' + (data.departure || '(not provided)'));
  lines.push('Accommodation: ' + (data.accommodation || ''));
  if (data.notes && String(data.notes).trim() !== '') {
    lines.push('');
    lines.push('Notes:');
    lines.push(String(data.notes));
  }
  lines.push('');
  lines.push('Submitted: ' + new Date(nowMs).toISOString());
  return { subject: subject, body: lines.join('\n') };
}

/**
 * Render a dietary selection (array of tags plus free-text "other") as a
 * comma-separated string. Returns '' when nothing is specified.
 *
 * @param {string[]|undefined|null} arr
 * @param {string|undefined|null} other
 * @returns {string}
 */
function formatDietary(arr, other) {
  var parts = [];
  if (Array.isArray(arr)) {
    for (var i = 0; i < arr.length; i++) {
      var v = String(arr[i] || '').trim();
      if (v) parts.push(v);
    }
  }
  if (other && String(other).trim() !== '') {
    parts.push(String(other).trim());
  }
  return parts.join(', ');
}

/**
 * Normalise a WhatsApp value for comparison.
 *
 * Sheets coerces strings that start with `+` and digits into Numbers, so cells
 * written before the appendRow fix store `353863786316` while new cells store
 * the text `+353863786316`. Returning a leading-`+`-stripped, whitespace-free
 * string lets the dedup lookup match across both shapes.
 *
 * @param {string|number|null|undefined} v
 * @returns {string}
 */
function normalizeWhatsapp(v) {
  if (v == null) return '';
  return String(v).replace(/\s+/g, '').replace(/^\+/, '');
}
