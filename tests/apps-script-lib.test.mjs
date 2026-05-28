import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

function loadLib() {
  const code = readFileSync(new URL('../apps-script/lib.gs', import.meta.url), 'utf8');
  const sandbox = { module: { exports: {} } };
  // Wrap the .gs file so `var` declarations attach to module.exports.
  runInNewContext(`${code}\nmodule.exports = { parsePayload, isAllowedOrigin, isThrottled, normalizeWhatsapp, formatNotification, formatDietary };`, sandbox);
  return sandbox.module.exports;
}

test('parsePayload returns ok for valid JSON', () => {
  const { parsePayload } = loadLib();
  const r = parsePayload('{"leadName":"X","whatsapp":"+919999999999","weddingAttending":"no","accommodation":"sorted","requiresVisa":"no","additionalGuests":[],"dietary":[],"dietaryOther":"","arrival":"","departure":"","notes":"","honeypot":""}');
  assert.equal(r.ok, true);
  assert.equal(r.value.leadName, 'X');
  assert.equal(r.value.requiresVisa, 'no');
});

test('parsePayload returns invalid_payload when requiresVisa missing', () => {
  const { parsePayload } = loadLib();
  const r = parsePayload('{"leadName":"X","whatsapp":"+919999999999","weddingAttending":"no","accommodation":"sorted","additionalGuests":[],"dietary":[],"dietaryOther":"","arrival":"","departure":"","notes":"","honeypot":""}');
  assert.equal(r.ok, false);
  assert.equal(r.code, 'invalid_payload');
});

test('parsePayload returns invalid_payload for missing required fields', () => {
  const { parsePayload } = loadLib();
  const r = parsePayload('{"leadName":""}');
  assert.equal(r.ok, false);
  assert.equal(r.code, 'invalid_payload');
});

test('parsePayload returns invalid_payload for filled honeypot', () => {
  const { parsePayload } = loadLib();
  const r = parsePayload('{"leadName":"X","whatsapp":"+919999999999","weddingAttending":"no","accommodation":"sorted","honeypot":"spam","additionalGuests":[],"dietary":[],"dietaryOther":"","arrival":"","departure":"","notes":""}');
  assert.equal(r.ok, false);
  assert.equal(r.code, 'invalid_payload');
});

test('isAllowedOrigin matches exact origin', () => {
  const { isAllowedOrigin } = loadLib();
  assert.equal(isAllowedOrigin('https://x.github.io', ['https://x.github.io']), true);
  assert.equal(isAllowedOrigin('https://attacker.example', ['https://x.github.io']), false);
  assert.equal(isAllowedOrigin('', ['https://x.github.io']), false);
});

test('isThrottled blocks rapid duplicate', () => {
  const { isThrottled } = loadLib();
  const now = 1_700_000_000_000;
  const last = now - 5_000; // 5 seconds ago
  assert.equal(isThrottled(now, last, 10_000), true);
});

test('isThrottled allows after window', () => {
  const { isThrottled } = loadLib();
  const now = 1_700_000_000_000;
  const last = now - 11_000;
  assert.equal(isThrottled(now, last, 10_000), false);
});

test('isThrottled allows when no last submission', () => {
  const { isThrottled } = loadLib();
  assert.equal(isThrottled(1_700_000_000_000, null, 10_000), false);
});

test('normalizeWhatsapp matches text "+digits" against legacy Number rows', () => {
  const { normalizeWhatsapp } = loadLib();
  // Old rows: Sheets coerced "+353863786316" to the Number 353863786316.
  // New rows: stored as text "+353863786316" thanks to the leading-apostrophe write.
  // Payload value from the client: always "+353863786316".
  assert.equal(normalizeWhatsapp(353863786316), '353863786316');
  assert.equal(normalizeWhatsapp('+353863786316'), '353863786316');
  assert.equal(normalizeWhatsapp(353863786316), normalizeWhatsapp('+353863786316'));
});

