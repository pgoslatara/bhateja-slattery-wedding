# Thanks page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a bilingual `/thanks/` page that publicly thanks every wedding vendor and doubles as a usable directory (name, category, personal note, website / Instagram link).

**Architecture:** A single paired page file `src/content/pages/thanks.{en,hi}.md` carries a `vendors` array in YAML frontmatter — array order is display order. A new `ThanksPage.astro` component renders a responsive card grid using the existing `.card` design tokens. Vendor field invariance across locales is enforced by extending `scripts/i18n-check.mjs` with a per-index parity check (only the `note` field is allowed to diverge).

**Tech Stack:** Astro 5, TypeScript, Zod content-collection schema, `js-yaml`, Node 22.6+ test runner.

## Global Constraints

- Couple's name order is **always "Apeksha and Padraic"** — never reversed.
- Every content file is paired `.en.md` / `.hi.md`; `scripts/i18n-check.mjs` must keep passing.
- After editing `thanks.en.md` the user runs `make rehash NAME=thanks` to bump `enHash` on the Hindi file.
- All design tokens (colours, fonts, radii) come from `src/styles/tokens.css` — no new tokens.
- Astro 5 strips locale dots from slugs; use `getCollection('pages').find(p => p.id === \`thanks.${lang}.md\`)`, never `getEntry`.
- Conventional Commits style: `feat:`, `fix:`, `chore:`, `docs:`, `ci:`, `test:`.
- UK English in user-visible copy.
- No em dashes in website copy — prefer commas, semicolons, colons, or periods.

---

### Task 1: Extend the `pages` Zod schema with an optional `vendors` array

**Files:**
- Modify: `src/content/config.ts` (extend `pages` schema)

**Interfaces:**
- Consumes: nothing.
- Produces: an exported Zod schema such that any file in the `pages` collection may carry `vendors: Array<{ slug, name, category, website?, instagram?, note }>`. The `vendors` array is validated at Astro build time when `astro:content` loads the collection. Other tasks read `entry.data.vendors` as a typed `Vendor[] | undefined`.

- [ ] **Step 1: Inspect current schema**

Run: `sed -n '1,12p' src/content/config.ts`
Expected: confirms the current `pages` collection schema has fields `title` and optional `enHash`.

- [ ] **Step 2: Edit `src/content/config.ts`**

Replace the existing `pages` collection definition with:

```ts
const vendorCategory = z.enum([
  'photography', 'videography', 'decor', 'florals', 'catering',
  'dj', 'mehendi', 'makeup', 'planning', 'other'
]);

const vendor = z.object({
  slug: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  name: z.string().min(1),
  category: vendorCategory,
  website: z.string().url().optional(),
  instagram: z.string().url().optional(),
  note: z.string().min(1)
});

const pages = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string().min(1),
    enHash: z.string().regex(/^[0-9a-f]{64}$/).optional(),
    vendors: z.array(vendor).optional()
  })
});
```

Keep the existing `schedule`, `faq` collections and `siteSchema` unchanged.

- [ ] **Step 3: Verify the schema compiles**

Run: `npx astro check`
Expected: no errors. Existing pages (home, donations, photos, travel, charities) still validate because `vendors` is optional.

- [ ] **Step 4: Commit**

```bash
git add src/content/config.ts
git commit -m "feat(content): allow optional vendors array on pages collection"
```

---

### Task 2: Extend `i18n-check.mjs` to enforce vendor-array parity across locales

**Files:**
- Modify: `scripts/i18n-check.mjs` (add structured frontmatter parse for the `pages` collection and a per-index vendors parity check)
- Modify: `tests/i18n-check.test.mjs` (add three vendor-parity tests)

**Interfaces:**
- Consumes: `runCheck({ contentRoot })` already exported.
- Produces: same error shape (`invariant_mismatch`) — extra `field` values such as `"vendors[0].slug"` or `"vendors.length"` so that the existing error printer keeps working without changes. New error code: none — `invariant_mismatch` is reused. The `js-yaml` package is already a dependency.

- [ ] **Step 1: Write failing tests for vendors parity**

Append to `tests/i18n-check.test.mjs`:

```js
test('vendors array parity: passes when only note differs', () => {
  const dir = makeContentDir();
  try {
    const en = `---
