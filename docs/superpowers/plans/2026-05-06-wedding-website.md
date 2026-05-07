# Wedding Website Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the bilingual wedding website specified in `docs/superpowers/specs/2026-05-06-wedding-website-design.md` — Astro static site, Google Apps Script + Sheets RSVP backend, GitHub Pages deploy via Actions, English/Hindi parity enforced in CI.

**Architecture:** Astro 5 static-site generator with built-in i18n routing (English at root, Hindi at `/hi/`). Content lives as Markdown/YAML in `src/content/`, validated by Zod schemas via Astro content collections. Each page is a shared component (`src/components/pages/<X>Page.astro`) called from two thin route wrappers (`src/pages/<x>.astro` and `src/pages/hi/<x>.astro`) — single source of truth, content varies by `lang` prop. Translation parity (file pairing, invariant frontmatter, source-hash freshness) enforced by Node scripts run in CI and via husky pre-commit. RSVP form POSTs JSON to a Google Apps Script web app that appends rows to a Google Sheet. CI builds and deploys to GitHub Pages on push to `main`.

**Tech Stack:** Astro 5, TypeScript (strict), Zod (via Astro), Node 20 LTS, Lucide icons, husky, `@google/clasp`, GitHub Actions, GitHub Pages, Google Apps Script, Google Sheets, Google Photos. No frameworks beyond Astro. Tests use Node's built-in `node:test` runner — no Vitest/Jest dependency.

**Conventions used throughout this plan:**
- Couple's name order is **always "Apeksha and Padraic"** (or "Apeksha & Padraic"). The Zod `coupleNames` object uses `partner1: "Apeksha"`, `partner2: "Padraic"`.
- Repository name is assumed `website-wedding`. The `base` URL is `/website-wedding`. If you choose a different repo name, change it in `astro.config.mjs` and the workflow files; nothing else needs to change.
- The deployed origin used in the Apps Script allow-list is parameterised via a `SITE_URL` env var at build time — the placeholder used through development is `https://example.github.io` and gets overridden in CI.
- Commits use Conventional Commits style (`feat:`, `chore:`, `test:`, `docs:`, `ci:`).

---

## Phase A — Foundation

### Task 1: Bootstrap Astro project

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `astro.config.mjs`
- Create: `.node-version`
- Modify: `.gitignore` (existing, adds Node and Astro entries)
- Create: `src/pages/index.astro` (placeholder)
- Create: `README.md` (skeleton; expanded in Task 28)

- [ ] **Step 1: Create `.node-version`**

```text
22.11.0
```

Node 22 LTS is required because the test runner uses `--experimental-strip-types` (added in Node 22.6) to import TypeScript test fixtures.

- [ ] **Step 2: Append Node and Astro entries to `.gitignore`**

The file currently contains only `.superpowers/`. Append the following lines:

```text
node_modules/
dist/
.astro/
.env
.env.local
.DS_Store
```

- [ ] **Step 3: Create `package.json`**

```json
{
  "name": "website-wedding",
  "version": "0.1.0",
  "type": "module",
  "private": true,
  "engines": {
    "node": ">=22.11"
  },
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "astro": "astro",
    "check": "astro check",
    "test": "node --test 'tests/**/*.test.mjs'",
    "i18n:check": "node scripts/i18n-check.mjs",
    "i18n:rehash": "node scripts/i18n-rehash.mjs",
    "script:push": "clasp push",
    "script:open": "clasp open",
    "prepare": "husky || true"
  },
  "dependencies": {
    "astro": "^5.0.0",
    "lucide-static": "^0.460.0"
  },
  "devDependencies": {
    "@astrojs/check": "^0.9.4",
    "@google/clasp": "^2.4.2",
    "husky": "^9.1.6",
    "typescript": "^5.5.0"
  }
}
```

- [ ] **Step 4: Create `tsconfig.json`**

```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist", "apps-script", "tests/**/fixtures/**"]
}
```

- [ ] **Step 5: Create `astro.config.mjs`**

```js
import { defineConfig } from 'astro/config';

const SITE_URL = process.env.SITE_URL ?? 'https://example.github.io';

export default defineConfig({
  site: SITE_URL,
  base: '/website-wedding',
  trailingSlash: 'always',
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'hi'],
    routing: { prefixDefaultLocale: false }
  },
  build: {
    format: 'directory'
  }
});
```

- [ ] **Step 6: Create `src/pages/index.astro`** (placeholder so the build is valid)

```astro
---
const lang = 'en';
---
<!doctype html>
<html lang={lang}>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width" />
    <meta name="robots" content="noindex, nofollow" />
    <title>Apeksha & Padraic</title>
  </head>
  <body>
    <h1>Apeksha & Padraic</h1>
    <p>Site under construction.</p>
  </body>
</html>
```

- [ ] **Step 7: Create skeleton `README.md`**

```markdown
# website-wedding

Wedding website for Apeksha and Padraic — 27 February 2027, Gurgaon.

See `docs/superpowers/specs/2026-05-06-wedding-website-design.md` for the full spec.

## Quickstart

```bash
make setup     # install deps + husky hook
make dev       # run dev server at http://localhost:4321
```
```

- [ ] **Step 8: Install dependencies and verify build**

Run:

```bash
npm install
npm run build
```

