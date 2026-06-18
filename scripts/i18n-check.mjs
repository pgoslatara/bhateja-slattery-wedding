import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import yaml from 'js-yaml';

const CONTENT_ROOT_DEFAULT = new URL('../src/content', import.meta.url).pathname;

// startTime / endTime are intentionally NOT invariant: they may be free-form
// localised words ("Evening" / "शाम") during the placeholder phase. Once real
// HH:MM times land, EN and HI naturally match and drift is caught visually.
const INVARIANT_FIELDS = {
  schedule: ['day', 'order', 'location'],
  faq: ['order'],
  pages: []
};

function walk(dir, found = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, found);
    else found.push(full);
  }
  return found;
}

function safeExists(p) {
  try { statSync(p); return true; } catch { return false; }
}

function localizedFiles(contentRoot) {
  if (!safeExists(contentRoot)) return [];
  return walk(contentRoot).filter(p => /\.(en|hi)\.md$/.test(p));
}

function pairPath(file) {
  return file.endsWith('.en.md')
    ? file.replace(/\.en\.md$/, '.hi.md')
    : file.replace(/\.hi\.md$/, '.en.md');
}

function collectionFor(file) {
  const parts = file.split('/');
  // Find the parent directory under content root: schedule/, faq/, pages/, etc.
  for (let i = parts.length - 2; i >= 0; i--) {
    if (parts[i] === 'schedule' || parts[i] === 'faq' || parts[i] === 'pages') return parts[i];
  }
  return null;
}

// Tiny YAML frontmatter parser — handles flat scalar fields (string, number, quoted string).
// Sufficient because content schemas only use flat frontmatter at the top level.
function parseFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return {};
  const out = {};
  for (const rawLine of m[1].split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    if (!line || line.startsWith('#')) continue;
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    let value = line.slice(colonIdx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    } else if (/^-?\d+$/.test(value) && value.length <= 15) {
      // Only coerce short digit strings to Number — long ones (e.g. SHA256 hashes that are
      // all-digit substrings) would lose precision as JS floats.
      value = Number(value);
    }
    out[key] = value;
  }
  return out;
}

export function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
}

const INVARIANT_VENDOR_FIELDS = ['slug', 'name', 'website', 'instagram'];

// Parse the full YAML frontmatter (structured). Returns {} when no frontmatter
// or when YAML parsing fails. Used only for collections that may contain
// non-scalar frontmatter (currently: the `pages` collection's `vendors` array).
function parseFrontmatterStructured(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return {};
  try {
    const parsed = yaml.load(m[1]);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function checkVendorsParity(enFm, hiFm, hiFile, errors) {
  const enList = Array.isArray(enFm.vendors) ? enFm.vendors : null;
  const hiList = Array.isArray(hiFm.vendors) ? hiFm.vendors : null;
  if (!enList && !hiList) return;
  if (!enList || !hiList || enList.length !== hiList.length) {
    errors.push({
      code: 'invariant_mismatch',
      path: hiFile,
      field: 'vendors.length',
      enValue: enList ? enList.length : null,
      hiValue: hiList ? hiList.length : null
    });
    return;
  }
  for (let i = 0; i < enList.length; i++) {
    for (const field of INVARIANT_VENDOR_FIELDS) {
      const a = enList[i]?.[field];
      const b = hiList[i]?.[field];
      if (a === b) continue;
      // Treat undefined === undefined as equal; treat undefined vs defined as a mismatch.
      if (a === undefined && b === undefined) continue;
      errors.push({
        code: 'invariant_mismatch',
        path: hiFile,
        field: `vendors[${i}].${field}`,
        enValue: a,
        hiValue: b
      });
    }
  }
}

export function runCheck({ contentRoot = CONTENT_ROOT_DEFAULT } = {}) {
  const errors = [];
  for (const file of localizedFiles(contentRoot)) {
    const pair = pairPath(file);
    if (!safeExists(pair)) {
      errors.push({ code: 'missing_pair', path: pair, source: file });
      continue;
    }
    if (!file.endsWith('.hi.md')) continue; // Run remaining checks once per pair, anchored on the Hindi file.

    const enFile = pair;
    const hiFile = file;
    const enText = readFileSync(enFile, 'utf8');
    const hiText = readFileSync(hiFile, 'utf8');
    const enFm = parseFrontmatter(enText);
    const hiFm = parseFrontmatter(hiText);

    // Source-hash freshness
    if (!hiFm.enHash) {
      errors.push({ code: 'missing_hash', path: hiFile });
    } else {
      const expected = sha256(enText);
      if (hiFm.enHash !== expected) {
        errors.push({ code: 'stale_hash', path: hiFile, expected, actual: hiFm.enHash, enFile });
      }
    }

    // Invariant frontmatter
    const collection = collectionFor(hiFile);
    const invariants = INVARIANT_FIELDS[collection] ?? [];
    for (const field of invariants) {
      if (Object.prototype.hasOwnProperty.call(enFm, field) || Object.prototype.hasOwnProperty.call(hiFm, field)) {
        if (enFm[field] !== hiFm[field]) {
          errors.push({ code: 'invariant_mismatch', path: hiFile, field, enValue: enFm[field], hiValue: hiFm[field] });
        }
      }
    }

    // Vendor-array parity (pages collection only)
    if (collection === 'pages') {
      const enFmFull = parseFrontmatterStructured(enText);
      const hiFmFull = parseFrontmatterStructured(hiText);
      checkVendorsParity(enFmFull, hiFmFull, hiFile, errors);
    }
  }
  return errors;
}

function main() {
  const errors = runCheck();
  if (errors.length === 0) {
    console.log('i18n-check: OK');
    process.exit(0);
  }
  for (const err of errors) {
    switch (err.code) {
      case 'missing_pair':
        console.error(`Missing translation: ${err.path}\n  Required because ${err.source} exists.`);
        break;
      case 'missing_hash':
        console.error(`${err.path} is missing 'enHash' frontmatter.\n  Run: npm run i18n:rehash -- ${baseName(err.path)}`);
        break;
      case 'stale_hash':
        console.error(`${err.enFile} has changed since ${err.path} was last synced.\n  Review the English version, update the Hindi translation, then run:\n    npm run i18n:rehash -- ${baseName(err.path)}`);
        break;
      case 'invariant_mismatch':
        console.error(`${err.path} field '${err.field}' (${JSON.stringify(err.hiValue)}) must match the English file (${JSON.stringify(err.enValue)}).`);
        break;
      default:
        console.error(JSON.stringify(err));
    }
  }
  process.exit(1);
}

function baseName(p) {
  const segs = p.split('/');
  return segs[segs.length - 1].replace(/\.(en|hi)\.md$/, '');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