title: Thanks
vendors:
  - slug: studio-x
    name: Studio X
    category: photography
    website: https://studiox.example
    note: Captured every quiet moment.
---
Intro paragraph.
`;
    const enHash = sha256(en);
    const hi = `---
title: धन्यवाद
enHash: ${enHash}
vendors:
  - slug: studio-x
    name: Studio X
    category: photography
    website: https://studiox.example
    note: हर शांत पल को कैद किया।
---
परिचय।
`;
    dir.write('pages/thanks.en.md', en);
    dir.write('pages/thanks.hi.md', hi);
    const errors = runCheck({ contentRoot: dir.root });
    assert.equal(errors.length, 0, JSON.stringify(errors));
  } finally {
    dir.cleanup();
  }
});

test('vendors array parity: reports mismatched slug', () => {
  const dir = makeContentDir();
  try {
    const en = `---
title: Thanks
vendors:
  - slug: studio-x
    name: Studio X
    category: photography
    note: a.
---
i.
`;
    const enHash = sha256(en);
    const hi = `---
title: धन्यवाद
enHash: ${enHash}
vendors:
  - slug: studio-y
    name: Studio X
    category: photography
    note: b.
---
i.
`;
    dir.write('pages/thanks.en.md', en);
    dir.write('pages/thanks.hi.md', hi);
    const errors = runCheck({ contentRoot: dir.root });
    assert.ok(errors.some(e => e.code === 'invariant_mismatch' && e.field === 'vendors[0].slug'));
  } finally {
    dir.cleanup();
  }
});

test('vendors array parity: reports length mismatch', () => {
  const dir = makeContentDir();
  try {
    const en = `---
title: Thanks
vendors:
  - slug: a
    name: A
    category: photography
    note: a.
  - slug: b
    name: B
    category: decor
    note: b.
---
i.
`;
    const enHash = sha256(en);
    const hi = `---
title: धन्यवाद
enHash: ${enHash}
vendors:
  - slug: a
    name: A
    category: photography
    note: क.
---
i.
`;
    dir.write('pages/thanks.en.md', en);
    dir.write('pages/thanks.hi.md', hi);
    const errors = runCheck({ contentRoot: dir.root });
    assert.ok(errors.some(e => e.code === 'invariant_mismatch' && e.field === 'vendors.length'));
  } finally {
    dir.cleanup();
  }
});
```

Also add `sha256` to the import list at the top of the test file (it is already exported by `scripts/i18n-check.mjs`):

```js
import { runCheck, sha256 } from '../scripts/i18n-check.mjs';
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `node --test 'tests/i18n-check.test.mjs'`
Expected: three new tests fail (the existing scalar parser ignores arrays, so it neither reports a length mismatch nor a per-item slug mismatch).

- [ ] **Step 3: Extend `scripts/i18n-check.mjs`**

Add `import yaml from 'js-yaml';` to the top of the file (after the existing imports).

Add this helper above `runCheck`:

```js
const INVARIANT_VENDOR_FIELDS = ['slug', 'name', 'category', 'website', 'instagram'];

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
```

Inside `runCheck`, after the existing invariant-field loop and before the `}` that closes the per-pair body, add:

```js
    if (collection === 'pages') {
      const enFmFull = parseFrontmatterStructured(enText);
      const hiFmFull = parseFrontmatterStructured(hiText);
      checkVendorsParity(enFmFull, hiFmFull, hiFile, errors);
    }
```

The existing scalar `parseFrontmatter` stays for `enHash` and other top-level scalars — we only reach for the structured parser when there might be a `vendors` array.

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `node --test 'tests/i18n-check.test.mjs'`
Expected: all tests pass (including the three new ones and every existing one).

- [ ] **Step 5: Commit**

```bash
git add scripts/i18n-check.mjs tests/i18n-check.test.mjs
git commit -m "feat(i18n-check): enforce vendor-array parity on the pages collection"
```

---

### Task 3: Add `nav.thanks` and a `thanks` block to `src/i18n/strings.ts`

**Files:**
- Modify: `src/i18n/strings.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `s.nav.thanks: string`, `s.thanks.visitWebsite: string`, `s.thanks.instagram: string`, `s.thanks.categories: Record<VendorCategory, string>` — all available on both `en` and `hi` blocks. The strings file already has a union type so type-safety enforces that the two locale blocks stay structurally identical.