Expected: `npm install` completes; `npm run build` succeeds and writes `./dist/index.html`. (Astro's `base` config controls URL prefix at runtime — links resolve under `/website-wedding/` — but does not nest the build output. GitHub Pages serves `./dist` under the repo path automatically.)

- [ ] **Step 9: Commit**

```bash
git add .gitignore .node-version package.json package-lock.json tsconfig.json astro.config.mjs src/pages/index.astro README.md
git commit -m "feat: bootstrap Astro project with i18n config"
```

---

### Task 2: Add `noindex` infrastructure (robots.txt + meta tag prep)

**Files:**
- Create: `public/robots.txt`

- [ ] **Step 1: Create `public/robots.txt`**

```text
User-agent: *
Disallow: /
```

- [ ] **Step 2: Verify build still succeeds**

Run: `npm run build`
Expected: PASS. After build, `dist/website-wedding/robots.txt` exists.

The `<meta name="robots">` tag is already in `src/pages/index.astro`; it will move into the shared `Layout` component in Task 11.

- [ ] **Step 3: Commit**

```bash
git add public/robots.txt
git commit -m "feat: add robots.txt to disallow indexing"
```

---

## Phase B — Content model

### Task 3: Define Zod content collection schemas

**Files:**
- Create: `src/content/config.ts`
- Create: `src/content/site.yaml`

The `enHash` field used by the translation parity checks (Task 6/7) is part of the schema for Hindi entries only — but Astro content collections share one schema across locales. We model it as **optional** at the schema level (so English entries don't need it) and have the i18n-check script enforce its presence on `*.hi.md` separately.

- [ ] **Step 1: Create `src/content/config.ts`**

```ts
import { defineCollection, z } from 'astro:content';

const pages = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string().min(1),
    enHash: z.string().regex(/^[0-9a-f]{64}$/).optional()
  })
});

const schedule = defineCollection({
  type: 'content',
  schema: z.object({
    day: z.union([z.literal(1), z.literal(2)]),
    order: z.number().int().min(0),
    name: z.string().min(1),
    startTime: z.union([z.string().regex(/^\d{2}:\d{2}$/), z.literal('TBD')]),
    endTime: z.union([z.string().regex(/^\d{2}:\d{2}$/), z.literal('TBD')]),
    location: z.string().optional(),
    dressCode: z.string().optional(),
    enHash: z.string().regex(/^[0-9a-f]{64}$/).optional()
  })
});

const faq = defineCollection({
  type: 'content',
  schema: z.object({
    order: z.number().int().min(0),
    question: z.string().min(1),
    enHash: z.string().regex(/^[0-9a-f]{64}$/).optional()
  })
});

export const collections = { pages, schedule, faq };

// Site-wide config schema (parsed manually from site.yaml — see src/i18n/site.ts).
export const siteSchema = z.object({
  coupleNames: z.object({
    partner1: z.string().min(1),
    partner2: z.string().min(1)
  }),
  weddingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  venue: z.object({
    name: z.string().min(1),
    addressShort: z.string().min(1),
    city: z.string().min(1),
    country: z.string().min(1),
    mapUrl: z.string().url()
  }),
  contactWhatsApp: z.string().regex(/^\+\d{6,15}$/),
  photosAlbumUrl: z.string().url().optional()
});

export type SiteConfig = z.infer<typeof siteSchema>;
```

- [ ] **Step 2: Create `src/content/site.yaml`**

```yaml
coupleNames:
  partner1: Apeksha
  partner2: Padraic
weddingDate: '2027-02-27'
venue:
  name: TBD
  addressShort: Gurgaon, India
  city: Gurgaon
  country: India
  mapUrl: 'https://maps.google.com/?q=Gurgaon'
contactWhatsApp: '+919000000000'
# photosAlbumUrl filled in post-wedding
```

- [ ] **Step 3: Verify schema by running astro check**

Run: `npx astro sync && npx astro check`
Expected: PASS — schemas compile, no entries to validate yet.

- [ ] **Step 4: Commit**

```bash
git add src/content/config.ts src/content/site.yaml
git commit -m "feat: define content collection schemas and site config"
```

---

### Task 4: Add a sample entry per collection (en + hi)

**Files:**
- Create: `src/content/pages/home.en.md`, `src/content/pages/home.hi.md`
- Create: `src/content/pages/travel.en.md`, `src/content/pages/travel.hi.md`
- Create: `src/content/pages/photos.en.md`, `src/content/pages/photos.hi.md`
- Create: `src/content/schedule/01-mehendi.en.md`, `src/content/schedule/01-mehendi.hi.md`
- Create: `src/content/schedule/02-ceremony.en.md`, `src/content/schedule/02-ceremony.hi.md`
- Create: `src/content/faq/01-dress-code.en.md`, `src/content/faq/01-dress-code.hi.md`
- Create: `src/content/faq/02-kids.en.md`, `src/content/faq/02-kids.hi.md`

The Hindi entries omit `enHash` for now — Task 9 (`make rehash`) populates them once the parity scripts exist. Astro's optional schema field means the build still passes.

- [ ] **Step 1: Create `home.en.md` and `home.hi.md`**

`src/content/pages/home.en.md`:

```markdown
---
title: Apeksha and Padraic
---

We can't wait to celebrate with you. This site has everything you need to know about the wedding.
```

`src/content/pages/home.hi.md`:

```markdown
---
title: अपेक्षा और पैड्रिक
---

हम आपके साथ जश्न मनाने के लिए उत्सुक हैं। इस वेबसाइट पर शादी की सारी जानकारी मिलेगी।
```

- [ ] **Step 2: Create `travel.en.md` and `travel.hi.md`**

`src/content/pages/travel.en.md`:

```markdown
---
title: Travel & Stay
---

The wedding takes place in Gurgaon, India. Indira Gandhi International Airport (DEL) is the closest airport. Detailed hotel and transport information coming soon.
```

`src/content/pages/travel.hi.md`:

```markdown
---
title: यात्रा और ठहरने की जानकारी
---

शादी गुड़गांव, भारत में होगी। निकटतम हवाई अड्डा इंदिरा गांधी अंतर्राष्ट्रीय हवाई अड्डा (DEL) है। होटल और परिवहन की विस्तृत जानकारी जल्द ही उपलब्ध होगी।
```

- [ ] **Step 3: Create `photos.en.md` and `photos.hi.md`**

`src/content/pages/photos.en.md`:

```markdown
---
title: Photos
---

Photos coming soon. Check back after 27 February 2027.
```

`src/content/pages/photos.hi.md`:

```markdown
---
title: तस्वीरें
---

तस्वीरें जल्द ही आएंगी। 27 फ़रवरी 2027 के बाद ज़रूर देखें।
```

- [ ] **Step 4: Create the schedule entries**

`src/content/schedule/01-mehendi.en.md`:

```markdown
---
day: 1
order: 1
name: Mehendi
startTime: TBD
endTime: TBD
dressCode: Festive Indian
---

Join us for an evening of music, henna, and warm welcomes the night before the wedding.
```

`src/content/schedule/01-mehendi.hi.md`:

```markdown
---
day: 1
order: 1
name: मेहंदी
startTime: TBD
endTime: TBD
dressCode: उत्सव भारतीय
---

शादी से पहली रात संगीत, मेहंदी और गर्मजोशी भरे स्वागत की एक शाम के लिए हमारे साथ जुड़ें।
```

`src/content/schedule/02-ceremony.en.md`:

```markdown
---
day: 2
order: 1
name: Wedding Ceremony
startTime: TBD
endTime: TBD
dressCode: Formal Indian
---

The wedding ceremony followed by reception. Details to follow.
```

`src/content/schedule/02-ceremony.hi.md`:

```markdown
---
day: 2
order: 1
name: विवाह समारोह
startTime: TBD
endTime: TBD
dressCode: औपचारिक भारतीय
---

विवाह समारोह और उसके बाद रिसेप्शन। विवरण जल्द ही उपलब्ध होगा।
```

- [ ] **Step 5: Create the FAQ entries**

`src/content/faq/01-dress-code.en.md`:

```markdown
---
order: 1
question: What is the dress code?
---

Festive Indian for the mehendi, formal Indian for the wedding day. Western formal also welcome.
```

`src/content/faq/01-dress-code.hi.md`:

```markdown
---
order: 1
question: ड्रेस कोड क्या है?
---

मेहंदी के लिए उत्सव भारतीय, शादी के दिन के लिए औपचारिक भारतीय। पश्चिमी औपचारिक पहनावा भी स्वागत है।
```

`src/content/faq/02-kids.en.md`:

```markdown
---
order: 2
question: Can I bring my children?
---

Yes — children are warmly welcome. Please mention them on your RSVP so we can plan accordingly.
```

`src/content/faq/02-kids.hi.md`:

```markdown
---
order: 2
question: क्या मैं बच्चों को ला सकता/सकती हूँ?
---

हाँ — बच्चों का सहर्ष स्वागत है। कृपया अपने RSVP में उन्हें शामिल करें ताकि हम उसी अनुसार व्यवस्था कर सकें।
```

- [ ] **Step 6: Verify content compiles**

Run: `npx astro sync && npx astro check`
Expected: PASS — all entries validate against the schemas.

- [ ] **Step 7: Commit**

```bash
git add src/content/pages src/content/schedule src/content/faq
git commit -m "feat: seed sample content for both locales"
```

---

## Phase C — i18n parity tooling

### Task 5: Test fixtures + helper for the i18n scripts

**Files:**
- Create: `tests/fixtures/i18n/.gitkeep`
- Create: `tests/helpers/tmpdir.mjs`

The i18n scripts operate on a directory tree. Tests give them a temp directory and assert behaviour. This task wires the shared helpers used by Tasks 6–8.

- [ ] **Step 1: Create `tests/helpers/tmpdir.mjs`**

```js
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export function makeContentDir() {
  const root = mkdtempSync(join(tmpdir(), 'i18n-test-'));
  return {
    root,
    write(relPath, contents) {
      const abs = join(root, relPath);
      mkdirSync(join(abs, '..'), { recursive: true });
      writeFileSync(abs, contents);
      return abs;
    },
    cleanup() {
      rmSync(root, { recursive: true, force: true });
    }
  };
}
```

- [ ] **Step 2: Add `.gitkeep` for fixtures dir**

Create `tests/fixtures/i18n/.gitkeep` (empty file). This reserves the path; individual tests will populate it via the helper at runtime.

- [ ] **Step 3: Run tests to verify the harness loads**

Run: `npm test`
Expected: `0 passing` (no test files yet) — the runner exits 0 when no tests exist if the path is valid. If `node --test tests` exits with a non-zero status because the directory has no test files, that's fine for now — Task 6 adds the first test.

- [ ] **Step 4: Commit**

```bash
git add tests/helpers/tmpdir.mjs tests/fixtures/i18n/.gitkeep
git commit -m "test: add i18n test helpers"
```

---

### Task 6: `i18n-check.mjs` — file pairing

**Files:**
- Create: `scripts/i18n-check.mjs`
- Create: `tests/i18n-check.test.mjs`

This task implements only the file-pairing rule. Subsequent tasks add invariant-frontmatter and source-hash checks to the same script.

- [ ] **Step 1: Write the failing test for missing pair**

`tests/i18n-check.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeContentDir } from './helpers/tmpdir.mjs';
import { runCheck } from '../scripts/i18n-check.mjs';

test('reports missing Hindi pair', () => {
  const dir = makeContentDir();
  try {
    dir.write('schedule/01-event.en.md', '---\nday: 1\norder: 1\nname: x\nstartTime: TBD\nendTime: TBD\n---\nbody\n');
    const errors = runCheck({ contentRoot: dir.root });
    assert.ok(errors.some(e => e.code === 'missing_pair' && e.path.endsWith('01-event.hi.md')));
  } finally {
    dir.cleanup();
  }
});

test('reports missing English pair', () => {
  const dir = makeContentDir();
  try {
    dir.write('schedule/01-event.hi.md', '---\nday: 1\norder: 1\nname: x\nstartTime: TBD\nendTime: TBD\n---\nbody\n');
    const errors = runCheck({ contentRoot: dir.root });
    assert.ok(errors.some(e => e.code === 'missing_pair' && e.path.endsWith('01-event.en.md')));
  } finally {
    dir.cleanup();
  }
});

// At this point, only file-pairing is validated. The hash field is not enforced yet —
// Task 7 adds the hash check AND replaces this test with a stronger "clean tree with valid hash"
// version (so don't worry if removing the placeholder enHash here looks under-tested for a moment).
test('clean tree returns no errors', () => {
  const dir = makeContentDir();
  try {
    dir.write('schedule/01-event.en.md', '---\nday: 1\norder: 1\nname: x\nstartTime: TBD\nendTime: TBD\n---\nbody\n');
    dir.write('schedule/01-event.hi.md', '---\nday: 1\norder: 1\nname: y\nstartTime: TBD\nendTime: TBD\n---\nbody\n');
    const errors = runCheck({ contentRoot: dir.root });
    assert.equal(errors.length, 0);
  } finally {
    dir.cleanup();
  }
});
```

**Important:** Task 7 will add hash enforcement, at which point this "clean tree" test must be removed or updated to include a real `enHash`. The new "clean tree with valid hash" test in Task 7 supersedes it — when implementing Task 7, **delete this test** to avoid a stale assertion.

- [ ] **Step 2: Run test — expect failure**

Run: `npm test`
Expected: FAIL — `Cannot find module '../scripts/i18n-check.mjs'`.

- [ ] **Step 3: Implement minimal `i18n-check.mjs`**

`scripts/i18n-check.mjs`:

```js
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
```

- [ ] **Step 4: Run tests — expect pass**

Run: `npm test`
Expected: 3 tests passing.

- [ ] **Step 5: Run script against real content**

Run: `npm run i18n:check`
Expected: `i18n-check: OK` (pairings created in Task 4 are complete).

- [ ] **Step 6: Commit**

```bash
git add scripts/i18n-check.mjs tests/i18n-check.test.mjs
git commit -m "feat: i18n-check enforces file pairing"
```

---

### Task 7: `i18n-check.mjs` — invariant frontmatter + source hash

**Files:**
- Modify: `scripts/i18n-check.mjs`
- Modify: `tests/i18n-check.test.mjs`

- [ ] **Step 1: Add failing tests for invariant frontmatter and stale hash**

Append to `tests/i18n-check.test.mjs`:

```js
test('reports invariant frontmatter mismatch on schedule entries', () => {
  const dir = makeContentDir();
  try {
    dir.write('schedule/01-event.en.md', '---\nday: 1\norder: 1\nname: A\nstartTime: "10:00"\nendTime: "11:00"\n---\nbody\n');
    dir.write('schedule/01-event.hi.md', '---\nday: 2\norder: 1\nname: B\nstartTime: "10:00"\nendTime: "11:00"\nenHash: 0000000000000000000000000000000000000000000000000000000000000000\n---\nbody\n');
    const errors = runCheck({ contentRoot: dir.root });
    assert.ok(errors.some(e => e.code === 'invariant_mismatch' && e.field === 'day'));
  } finally {
    dir.cleanup();
  }
});

test('reports stale enHash', () => {
  const dir = makeContentDir();
  try {
    const enContents = '---\nday: 1\norder: 1\nname: A\nstartTime: TBD\nendTime: TBD\n---\nbody v2\n';
    dir.write('schedule/01-event.en.md', enContents);
    dir.write('schedule/01-event.hi.md', '---\nday: 1\norder: 1\nname: B\nstartTime: TBD\nendTime: TBD\nenHash: 0000000000000000000000000000000000000000000000000000000000000000\n---\nbody hindi\n');
    const errors = runCheck({ contentRoot: dir.root });
    assert.ok(errors.some(e => e.code === 'stale_hash'));
  } finally {
    dir.cleanup();
  }
});

test('reports missing enHash on Hindi file', () => {
  const dir = makeContentDir();
  try {
    dir.write('schedule/01-event.en.md', '---\nday: 1\norder: 1\nname: A\nstartTime: TBD\nendTime: TBD\n---\nbody\n');
    dir.write('schedule/01-event.hi.md', '---\nday: 1\norder: 1\nname: B\nstartTime: TBD\nendTime: TBD\n---\nbody hindi\n');
    const errors = runCheck({ contentRoot: dir.root });
    assert.ok(errors.some(e => e.code === 'missing_hash'));
  } finally {
    dir.cleanup();
  }
});

test('clean tree with valid hash returns no errors', () => {
  const dir = makeContentDir();
  try {
    const enContents = '---\nday: 1\norder: 1\nname: A\nstartTime: TBD\nendTime: TBD\n---\nbody\n';
    dir.write('schedule/01-event.en.md', enContents);
    // Compute the expected hash of the en file using the same algorithm the script uses.
    const { createHash } = await import('node:crypto');
    const enHash = createHash('sha256').update(enContents).digest('hex');
    dir.write('schedule/01-event.hi.md', `---\nday: 1\norder: 1\nname: B\nstartTime: TBD\nendTime: TBD\nenHash: ${enHash}\n---\nbody hindi\n`);
    const errors = runCheck({ contentRoot: dir.root });
    assert.equal(errors.length, 0);
  } finally {
    dir.cleanup();
  }
});
```

Note: the last test uses a top-level `await import` inside an async test callback — wrap with `async () => { ... }`. Astro tooling supports this on Node 20.

Replace the last test's signature with:

```js
test('clean tree with valid hash returns no errors', async () => {
```

- [ ] **Step 2: Run tests — expect failure**

Run: `npm test`
Expected: 3 new tests fail (the existing 3 still pass).

- [ ] **Step 3: Extend `scripts/i18n-check.mjs`**

Replace the entire file with:

```js
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

const CONTENT_ROOT_DEFAULT = new URL('../src/content', import.meta.url).pathname;

const INVARIANT_FIELDS = {
  schedule: ['day', 'order', 'startTime', 'endTime', 'location'],
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
      // Only coerce short digit strings — long ones (e.g. an all-digit SHA256 hash)
      // would lose precision as JS floats and break the enHash check.
      value = Number(value);
    }
    out[key] = value;
  }
  return out;
}

export function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
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
```

- [ ] **Step 4: Run tests — expect pass**

Run: `npm test`
Expected: 6 tests passing.

- [ ] **Step 5: Run script against real content**

Run: `npm run i18n:check`
Expected: FAIL — every Hindi file in `src/content/` is missing `enHash`. The script lists them all. This is fine; Task 8 builds the rehash script that fixes this.

- [ ] **Step 6: Commit**

```bash
git add scripts/i18n-check.mjs tests/i18n-check.test.mjs
git commit -m "feat: i18n-check enforces invariant frontmatter and source hash"
```

---

### Task 8: `i18n-rehash.mjs`

**Files:**
- Create: `scripts/i18n-rehash.mjs`
- Create: `tests/i18n-rehash.test.mjs`

The rehash script reads a basename (e.g. `01-mehendi`), finds the matching `.en.md` and `.hi.md` files anywhere under `src/content/`, recomputes the hash of the English file, and writes (or replaces) the `enHash` frontmatter line in the Hindi file.

- [ ] **Step 1: Write failing tests**

`tests/i18n-rehash.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeContentDir } from './helpers/tmpdir.mjs';
import { rehash } from '../scripts/i18n-rehash.mjs';
import { sha256 } from '../scripts/i18n-check.mjs';

test('inserts enHash when missing', () => {
  const dir = makeContentDir();
  try {
    const en = '---\nday: 1\norder: 1\nname: A\nstartTime: TBD\nendTime: TBD\n---\nbody\n';
    dir.write('schedule/01-event.en.md', en);
    dir.write('schedule/01-event.hi.md', '---\nday: 1\norder: 1\nname: B\nstartTime: TBD\nendTime: TBD\n---\nbody hindi\n');
    const result = rehash({ contentRoot: dir.root, name: '01-event' });
    assert.equal(result.updated.length, 1);
    const hi = readFileSync(`${dir.root}/schedule/01-event.hi.md`, 'utf8');
    assert.match(hi, new RegExp(`enHash:\\s*${sha256(en)}`));
  } finally {
    dir.cleanup();
  }
});

test('replaces stale enHash', () => {
  const dir = makeContentDir();
  try {
    const en = '---\nday: 1\norder: 1\nname: A\nstartTime: TBD\nendTime: TBD\n---\nbody v2\n';
    dir.write('schedule/01-event.en.md', en);
    dir.write('schedule/01-event.hi.md', '---\nday: 1\norder: 1\nname: B\nstartTime: TBD\nendTime: TBD\nenHash: 0000000000000000000000000000000000000000000000000000000000000000\n---\nbody hindi\n');
    rehash({ contentRoot: dir.root, name: '01-event' });
    const hi = readFileSync(`${dir.root}/schedule/01-event.hi.md`, 'utf8');
    assert.match(hi, new RegExp(`enHash:\\s*${sha256(en)}`));
    assert.doesNotMatch(hi, /enHash:\s*0{64}/);
  } finally {
    dir.cleanup();
  }
});

test('throws when no English match exists', () => {
  const dir = makeContentDir();
  try {
    dir.write('schedule/01-event.hi.md', '---\nday: 1\norder: 1\nname: B\nstartTime: TBD\nendTime: TBD\n---\nbody\n');
    assert.throws(
      () => rehash({ contentRoot: dir.root, name: '01-event' }),
      /no matching .*\.en\.md/i
    );
  } finally {
    dir.cleanup();
  }
});

test('throws when name not provided', () => {
  const dir = makeContentDir();
  try {
    assert.throws(() => rehash({ contentRoot: dir.root, name: undefined }), /name is required/i);
  } finally {
    dir.cleanup();
  }
});
```

- [ ] **Step 2: Run tests — expect failure**

Run: `npm test`
Expected: tests fail (script does not exist).

- [ ] **Step 3: Implement `scripts/i18n-rehash.mjs`**

```js
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
```

- [ ] **Step 4: Run tests — expect pass**

Run: `npm test`
Expected: 4 new tests passing (10 total).

- [ ] **Step 5: Rehash all real content entries**

Run, one per Hindi file:

```bash
npm run i18n:rehash -- home
npm run i18n:rehash -- travel
npm run i18n:rehash -- photos
npm run i18n:rehash -- 01-mehendi
npm run i18n:rehash -- 02-ceremony
npm run i18n:rehash -- 01-dress-code
npm run i18n:rehash -- 02-kids
```

- [ ] **Step 6: Run i18n:check — expect pass**

Run: `npm run i18n:check`
Expected: `i18n-check: OK`

- [ ] **Step 7: Commit**

```bash
git add scripts/i18n-rehash.mjs tests/i18n-rehash.test.mjs src/content
git commit -m "feat: i18n-rehash script + initial enHash backfill"
```

---

### Task 9: husky pre-commit hook

**Files:**
- Create: `.husky/pre-commit`

- [ ] **Step 1: Initialise husky**

Run: `npx husky init`
Expected: creates `.husky/pre-commit` with `npm test` as default content.

- [ ] **Step 2: Replace `.husky/pre-commit` contents**

```sh
#!/usr/bin/env sh
# Run translation parity check before allowing commit.
npm run i18n:check
```

- [ ] **Step 3: Make executable**

Run: `chmod +x .husky/pre-commit`

- [ ] **Step 4: Verify hook runs**

Make a no-op change (e.g. add a trailing newline to `README.md`), `git add` it, then `git commit -m "chore: test hook"`. Expected: hook runs, `i18n-check: OK`, commit succeeds. Revert the change with `git reset --hard HEAD~1` afterwards.

- [ ] **Step 5: Commit hook itself**

```bash
git add .husky/pre-commit
git commit -m "chore: add husky pre-commit hook for i18n parity"
```

---

## Phase D — Visual / layout

### Task 10: Design tokens, fonts, and base CSS

**Files:**
- Create: `src/styles/tokens.css`
- Create: `src/styles/global.css`
- Create: `public/fonts/README.md`

We use Google Fonts via stylesheet link for v1 to keep the initial setup simple. Self-hosting (per spec §6.4) becomes a follow-up enhancement; the spec's privacy reasoning still applies — flag in `public/fonts/README.md` so it doesn't get forgotten.

- [ ] **Step 1: Create `src/styles/tokens.css`**

```css
:root {
  --color-bg: #FDF5D4;
  --color-surface: #FFFFFF;
  --color-primary: #C8102E;
  --color-primary-dark: #8B0A1F;
  --color-accent: #D4A017;
  --color-accent-light: #F5D76E;
  --color-text: #2A1810;
  --color-text-muted: #6B5040;
  --color-border: #D4A017;
  --color-error: #A01020;
  --color-success: #1A5F3C;

  --font-display: 'Playfair Display', 'Tiro Devanagari Hindi', serif;
  --font-heading: 'Cormorant Garamond', 'Tiro Devanagari Hindi', serif;
  --font-body: 'Inter', 'Noto Sans Devanagari', system-ui, sans-serif;

  --radius-card: 8px;
  --max-content: 720px;
}

html[lang="hi"] {
  --font-display: 'Tiro Devanagari Hindi', serif;
  --font-heading: 'Tiro Devanagari Hindi', serif;
  --font-body: 'Noto Sans Devanagari', system-ui, sans-serif;
}
```

- [ ] **Step 2: Create `src/styles/global.css`**

```css
@import './tokens.css';

*, *::before, *::after { box-sizing: border-box; }

html { font-size: 16px; }
body {
  margin: 0;
  background: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-body);
  line-height: 1.6;
}

h1, h2, h3 { font-family: var(--font-display); color: var(--color-primary); margin: 0 0 0.5em; }
h1 { font-size: clamp(2rem, 4vw + 1rem, 3.25rem); font-weight: 700; }
h2 { font-size: clamp(1.5rem, 2vw + 1rem, 2.25rem); font-weight: 600; font-family: var(--font-heading); }
h3 { font-size: 1.25rem; font-weight: 600; font-family: var(--font-heading); color: var(--color-text); }

a { color: var(--color-primary); }
a:hover { color: var(--color-primary-dark); }

main { max-width: var(--max-content); margin: 0 auto; padding: 1.5rem 1rem; }

.card {
  background: var(--color-surface);
  border: 2px double var(--color-border);
  border-radius: var(--radius-card);
  padding: 1.25rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.button {
  display: inline-block;
  background: var(--color-primary);
  color: var(--color-bg);
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  font-family: var(--font-body);
  font-size: 1rem;
  text-decoration: none;
  cursor: pointer;
  min-height: 44px;
}
.button:hover { background: var(--color-primary-dark); }

input, select, textarea {
  font: inherit;
  padding: 0.6rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: var(--color-surface);
  color: var(--color-text);
  width: 100%;
  min-height: 44px;
}

.subtitle { color: var(--color-text-muted); }
.error-text { color: var(--color-error); }
.success-text { color: var(--color-success); }

.visually-hidden {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}

/* Honeypot — hidden from users, present in DOM for bots */
.honeypot { position: absolute; left: -9999px; opacity: 0; pointer-events: none; }
```

- [ ] **Step 3: Create `public/fonts/README.md`**

```markdown
# Fonts

Currently the site loads Google Fonts via stylesheet link. To self-host
(per the spec's privacy preference, §6.4):

1. Download the WOFF2 files for Playfair Display, Cormorant Garamond,
   Inter, Tiro Devanagari Hindi, and Noto Sans Devanagari.
2. Place them in this directory.
3. Replace the `<link rel="stylesheet" href="https://fonts.googleapis.com/...">`
   tag in `src/components/Layout.astro` with a local `@font-face` stylesheet.

This is a non-blocking follow-up — the site is functional with the CDN link.
```

- [ ] **Step 4: Build to confirm no errors**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/styles public/fonts/README.md
git commit -m "feat: design tokens and global styles"
```

---

### Task 11: Layout component + Header + Footer

**Files:**
- Create: `src/components/Layout.astro`
- Create: `src/components/Header.astro`
- Create: `src/components/Footer.astro`
- Create: `src/i18n/strings.ts`
- Create: `src/i18n/urls.ts`

The auto-detect language script and the LangToggle component come in Task 12. This task wires up the static skeleton.

- [ ] **Step 1: Create `src/i18n/strings.ts`**

```ts
export type Locale = 'en' | 'hi';

export const strings = {
  en: {
    nav: {
      home: 'Home',
      schedule: 'Schedule',
      travel: 'Travel',
      rsvp: 'RSVP',
      faq: 'FAQ',
      photos: 'Photos'
    },
    footer: {
      contactPrefix: 'Questions? Message us on WhatsApp:'
    },
    rsvp: {
      formTitle: 'RSVP',
      leadName: 'Your name',
      additionalGuests: 'Additional guests on this invitation',
      addGuest: 'Add another guest',
      removeGuest: 'Remove',
      day1Question: 'Will you join us for the Mehendi (26 Feb 2027)?',
      day2Question: 'Will you join us for the Wedding (27 Feb 2027)?',
      yes: 'Yes',
      no: 'No',
      dietary: 'Dietary requirements',
      dietaryOptions: {
        vegetarian: 'Vegetarian',
        vegan: 'Vegan',
        jain: 'Jain',
        halal: 'Halal',
        glutenFree: 'Gluten-free',
        nutAllergy: 'Nut allergy'
      },
      dietaryOther: 'Anything else? (allergies, sensitivities)',
      arrival: 'Arrival date and time (optional)',
      departure: 'Departure date and time (optional)',
      accommodation: 'Accommodation',
      accommodationOptions: {
        sorted: "I've sorted my own",
        recommended: "I'd like to stay at the recommended hotel",
        help: 'I need help booking'
      },
      whatsapp: 'WhatsApp number',
      whatsappPlaceholder: '+91 …',
      notes: 'Anything else?',
      submit: 'Send RSVP',
      submitting: 'Submitting your RSVP…',
      successTitle: 'Thank you!',
      successBody:
        '{name}, Apeksha and Padraic have your RSVP. To change anything, just resubmit. We\'ll be in touch on WhatsApp closer to the date.',
      errors: {
        invalid_payload: 'Please check the highlighted fields and resubmit.',
        throttled: 'Looks like you just submitted — please wait a few seconds and try again.',
        network: 'Something went wrong — please try again, or message us on WhatsApp.',
        internal: 'Something went wrong — please try again, or message us on WhatsApp.',
        invalid_origin: 'Something went wrong — please try again, or message us on WhatsApp.',
        whatsappRequired: 'Please enter your WhatsApp number.',
        whatsappFormat: 'WhatsApp number should start with + and a country code.',
        leadNameRequired: 'Please enter your name.'
      }
    },
    photos: {
      placeholder: 'Photos coming soon. Check back after 27 February 2027.'
    }
  },
  hi: {
    nav: {
      home: 'मुख्य पृष्ठ',
      schedule: 'कार्यक्रम',
      travel: 'यात्रा',
      rsvp: 'जवाब दें',
      faq: 'सामान्य प्रश्न',
      photos: 'तस्वीरें'
    },
    footer: {
      contactPrefix: 'कोई प्रश्न? व्हाट्सऐप पर संदेश भेजें:'
    },
    rsvp: {
      formTitle: 'RSVP — कृपया जवाब दें',
      leadName: 'आपका नाम',
      additionalGuests: 'इस निमंत्रण पर अन्य अतिथि',
      addGuest: 'एक और अतिथि जोड़ें',
      removeGuest: 'हटाएँ',
      day1Question: 'क्या आप मेहंदी (26 फ़रवरी 2027) में आएंगे?',
      day2Question: 'क्या आप शादी (27 फ़रवरी 2027) में आएंगे?',
      yes: 'हाँ',
      no: 'नहीं',
      dietary: 'भोजन संबंधी आवश्यकताएँ',
      dietaryOptions: {
        vegetarian: 'शाकाहारी',
        vegan: 'विगन',
        jain: 'जैन',
        halal: 'हलाल',
        glutenFree: 'ग्लूटेन-मुक्त',
        nutAllergy: 'नट्स से एलर्जी'
      },
      dietaryOther: 'और कुछ? (एलर्जी, संवेदनशीलताएँ)',
      arrival: 'आगमन की तिथि और समय (वैकल्पिक)',
      departure: 'प्रस्थान की तिथि और समय (वैकल्पिक)',
      accommodation: 'ठहरने की व्यवस्था',
      accommodationOptions: {
        sorted: 'मेरी अपनी व्यवस्था है',
        recommended: 'मुझे सुझाए गए होटल में रहना है',
        help: 'मुझे बुकिंग में मदद चाहिए'
      },
      whatsapp: 'व्हाट्सऐप नंबर',
      whatsappPlaceholder: '+91 …',
      notes: 'और कुछ?',
      submit: 'RSVP भेजें',
      submitting: 'आपका RSVP भेजा जा रहा है…',
      successTitle: 'धन्यवाद!',
      successBody:
        '{name}, अपेक्षा और पैड्रिक को आपका RSVP मिल गया है। कुछ बदलना हो तो फिर से भेज दीजिए। शादी के क़रीब हम व्हाट्सऐप पर संपर्क करेंगे।',
      errors: {
        invalid_payload: 'कृपया चिह्नित फ़ील्ड जाँचें और फिर से भेजें।',
        throttled: 'लगता है आपने अभी-अभी भेजा है — कुछ सेकंड रुककर फिर कोशिश करें।',
        network: 'कुछ गड़बड़ हुई — फिर कोशिश करें, या व्हाट्सऐप पर संदेश भेजें।',
        internal: 'कुछ गड़बड़ हुई — फिर कोशिश करें, या व्हाट्सऐप पर संदेश भेजें।',
        invalid_origin: 'कुछ गड़बड़ हुई — फिर कोशिश करें, या व्हाट्सऐप पर संदेश भेजें।',
        whatsappRequired: 'कृपया अपना व्हाट्सऐप नंबर दर्ज करें।',
        whatsappFormat: 'व्हाट्सऐप नंबर + और देश-कोड से शुरू होना चाहिए।',
        leadNameRequired: 'कृपया अपना नाम दर्ज करें।'
      }
    },
    photos: {
      placeholder: 'तस्वीरें जल्द आएँगी। 27 फ़रवरी 2027 के बाद ज़रूर देखें।'
    }
  }
} as const;

export type Strings = (typeof strings)['en'];

export function t(lang: Locale): Strings {
  return strings[lang];
}
```

- [ ] **Step 2: Create `src/i18n/urls.ts`**

```ts
import type { Locale } from './strings';

const BASE = import.meta.env.BASE_URL ?? '/';

function withBase(path: string) {
  const trimmedBase = BASE.endsWith('/') ? BASE.slice(0, -1) : BASE;
  return `${trimmedBase}${path}`;
}

export function localeUrl(lang: Locale, path: string): string {
  const normalised = path.startsWith('/') ? path : `/${path}`;
  return lang === 'hi' ? withBase(`/hi${normalised}`) : withBase(normalised);
}

export function otherLocaleUrlForCurrent(currentLang: Locale, currentPath: string): string {
  const otherLang: Locale = currentLang === 'en' ? 'hi' : 'en';
  // Strip the base path and the /hi/ prefix if present, so we can rebuild against the other locale.
  let pathOnly = currentPath;
  if (BASE !== '/' && pathOnly.startsWith(BASE)) pathOnly = pathOnly.slice(BASE.length - (BASE.endsWith('/') ? 1 : 0));
  if (pathOnly.startsWith('/hi/')) pathOnly = pathOnly.slice(3);
  if (pathOnly === '/hi') pathOnly = '/';
  return localeUrl(otherLang, pathOnly || '/');
}
```

- [ ] **Step 3: Create `src/components/Header.astro`**

```astro
---
import { t, type Locale } from '../i18n/strings';
import { localeUrl } from '../i18n/urls';
import LangToggle from './LangToggle.astro';

interface Props { lang: Locale; currentPath: string }
const { lang, currentPath } = Astro.props;
const s = t(lang);
---
<header class="site-header">
  <a class="brand" href={localeUrl(lang, '/')}>Apeksha &amp; Padraic</a>
  <nav class="primary-nav" aria-label="Primary">
    <a href={localeUrl(lang, '/schedule/')}>{s.nav.schedule}</a>
    <a href={localeUrl(lang, '/travel/')}>{s.nav.travel}</a>
    <a href={localeUrl(lang, '/rsvp/')}>{s.nav.rsvp}</a>
    <a href={localeUrl(lang, '/faq/')}>{s.nav.faq}</a>
    <a href={localeUrl(lang, '/photos/')}>{s.nav.photos}</a>
  </nav>
  <LangToggle lang={lang} currentPath={currentPath} />
</header>

<style>
  .site-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 1rem;
    padding: 1rem;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-bg);
  }
  .brand {
    font-family: var(--font-display);
    color: var(--color-primary);
    font-size: 1.25rem;
    font-weight: 700;
    text-decoration: none;
  }
  .primary-nav {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
  }
  .primary-nav a {
    color: var(--color-text);
    text-decoration: none;
    padding: 0.5rem;
    min-height: 44px;
    display: inline-flex;
    align-items: center;
  }
  .primary-nav a:hover { color: var(--color-primary); }
