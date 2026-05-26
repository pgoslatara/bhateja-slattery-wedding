import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

function loadLib() {
  const code = readFileSync(new URL('../apps-script/lib.gs', import.meta.url), 'utf8');
  const sandbox = { module: { exports: {} } };
  // Wrap the .gs file so `var` declarations attach to module.exports.
  runInNewContext(`${code}\nmodule.exports = { parsePayload, isAllowedOrigin, isThrottled, normalizeWhatsapp };`, sandbox);
  return sandbox.module.exports;
}

test('parsePayload returns ok for valid JSON', () => {
  const { parsePayload } = loadLib();
  const r = parsePayload('{"leadName":"X","whatsapp":"+919999999999","day2Attending":"no","accommodation":"sorted","requiresVisa":"no","additionalGuests":[],"dietary":[],"dietaryOther":"","arrival":"","departure":"","notes":"","honeypot":""}');
  assert.equal(r.ok, true);
  assert.equal(r.value.leadName, 'X');
  assert.equal(r.value.requiresVisa, 'no');
});

test('parsePayload returns invalid_payload when requiresVisa missing', () => {
  const { parsePayload } = loadLib();
  const r = parsePayload('{"leadName":"X","whatsapp":"+919999999999","day2Attending":"no","accommodation":"sorted","additionalGuests":[],"dietary":[],"dietaryOther":"","arrival":"","departure":"","notes":"","honeypot":""}');
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
  const r = parsePayload('{"leadName":"X","whatsapp":"+919999999999","day2Attending":"no","accommodation":"sorted","honeypot":"spam","additionalGuests":[],"dietary":[],"dietaryOther":"","arrival":"","departure":"","notes":""}');
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