- [ ] **Step 1: Edit the EN block**

In `src/i18n/strings.ts`, add `thanks: 'Thanks'` to the EN `nav` block (final entry, after `photos`):

```ts
    nav: {
      home: 'Home',
      schedule: 'Schedule',
      travel: 'Travel',
      rsvp: 'RSVP',
      donations: 'Donations',
      faq: 'FAQ',
      photos: 'Photos',
      thanks: 'Thanks'
    },
```

Then add a new `thanks` top-level block in the EN object (place it after the existing `donations` block; ordering inside the object is presentational only):

```ts
    thanks: {
      visitWebsite: 'Visit website',
      instagram: 'Instagram',
      categories: {
        photography: 'Photography',
        videography: 'Videography',
        decor: 'Decor',
        florals: 'Florals',
        catering: 'Catering',
        dj: 'DJ',
        mehendi: 'Mehendi',
        makeup: 'Makeup',
        planning: 'Planning',
        other: 'Other'
      }
    },
```

- [ ] **Step 2: Edit the HI block to mirror it**

Add `thanks: 'धन्यवाद'` as the final entry in the HI `nav` block:

```ts
    nav: {
      home: 'मुख्य पृष्ठ',
      schedule: 'कार्यक्रम',
      travel: 'यात्रा',
      rsvp: 'जवाब दें',
      donations: 'दान',
      faq: 'सामान्य प्रश्न',
      photos: 'तस्वीरें',
      thanks: 'धन्यवाद'
    },
```

Add the matching `thanks` block to the HI object (same nesting and key order as EN):

```ts
    thanks: {
      visitWebsite: 'वेबसाइट देखें',
      instagram: 'इंस्टाग्राम',
      categories: {
        photography: 'फ़ोटोग्राफी',
        videography: 'वीडियोग्राफी',
        decor: 'सजावट',
        florals: 'फूलों की सजावट',
        catering: 'कैटरिंग',
        dj: 'डीजे',
        mehendi: 'मेहंदी',
        makeup: 'मेकअप',
        planning: 'योजना',
        other: 'अन्य'
      }
    },
```

- [ ] **Step 3: Verify type-safety**

Run: `npx astro check`
Expected: no errors. Because `Strings = (typeof strings)[Locale]` is a union of both blocks, any field present in one locale but missing in the other surfaces here as a type error.

- [ ] **Step 4: Commit**

```bash
git add src/i18n/strings.ts
git commit -m "feat(i18n): add Thanks nav label and category strings"
```

---

### Task 4: Author the bilingual content files

**Files:**
- Create: `src/content/pages/thanks.en.md`
- Create: `src/content/pages/thanks.hi.md`

**Interfaces:**
- Consumes: the schema from Task 1.
- Produces: a parsed `entry.data.vendors` array that Task 5 reads. The single seed vendor below is a placeholder so the page is renderable; the user will fill in real vendors before launch.

- [ ] **Step 1: Create `src/content/pages/thanks.en.md`**

Write the file with one seed vendor so the page is renderable end-to-end:

```markdown
---
title: Thanks
vendors:
  - slug: example-studio
    name: Example Studio
    category: photography
    website: https://example.com
    instagram: https://instagram.com/example
    note: Placeholder vendor; replace with the real list before launch.
---

These are the people who made our day happen. We can't recommend them enough.
```

- [ ] **Step 2: Create `src/content/pages/thanks.hi.md`** (with a placeholder `enHash` to be regenerated next step)

```markdown
---
title: धन्यवाद
enHash: 0000000000000000000000000000000000000000000000000000000000000000
vendors:
  - slug: example-studio
    name: Example Studio
    category: photography
    website: https://example.com
    instagram: https://instagram.com/example
    note: एक उदाहरण वेंडर; लॉन्च से पहले असली सूची भर दें।
---

ये वे लोग हैं जिन्होंने हमारे दिन को संभव बनाया। हम इन्हें दिल से सुझाते हैं।
```

- [ ] **Step 3: Refresh the source-hash on the Hindi file**