</style>
```

- [ ] **Step 4: Create `src/components/Footer.astro`**

```astro
---
import { t, type Locale } from '../i18n/strings';
import { siteSchema, type SiteConfig } from '../content/config';
import yaml from 'js-yaml';
import { readFileSync } from 'node:fs';

interface Props { lang: Locale }
const { lang } = Astro.props;
const s = t(lang);

const siteRaw = readFileSync(new URL('../content/site.yaml', import.meta.url), 'utf8');
const site = siteSchema.parse(yaml.load(siteRaw)) as SiteConfig;
const waLink = `https://wa.me/${site.contactWhatsApp.replace(/\D/g, '')}`;
---
<footer class="site-footer">
  <div class="garland" aria-hidden="true"></div>
  <p>{site.weddingDate} · {site.venue.city}, {site.venue.country}</p>
  <p>{s.footer.contactPrefix} <a href={waLink}>{site.contactWhatsApp}</a></p>
</footer>

<style>
  .site-footer {
    margin-top: 3rem;
    padding: 2rem 1rem;
    text-align: center;
    border-top: 1px solid var(--color-border);
    color: var(--color-text-muted);
  }
  .garland {
    height: 24px;
    background: linear-gradient(90deg, var(--color-accent) 0%, var(--color-primary) 50%, var(--color-accent) 100%);
    margin: -2rem -1rem 1.5rem;
    opacity: 0.7;
  }
  .site-footer a { color: var(--color-primary); }
