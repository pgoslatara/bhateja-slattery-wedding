# Thanks page — design

A new bilingual page that publicly thanks the vendors who made the wedding happen, and doubles as a usable directory so guests (and family planning future events) can find and contact them.

## Goals

- A warm, visible acknowledgement of every vendor — credit as a first-class thing, not a footnote.
- A directory guests can actually use: vendor name, what they did, a link to reach them.
- Slot into the existing site without inventing new design language or new tooling.

## Non-goals

- No phone / WhatsApp numbers for vendors. Links only.
- No vendor logos, photos, or testimonial blocks. Likeness + copyright friction not worth it for v1.
- No filtering, search, or category navigation. The page is short enough to scan top-to-bottom.
- No ratings / stars.
- No category section headings — a single visual grid by the couple's chosen order.

## User-visible behaviour

### Route and nav

- English route: `/thanks/`
- Hindi route: `/hi/thanks/`
- Nav label: **Thanks** (EN) / **धन्यवाद** (HI), added to `Header.astro` after Photos via the existing `nav` block in `strings.ts`.
- Same `noindex` + `robots.txt` posture as every other page. No special privacy treatment.

### Page structure

1. **Page heading**: rendered from the markdown frontmatter `title` (per the established pattern in `DonationsPage.astro` — `<h1>{entry.data.title}</h1>`). The EN file sets `title: Thanks`; the HI file sets `title: धन्यवाद`.
2. **Intro paragraph**: a single sentence from the couple, e.g. *"These are the people who made our day happen. We can't recommend them enough."* Stored in the markdown body so it translates cleanly.
3. **Vendor grid**: responsive — 1 column on mobile, 2 columns on tablet (≥640px), 3 columns on desktop (≥1024px). Uses the existing `.card` style and design tokens; no new visual vocabulary.

### Vendor card

Each card renders, top to bottom:

- A small uppercase **category pill** (e.g. `PHOTOGRAPHY` / `फोटोग्राफी`), styled with the existing gold/cream tokens.
- The **vendor name** in the display font (Tiro Devanagari Hindi for HI, the EN display font for EN). Vendor names are proper nouns and do not translate — the same string renders on both locales.
- The **personal note** in body type — 1–2 sentences from the couple.
- A **link row** at the bottom: zero, one, or two of:
  - `Visit website ↗` → external link in a new tab, `rel="noopener noreferrer"`.
  - `Instagram ↗` → external link, same rel.

If a vendor has neither link, the link row is omitted entirely (no empty placeholder).

### Anchors and deep linking

- Each card gets a stable `id="vendor-<slug>"` where `<slug>` is the vendor's frontmatter `slug` (see Data shape).
- Each card carries the floating anchor (`.anchor-link-floating`) per the established pattern in `memory/patterns.md` — `#` in the top-right corner of the card. The parent must be `position: relative` (already true for `.card`).
- Behaviour reuses the existing Layout script: hash routing, pulse animation, copy-link aria label.

## Data shape

A single paired page file holds the page intro and the vendor list:

```
src/content/pages/thanks.en.md
src/content/pages/thanks.hi.md
```

The vendor list lives in **frontmatter**, as an array. **Display order is array order** — there is no `order` numeric field; whoever appears first in the YAML list appears first on the page.

```yaml
---
title: Thanks
vendors:
  - slug: studio-x
    name: "Studio X"
    category: photography
    website: "https://studiox.example"
    instagram: "https://instagram.com/studiox"
    note: "Captured every quiet moment we would have otherwise missed."
  - slug: bloom-co
    name: "Bloom & Co."
    category: florals
    website: "https://bloom.example"
    note: "Marigold garlands that smelled like the venue itself."
  # …
---

These are the people who made our day happen. We can't recommend them enough.
```

### Field rules

| Field | Type | Required | Invariant across locales? | Notes |
|---|---|---|---|---|
| `slug` | string | yes | yes | URL-safe (`/^[a-z0-9][a-z0-9-]*$/`); used for the card's anchor id. |
| `name` | string | yes | yes | Proper noun; the same string in both files. |
| `category` | enum | yes | yes | One of the keys in the category-label table below. Drives the pill label. |
| `website` | URL | no | yes | Validated as URL. |
| `instagram` | URL | no | yes | Full URL, not a `@handle`. Simpler — no transformation logic, no domain assumption. |
| `note` | string | yes | **no** (translates) | 1–2 sentences; plain text only, no markdown. |

`title` is the existing required field on the `pages` collection.

The markdown body holds the page **intro paragraph** (also translates).

### Category enum (initial set)

`photography`, `videography`, `decor`, `florals`, `catering`, `dj`, `mehendi`, `makeup`, `planning`, `other`.

The final list is trimmed once we know the actual vendors — `other` is the escape hatch. No "uncategorised" allowed silently; every vendor picks one.

