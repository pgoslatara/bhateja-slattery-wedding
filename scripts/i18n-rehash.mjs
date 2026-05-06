import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { sha256 } from './i18n-check.mjs';

const CONTENT_ROOT_DEFAULT = new URL('../src/content', import.meta.url).pathname;

function walk(dir, found = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, found);
    else found.push(full);
  }
  return found;
}

function findFile(root, suffix) {
  const safe = (() => { try { statSync(root); return true; } catch { return false; } })();
  if (!safe) return null;
  for (const p of walk(root)) {
    if (p.endsWith(suffix)) return p;
  }
  return null;
}

function setEnHash(text, hash) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) throw new Error('No frontmatter found in Hindi file');
  const fmBody = m[1];
  let nextFm;
  if (/^enHash:.*$/m.test(fmBody)) {
    nextFm = fmBody.replace(/^enHash:.*$/m, `enHash: ${hash}`);
  } else {
    nextFm = `${fmBody}\nenHash: ${hash}`;
  }
  return text.replace(m[0], `---\n${nextFm}\n---`);
}

export function rehash({ contentRoot = CONTENT_ROOT_DEFAULT, name } = {}) {
  if (!name) throw new Error('name is required (e.g. make rehash NAME=01-mehendi)');
  const enFile = findFile(contentRoot, `${name}.en.md`);
  const hiFile = findFile(contentRoot, `${name}.hi.md`);
  if (!enFile) throw new Error(`No matching ${name}.en.md found under ${contentRoot}`);
  if (!hiFile) throw new Error(`No matching ${name}.hi.md found under ${contentRoot}`);
  const enText = readFileSync(enFile, 'utf8');
  const hiText = readFileSync(hiFile, 'utf8');
  const next = setEnHash(hiText, sha256(enText));
  writeFileSync(hiFile, next);
  return { updated: [hiFile], hash: sha256(enText) };
}

function main() {
  const name = process.argv[2];
  if (!name) {
    console.error('Usage: npm run i18n:rehash -- <name>');
    process.exit(2);
  }
  try {
    const { updated, hash } = rehash({ name });
    console.log(`Updated ${updated[0]} with enHash ${hash.slice(0, 12)}…`);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
