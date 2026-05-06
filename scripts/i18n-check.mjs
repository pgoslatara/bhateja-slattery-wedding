import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';

const CONTENT_ROOT_DEFAULT = new URL('../src/content', import.meta.url).pathname;

function walk(dir, found = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, found);
    else found.push(full);
  }
  return found;
}

function localizedFiles(contentRoot) {
  if (!safeExists(contentRoot)) return [];
  return walk(contentRoot).filter(p => /\.(en|hi)\.md$/.test(p));
}

function safeExists(p) {
  try { statSync(p); return true; } catch { return false; }
}

function pairPath(file) {
  return file.endsWith('.en.md')
    ? file.replace(/\.en\.md$/, '.hi.md')
    : file.replace(/\.hi\.md$/, '.en.md');
}

export function runCheck({ contentRoot = CONTENT_ROOT_DEFAULT } = {}) {
  const errors = [];
  for (const file of localizedFiles(contentRoot)) {
    const pair = pairPath(file);
    if (!safeExists(pair)) {
      errors.push({ code: 'missing_pair', path: pair, source: file });
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
    if (err.code === 'missing_pair') {
      console.error(`Missing translation: ${err.path}\n  Required because ${err.source} exists.`);
    } else {
      console.error(JSON.stringify(err));
    }
  }
  process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
