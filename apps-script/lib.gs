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
  // WhatsApp number must start with + and contain 6–15 digits.
  if (typeof data.whatsapp !== 'string' || !/^\+\d{6,15}$/.test(data.whatsapp)) {
    return { ok: false, code: 'invalid_payload' };
  }
  if (data.day1Attending !== 'yes' && data.day1Attending !== 'no') {
    return { ok: false, code: 'invalid_payload' };
  }
  if (data.day2Attending !== 'yes' && data.day2Attending !== 'no') {
    return { ok: false, code: 'invalid_payload' };
  }
  if (['sorted', 'recommended', 'help'].indexOf(data.accommodation) === -1) {
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
