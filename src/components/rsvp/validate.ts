export type AdditionalGuest = {
  name: string;
  dietary: string[];
  dietaryOther: string;
};

export type RsvpInput = {
  leadName: string;
  additionalGuests: AdditionalGuest[];
  day2Attending: 'yes' | 'no' | '';
  dietary: string[];
  dietaryOther: string;
  arrival: string;
  departure: string;
  accommodation: 'sorted' | 'recommended' | 'help' | '';
  requiresVisa: 'yes' | 'no' | '';
  whatsapp: string;
  notes: string;
  honeypot: string;
};

export type ValidationErrorCode =
  | 'leadNameRequired'
  | 'whatsappRequired'
  | 'whatsappFormat'
  | 'day2AttendingRequired'
  | 'accommodationRequired'
  | 'requiresVisaRequired'
  | 'invalid_payload';

export type Validated =
  | { ok: true; value: RsvpInput }
  | { ok: false; errors: Partial<Record<keyof RsvpInput, ValidationErrorCode>> };

const MAX_LEN = 500;

function trim(s: string) { return (s ?? '').toString().trim(); }
function cap(s: string) { return s.length > MAX_LEN ? s.slice(0, MAX_LEN) : s; }

export function validateRsvp(raw: RsvpInput): Validated {
  const errors: Partial<Record<keyof RsvpInput, ValidationErrorCode>> = {};

  if (trim(raw.honeypot)) errors.honeypot = 'invalid_payload';

  const leadName = trim(raw.leadName);
  if (!leadName) errors.leadName = 'leadNameRequired';

  const whatsapp = trim(raw.whatsapp).replace(/\s+/g, '');
  if (!whatsapp) errors.whatsapp = 'whatsappRequired';
  else if (!/^\+\d{10,15}$/.test(whatsapp)) errors.whatsapp = 'whatsappFormat';

  if (raw.day2Attending !== 'yes' && raw.day2Attending !== 'no') {
    errors.day2Attending = 'day2AttendingRequired';
  }
  if (raw.accommodation !== 'sorted' && raw.accommodation !== 'recommended' && raw.accommodation !== 'help') {
    errors.accommodation = 'accommodationRequired';
  }
  if (raw.requiresVisa !== 'yes' && raw.requiresVisa !== 'no') {
    errors.requiresVisa = 'requiresVisaRequired';
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const additionalGuests: AdditionalGuest[] = (raw.additionalGuests ?? [])
    .map(g => ({
      name: cap(trim(g?.name ?? '')),
      dietary: (g?.dietary ?? []).map(trim).filter(Boolean),
      dietaryOther: cap(trim(g?.dietaryOther ?? ''))
    }))
    .filter(g => g.name !== '');

  return {
    ok: true,
    value: {
      leadName: cap(leadName),
      additionalGuests,
      day2Attending: raw.day2Attending,
      dietary: (raw.dietary ?? []).map(trim).filter(Boolean),
      dietaryOther: cap(trim(raw.dietaryOther)),
      arrival: cap(trim(raw.arrival)),
      departure: cap(trim(raw.departure)),
      accommodation: raw.accommodation,
      requiresVisa: raw.requiresVisa,
      whatsapp,
      notes: cap(trim(raw.notes)),
      honeypot: ''
    }
  };
}