Run: `make rehash NAME=thanks`
Expected: `thanks.hi.md`'s `enHash` is rewritten to the sha256 of `thanks.en.md`.

- [ ] **Step 4: Verify i18n-check passes**

Run: `npm run i18n:check`
Expected: `i18n-check: OK`.

- [ ] **Step 5: Verify Astro accepts the schema**

Run: `npx astro check`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/content/pages/thanks.en.md src/content/pages/thanks.hi.md
git commit -m "feat(content): add bilingual Thanks page content with seed vendor"
```

---

### Task 5: Build `ThanksPage.astro` and the two route wrappers

**Files:**
- Create: `src/components/pages/ThanksPage.astro`
- Create: `src/pages/thanks.astro`
- Create: `src/pages/hi/thanks.astro`

**Interfaces:**
- Consumes: `entry.data.title`, `entry.data.vendors`, the `s.thanks.*` strings from Task 3, the `<Layout>` component, `localeUrl` helper.
- Produces: rendered HTML at `/thanks/` and `/hi/thanks/`. The `<li class="card vendor-card">` per vendor with id `vendor-<slug>` is the deep-link target that other pages may eventually link to.

- [ ] **Step 1: Create `src/components/pages/ThanksPage.astro`**

```astro
---
import { getCollection } from 'astro:content';
import Layout from '../Layout.astro';
import { t, type Locale } from '../../i18n/strings';

interface Props { lang: Locale }
const { lang } = Astro.props;
const s = t(lang);

// Astro 5 i18n routing strips locale dots from slugs — use getCollection + filter.
const pages = await getCollection('pages');
const entry = pages.find(p => p.id === `thanks.${lang}.md`);
if (!entry) throw new Error(`Missing pages/thanks.${lang}.md`);
const { Content } = await entry.render();

const vendors = entry.data.vendors ?? [];
---
<Layout lang={lang} title={entry.data.title}>
  <h1>{entry.data.title}</h1>
  <article class="card intro deep-link-target" id="thanks-intro">
    <a
      class="anchor-link anchor-link-floating"
      href="#thanks-intro"
      aria-label={s.a11y.copyLink}
      data-anchor-link
    >#</a>
    <Content />
  </article>

  {vendors.length > 0 && (
    <ul class="vendor-grid" role="list">
      {vendors.map(v => (
        <li class="card vendor-card deep-link-target" id={`vendor-${v.slug}`}>
          <a
            class="anchor-link anchor-link-floating"
            href={`#vendor-${v.slug}`}
            aria-label={s.a11y.copyLink}
            data-anchor-link
          >#</a>
          <p class="vendor-category">{s.thanks.categories[v.category]}</p>
          <h2 class="vendor-name">{v.name}</h2>
          <p class="vendor-note">{v.note}</p>
          {(v.website || v.instagram) && (
            <p class="vendor-links">
              {v.website && (
                <a
                  href={v.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${v.name}, ${s.thanks.visitWebsite}`}
                >{s.thanks.visitWebsite} ↗</a>
              )}
              {v.instagram && (
                <a
                  href={v.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${v.name}, ${s.thanks.instagram}`}
                >{s.thanks.instagram} ↗</a>
              )}
            </p>
          )}
        </li>
      ))}
    </ul>
  )}
</Layout>

<style>
  .vendor-grid {
    list-style: none;
    padding: 0;
    margin: 1.5rem 0 0;
    display: grid;
    gap: 1rem;
    grid-template-columns: 1fr;
  }
  @media (min-width: 640px) {
    .vendor-grid { grid-template-columns: 1fr 1fr; }
  }
  @media (min-width: 1024px) {
    .vendor-grid { grid-template-columns: 1fr 1fr 1fr; }
  }
  .vendor-card {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .vendor-category {
    margin: 0;
    font-size: 0.75rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--color-primary);
  }
  .vendor-name {
    font-family: var(--font-display);
    color: var(--color-primary);
    margin: 0;
    font-size: 1.4rem;
    line-height: 1.2;
  }
  .vendor-note {
    margin: 0;
    color: var(--color-text);
  }
  .vendor-links {
    margin: auto 0 0;
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem 1.25rem;
    padding-top: 0.25rem;
  }
  .vendor-links a {
    color: var(--color-primary);
    text-decoration: underline;
  }
