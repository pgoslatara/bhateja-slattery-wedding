# Wedding Website — Design Spec

**Couple:** Apeksha and Padraic
**Wedding date:** 27 February 2027
**Venue:** Single venue, Gurgaon, India (two-day event; mehendi 26 Feb, ceremony 27 Feb)
**Author:** Padraic Slattery
**Date drafted:** 2026-05-06
**Target go-live:** within ~1 month of drafting (early June 2026)

---

## 1. Goals

A bilingual (English + Hindi) wedding website for ~60 invited guests covering the basics: date and venue, schedule, travel and accommodation, RSVP collection, FAQ and dress code, and a post-wedding photo gallery.

The site must be:

- Maintainable by Padraic via Markdown edits in a Git repository
- Accessible to less-tech-savvy guests (mobile-first, large tap targets, default English with auto-detected Hindi for Hindi-locale browsers)
- Hosted free on GitHub Pages, deployed via GitHub Actions
- Visually styled in a "Traditional Indian" mood — marigold, deep red, gold accents, ornate decorative motifs
- Excluded from search-engine indexing (`noindex` + `robots.txt`)

## 2. Out-of-scope (explicit non-goals)

- "Edit my RSVP" UI — guests resubmit the form to update their answers
- Per-guest invitation codes — designed to be a non-breaking addition later if abuse appears
- Photo upload by guests
- Audio/music playback
- "How we met" / story / about-us page
- Gift registry links
- Guest password protection
- SEO, sitemap, `hreflang` tags (intentionally omitted for privacy)
- Analytics, tracking, third-party scripts

## 3. Requirements summary

| Area | Decision |
|---|---|
| Audience | ~60 guests, mostly India + some Europe, mixed tech-savviness |
| Languages | English + Hindi, toggle, auto-detect on first visit, default English |
| Hosting | GitHub Pages |
| Build / CI | GitHub Actions |
| Content workflow | Markdown files committed to repo |
| RSVP backend | Google Apps Script web app writing to Google Sheet |
| Photo gallery | Embedded shared Google Photos album (post-wedding only; placeholder before) |
| Visual direction | Traditional Indian (marigold/red/gold, ornate borders) |
| Privacy | `noindex` + obscure URL — no password gate |
| Infrastructure as code | None (Terraform skipped for this scale) |

## 4. Site structure

Six pages, each available in English (root) and Hindi (`/hi/...`). Mobile-first.

| Path (English) | Path (Hindi) | Purpose |
|---|---|---|
| `/` | `/hi/` | Home — names, date, venue, hero, CTAs to RSVP and Schedule |
| `/schedule/` | `/hi/schedule/` | Two-day timeline (Day 1: Mehendi 26 Feb; Day 2: Ceremony 27 Feb). Times TBD until confirmed. |
| `/travel/` | `/hi/travel/` | Getting to Gurgaon, hotel suggestions, parking |
| `/rsvp/` | `/hi/rsvp/` | RSVP form — submits to Apps Script |
| `/faq/` | `/hi/faq/` | Q&A, includes dress code, kids policy, gifts guidance |
| `/photos/` | `/hi/photos/` | Pre-wedding placeholder; post-wedding Google Photos embed |

**Global elements:**