</style>
```

This footer reads `site.yaml` directly with `js-yaml`. We need to add it as a dependency.

- [ ] **Step 5: Add `js-yaml` dependency**

Run: `npm install js-yaml @types/js-yaml`
Expected: dependencies install, `package.json` updated.

- [ ] **Step 6: Create `src/components/LangToggle.astro` (placeholder so Header builds)**

This is a stub — Task 12 implements the real toggle and the auto-detect script.

```astro
---
import type { Locale } from '../i18n/strings';
import { otherLocaleUrlForCurrent } from '../i18n/urls';

interface Props { lang: Locale; currentPath: string }
const { lang, currentPath } = Astro.props;
const otherUrl = otherLocaleUrlForCurrent(lang, currentPath);
const otherLabel = lang === 'en' ? 'हिंदी' : 'EN';
---
<a class="lang-toggle" href={otherUrl} hreflang={lang === 'en' ? 'hi' : 'en'}>{otherLabel}</a>

<style>
  .lang-toggle {
    color: var(--color-primary);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    padding: 0.4rem 0.8rem;
    text-decoration: none;
    min-height: 44px;
    display: inline-flex;
    align-items: center;
  }
</style>
```

- [ ] **Step 7: Create `src/components/Layout.astro`**

```astro
---
import '../styles/global.css';
import Header from './Header.astro';
import Footer from './Footer.astro';
import { t, type Locale } from '../i18n/strings';

interface Props { lang: Locale; title?: string }
const { lang, title } = Astro.props;
const s = t(lang);
const pageTitle = title ? `${title} · Apeksha & Padraic` : 'Apeksha & Padraic';
const currentPath = Astro.url.pathname;
---
<!doctype html>
<html lang={lang}>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex, nofollow" />
    <title>{pageTitle}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      rel="stylesheet"
      href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,400&family=Inter:wght@400;500;700&family=Noto+Sans+Devanagari:wght@400;500;700&family=Playfair+Display:wght@700&family=Tiro+Devanagari+Hindi&display=swap"
    />
  </head>
  <body>
    <Header lang={lang} currentPath={currentPath} />
    <main>
      <slot />
    </main>
    <Footer lang={lang} />
  </body>
</html>
```

- [ ] **Step 8: Update `src/pages/index.astro` to use Layout**

```astro
---
import Layout from '../components/Layout.astro';
---
<Layout lang="en" title="Home">
  <h1>Apeksha &amp; Padraic</h1>
  <p>Site under construction.</p>
</Layout>
```

- [ ] **Step 9: Verify build**

Run: `npm run build`
Expected: PASS. Open `dist/website-wedding/index.html` and confirm it includes the header, footer, lang toggle, and Apeksha-and-Padraic branding.

- [ ] **Step 10: Commit**

```bash
git add src/i18n src/components src/pages/index.astro package.json package-lock.json
git commit -m "feat: layout, header, footer, i18n strings"
```

---

### Task 12: Auto-detect language inline script

**Files:**
- Modify: `src/components/Layout.astro`
- Modify: `src/components/LangToggle.astro`

- [ ] **Step 1: Add the auto-detect inline script to `Layout.astro`**

Insert directly after the `<title>` tag in the `<head>`:

```astro
    <script is:inline define:vars={{ baseUrl: import.meta.env.BASE_URL ?? '/' }}>
      (function () {
        try {
          var stored = localStorage.getItem('wedding_lang');
          var browserLang = (navigator.language || 'en').toLowerCase();
          var preferred = stored || (browserLang.indexOf('hi') === 0 ? 'hi' : 'en');
          if (!stored) localStorage.setItem('wedding_lang', preferred);
          var path = location.pathname;
          var trimmedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
          var rest = path.startsWith(trimmedBase) ? path.slice(trimmedBase.length) : path;
          var onHindi = rest === '/hi' || rest.indexOf('/hi/') === 0;
          if (preferred === 'hi' && !onHindi) {
            location.replace(trimmedBase + '/hi' + (rest === '/' ? '/' : rest));
          } else if (preferred === 'en' && onHindi) {
            location.replace(trimmedBase + (rest.replace(/^\/hi/, '') || '/'));
          }
        } catch (e) { /* fail open */ }
      })();
    </script>
```

- [ ] **Step 2: Make the toggle persist preference**

Replace `src/components/LangToggle.astro` with:

```astro
---
import type { Locale } from '../i18n/strings';
import { otherLocaleUrlForCurrent } from '../i18n/urls';

