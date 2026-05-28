import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateRsvp } from '../src/components/rsvp/validate.ts';

const baseValid = {
  leadName: 'Sandeep',
  additionalGuests: [],
  weddingAttending: 'yes',
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
  const r = validateRsvp({
    ...baseValid,
    additionalGuests: [
      { name: '', dietary: [], dietaryOther: '' },
      { name: '   ', dietary: ['vegetarian'], dietaryOther: '' },
      { name: 'Real Person', dietary: [], dietaryOther: '' }
    ]
  });
  assert.equal(r.ok, true);
  assert.equal(r.value.additionalGuests.length, 1);
  assert.equal(r.value.additionalGuests[0].name, 'Real Person');
});

test('preserves per-guest dietary preferences', () => {
  const r = validateRsvp({
    ...baseValid,
    additionalGuests: [
      { name: 'Priya', dietary: ['vegetarian', 'jain'], dietaryOther: 'no garlic' },
      { name: 'Rohit', dietary: ['glutenFree'], dietaryOther: '' }
    ]
  });
  assert.equal(r.ok, true);
  assert.deepEqual(r.value.additionalGuests, [
    { name: 'Priya', dietary: ['vegetarian', 'jain'], dietaryOther: 'no garlic' },
    { name: 'Rohit', dietary: ['glutenFree'], dietaryOther: '' }
  ]);
});

test('trims per-guest dietary values', () => {
  const r = validateRsvp({
    ...baseValid,
    additionalGuests: [
      { name: '  Asha  ', dietary: [' vegan ', ''], dietaryOther: '  shellfish allergy  ' }
    ]
  });
  assert.equal(r.ok, true);
  assert.deepEqual(r.value.additionalGuests[0], {
    name: 'Asha',
    dietary: ['vegan'],
    dietaryOther: 'shellfish allergy'
  });
});

test('passes requiresVisa through unchanged', () => {
  const r = validateRsvp({ ...baseValid, requiresVisa: 'yes' });
  assert.equal(r.ok, true);
  assert.equal(r.value.requiresVisa, 'yes');
});

test('rejects missing weddingAttending selection', () => {
  const r = validateRsvp({ ...baseValid, weddingAttending: '' });
  assert.equal(r.ok, false);
  assert.equal(r.errors.weddingAttending, 'weddingAttendingRequired');
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
