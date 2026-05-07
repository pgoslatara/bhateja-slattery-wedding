import { validateRsvp, type RsvpInput } from './validate';
import { strings, type Locale } from '../../i18n/strings';

type FormState = {
  endpoint: string;
  lang: Locale;
  form: HTMLFormElement;
  successPanel: HTMLElement;
};

function readForm(form: HTMLFormElement): RsvpInput {
  const fd = new FormData(form);
  const guests = Array.from(form.querySelectorAll<HTMLInputElement>('input[name="additionalGuests[]"]'))
    .map(el => el.value.trim());
  return {
    leadName: String(fd.get('leadName') ?? ''),
    additionalGuests: guests,
    day1Attending: (fd.get('day1Attending') as RsvpInput['day1Attending']) ?? '',
    day2Attending: (fd.get('day2Attending') as RsvpInput['day2Attending']) ?? '',
    dietary: fd.getAll('dietary').map(v => String(v)),
    dietaryOther: String(fd.get('dietaryOther') ?? ''),
    arrival: String(fd.get('arrival') ?? ''),
    departure: String(fd.get('departure') ?? ''),
    accommodation: (fd.get('accommodation') as RsvpInput['accommodation']) ?? '',
    whatsapp: String(fd.get('whatsapp') ?? ''),
    notes: String(fd.get('notes') ?? ''),
    honeypot: String(fd.get('favourite_pet') ?? '')
  };
}

function showError(form: HTMLFormElement, code: string, lang: Locale, field?: string) {
  const messages = strings[lang].rsvp.errors;
  const text = (messages as Record<string, string>)[code] ?? messages.internal;
  if (field) {
    const target = form.querySelector<HTMLElement>(`[data-error="${field}"]`);
    if (target) {
      target.textContent = text;
      target.hidden = false;
      return;
    }
  }
  const formError = form.querySelector<HTMLElement>('[data-form-error]');
  if (formError) {
    formError.textContent = text;
    formError.hidden = false;
  }
}

function clearErrors(form: HTMLFormElement) {
  form.querySelectorAll<HTMLElement>('[data-error]').forEach(el => { el.textContent = ''; el.hidden = true; });
  const formError = form.querySelector<HTMLElement>('[data-form-error]');
  if (formError) { formError.textContent = ''; formError.hidden = true; }
}

async function submit(state: FormState) {
  const { form, endpoint, lang, successPanel } = state;
  clearErrors(form);
  const submitBtn = form.querySelector<HTMLButtonElement>('[data-submit]');
  if (!submitBtn) return;

  const validation = validateRsvp(readForm(form));
  if (!validation.ok) {
    for (const [field, code] of Object.entries(validation.errors)) {
      showError(form, code as string, lang, field);
    }
    return;
  }

  submitBtn.disabled = true;
  const submittingLabel = strings[lang].rsvp.submitting;
  const submitLabel = strings[lang].rsvp.submit;
  submitBtn.textContent = submittingLabel;
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      // Origin is sent in the body because Apps Script web apps don't expose
      // request headers — server reads it from `data.origin` for the allow-list check.
      body: JSON.stringify({ ...validation.value, origin: window.location.origin })
    });
    const data = await res.json().catch(() => ({ status: 'error', code: 'internal' }));
    if (data.status === 'ok') {
      const body = strings[lang].rsvp.successBody.replace('{name}', validation.value.leadName);
      const target = successPanel.querySelector<HTMLElement>('[data-success-body]');
      if (target) target.textContent = body;
      form.hidden = true;
      successPanel.hidden = false;
      successPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      showError(form, data.code ?? 'internal', lang);
    }
  } catch {
    showError(form, 'network', lang);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = submitLabel;
  }
}

function bindAddGuest(form: HTMLFormElement) {
  const addBtn = form.querySelector<HTMLButtonElement>('[data-add-guest]');
  const list = form.querySelector<HTMLElement>('[data-additional-guests]');
  if (!addBtn || !list) return;
  addBtn.addEventListener('click', () => {
    const input = document.createElement('input');
    input.name = 'additionalGuests[]';
    input.type = 'text';
    input.maxLength = 100;
    list.appendChild(input);
    input.focus();
  });
}

document.querySelectorAll<HTMLFormElement>('form[data-rsvp]').forEach(form => {
  const endpoint = form.dataset.endpoint ?? '';
  const lang = (form.dataset.lang ?? 'en') as Locale;
  const successPanel = form.parentElement?.querySelector<HTMLElement>('[data-success]');
  if (!successPanel) return;
  const state: FormState = { endpoint, lang, form, successPanel };
  form.addEventListener('submit', e => { e.preventDefault(); submit(state); });
  bindAddGuest(form);
});