interface Props { lang: Locale; currentPath: string }
const { lang, currentPath } = Astro.props;
const otherLang: Locale = lang === 'en' ? 'hi' : 'en';
const otherUrl = otherLocaleUrlForCurrent(lang, currentPath);
const otherLabel = lang === 'en' ? 'हिंदी' : 'EN';
---
<a
  class="lang-toggle"
  href={otherUrl}
  hreflang={otherLang}
  data-target-lang={otherLang}
  >{otherLabel}</a>

<script is:inline>
  document.querySelectorAll('a.lang-toggle').forEach(function (el) {
    el.addEventListener('click', function () {
      try { localStorage.setItem('wedding_lang', el.dataset.targetLang); } catch (e) { /* ignore */ }
    });
  });
</script>

<style>
  .lang-toggle {
    color: var(--color-primary);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    padding: 0.4rem 0.8rem;
    text-decoration: none;
    min-height: 44px;
    display: inline-flex;
    align-items: center;
  }
</style>
```

- [ ] **Step 3: Build and manually verify**

Run: `npm run build && npm run preview`
Expected: dev preview at `http://localhost:4321/website-wedding/`. Manually check:
- Visit `/website-wedding/` — sees English version.
- Click the `हिंदी` toggle — URL becomes `/website-wedding/hi/`, content stays Hindi-empty (the placeholder index has no Hindi version yet — that's fine; we'll add `src/pages/hi/index.astro` in Task 14).
- Reload `/website-wedding/` — auto-redirects to `/website-wedding/hi/` because preference is now `hi`.
- Click `EN` — back to root, preference flipped.

For now, since `src/pages/hi/index.astro` doesn't exist, clicking the toggle from the home page returns 404 — that's expected and resolves at Task 14.

- [ ] **Step 4: Commit**

```bash
git add src/components/Layout.astro src/components/LangToggle.astro
git commit -m "feat: language auto-detect with manual toggle persistence"
```

---

## Phase E — Pages

### Task 13: HomePage component + EN/HI route wrappers

**Files:**
- Create: `src/components/pages/HomePage.astro`
- Modify: `src/pages/index.astro`
- Create: `src/pages/hi/index.astro`

- [ ] **Step 1: Create `src/components/pages/HomePage.astro`**

```astro
---
import { getEntry } from 'astro:content';
import Layout from '../Layout.astro';
import { t, type Locale } from '../../i18n/strings';
import { localeUrl } from '../../i18n/urls';
import { siteSchema, type SiteConfig } from '../../content/config';
import yaml from 'js-yaml';
import { readFileSync } from 'node:fs';

interface Props { lang: Locale }
const { lang } = Astro.props;
const s = t(lang);

const entry = await getEntry('pages', `home.${lang}`);
if (!entry) throw new Error(`Missing pages/home.${lang}`);
const { Content } = await entry.render();

const siteRaw = readFileSync(new URL('../../content/site.yaml', import.meta.url), 'utf8');
const site = siteSchema.parse(yaml.load(siteRaw)) as SiteConfig;
---
<Layout lang={lang} title={entry.data.title}>
  <section class="hero">
    <h1>{site.coupleNames.partner1} &amp; {site.coupleNames.partner2}</h1>
    <p class="date">27 February 2027 · {site.venue.city}, {site.venue.country}</p>
    <Content />
    <div class="cta-row">
      <a class="button" href={localeUrl(lang, '/rsvp/')}>{s.nav.rsvp}</a>
      <a class="button button-secondary" href={localeUrl(lang, '/schedule/')}>{s.nav.schedule}</a>
    </div>
  </section>
</Layout>

<style>
  .hero { text-align: center; padding: 2rem 0 3rem; }
  .date { font-family: var(--font-heading); font-size: 1.25rem; color: var(--color-text-muted); margin-bottom: 1.5rem; }
  .cta-row { display: flex; justify-content: center; gap: 1rem; flex-wrap: wrap; margin-top: 1.5rem; }
  .button-secondary { background: var(--color-accent); color: var(--color-text); }
  .button-secondary:hover { background: var(--color-accent-light); }
</style>
```

- [ ] **Step 2: Replace `src/pages/index.astro`**

```astro
---
import HomePage from '../components/pages/HomePage.astro';
---
<HomePage lang="en" />
```

- [ ] **Step 3: Create `src/pages/hi/index.astro`**

```astro
---
import HomePage from '../../components/pages/HomePage.astro';
---
<HomePage lang="hi" />
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: PASS. Both `dist/website-wedding/index.html` and `dist/website-wedding/hi/index.html` exist.

- [ ] **Step 5: Commit**

```bash
git add src/components/pages/HomePage.astro src/pages/index.astro src/pages/hi/index.astro
git commit -m "feat: home page with hero and CTAs"
```

---

### Task 14: SchedulePage

**Files:**
- Create: `src/components/pages/SchedulePage.astro`
- Create: `src/pages/schedule.astro`
- Create: `src/pages/hi/schedule.astro`

- [ ] **Step 1: Create `src/components/pages/SchedulePage.astro`**

> **Note**: Astro 5 i18n routing strips locale dots from the URL slug, but the content-collection `id` field still contains the raw filename (e.g. `01-mehendi.en.md`). Filter on `id.endsWith('.${lang}.md')` — see HomePage.astro from Task 13 for the working pattern.

```astro
---
import { getCollection } from 'astro:content';
import Layout from '../Layout.astro';
import type { Locale } from '../../i18n/strings';
import { t } from '../../i18n/strings';

interface Props { lang: Locale }
const { lang } = Astro.props;
const s = t(lang);

const all = await getCollection('schedule', e => e.id.endsWith(`.${lang}.md`));
const day1 = all.filter(e => e.data.day === 1).sort((a, b) => a.data.order - b.data.order);
const day2 = all.filter(e => e.data.day === 2).sort((a, b) => a.data.order - b.data.order);

const dayLabel = (n: 1 | 2) => {
  if (lang === 'en') return n === 1 ? 'Day 1 — 26 February 2027' : 'Day 2 — 27 February 2027';
  return n === 1 ? 'दिन 1 — 26 फ़रवरी 2027' : 'दिन 2 — 27 फ़रवरी 2027';
};
---
<Layout lang={lang} title={s.nav.schedule}>
  <h1>{s.nav.schedule}</h1>
  <div class="days">
    {[{ n: 1 as const, items: day1 }, { n: 2 as const, items: day2 }].map(({ n, items }) => (
      <section>
        <h2>{dayLabel(n)}</h2>
        {items.length === 0 && <p class="subtitle">TBD</p>}
        {items.map(async (entry) => {
          const { Content } = await entry.render();
          return (
            <article class="card schedule-event">
              <header>
                <h3>{entry.data.name}</h3>
                <p class="time">
                  {entry.data.startTime}
                  {entry.data.endTime && entry.data.endTime !== entry.data.startTime ? ` – ${entry.data.endTime}` : ''}
                </p>
                {entry.data.location && <p class="subtitle">{entry.data.location}</p>}
                {entry.data.dressCode && <p class="subtitle"><strong>{lang === 'en' ? 'Dress code' : 'ड्रेस कोड'}:</strong> {entry.data.dressCode}</p>}
              </header>
              <Content />
            </article>
          );
        })}
      </section>
    ))}
  </div>
</Layout>

<style>
  .days { display: grid; gap: 2rem; }
  @media (min-width: 1024px) { .days { grid-template-columns: 1fr 1fr; } }
  .schedule-event { margin-bottom: 1rem; }
  .schedule-event .time { font-family: var(--font-heading); font-size: 1.1rem; color: var(--color-primary); margin: 0 0 0.25rem; }
</style>
```

- [ ] **Step 2: Create `src/pages/schedule.astro`**

```astro
---
import SchedulePage from '../components/pages/SchedulePage.astro';
---
<SchedulePage lang="en" />
```

- [ ] **Step 3: Create `src/pages/hi/schedule.astro`**

```astro
---
import SchedulePage from '../../components/pages/SchedulePage.astro';
---
<SchedulePage lang="hi" />
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: PASS. `dist/website-wedding/schedule/index.html` and `dist/website-wedding/hi/schedule/index.html` exist with both events listed under the correct day.

- [ ] **Step 5: Commit**

```bash
git add src/components/pages/SchedulePage.astro src/pages/schedule.astro src/pages/hi/schedule.astro
git commit -m "feat: schedule page with two-day timeline"
```

---

### Task 15: TravelPage

**Files:**
- Create: `src/components/pages/TravelPage.astro`
- Create: `src/pages/travel.astro`
- Create: `src/pages/hi/travel.astro`

- [ ] **Step 1: Create `src/components/pages/TravelPage.astro`**

> **Note**: Use `getCollection('pages').find(p => p.id === 'travel.${lang}.md')` instead of `getEntry`. Astro 5 i18n routing breaks slug-based lookups for files containing locale dots — see HomePage.astro from Task 13 for the working pattern.

```astro
---
import { getCollection } from 'astro:content';
import Layout from '../Layout.astro';
import { t, type Locale } from '../../i18n/strings';

interface Props { lang: Locale }
const { lang } = Astro.props;
const s = t(lang);

const pages = await getCollection('pages');
const entry = pages.find(p => p.id === `travel.${lang}.md`);
if (!entry) throw new Error(`Missing pages/travel.${lang}.md`);
const { Content } = await entry.render();
---
<Layout lang={lang} title={s.nav.travel}>
  <h1>{entry.data.title}</h1>
  <article class="card">
    <Content />
  </article>
</Layout>
```

- [ ] **Step 2: Create the route wrappers**

`src/pages/travel.astro`:

```astro
---
import TravelPage from '../components/pages/TravelPage.astro';
---
<TravelPage lang="en" />
```

`src/pages/hi/travel.astro`:

```astro
---
import TravelPage from '../../components/pages/TravelPage.astro';
---
<TravelPage lang="hi" />
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/pages/TravelPage.astro src/pages/travel.astro src/pages/hi/travel.astro
git commit -m "feat: travel page"
```

---

### Task 16: FaqPage

**Files:**
- Create: `src/components/pages/FaqPage.astro`
- Create: `src/pages/faq.astro`
- Create: `src/pages/hi/faq.astro`

- [ ] **Step 1: Create `src/components/pages/FaqPage.astro`**

```astro
---
import { getCollection } from 'astro:content';
import Layout from '../Layout.astro';
import { t, type Locale } from '../../i18n/strings';

interface Props { lang: Locale }
const { lang } = Astro.props;
const s = t(lang);

const items = (await getCollection('faq', e => e.id.endsWith(`.${lang}.md`))).sort((a, b) => a.data.order - b.data.order);
---
<Layout lang={lang} title={s.nav.faq}>
  <h1>{s.nav.faq}</h1>
  <div class="faq-list">
    {items.map(async (entry) => {
      const { Content } = await entry.render();
      return (
        <details class="card faq-item">
          <summary>{entry.data.question}</summary>
          <div class="faq-body">
            <Content />
          </div>
        </details>
      );
    })}
  </div>
</Layout>

<style>
  .faq-list { display: grid; gap: 0.75rem; }
  .faq-item summary {
    cursor: pointer;
    font-family: var(--font-heading);
    font-weight: 600;
    font-size: 1.1rem;
    padding: 0.25rem 0;
    min-height: 44px;
    display: flex;
    align-items: center;
  }
  .faq-body { padding: 0.5rem 0 0; }
</style>
```

- [ ] **Step 2: Create the route wrappers**

`src/pages/faq.astro`:

```astro
---
import FaqPage from '../components/pages/FaqPage.astro';
---
<FaqPage lang="en" />
```

`src/pages/hi/faq.astro`:

```astro
---
import FaqPage from '../../components/pages/FaqPage.astro';
---
<FaqPage lang="hi" />
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: PASS. Both FAQ pages list two accordion items.

- [ ] **Step 4: Commit**

```bash
git add src/components/pages/FaqPage.astro src/pages/faq.astro src/pages/hi/faq.astro
git commit -m "feat: FAQ page with accordions"
```

---

### Task 17: PhotosPage

**Files:**
- Create: `src/components/pages/PhotosPage.astro`
- Create: `src/pages/photos.astro`
- Create: `src/pages/hi/photos.astro`

- [ ] **Step 1: Create `src/components/pages/PhotosPage.astro`**

> **Note**: Use `getCollection('pages').find(...)` instead of `getEntry` (Astro 5 i18n slug issue), and read `site.yaml` via `process.cwd()` (Vite-bundled component limitation). Both patterns are established in HomePage.astro from Task 13 — copy from there.

```astro
---
import { getCollection } from 'astro:content';
import Layout from '../Layout.astro';
import { t, type Locale } from '../../i18n/strings';
import { siteSchema, type SiteConfig } from '../../content/config';
import yaml from 'js-yaml';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