### Category labels (i18n)

Added to `src/i18n/strings.ts` under a new `thanks.categories` block, keyed by the invariant category slug:

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
}
```

Hindi values are filled in alongside.

`strings.ts`'s `nav` block also gains a `thanks` key.

## Schema and validation

Extend `pages` collection schema in `src/content/config.ts` to allow an optional `vendors` array on any page in the collection:

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

`vendors` is optional on the schema so existing pages (home, donations, photos, travel, charities) keep validating without change.

### i18n parity enforcement

The existing `scripts/i18n-check.mjs` already enforces three rules; we extend it minimally:

1. **File pairing**: `thanks.en.md` and `thanks.hi.md` must both exist. Already handled by the generic pairing check.
2. **Invariant frontmatter**: today, `INVARIANT_FIELDS` in `scripts/i18n-check.mjs` maps a collection name to a list of flat field names. Extend it with a per-collection hook for the `pages` collection that, when both files carry a `vendors` array, asserts: (a) equal length, (b) equal value at each index for the invariant per-item fields (`slug`, `name`, `category`, `website`, `instagram`). Only `note` may diverge. Order must match — index `i` in EN corresponds to index `i` in HI. Mismatches surface with the same `invariant_mismatch` error shape used today, so the user-facing failure mode is unchanged.
3. **`enHash` freshness**: already covered by the generic source-hash check on the `.hi.md` file. After editing `thanks.en.md`, the user runs `make rehash NAME=thanks`.

If a future page in the `pages` collection also wants to use this `vendors` array, it inherits the same parity rules for free.

## Components

A new `src/components/pages/ThanksPage.astro` that takes a `lang` prop and:

- Loads `thanks.${lang}.md` from the `pages` collection using the `getCollection` + filter pattern (per the Astro 5 slug-stripping gotcha in `memory/patterns.md`).
- Renders the page heading, intro paragraph (from the markdown body), and the vendor grid.
- The vendor grid is a `<ul class="vendor-grid">` with each card a `<li class="card vendor-card">` — semantic list of vendors.

Two thin route wrappers:

- `src/pages/thanks.astro` → `<ThanksPage lang="en" />`
- `src/pages/hi/thanks.astro` → `<ThanksPage lang="hi" />`

`Header.astro` gains a nav link to the localised `thanks` URL using the existing `localizedUrl` helper.

## Styling

All new CSS in a scoped `<style>` block on `ThanksPage.astro`, using existing tokens:

- `.vendor-grid` — CSS grid, `grid-template-columns: repeat(auto-fit, minmax(280px, 1fr))`, gap from token.
- `.vendor-card` — extends `.card`; ensures `position: relative` so the floating anchor link sits correctly.
- `.vendor-category` — uppercase pill, gold ink on cream background, small font, tracked letter-spacing.
- `.vendor-name` — display font, larger; respects `html[lang="hi"]` font swap automatically because tokens are global.
- `.vendor-note` — body type, normal weight.
- `.vendor-links` — flex row, gap from token; each link gets the existing `↗` external-link styling if there is a shared pattern, otherwise a small inline arrow.

No new design tokens. No new fonts. No new colours.

## Accessibility

- Vendor grid is a `<ul>` of `<li>`s — assistive tech announces it as a list of N items.
- The category pill is presentational text inside the card, not a separate `<aside>`; readers will read it inline.
- External links carry `rel="noopener noreferrer"` and visible "↗" plus `aria-label="<name>, website (opens in a new tab)"` so the destination is clear when announced.
- The card's anchor link uses the same `aria-label` mechanism as the rest of the site (localised by the Layout script per `memory/patterns.md`).

## Testing

- Unit/test: extend the existing i18n-check test (or add a new `tests/i18n-vendors.test.mjs`) to verify the invariant-field rule on the `vendors` array — at least one fixture pair that diverges on `slug` should fail, one that diverges only on `note` should pass.
- Schema test: a `tests/thanks-schema.test.mjs` (or extension of existing schema test) that loads a sample `thanks.en.md` through the Zod schema and asserts validation.
- `make check` (i18n parity + `astro check` + tests + build) must pass.
- Manual smoke: `make dev`, hit `/thanks/` and `/hi/thanks/`, confirm grid layout at three breakpoints, deep-link to one vendor anchor, verify external links open in a new tab.

## Out of scope (explicitly)

- Logos / vendor imagery.
- A "leave a review" form.
- Auto-fetching vendor metadata from URLs.
- Filtering or sorting controls.
- A bilingual category picker — categories are a closed enum, not user-facing.
- Surfacing vendors anywhere outside this page in v1.

## Open questions

None — final vendor list and categories will be filled in during implementation as the user provides them, but they do not affect the design.