- **Header**: monogram/wordmark, primary nav, language toggle (`EN | हिंदी`)
- **Footer**: date + venue line, contact (Padraic and Apeksha's WhatsApp), marigold garland decorative strip across the top of the footer

**Less-tech-savvy considerations:**

- Prominent "RSVP" CTA on home
- Body text ≥16px; tap targets ≥44px
- Language toggle persistently in header
- Dress code surfaced in FAQ and on Schedule page

## 5. Content model

All content as Markdown/YAML in `src/content/`, validated by Astro content collections (Zod schemas). Bad frontmatter fails the build with a clear error.

### 5.1 Directory layout

```text
src/content/
├── site.yaml                  # Global config (see schema below)
├── pages/                     # Long-form page content (markdown body)
│   ├── home.en.md
│   ├── home.hi.md
│   ├── travel.en.md
│   ├── travel.hi.md
│   ├── photos.en.md
│   └── photos.hi.md
├── schedule/                  # One file per event
│   ├── 01-mehendi.en.md
│   ├── 01-mehendi.hi.md
│   ├── 02-ceremony.en.md
│   └── 02-ceremony.hi.md
└── faq/                       # One file per question
    ├── dress-code.en.md
    ├── dress-code.hi.md
    ├── kids.en.md
    └── kids.hi.md
```

### 5.2 Schemas (Zod)

**`site.yaml`:**

- `coupleNames`: `{ partner1: string, partner2: string }` — by convention `partner1 = "Apeksha"`, `partner2 = "Padraic"` (rendered as "Apeksha and Padraic" or "Apeksha & Padraic" throughout)
- `weddingDate`: ISO date string (`"2027-02-27"`)
- `venue`: `{ name: string, addressShort: string, city: string, country: string, mapUrl: string }`
- `contactWhatsApp`: E.164 phone string (e.g. `"+919XXXXXXXXX"`)
- `photosAlbumUrl`: optional URL string (Google Photos shared album)

**`schedule/*.md` frontmatter:**

- `day`: `1 | 2`
- `order`: number (sort within day)
- `name`: string (translatable — e.g. "Mehendi" / "मेहंदी")
- `startTime`: string — `"HH:MM"` 24-hour, or `"TBD"`
- `endTime`: string or `"TBD"`
- `location`: string, optional
- `dressCode`: string, optional
- `enHash`: string (Hindi files only — see §7.2)

**`faq/*.md` frontmatter:**

- `order`: number
- `question`: string (translatable)
- `enHash`: string (Hindi files only)

**`pages/*.md` frontmatter:**

- `title`: string
- `enHash`: string (Hindi files only)

### 5.3 File-pairing convention

For every `*.en.md` there must be a corresponding `*.hi.md` (and vice versa). Enforced in CI by `scripts/i18n-check.mjs` (see §7).

## 6. i18n (routing, language toggle, typography)

### 6.1 Astro configuration

```js
// astro.config.mjs
export default defineConfig({
  site: 'https://<github-username>.github.io',
  base: '/bhateja-slattery-wedding',
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'hi'],
    routing: { prefixDefaultLocale: false }
  }
});
```

English at `/`, Hindi at `/hi/`.

### 6.2 Page implementation pattern

To avoid duplicating logic across two language URL trees, each page has one shared component plus two thin wrappers:

```text
src/components/pages/SchedulePage.astro      ← actual page logic, takes `lang` prop
src/pages/schedule.astro                     ← <SchedulePage lang="en" />
src/pages/hi/schedule.astro                  ← <SchedulePage lang="hi" />
```

The shared component reads matching content collection entries based on `lang`. Layout and logic are single-source; only content varies.

### 6.3 Auto-detect with manual toggle

Inline `<head>` script (runs synchronously before paint to avoid FOUC):

```html
<script>
  (function () {
    try {
      var stored = localStorage.getItem('wedding_lang');
      var browserLang = (navigator.language || 'en').toLowerCase();
      var preferred = stored || (browserLang.indexOf('hi') === 0 ? 'hi' : 'en');
      if (!stored) localStorage.setItem('wedding_lang', preferred);
      var path = location.pathname;
      var onHindi = path === '/hi' || path.indexOf('/hi/') === 0;
      if (preferred === 'hi' && !onHindi) {
        location.replace('/hi' + (path === '/' ? '/' : path));
      } else if (preferred === 'en' && onHindi) {
        location.replace(path.replace(/^\/hi/, '') || '/');
      }
    } catch (e) { /* fail open: render whatever URL says */ }
  })();
</script>
```

**Toggle button** (in header) is a plain `<a>` link to the equivalent URL in the other language. It additionally writes the new preference to `localStorage.wedding_lang` via a small click handler.

**JS-disabled fallback**: no redirect; user sees what the URL says; toggle still works as plain links.

### 6.4 Typography

| Use | English | Hindi |
|---|---|---|
| Display headings | Playfair Display (700) | Tiro Devanagari Hindi |
| Section headings | Cormorant Garamond (600) | Tiro Devanagari Hindi |
| Body | Inter (400) | Noto Sans Devanagari (400) |
| Decorative / monogram | Cormorant Garamond Italic | English monogram used across both languages |

Fonts self-hosted in `public/fonts/` (no third-party requests).

### 6.5 SEO / privacy

- Every page emits `<meta name="robots" content="noindex, nofollow">`
- `public/robots.txt`: `User-agent: *` / `Disallow: /`
- **No** `hreflang`, **no** sitemap, **no** Astro sitemap integration

⚠️ `noindex` keeps the site out of search results but does not prevent direct-URL access. The couple has accepted this trade-off (see §11 R2).

## 7. Translation parity (CI-enforced)

### 7.1 File pairing

For every `*.en.md` (or `*.hi.md`), the matching opposite-language file must exist. Mismatch → CI fails.

### 7.2 Source-hash check

Each `*.hi.md` carries an `enHash` field in its frontmatter — the SHA-256 of the matching `*.en.md` (raw file bytes, including frontmatter).

CI recomputes and compares. Mismatch → CI fails with:

```
01-mehendi.en.md has changed since 01-mehendi.hi.md was last synced.
Review the English version, update the Hindi translation, then run:
  make rehash NAME=01-mehendi
```

### 7.3 Invariant frontmatter fields

Schema-declared "language-invariant" fields (e.g. `day`, `order`, `startTime`, `endTime`, `location` on schedule entries) must be byte-for-byte identical between paired files. CI fails on mismatch.

### 7.4 Helper scripts

- `scripts/i18n-check.mjs` — runs all three checks; used in CI and via `make check`
- `scripts/i18n-rehash.mjs` — recomputes and writes `enHash` for one or more files; called via `make rehash NAME=<basename>`
- `.husky/pre-commit` runs `i18n-check` to catch drift before push

### 7.5 What this does NOT catch

- Bad translations (semantically incorrect Hindi). A native Hindi speaker should review pre-launch.

## 8. RSVP flow

### 8.1 Form fields (single-page form, top to bottom)

1. Lead guest name — required
2. Additional guests on this invitation — repeatable, "Add another guest" button
3. Day 1 (Mehendi, 26 Feb 2027) — radio: Yes / No
4. Day 2 (Wedding, 27 Feb 2027) — radio: Yes / No
5. Dietary requirements — checkboxes (Vegetarian / Vegan / Jain / Halal / Gluten-free / Nut allergy) + free-text "Anything else?"
6. Travel — arrival date/time + departure date/time (optional, "TBD" allowed)
7. Accommodation — radio (I've sorted my own / I'd like the recommended hotel / I need help booking)
8. WhatsApp number — required, country-code dropdown defaults to `+91`
9. Anything else? — free text
10. Honeypot — invisible `<input name="favourite_pet">` (real users leave empty; bots fill it)

### 8.2 Bot / malicious-entry defence (layered)

| Layer | Where | Stops |
|---|---|---|
| Honeypot | Server | Naive form-spam bots |
| `Origin` header check | Apps Script | Submissions not from the wedding site |
| Throttle: 1 per WhatsApp number per 10s | Apps Script | Replay floods |
| Field validation (length caps, enum constraints) | Client + server | Malicious / oversized payloads |

### 8.3 Multi-submission (edit-by-resubmit)

- Apps Script appends every submission to a `submissions` tab — full audit log, never overwritten
- A `latest` tab uses Sheet formulas to show the latest row per WhatsApp number — that's the working view for Padraic and Apeksha
- No "edit my RSVP" UI in v1 — success screen instructs guests: "To change anything, just resubmit — your latest answer is what counts."

### 8.4 Sheet structure

| Tab | Purpose | Key columns |
|---|---|---|
| `submissions` | Append-only audit log | `timestamp`, `lead_name`, `additional_guests` (JSON), `day1_attending`, `day2_attending`, `dietary` (JSON), `arrival`, `departure`, `accommodation`, `whatsapp`, `notes`, `raw_json` |
| `latest` | Formula-driven view (latest per `whatsapp`) | Same columns, sorted by `lead_name` |

A future `codes` tab can be added if invitation codes are reintroduced (see §11 R5).

### 8.5 Apps Script — POST handler behaviour

1. Origin check → reject if `Origin` header is not the deployed GitHub Pages URL (the allowlist is configured in `Code.gs` and contains the production origin only — e.g. `https://<user>.github.io`)
2. Honeypot empty → reject if filled
3. Parse JSON body → reject if invalid or missing required fields
4. Throttle check → look up last submission timestamp for this `whatsapp` in `submissions`; reject if <10s ago
5. Append row to `submissions`
6. Return JSON `{ status: "ok" }` or `{ status: "error", code: "<error_code>" }`

`doGet(e)` returns 405 (no GET allowed). All errors return stable string codes (`invalid_origin`, `invalid_payload`, `throttled`, `internal`); the client maps codes to localised messages.

### 8.6 CORS

Apps Script web-app responses set permissive CORS. The form uses `fetch` with a JSON body sent as `Content-Type: text/plain` to remain a "simple request" (no preflight `OPTIONS`).

### 8.7 Apps Script lifecycle

- Source committed in `apps-script/Code.gs`, manifest in `apps-script/appsscript.json`
- Pushed to Google via `clasp` (`make script-push`)
- Deployed manually as a Web App once (Anyone access). Re-deployment is a manual UI step, documented in `apps-script/README.md`.
- The web-app URL is stored as a GitHub Actions secret (`APPS_SCRIPT_URL`) and exposed to Astro at build time via `import.meta.env.APPS_SCRIPT_URL`

### 8.8 Confirmation / error UX

- **Submitting**: button disabled, diya-flame spinner, "Submitting your RSVP…"
- **Success**: full-page confirmation. *"Thank you, {name}! Apeksha and Padraic have your RSVP. To change anything, just resubmit. We'll be in touch on WhatsApp closer to the date."*
- **Error**: inline message, localised. Specific codes:
  - `throttled`: "Looks like you just submitted — please wait a few seconds and try again."
  - `invalid_payload`: "Please check the highlighted fields and resubmit."
  - `network` / `internal` / `invalid_origin`: "Something went wrong — please try again, or message us on WhatsApp." (`invalid_origin` is not normally user-reachable; it indicates a misconfiguration and would only occur if the form is loaded from an unexpected URL.)
- Form values **preserved on error** (no re-typing)

### 8.9 Bilingual handling

Both languages POST identical JSON shape (English keys). Apps Script returns stable error codes. Client maps codes to localised messages.

## 9. Visual design system

### 9.1 Colour palette

| Token | Value | Usage |
|---|---|---|
| `--color-bg` | `#FDF5D4` | Page background — warm cream/ivory |
| `--color-surface` | `#FFFFFF` | Cards, form fields |
| `--color-primary` | `#C8102E` | Deep red — headings, CTAs, accents |
| `--color-primary-dark` | `#8B0A1F` | Hover/active |
| `--color-accent` | `#D4A017` | Marigold/gold — borders, dividers, ornaments |
| `--color-accent-light` | `#F5D76E` | Hover, decorative fills |
| `--color-text` | `#2A1810` | Body — deep brown, warmer than black on cream |
| `--color-text-muted` | `#6B5040` | Secondary text |
| `--color-border` | `#D4A017` | Card borders, dividers |
| `--color-error` | `#A01020` | Form errors |
| `--color-success` | `#1A5F3C` | Confirmations |

**Contrast checks (WCAG AA):**

- Red on cream: 7.2:1 ✓
- Brown on cream: 11.8:1 ✓
- Gold on cream: 3.1:1 — used only for borders and decorative elements, **never for body text**

All tokens declared in `src/styles/tokens.css` as CSS custom properties on `:root`.

### 9.2 Decorative motifs

| Element | Where | Description |
|---|---|---|
| Mehendi/henna pattern | Subtle page background watermark on Schedule + RSVP | Hand-drawn flowing organic SVG, ~5% opacity, gold |
| Marigold (genda phool) garland | Strip across the top of the footer | Repeating marigold SVG, gold/orange |
| Paisley (boota) ornament | Section dividers | Small mirrored gold paisley each side of headings |
| Mandala | Centred behind hero name on home page | Faint gold mandala SVG, ~8% opacity |
| Diya glyph | RSVP submit-state spinner | Tiny animated diya flame |
| Mustard-field hero | Home page hero background | Custom SVG: yellow blossoms, blue sky horizon |
| SRK silhouette (DDLJ pose) | Foreground of the mustard-field hero | Stylised silhouette of SRK in the iconic arms-outstretched DDLJ pose, in deep red or gold against the mustard background. **Sourced/commissioned by the couple — not generated as part of the build.** Site ships with a generic placeholder until the asset is dropped in. |

All motifs as inline SVG, stored in `src/assets/motifs/`, hand-crafted or sourced from open-licensed CC0 / public-domain Indian motif libraries.

### 9.3 Layout primitives

- Single-column on mobile (≤768px), centred, comfortable side margins
- Two-column on desktop (≥1024px) where it makes sense (Schedule has Day 1 / Day 2 side by side)
- Generous vertical rhythm (line-height 1.6 body)
- Max content width ~720px
- Cards: rounded 8px, subtle shadow, gold double-line border for emphasis

### 9.4 Iconography

- **Lucide** SVG icons (open-source, small bundle)
- Used minimally — calendar, map pin, WhatsApp logo for contact

### 9.5 Photography strategy

- Pre-wedding: hero uses mustard-field SVG + SRK silhouette (no real photos required to ship)
- Photos page is text-only ("Photos coming soon. Check back after 27 February 2027.") with an ornamental flourish
- Post-wedding: replace placeholder with embedded Google Photos shared album (single iframe / lightweight gallery component); content update is markdown-only

## 10. Deployment, CI, and local development

### 10.1 Repository layout (deployment-relevant)

```text
bhateja-slattery-wedding/
├── .github/workflows/
│   ├── deploy.yml                # build + deploy to GitHub Pages on push to main
│   ├── pr-checks.yml             # i18n parity, type-check, build sanity
│   └── apps-script-push.yml      # manual workflow_dispatch — clasp push
├── apps-script/
│   ├── Code.gs
│   ├── appsscript.json
│   └── README.md                 # one-time setup + redeployment steps
├── public/
│   ├── robots.txt
│   └── fonts/
├── src/
│   ├── assets/motifs/
│   ├── components/
│   ├── content/
│   ├── pages/
│   └── styles/tokens.css
├── scripts/
│   ├── i18n-check.mjs
│   └── i18n-rehash.mjs
├── astro.config.mjs
├── package.json
├── Makefile
├── .node-version
├── .husky/pre-commit
└── README.md
```

### 10.2 GitHub Actions

**`deploy.yml`** — push to `main` → live site:

1. Checkout
2. Set up Node from `.node-version`
3. `npm ci`
4. `npm run i18n:check`
5. `npx astro check`
6. `npm run build` (with `APPS_SCRIPT_URL` injected from secrets)
7. Upload artifact via `actions/upload-pages-artifact`
8. Deploy via `actions/deploy-pages`

Permissions: `pages: write`, `id-token: write` (for OIDC).
Concurrency-limited: only one deploy at a time; new pushes cancel in-progress builds.

**`pr-checks.yml`** — every PR: same as deploy minus the deploy step. Branch protection on `main` requires it to pass.

**`apps-script-push.yml`** — manual `workflow_dispatch`: runs `clasp push` to upload Apps Script changes (requires a `CLASP_AUTH` secret with the OAuth credentials).

### 10.3 Local development — `Makefile`

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
	npx husky install

dev:         ## Run Astro dev server with HMR
	npm run dev -- --host $(HOST) --port $(PORT)

build:       ## Production build to ./dist
	npm run i18n:check
	npx astro check
	npm run build

preview:     build  ## Build and serve the production output locally
	npm run preview -- --host $(HOST) --port $(PORT)

serve:       preview  ## Alias for preview

check:       ## Run all checks (i18n parity, content schemas, types)
	npm run i18n:check
	npx astro check

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

`make dev` and `make preview` bind to `0.0.0.0` so the dev server is reachable from another device on the local network (useful for testing the Hindi rendering and the responsive layout on a phone). Override with `HOST=127.0.0.1` for loopback only.

### 10.4 GitHub Pages configuration

- Source: GitHub Actions
- Custom domain: none (default `<user>.github.io/bhateja-slattery-wedding`); choose an unobtrusive repo name to keep the URL non-obvious
- Force HTTPS: on
- `noindex` enforced via meta tag + `public/robots.txt`

## 11. Decisions and risks

### Decisions log

| # | Decision | Rationale |
|---|---|---|
| D1 | Astro as SSG | First-class i18n, type-safe content, GitHub Pages action |
| D2 | Google Apps Script for RSVP backend | Free, no third-party data, no client-side secrets |
| D3 | No Terraform | Nothing to manage as code at this scale |
| D4 | One Markdown file per language pair (`*.en.md` / `*.hi.md`) | Easy diffs, drafts in branches |
| D5 | Hash-based translation parity in CI | Catches "English changed, Hindi didn't" |
| D6 | Auto-detect language with manual toggle override | Preferred over URL-as-authoritative |
| D7 | Couple's name order: "Apeksha and Padraic" | Stylistic preference |
| D8 | Privacy mode A: `noindex` only, no password gate | Acceptable trade-off for invite-only site |
| D9 | Drop invitation code from RSVP for v1 | Reduce launch complexity; can re-introduce |
| D10 | "Traditional Indian" visual direction | Picked from four mood options |
| D11 | Decorative motifs: mehendi watermark, marigold garland footer, paisley dividers, mandala behind hero, diya spinner | All hand-crafted SVGs in `src/assets/motifs/` |
| D12 | DDLJ tribute via stylised SRK silhouette in mustard-field hero | Couple has accepted associated risk (see R1) |
| D13 | Photos page placeholder pre-wedding; embed Google Photos album post-wedding | Zero-maintenance gallery |
| D14 | Multi-submission upsert keyed by WhatsApp number | Latest-wins via `latest` Sheet tab formula |
| D15 | Makefile wraps common workflows | Lower friction than memorising npm scripts |

### Risks register

| ID | Risk | Mitigation |
|---|---|---|
| R1 | SRK silhouette is derived from a copyrighted film still and depicts a public figure protected under Indian personality-rights law | Risk explicitly accepted by couple. Site is `noindex`'d. Asset stored as a swap-in file; can be replaced with a non-protected illustration at any time. |
| R2 | Without a password gate, anyone with the URL can view the site | Mitigated by `noindex` and an obscure GitHub Pages URL. Couple has accepted this trade-off. Shared-password gate can be added later as a non-breaking enhancement. |
| R3 | Apps Script web-app deployments are a manual UI step | Documented in `apps-script/README.md`. Re-deploy needed only when `Code.gs` changes — likely rare after launch. |
| R4 | Schedule details largely TBD at spec time (only Mehendi date confirmed) | Spec defines the data model; filling times in is a content task, not a code change. |
| R5 | Apps Script can't see client IPs, so no IP-based throttle is possible | Honeypot + Origin check + per-WhatsApp throttle is sufficient for a noindex'd site. If abuse appears, reintroduce invitation codes (designed as a non-breaking addition). |
| R6 | CI catches missing/out-of-sync translations but not bad translations | A native Hindi speaker should review before launch. |
| R7 | Single developer (Padraic) — bus factor of one | Markdown-edit content path is documented in `README.md` so a non-developer can also do those updates. |

## 12. Testing

| Layer | Tool | Catches |
|---|---|---|
| Content schemas | Astro content collections (Zod) | Bad frontmatter, missing fields, wrong types |
| Translation parity | `scripts/i18n-check.mjs` | Missing translations, EN/HI drift |
| Type-check | `astro check` | Component prop misuse, broken imports |
| Build sanity | `astro build` in CI | Anything that breaks the build |
| RSVP form (manual, pre-launch) | Submit a real entry to a *test* tab in the Sheet | End-to-end form → Apps Script → Sheet |
| Visual / accessibility (manual) | Browser DevTools + Lighthouse | Contrast, mobile viewport, font loading |

No automated unit tests in v1. The site has minimal dynamic logic; the RSVP form is the only interactive piece and a real test submission to a staging tab is more useful than a mock. Reassess if the project grows.

## 13. Tech stack summary

- **Astro** (latest stable) — static site generator
- **TypeScript** — for component logic
- **Zod** — content collection schemas (bundled with Astro)
- **Lucide** — icons
- **Google Fonts (self-hosted)** — Playfair Display, Cormorant Garamond, Inter, Tiro Devanagari Hindi, Noto Sans Devanagari
- **Husky** — pre-commit hook runner
- **clasp** (`@google/clasp`) — Apps Script source-control / push tool
- **GitHub Actions** — CI/CD
- **GitHub Pages** — hosting
- **Google Apps Script** — RSVP backend
- **Google Sheets** — RSVP data store
- **Google Photos** — post-wedding album

## 14. Out of scope (for emphasis)

Re-listing the §2 non-goals as a closing reminder of what this spec deliberately does not cover: edit-my-RSVP UI, invitation codes, guest photo upload, audio playback, story page, registry, password protection, SEO/sitemap, analytics.