interface Props { lang: Locale }
const { lang } = Astro.props;
const s = t(lang);

const pages = await getCollection('pages');
const entry = pages.find(p => p.id === `photos.${lang}.md`);
if (!entry) throw new Error(`Missing pages/photos.${lang}.md`);
const { Content } = await entry.render();

const siteRaw = readFileSync(resolve(process.cwd(), 'src/content/site.yaml'), 'utf8');
const site = siteSchema.parse(yaml.load(siteRaw)) as SiteConfig;
---
<Layout lang={lang} title={s.nav.photos}>
  <h1>{s.nav.photos}</h1>
  {site.photosAlbumUrl ? (
    <p>
      <a class="button" href={site.photosAlbumUrl} target="_blank" rel="noopener">{lang === 'en' ? 'View album' : 'एल्बम देखें'}</a>
    </p>
  ) : (
    <article class="card">
      <Content />
    </article>
  )}
</Layout>
```

- [ ] **Step 2: Create the route wrappers**

`src/pages/photos.astro`:

```astro
---
import PhotosPage from '../components/pages/PhotosPage.astro';
---
<PhotosPage lang="en" />
```

`src/pages/hi/photos.astro`:

```astro
---
import PhotosPage from '../../components/pages/PhotosPage.astro';
---
<PhotosPage lang="hi" />
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/pages/PhotosPage.astro src/pages/photos.astro src/pages/hi/photos.astro
git commit -m "feat: photos page with placeholder + future album link"
```

---

## Phase F — RSVP

### Task 18: RSVP form validation (pure logic, TDD)

**Files:**
- Create: `src/components/rsvp/validate.ts`
- Create: `tests/rsvp-validate.test.mjs`

The form's pure validation logic lives in `validate.ts`. The DOM-binding code (Task 20) calls these functions and renders error messages.

- [ ] **Step 1: Write failing tests**

`tests/rsvp-validate.test.mjs`:

```js
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
```

The TypeScript file is imported by `node --test` via Node's experimental TS support (Node 20+ with `--experimental-strip-types`). Update the test command:

`package.json`:

```json
"test": "node --experimental-strip-types --no-warnings --test 'tests/**/*.test.mjs'"
```

(Replaces the previous `"test": "node --test tests"` line.)

- [ ] **Step 2: Run tests — expect failure**

Run: `npm test`
Expected: FAIL — `validate.ts` does not exist.

- [ ] **Step 3: Implement `src/components/rsvp/validate.ts`**

```ts
export type RsvpInput = {
  leadName: string;
  additionalGuests: string[];
  day1Attending: 'yes' | 'no' | '';
  day2Attending: 'yes' | 'no' | '';
  dietary: string[];
  dietaryOther: string;
  arrival: string;
  departure: string;
  accommodation: 'sorted' | 'recommended' | 'help' | '';
  whatsapp: string;
  notes: string;
  honeypot: string;
};

export type ValidationErrorCode =
  | 'leadNameRequired'
  | 'whatsappRequired'
  | 'whatsappFormat'
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
  else if (!/^\+\d{6,15}$/.test(whatsapp)) errors.whatsapp = 'whatsappFormat';

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const additionalGuests = (raw.additionalGuests ?? []).map(trim).filter(Boolean).map(cap);

  return {
    ok: true,
    value: {
      leadName: cap(leadName),
      additionalGuests,
      day1Attending: raw.day1Attending,
      day2Attending: raw.day2Attending,
      dietary: (raw.dietary ?? []).map(trim).filter(Boolean),
      dietaryOther: cap(trim(raw.dietaryOther)),
      arrival: cap(trim(raw.arrival)),
      departure: cap(trim(raw.departure)),
      accommodation: raw.accommodation,
      whatsapp,
      notes: cap(trim(raw.notes)),
      honeypot: ''
    }
  };
}
```

- [ ] **Step 4: Run tests — expect pass**

Run: `npm test`
Expected: 6 RSVP tests pass; the existing 10 i18n tests still pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/rsvp/validate.ts tests/rsvp-validate.test.mjs package.json
git commit -m "feat: RSVP validation logic with tests"
```

---

### Task 19: RsvpForm component (UI markup)

**Files:**
- Create: `src/components/rsvp/RsvpForm.astro`

This component renders the form markup. Submission logic is wired in Task 20.

- [ ] **Step 1: Create `src/components/rsvp/RsvpForm.astro`**

```astro
---
import { t, type Locale } from '../../i18n/strings';

interface Props { lang: Locale; appsScriptUrl: string }
const { lang, appsScriptUrl } = Astro.props;
const s = t(lang).rsvp;
---
<form class="rsvp-form card" data-rsvp data-endpoint={appsScriptUrl} data-lang={lang} novalidate>
  <h2>{s.formTitle}</h2>

  <div class="field">
    <label for="leadName">{s.leadName}</label>
    <input id="leadName" name="leadName" type="text" required maxlength="100" />
    <p class="error-text" data-error="leadName" hidden></p>
  </div>

  <fieldset class="field">
    <legend>{s.additionalGuests}</legend>
    <div data-additional-guests>
      <input name="additionalGuests[]" type="text" maxlength="100" />
    </div>
    <button type="button" class="button button-secondary" data-add-guest>{s.addGuest}</button>
  </fieldset>

  <fieldset class="field">
    <legend>{s.day1Question}</legend>
    <label><input type="radio" name="day1Attending" value="yes" required /> {s.yes}</label>
    <label><input type="radio" name="day1Attending" value="no" /> {s.no}</label>
  </fieldset>

  <fieldset class="field">
    <legend>{s.day2Question}</legend>
    <label><input type="radio" name="day2Attending" value="yes" required /> {s.yes}</label>
    <label><input type="radio" name="day2Attending" value="no" /> {s.no}</label>
  </fieldset>

  <fieldset class="field">
    <legend>{s.dietary}</legend>
    {Object.entries(s.dietaryOptions).map(([key, label]) => (
      <label><input type="checkbox" name="dietary" value={key} /> {label}</label>
    ))}
    <label class="block">
      <span>{s.dietaryOther}</span>
      <input type="text" name="dietaryOther" maxlength="200" />
    </label>
  </fieldset>

  <div class="field">
    <label for="arrival">{s.arrival}</label>
    <input id="arrival" name="arrival" type="text" maxlength="100" />
  </div>
  <div class="field">
    <label for="departure">{s.departure}</label>
    <input id="departure" name="departure" type="text" maxlength="100" />
  </div>

  <fieldset class="field">
    <legend>{s.accommodation}</legend>
    {Object.entries(s.accommodationOptions).map(([key, label]) => (
      <label><input type="radio" name="accommodation" value={key} required /> {label}</label>
    ))}
  </fieldset>

  <div class="field">
    <label for="whatsapp">{s.whatsapp}</label>
    <input id="whatsapp" name="whatsapp" type="tel" placeholder={s.whatsappPlaceholder} required maxlength="20" />
    <p class="error-text" data-error="whatsapp" hidden></p>
  </div>

  <div class="field">
    <label for="notes">{s.notes}</label>
    <textarea id="notes" name="notes" rows="3" maxlength="500"></textarea>
  </div>

  <div class="honeypot" aria-hidden="true">
    <label for="favourite_pet">Leave this empty</label>
    <input id="favourite_pet" name="favourite_pet" type="text" tabindex="-1" autocomplete="off" />
  </div>

  <button type="submit" class="button" data-submit>{s.submit}</button>
  <p class="error-text" data-form-error hidden></p>
</form>

<div class="rsvp-success card" data-success hidden>
  <h2>{s.successTitle}</h2>
  <p data-success-body></p>
</div>

<style>
  .rsvp-form .field { margin-bottom: 1.25rem; }
  .rsvp-form fieldset { border: none; padding: 0; }
  .rsvp-form fieldset legend { font-family: var(--font-heading); font-weight: 600; margin-bottom: 0.5rem; }
  .rsvp-form label { display: inline-flex; align-items: center; gap: 0.4rem; min-height: 44px; padding-right: 1rem; }
  .rsvp-form label.block { display: block; padding: 0; min-height: auto; }
  .rsvp-form label.block span { display: block; margin-bottom: 0.25rem; }
  [data-additional-guests] input { margin-bottom: 0.5rem; }
</style>
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: PASS (form renders into static HTML; submission logic added next task).

- [ ] **Step 3: Commit**

```bash
git add src/components/rsvp/RsvpForm.astro
git commit -m "feat: RSVP form markup"
```

---

### Task 20: RSVP client submission script + RsvpPage wiring

**Files:**
- Create: `src/components/rsvp/client.ts`
- Create: `src/components/pages/RsvpPage.astro`
- Create: `src/pages/rsvp.astro`
- Create: `src/pages/hi/rsvp.astro`
- Modify: `astro.config.mjs` (add `APPS_SCRIPT_URL` env exposure)

- [ ] **Step 1: Create `src/components/rsvp/client.ts`**

```ts
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
      body: JSON.stringify(validation.value)
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
```

- [ ] **Step 2: Create `src/components/pages/RsvpPage.astro`**

```astro
---
import Layout from '../Layout.astro';
import RsvpForm from '../rsvp/RsvpForm.astro';
import { t, type Locale } from '../../i18n/strings';

interface Props { lang: Locale }
const { lang } = Astro.props;
const s = t(lang);
const appsScriptUrl = import.meta.env.PUBLIC_APPS_SCRIPT_URL ?? '';
---
<Layout lang={lang} title={s.nav.rsvp}>
  <h1>{s.rsvp.formTitle}</h1>
  {appsScriptUrl ? (
    <RsvpForm lang={lang} appsScriptUrl={appsScriptUrl} />
  ) : (
    <p class="error-text">{lang === 'en' ? 'RSVP endpoint not configured. Set PUBLIC_APPS_SCRIPT_URL.' : 'RSVP endpoint कॉन्फ़िगर नहीं है।'}</p>
  )}
  <script>
    // RsvpPage lives at src/components/pages/, client at src/components/rsvp/, so the
    // relative path from this file is `../rsvp/client` (one level up to components/, then into rsvp/).
    import '../rsvp/client';
  </script>
</Layout>
```

The `<script>` block with an `import` is processed and bundled by Astro at build time — emitted as a deferred ES module so `client.ts`'s top-level DOM queries run after the form HTML is parsed.

- [ ] **Step 3: Create the route wrappers**

`src/pages/rsvp.astro`:

```astro
---
import RsvpPage from '../components/pages/RsvpPage.astro';
---
<RsvpPage lang="en" />
```

`src/pages/hi/rsvp.astro`:

```astro
---
import RsvpPage from '../../components/pages/RsvpPage.astro';
---
<RsvpPage lang="hi" />
```

- [ ] **Step 4: Document `PUBLIC_APPS_SCRIPT_URL` env var**

Append to `README.md`:

```markdown

## Environment variables

| Var | Where | Purpose |
|---|---|---|
| `PUBLIC_APPS_SCRIPT_URL` | Build (CI secret + local `.env.local`) | The deployed Apps Script web-app URL the RSVP form POSTs to |
| `SITE_URL` | Build | Absolute origin of the deployed site (used by Astro for canonical/asset URLs) |

For local development, create `.env.local`:

```text
PUBLIC_APPS_SCRIPT_URL=https://script.google.com/macros/s/<deployment-id>/exec
SITE_URL=http://localhost:4321
```
```

- [ ] **Step 5: Verify build with placeholder env**

Run:

```bash
PUBLIC_APPS_SCRIPT_URL=https://example.invalid/exec npm run build
```

Expected: PASS. The form is rendered into both `dist/website-wedding/rsvp/index.html` and `dist/website-wedding/hi/rsvp/index.html`.

- [ ] **Step 6: Commit**

```bash
git add src/components/rsvp/client.ts src/components/pages/RsvpPage.astro src/pages/rsvp.astro src/pages/hi/rsvp.astro README.md
git commit -m "feat: RSVP page with client-side submission"
```

---

## Phase G — Apps Script backend

### Task 21: Apps Script pure logic + tests

**Files:**
- Create: `apps-script/lib.gs`
- Create: `tests/apps-script-lib.test.mjs`

The pure logic — payload parsing, origin allow-list, throttle decision — lives in `lib.gs` so it's testable in Node. Apps Script `.gs` files are JavaScript with extra globals; we run `lib.gs` through Node's `vm` module with mocked globals.

- [ ] **Step 1: Write failing tests**

`tests/apps-script-lib.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

function loadLib() {
  const code = readFileSync(new URL('../apps-script/lib.gs', import.meta.url), 'utf8');
  const sandbox = { module: { exports: {} } };
  // Wrap the .gs file so `var` declarations attach to module.exports.
  runInNewContext(`${code}\nmodule.exports = { parsePayload, isAllowedOrigin, isThrottled };`, sandbox);
  return sandbox.module.exports;
}

test('parsePayload returns ok for valid JSON', () => {
  const { parsePayload } = loadLib();
  const r = parsePayload('{"leadName":"X","whatsapp":"+919999999999","day1Attending":"yes","day2Attending":"no","accommodation":"sorted","additionalGuests":[],"dietary":[],"dietaryOther":"","arrival":"","departure":"","notes":"","honeypot":""}');
  assert.equal(r.ok, true);
  assert.equal(r.value.leadName, 'X');
});

test('parsePayload returns invalid_payload for missing required fields', () => {
  const { parsePayload } = loadLib();
  const r = parsePayload('{"leadName":""}');
  assert.equal(r.ok, false);
  assert.equal(r.code, 'invalid_payload');
});

test('parsePayload returns invalid_payload for filled honeypot', () => {
  const { parsePayload } = loadLib();
  const r = parsePayload('{"leadName":"X","whatsapp":"+919999999999","day1Attending":"yes","day2Attending":"no","accommodation":"sorted","honeypot":"spam","additionalGuests":[],"dietary":[],"dietaryOther":"","arrival":"","departure":"","notes":""}');
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
```

- [ ] **Step 2: Run tests — expect failure**

Run: `npm test`
Expected: new tests fail (`apps-script/lib.gs` does not exist).

- [ ] **Step 3: Implement `apps-script/lib.gs`**

```js
function parsePayload(rawBody) {
  var data;
  try {
    data = JSON.parse(rawBody || '{}');
  } catch (e) {
    return { ok: false, code: 'invalid_payload' };
  }
  if (data && typeof data.honeypot === 'string' && data.honeypot.trim() !== '') {
    return { ok: false, code: 'invalid_payload' };
  }
  if (!data || typeof data.leadName !== 'string' || data.leadName.trim() === '') {
    return { ok: false, code: 'invalid_payload' };
  }
  if (typeof data.whatsapp !== 'string' || !/^\+\d{6,15}$/.test(data.whatsapp)) {
    return { ok: false, code: 'invalid_payload' };
  }
  if (data.day1Attending !== 'yes' && data.day1Attending !== 'no') {
    return { ok: false, code: 'invalid_payload' };
  }
  if (data.day2Attending !== 'yes' && data.day2Attending !== 'no') {
    return { ok: false, code: 'invalid_payload' };
  }
  if (['sorted', 'recommended', 'help'].indexOf(data.accommodation) === -1) {
    return { ok: false, code: 'invalid_payload' };
  }
  return { ok: true, value: data };
}

function isAllowedOrigin(origin, allowList) {
  if (!origin) return false;
  for (var i = 0; i < allowList.length; i++) {
    if (allowList[i] === origin) return true;
  }
  return false;
}

function isThrottled(nowMs, lastSubmissionMs, windowMs) {
  if (lastSubmissionMs == null) return false;
  return (nowMs - lastSubmissionMs) < windowMs;
}
```

- [ ] **Step 4: Run tests — expect pass**

Run: `npm test`
Expected: 7 new tests pass; total test count rises accordingly.

- [ ] **Step 5: Commit**

```bash
git add apps-script/lib.gs tests/apps-script-lib.test.mjs
git commit -m "feat: Apps Script pure logic with tests"
```

---

### Task 22: Apps Script Web App (Code.gs + manifest + clasp config)

**Files:**
- Create: `apps-script/Code.gs`
- Create: `apps-script/appsscript.json`
- Create: `apps-script/.claspignore`
- Create: `apps-script/README.md`
- Modify: `.gitignore` (ignore `apps-script/.clasp.json` which contains the script ID)

`Code.gs` is the Apps Script entry point — it consumes `lib.gs` and adds the Sheet I/O. It is **not** unit-tested; the test plan is a manual submission to a staging Sheet (Task 30 step).

- [ ] **Step 1: Create `apps-script/appsscript.json`**

```json
{
  "timeZone": "Asia/Kolkata",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "webapp": {
    "executeAs": "USER_DEPLOYING",
    "access": "ANYONE_ANONYMOUS"
  }
}
```

- [ ] **Step 2: Create `apps-script/Code.gs`**

```js
var ALLOWED_ORIGINS = [
  'https://example.github.io'  // Replace with the deployed origin once known.
];
var THROTTLE_WINDOW_MS = 10000;
var SUBMISSIONS_TAB = 'submissions';

function doPost(e) {
  var origin = (e && e.parameter && e.parameter.origin)
    || (e && e.requestHeaders && e.requestHeaders['Origin'])
    || '';
  if (!isAllowedOrigin(origin, ALLOWED_ORIGINS)) {
    return jsonResponse({ status: 'error', code: 'invalid_origin' });
  }

  var rawBody = e && e.postData && e.postData.contents;
  var parsed = parsePayload(rawBody);
  if (!parsed.ok) {
    return jsonResponse({ status: 'error', code: parsed.code });
  }
  var data = parsed.value;

  var lock = LockService.getScriptLock();
  try { lock.waitLock(5000); } catch (lockErr) {
    return jsonResponse({ status: 'error', code: 'internal' });
  }
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SUBMISSIONS_TAB);
    if (!sheet) sheet = createSubmissionsSheet();
    var nowMs = new Date().getTime();
    var lastMs = lookupLastSubmissionMs(sheet, data.whatsapp);
    if (isThrottled(nowMs, lastMs, THROTTLE_WINDOW_MS)) {
      return jsonResponse({ status: 'error', code: 'throttled' });
    }
    appendRow(sheet, nowMs, data);
  } finally {
    lock.releaseLock();
  }
  return jsonResponse({ status: 'ok' });
}

function doGet() {
  // ContentService has no HTTP status-code setter — Apps Script web apps
  // always respond 200 unless they throw. Returning an error code in the
  // body is the closest we can get for "method not allowed".
  return jsonResponse({ status: 'error', code: 'invalid_origin' });
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function createSubmissionsSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.insertSheet(SUBMISSIONS_TAB);
  sheet.appendRow([
    'timestamp', 'lead_name', 'additional_guests', 'day1_attending', 'day2_attending',
    'dietary', 'dietary_other', 'arrival', 'departure', 'accommodation', 'whatsapp', 'notes', 'raw_json'
  ]);
  return sheet;
}

function lookupLastSubmissionMs(sheet, whatsapp) {
  var rows = sheet.getDataRange().getValues();
  var lastMs = null;
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][10] === whatsapp) {
      var ts = rows[i][0];
      var ms = ts instanceof Date ? ts.getTime() : Number(ts);
      if (!lastMs || ms > lastMs) lastMs = ms;
    }
  }
  return lastMs;
}

function appendRow(sheet, nowMs, d) {
  sheet.appendRow([
    new Date(nowMs).toISOString(),
    d.leadName,
    JSON.stringify(d.additionalGuests || []),
    d.day1Attending,
    d.day2Attending,
    JSON.stringify(d.dietary || []),
    d.dietaryOther || '',
    d.arrival || '',
    d.departure || '',
    d.accommodation,
    d.whatsapp,
    d.notes || '',
    JSON.stringify(d)
  ]);
}
```

- [ ] **Step 3: Create `apps-script/.claspignore`**

```text
# Files in this directory not pushed by clasp
README.md
.claspignore
```

- [ ] **Step 4: Append `.clasp.json` to `.gitignore`**

Append to `.gitignore`:

```text
.clasp.json
```

`.clasp.json` lives at the repo root and contains the script ID. It's generated locally per developer (and at CI runtime by the apps-script-push workflow). Not committed because the script ID is one of the few pieces of project state the spec keeps out of git.

- [ ] **Step 5: Create `apps-script/README.md`**

```markdown
# Apps Script — RSVP backend

Code lives here in version control and is pushed to Google via [clasp].

## One-time setup

1. Create a Google Sheet that will hold the RSVP submissions.
2. Open it, then *Extensions → Apps Script*. Note the script ID from the URL
   (`https://script.google.com/u/0/home/projects/<scriptId>/edit`).
3. Locally (from the **repository root**, not from `apps-script/`):

   ```bash
   npm i -g @google/clasp     # one-time
   clasp login                 # one-time
   echo '{"scriptId":"<scriptId>","rootDir":"./apps-script"}' > .clasp.json
   make script-push            # pushes Code.gs + lib.gs + appsscript.json
   ```

   Keeping `.clasp.json` at the repo root (with `rootDir: ./apps-script`) matches what CI does in `apps-script-push.yml`.

4. Edit `Code.gs` and replace `ALLOWED_ORIGINS` with the deployed GitHub
   Pages origin (e.g. `https://<your-username>.github.io`).
5. `make script-push` again to upload the change.
6. In the Apps Script editor: *Deploy → New deployment → Web app*. Set:
   - Execute as: **Me**
   - Who has access: **Anyone**
7. Copy the resulting `https://script.google.com/macros/s/.../exec` URL.
8. Add it as a GitHub Actions secret named `PUBLIC_APPS_SCRIPT_URL`.

## Re-deploying after Code.gs changes

`clasp push` uploads new code, but the published web-app URL is pinned to a
specific deployment version. To make changes live:

1. `make script-push`
2. `make script-open` — opens the editor
3. *Deploy → Manage deployments → (select existing) → Edit (pencil) →
   Version: New version → Deploy*
4. The deployment URL is unchanged, so no GitHub secret update needed.

## Manual smoke test

After every redeploy, post a test payload from the terminal:

```bash
curl -X POST "$PUBLIC_APPS_SCRIPT_URL" \
  -H "Origin: https://<your-username>.github.io" \
  -H "Content-Type: text/plain" \
  -d '{"leadName":"Test","whatsapp":"+919999999999","day1Attending":"yes","day2Attending":"no","accommodation":"sorted","additionalGuests":[],"dietary":[],"dietaryOther":"","arrival":"","departure":"","notes":"","honeypot":""}'
```

Expected: `{"status":"ok"}` and a new row in the `submissions` tab.

[clasp]: https://github.com/google/clasp
```

- [ ] **Step 6: Commit**

```bash
git add apps-script .gitignore
git commit -m "feat: Apps Script web app + clasp setup"
```

---

## Phase H — CI/CD

### Task 23: PR-checks workflow

**Files:**
- Create: `.github/workflows/pr-checks.yml`

- [ ] **Step 1: Create `.github/workflows/pr-checks.yml`**

```yaml
name: PR checks

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: .node-version
          cache: npm
      - run: npm ci
      - run: npm run i18n:check
      - run: npx astro sync
      - run: npx astro check
      - run: npm test
      - run: npm run build
        env:
          PUBLIC_APPS_SCRIPT_URL: https://example.invalid/exec
          SITE_URL: https://example.github.io