test('normalizeWhatsapp tolerates whitespace and nullish inputs', () => {
  const { normalizeWhatsapp } = loadLib();
  assert.equal(normalizeWhatsapp(' +91 9818 009962 '), '919818009962');
  assert.equal(normalizeWhatsapp(null), '');
  assert.equal(normalizeWhatsapp(undefined), '');
  assert.equal(normalizeWhatsapp(''), '');
});

test('formatDietary joins tags and free-text "other"', () => {
  const { formatDietary } = loadLib();
  assert.equal(formatDietary(['vegetarian', 'glutenFree'], ''), 'vegetarian, glutenFree');
  assert.equal(formatDietary([], 'no peanuts'), 'no peanuts');
  assert.equal(formatDietary(['vegetarian'], 'no peanuts'), 'vegetarian, no peanuts');
  assert.equal(formatDietary(null, undefined), '');
  assert.equal(formatDietary([''], '   '), '');
});

test('formatNotification builds subject and body for a solo guest', () => {
  const { formatNotification } = loadLib();
  const ts = Date.UTC(2026, 4, 27, 9, 30, 0); // 2026-05-27T09:30:00Z
  const msg = formatNotification(
    {
      leadName: 'Padraic Slattery',
      whatsapp: '+353863786316',
      weddingAttending: 'yes',
      accommodation: 'sorted',
      requiresVisa: 'no',
      additionalGuests: [],
      dietary: ['vegetarian'],
      dietaryOther: '',
      arrival: '2026-05-06 evening',
      departure: '2026-05-09 morning',
      notes: '',
    },
    ts,
  );
  assert.equal(msg.subject, 'RSVP: Padraic Slattery (party of 1)');
  assert.match(msg.body, /Lead guest: Padraic Slattery/);
  assert.match(msg.body, /WhatsApp: \+353863786316/);
  assert.match(msg.body, /Party size: 1/);
  assert.match(msg.body, /Wedding: Yes/);
  assert.match(msg.body, /Dietary \(lead\): vegetarian/);
  assert.match(msg.body, /Requires Indian visa: No/);
  assert.match(msg.body, /Accommodation: sorted/);
  assert.match(msg.body, /Submitted: 2026-05-27T09:30:00\.000Z/);
  // No "Additional guests:" header when none provided.
  assert.equal(msg.body.includes('Additional guests:'), false);
  // No notes section when notes is empty.
  assert.equal(msg.body.includes('Notes:'), false);
});

test('formatNotification lists additional guests with per-person dietary', () => {
  const { formatNotification } = loadLib();
  const msg = formatNotification(
    {
      leadName: 'Apeksha Bhateja',
      whatsapp: '+919818009962',
      weddingAttending: 'no',
      accommodation: 'help',
      requiresVisa: 'yes',
      additionalGuests: [
        { name: 'Guest One', dietary: ['vegetarian'], dietaryOther: '' },
        { name: 'Guest Two', dietary: [], dietaryOther: 'no shellfish' },
        { name: '', dietary: [], dietaryOther: '' },
      ],
      dietary: [],
      dietaryOther: '',
      arrival: '',
      departure: '',
      notes: 'Need an early check-in if possible.',
    },
    0,
  );
  assert.equal(msg.subject, 'RSVP: Apeksha Bhateja (party of 4)');
  assert.match(msg.body, /Additional guests:\n {2}- Guest One \(vegetarian\)\n {2}- Guest Two \(no shellfish\)\n {2}- \(no name\)/);
  assert.match(msg.body, /Wedding: No/);
  assert.match(msg.body, /Dietary \(lead\): None specified/);
  assert.match(msg.body, /Requires Indian visa: Yes/);
  assert.match(msg.body, /Arrival: \(not provided\)/);
  assert.match(msg.body, /Departure: \(not provided\)/);
  assert.match(msg.body, /Notes:\nNeed an early check-in if possible\./);
});
