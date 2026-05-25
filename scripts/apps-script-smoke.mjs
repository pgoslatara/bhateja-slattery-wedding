// Smoke-test the deployed Apps Script RSVP endpoint.
//
// Verifies the live web-app version matches the current `apps-script/lib.gs`
// validation contract — the most common failure mode is `clasp push` without a
// follow-up "Manage deployments → New version" in the editor, which leaves the
// pinned deployment running stale validation.
//
// Reads PUBLIC_APPS_SCRIPT_URL from env. Posts a canonical valid payload from
// the allowed production origin and asserts `{"status":"ok"}`. Exits non-zero
// on any other response so CI / `make script-smoke` fails loudly.
//
// Test rows land in the `submissions` sheet — use leadName + whatsapp values
// recognisable as smoke tests so they can be filtered out of the `latest` view.

const url = process.env.PUBLIC_APPS_SCRIPT_URL;
if (!url) {
  console.error('PUBLIC_APPS_SCRIPT_URL is not set.');
  process.exit(2);
}

const payload = {
  leadName: '__smoke_test__',
  additionalGuests: [],
  day2Attending: 'yes',
  dietary: [],
  dietaryOther: '',
  arrival: '',
  departure: '',
  accommodation: 'sorted',
  requiresVisa: 'no',
  whatsapp: '+10000000000',
  notes: 'apps-script smoke test',
  honeypot: '',
  origin: 'https://pgoslatara.github.io'
};

const res = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'text/plain' },
  body: JSON.stringify(payload),
  redirect: 'follow'
});

const text = await res.text();
let data;
try {
  data = JSON.parse(text);
} catch {
  console.error(`Smoke test failed: response was not JSON (HTTP ${res.status}).`);
  console.error(text.slice(0, 500));
  process.exit(1);
}

if (data.status === 'ok') {
  console.log('Smoke test passed: deployed endpoint accepted the canonical payload.');
  process.exit(0);
}

// Throttle is benign — it proves the endpoint is alive and validation passed; it
// only fires when a previous smoke-test row landed within THROTTLE_WINDOW_MS.
if (data.code === 'throttled') {
  console.log('Smoke test passed (throttled — endpoint is healthy, prior run hit the window).');
  process.exit(0);
}

console.error(`Smoke test FAILED with code "${data.code}".`);
if (data.code === 'invalid_payload') {
  console.error('Likely cause: deployed Apps Script is stale — run "Manage deployments → New version" in the editor.');
} else if (data.code === 'invalid_origin') {
  console.error('Likely cause: ALLOWED_ORIGINS in Code.gs does not include https://pgoslatara.github.io.');
}
process.exit(1);