```

- [ ] **Step 2: Commit and verify**

```bash
git add .github/workflows/pr-checks.yml
git commit -m "ci: add PR checks workflow"
```

After pushing the branch and opening a PR (or pushing to a feature branch), confirm the workflow runs green in GitHub Actions. If it fails, fix locally — do not edit the workflow to bypass.

---

### Task 24: Deploy workflow

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: Create `.github/workflows/deploy.yml`**

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: .node-version
          cache: npm
      - run: npm ci
      - run: npm run i18n:check
      - run: npx astro sync
      - run: npx astro check
      - run: npm test
      - name: Build
        env:
          PUBLIC_APPS_SCRIPT_URL: ${{ secrets.PUBLIC_APPS_SCRIPT_URL }}
          SITE_URL: https://${{ github.repository_owner }}.github.io
        run: npm run build
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Configure GitHub Pages source**

Manually in the GitHub repo: *Settings → Pages → Build and deployment → Source: GitHub Actions*.

- [ ] **Step 3: Add `PUBLIC_APPS_SCRIPT_URL` secret**

In *Settings → Secrets and variables → Actions → New repository secret*: name `PUBLIC_APPS_SCRIPT_URL`, value the URL from the Apps Script deployment (Task 22 step 7).

- [ ] **Step 4: Commit and verify**

```bash
git add .github/workflows/deploy.yml
git commit -m "ci: add GitHub Pages deploy workflow"
```

Push to `main`, watch the Actions tab. Expected: `build` then `deploy` jobs succeed; the site is live at `https://<owner>.github.io/website-wedding/`.

---

### Task 25: Apps Script push workflow

**Files:**
- Create: `.github/workflows/apps-script-push.yml`

This workflow runs `clasp push` from CI. It needs OAuth credentials. The simplest method: store the contents of `~/.clasprc.json` (created by `clasp login`) as a GitHub secret `CLASP_AUTH`.

- [ ] **Step 1: Create `.github/workflows/apps-script-push.yml`**

```yaml
name: Apps Script — push

on:
  workflow_dispatch:

jobs:
  push:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: .node-version
          cache: npm
      - run: npm ci
      - name: Configure clasp credentials
        run: |
          echo "$CLASP_AUTH" > ~/.clasprc.json
          chmod 600 ~/.clasprc.json
        env:
          CLASP_AUTH: ${{ secrets.CLASP_AUTH }}
      - name: Configure clasp project
        run: |
          echo '{"scriptId":"${{ secrets.APPS_SCRIPT_ID }}","rootDir":"./apps-script"}' > .clasp.json
      - run: npx clasp push --force
      - name: Note
        run: echo "Note - this only pushes the source. To make changes live, follow the manual deploy step in apps-script/README.md."
```

- [ ] **Step 2: Add the required secrets**

- `CLASP_AUTH` — paste the entire JSON contents of your local `~/.clasprc.json` after running `clasp login`
- `APPS_SCRIPT_ID` — the script ID from the Apps Script URL (same one you used in `apps-script/.clasp.json` locally)

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/apps-script-push.yml
git commit -m "ci: add manual workflow to push Apps Script via clasp"
```

---

## Phase I — Developer experience polish

### Task 26: Makefile

**Files:**
- Create: `Makefile`

- [ ] **Step 1: Create `Makefile`** (use **tab** indentation for command lines)

```makefile
.DEFAULT_GOAL := help

PORT ?= 4321
HOST ?= 0.0.0.0

help:        ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) \
	  | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

setup:       ## Install all dependencies (run once after clone)
	@command -v node >/dev/null || (echo "Node.js required (see .node-version)"; exit 1)
	npm ci
	npx husky init || true

dev:         ## Run Astro dev server with HMR
	npm run dev -- --host $(HOST) --port $(PORT)

build:       ## Production build to ./dist
	npm run i18n:check
	npx astro check
	npm run build

preview: build  ## Build and serve the production output locally
	npm run preview -- --host $(HOST) --port $(PORT)

serve: preview  ## Alias for preview

check:       ## Run all checks (i18n parity, content schemas, types, tests)
	npm run i18n:check
	npx astro check
	npm test

rehash:      ## Bump enHash. Usage: make rehash NAME=01-mehendi
	npm run i18n:rehash -- $(NAME)

script-push: ## Push Apps Script via clasp
	npm run script:push

script-open: ## Open Apps Script editor for manual deploy
	npm run script:open

clean:       ## Remove build artifacts and node_modules
	rm -rf dist node_modules .astro

.PHONY: help setup dev build preview serve check rehash script-push script-open clean
```

- [ ] **Step 2: Verify**

Run: `make help`
Expected: prints the list of targets with descriptions.

Run: `make check`
Expected: all three checks pass.

- [ ] **Step 3: Commit**

```bash
git add Makefile
git commit -m "chore: add Makefile for common workflows"
```

---

### Task 27: Expanded README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace `README.md` with the full version**

```markdown
# website-wedding

Wedding website for **Apeksha and Padraic** — 27 February 2027, Gurgaon.
Bilingual (English + Hindi), static, deployed to GitHub Pages.

Spec: `docs/superpowers/specs/2026-05-06-wedding-website-design.md`
Plan: `docs/superpowers/plans/2026-05-06-wedding-website.md`

---

## Quickstart

```bash
make setup      # install deps + initialise husky hook
make dev        # http://localhost:4321/website-wedding/
```

## Common tasks

- `make build` — production build to `./dist/`
- `make preview` — build, then serve the production output
- `make check` — run i18n parity, type-check, and tests
- `make rehash NAME=01-mehendi` — refresh `enHash` after syncing a Hindi translation

## Editing content

All content is in `src/content/`:

```
src/content/
├── site.yaml             # global config (names, date, venue, contact)
├── pages/                # home, travel, photos
├── schedule/             # one file per event (numbered to control order)
└── faq/                  # one file per question
```

Each entry has paired `.en.md` and `.hi.md` files. **Both must exist and stay in sync.** After editing the English version of a file, also update the Hindi version, then run:

```bash
make rehash NAME=<basename>     # e.g. make rehash NAME=01-mehendi
```

This recomputes the `enHash` field in the Hindi file. CI will fail if you forget.

## Adding a new schedule event or FAQ entry

1. Create both files: `src/content/schedule/03-reception.en.md` and `03-reception.hi.md`.
2. Use the `order` field to control display order within a day.
3. Run `make rehash NAME=03-reception`.
4. Run `make check` locally before committing.

## Environment variables

| Var | Where | Purpose |
|---|---|---|
| `PUBLIC_APPS_SCRIPT_URL` | Build (CI secret + local `.env.local`) | The deployed Apps Script web-app URL the RSVP form POSTs to |
| `SITE_URL` | Build | Absolute origin of the deployed site (used by Astro for canonical URLs) |

For local development create `.env.local`:

```text
PUBLIC_APPS_SCRIPT_URL=https://script.google.com/macros/s/<deployment-id>/exec
SITE_URL=http://localhost:4321
```

## RSVP backend

The form POSTs to a Google Apps Script web app that writes to a Google Sheet.
See `apps-script/README.md` for setup and redeploy steps.

## Privacy

The site is `noindex`'d via `<meta>` tag and `robots.txt`. Anyone with the URL
can still view it — there is no password gate by design.

## Deployment

Pushes to `main` trigger `.github/workflows/deploy.yml`, which builds and
publishes to GitHub Pages. The Apps Script is deployed manually (see
`apps-script/README.md`).

## Repository layout

```
.github/workflows/    CI: PR checks, deploy, apps-script push
.husky/pre-commit     Runs i18n:check before commit
apps-script/          Google Apps Script source + manifest
docs/superpowers/     Spec and plan
public/               Static assets (robots.txt, fonts)
scripts/              i18n parity tooling
src/                  Astro source — components, content, pages, styles
tests/                Node test runner specs
```
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: expand README with content workflow"
```

---

### Task 28: Final smoke test

This task runs no code changes — it's the manual checklist that closes the loop on a real deployment.

**Files:** none

- [ ] **Step 1: Set up the Apps Script (if not already done in Task 22)**

Follow `apps-script/README.md` end to end. End state: a deployment URL captured as the `PUBLIC_APPS_SCRIPT_URL` GitHub secret.

- [ ] **Step 2: Trigger a deploy**

Push to `main` (or run the deploy workflow from the Actions tab via *Run workflow*). Wait for both `build` and `deploy` jobs to succeed.

- [ ] **Step 3: Visit the site and walk every page**

Open `https://<owner>.github.io/website-wedding/`. Confirm:

- [ ] Home page renders with names, date, two CTAs.
- [ ] Schedule page lists Mehendi (Day 1) and Wedding (Day 2).
- [ ] Travel page renders the placeholder copy.
- [ ] FAQ page shows two accordion items, expandable.
- [ ] Photos page shows the "coming soon" placeholder.
- [ ] RSVP page shows the form.
- [ ] Click `हिंदी` toggle — every page has a Hindi equivalent.
- [ ] Hard-refresh — auto-detect respects the stored preference.
- [ ] Open in a Chrome incognito window with `accept-language: hi-IN` (DevTools *Sensors* tab) — the site auto-redirects to `/hi/`.
- [ ] In DevTools *Lighthouse* run a mobile audit. Expected: accessibility score ≥ 95, performance ≥ 80, no critical errors.
- [ ] *View source* on any page — confirm `<meta name="robots" content="noindex, nofollow">` is present.

- [ ] **Step 4: Submit a real test RSVP**

Submit the form with a fake but realistic payload. Expected:
- Success panel appears with "Thank you, {name}".
- A new row appears in the `submissions` tab of the Sheet.
- Re-submitting the same form within 10 seconds displays the throttled error inline.
- Re-submitting after 10 seconds appends a second row.

- [ ] **Step 5: Verify privacy posture**

`curl https://<owner>.github.io/website-wedding/robots.txt` → returns `Disallow: /`.

- [ ] **Step 6: Drop in the SRK silhouette asset (if available)**

If the silhouette file is ready, save it to `src/assets/motifs/hero-srk-silhouette.svg` and add a placeholder `<img>` to `HomePage.astro`'s hero section. (Out of strict scope for v1; can be a follow-up commit.)

- [ ] **Step 7: Tag the v1 release**

```bash
git tag -a v1.0.0 -m "Wedding site v1.0.0 — public launch"
git push origin v1.0.0
```

---

## Self-review against the spec

- §1 Goals — covered (Tasks 1–27)
- §2 Out-of-scope — none of the listed non-goals are implemented (verified)
- §3 Requirements summary — covered:
  - Audience, languages, hosting, CI, content workflow → Tasks 1, 6–9, 11–17, 23–27
  - RSVP backend → Tasks 18–22
  - Photo gallery → Task 17
  - Visual direction → Tasks 10–11, 13
  - Privacy → Task 2 + Task 11 (meta tag in Layout)
  - No Terraform → confirmed (none in plan)
- §4 Site structure — six pages × two locales → Tasks 13–17, 20
- §5 Content model — schemas, layout, pairing → Tasks 3–4
- §6 i18n — routing, page pattern, auto-detect, typography, privacy → Tasks 1, 10–13, 20
- §7 Translation parity — file pairing, hash, invariants, helper scripts, husky → Tasks 6–9
- §8 RSVP flow — form, defence layers, multi-submission, sheet structure, Apps Script handler, CORS, lifecycle, UX, bilingual → Tasks 18–22
- §9 Visual design — palette, motifs (placeholders only — see note below), layout primitives, icons, photography → Tasks 10, 13, 17
- §10 Deployment, CI, local dev — workflows + Makefile → Tasks 23–26
- §11–14 Decisions, risks, testing, tech stack — captured implicitly throughout

**Spec items intentionally simplified for v1 (recorded as follow-ups):**
- Decorative motifs (mehendi watermark, marigold garland with paisley dividers, mandala behind hero, diya spinner, mustard-field SVG, SRK silhouette) — the plan leaves placeholders. They are content additions, not architectural changes; once the SVG assets are commissioned/sourced they drop into `src/assets/motifs/` and are referenced from `Layout.astro`/`HomePage.astro` without other code changes.
- Self-hosted fonts — flagged as a follow-up in `public/fonts/README.md` (Task 10 step 3). Initial site uses the Google Fonts CDN.
- Lucide icons — referenced in `package.json` but not yet rendered. They are imported on demand from `lucide-static` when icons are added; not blocking for v1 since the spec only calls for icons "where strictly useful".

These follow-ups are deliberate scope reductions to hit the one-month launch deadline. None affect the architecture, schemas, or backend.

---

## Execution

Plan complete and saved to `docs/superpowers/plans/2026-05-06-wedding-website.md`.