</style>
```

- [ ] **Step 2: Create `src/pages/thanks.astro`**

```astro
---
import ThanksPage from '../components/pages/ThanksPage.astro';
---
<ThanksPage lang="en" />
```

- [ ] **Step 3: Create `src/pages/hi/thanks.astro`**

```astro
---
import ThanksPage from '../../components/pages/ThanksPage.astro';
---
<ThanksPage lang="hi" />
```

- [ ] **Step 4: Build and verify both routes**

Run: `npm run build`
Expected: build succeeds; output contains `dist/thanks/index.html` and `dist/hi/thanks/index.html`.

- [ ] **Step 5: Commit**

```bash
git add src/components/pages/ThanksPage.astro src/pages/thanks.astro src/pages/hi/thanks.astro
git commit -m "feat(thanks): add Thanks page component and route wrappers"
```

---

### Task 6: Add the Thanks link to the primary nav

**Files:**
- Modify: `src/components/Header.astro` (insert one nav entry)

**Interfaces:**
- Consumes: `s.nav.thanks` from Task 3.
- Produces: a visible nav link on every page, in both locales, pointing to the localised `/thanks/` URL.

- [ ] **Step 1: Edit `src/components/Header.astro`**

Inside the `<nav id="primary-nav" …>` block, append after the `photos` link:

```astro
      <a href={localeUrl(lang, '/thanks/')}>{s.nav.thanks}</a>
```

The full nav block reads:

```astro
    <nav id="primary-nav" class="primary-nav" aria-label="Primary" data-open="false">
      <a href={localeUrl(lang, '/schedule/')}>{s.nav.schedule}</a>
      <a href={localeUrl(lang, '/travel/')}>{s.nav.travel}</a>
      <a href={localeUrl(lang, '/rsvp/')}>{s.nav.rsvp}</a>
      <a href={localeUrl(lang, '/donations/')}>{s.nav.donations}</a>
      <a href={localeUrl(lang, '/faq/')}>{s.nav.faq}</a>
      <a href={localeUrl(lang, '/photos/')}>{s.nav.photos}</a>
      <a href={localeUrl(lang, '/thanks/')}>{s.nav.thanks}</a>
    </nav>
```

- [ ] **Step 2: Build to confirm the link renders**

Run: `npm run build`
Expected: build succeeds. `grep -o 'href="[^"]*thanks/"' dist/index.html` returns at least one match.

- [ ] **Step 3: Commit**

```bash
git add src/components/Header.astro
git commit -m "feat(nav): link Thanks page from the primary nav"
```

---

### Task 7: Full check + manual smoke test

**Files:** none modified.

**Interfaces:** none.

- [ ] **Step 1: Run the full check**

Run: `make check`
Expected: `i18n-check: OK`, `astro check` clean, all tests pass, build succeeds.

- [ ] **Step 2: Start the dev server**

Run: `make dev`
Expected: dev server on `http://0.0.0.0:4321/bhateja-slattery-wedding/`.

- [ ] **Step 3: Manually verify**

In a browser, visit each in turn and confirm:

- `/bhateja-slattery-wedding/thanks/` renders with the heading "Thanks", the intro paragraph, and the seed vendor card.
- `/bhateja-slattery-wedding/hi/thanks/` renders with the heading "धन्यवाद" and the matching Hindi intro.
- Resize the window through ~639px → ~640px → ~1024px and confirm the grid switches from 1 → 2 → 3 columns.
- Click the floating `#` on the seed vendor card and confirm the URL gains `#vendor-example-studio` and the card pulses (existing anchor-link behaviour).
- "Visit website ↗" opens in a new tab with `noopener noreferrer` (right-click → inspect to confirm rel attribute).
- The Thanks link appears in the header on every page, in both locales.

- [ ] **Step 4: Stop the dev server**

No commit — manual verification only.

---

### Task 8 (optional, deferred): Populate real vendors

This is not part of the implementation plan; it is what the user does after merge. For each real vendor, append an entry to the `vendors:` array in both files (in the desired display order), then run `make rehash NAME=thanks`. The seed vendor entry can be removed at that point.
