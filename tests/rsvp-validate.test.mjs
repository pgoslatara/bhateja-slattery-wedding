import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateRsvp } from '../src/components/rsvp/validate.ts';

const baseValid = {
  leadName: 'Sandeep',
  additionalGuests: [],
  day1Attending: 'yes',
  day2Attending: 'yes',
  dietary: [],
  dietaryOther: '',
  arrival: '',
  departure: '',
  accommodation: 'sorted',
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
