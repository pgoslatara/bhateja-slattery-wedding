import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateRsvp } from '../src/components/rsvp/validate.ts';

const baseValid = {
  leadName: 'Sandeep',
  additionalGuests: [],
  day2Attending: 'yes',
  dietary: [],
  dietaryOther: '',
  arrival: '',
  departure: '',
  accommodation: 'sorted',
  requiresVisa: 'no',
  whatsapp: '+919999999999',
  notes: '',
  honeypot: ''
};

test('accepts a valid payload', () => {
  const r = validateRsvp(baseValid);
  assert.equal(r.ok, true);
});

test('rejects missing lead name', () => {
  const r = validateRsvp({ ...baseValid, leadName: '   ' });
  assert.equal(r.ok, false);
  assert.deepEqual(r.errors.leadName, 'leadNameRequired');
});

test('rejects missing whatsapp', () => {
  const r = validateRsvp({ ...baseValid, whatsapp: '' });
  assert.equal(r.ok, false);
  assert.equal(r.errors.whatsapp, 'whatsappRequired');
});

test('rejects whatsapp without country code', () => {
  const r = validateRsvp({ ...baseValid, whatsapp: '9999999999' });
  assert.equal(r.ok, false);
  assert.equal(r.errors.whatsapp, 'whatsappFormat');
});

test('honeypot filled means invalid (silently)', () => {
  const r = validateRsvp({ ...baseValid, honeypot: 'spam' });
  assert.equal(r.ok, false);
  assert.equal(r.errors.honeypot, 'invalid_payload');
});

test('strips empty additional guests', () => {
  const r = validateRsvp({ ...baseValid, additionalGuests: ['', '  ', 'Real Person'] });
  assert.equal(r.ok, true);
  assert.deepEqual(r.value.additionalGuests, ['Real Person']);
});

test('passes requiresVisa through unchanged', () => {
  const r = validateRsvp({ ...baseValid, requiresVisa: 'yes' });
  assert.equal(r.ok, true);
  assert.equal(r.value.requiresVisa, 'yes');
});

test('rejects missing day2Attending selection', () => {
  const r = validateRsvp({ ...baseValid, day2Attending: '' });
  assert.equal(r.ok, false);
  assert.equal(r.errors.day2Attending, 'day2AttendingRequired');
});

test('rejects missing accommodation selection', () => {
  const r = validateRsvp({ ...baseValid, accommodation: '' });
  assert.equal(r.ok, false);
  assert.equal(r.errors.accommodation, 'accommodationRequired');
});

test('rejects missing requiresVisa selection', () => {
  const r = validateRsvp({ ...baseValid, requiresVisa: '' });
  assert.equal(r.ok, false);
  assert.equal(r.errors.requiresVisa, 'requiresVisaRequired');
});
