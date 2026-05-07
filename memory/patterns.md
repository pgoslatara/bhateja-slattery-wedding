# Patterns and gotchas

Non-obvious mechanics learnt while building this codebase. Read first; refer back as you work.

## Conventions

- Couple's name order is **always "Apeksha and Padraic"** (or "Apeksha & Padraic"). Never the other order.
- Repo deploys to GitHub Pages under `/website-wedding`. `astro.config.mjs` sets `base: '/website-wedding'`.
- All content lives in `src/content/` as paired `.en.md` / `.hi.md` files.
- Tests use Node's built-in `node:test` runner with `--experimental-strip-types` for `.ts` test fixtures.
- Pre-commit hook runs `npm run i18n:check` only (fast). Full check is `make check` (i18n + types + tests).
- Privacy is by-obscurity (`noindex` + `robots.txt`). No password gate by design.
- Conventional Commits style — `feat:`, `fix:`, `chore:`, `docs:`, `ci:`, `test:`.

## Astro 5 mechanics

- **i18n slug stripping**: Astro 5 strips locale dots from content slugs (`home.hi.md` → slug `homehi`). `getEntry('pages', 'home.hi')` does **not** work. Use `getCollection('pages').then(p => p.find(e => e.id === 'home.${lang}.md'))` instead — the `id` is the raw filename and stays stable. Pattern is established in `src/components/pages/HomePage.astro`.

- **`import.meta.url` in components**: Inside Astro/Vite-bundled components, `import.meta.url` resolves to the compiled chunk path, not the source file. To read a source file at build time (e.g. `site.yaml`), use `resolve(process.cwd(), 'src/content/site.yaml')`.

- **Build output path**: `astro.config.mjs`'s `base` controls URL prefix at runtime, not the output directory. Build produces `./dist/index.html` directly — GitHub Pages serves it under `/website-wedding/` automatically.

- **Astro `Image` from `astro:assets`** auto-optimises raster images at build (3 MB JPEG → ~200 KB WebP). Pattern: `import x from '../assets/x.jpg'; <Image src={x} width={2400} quality={80} loading="eager" decoding="async" />`.

- **Inline SVG via `?raw`**: `import svg from '../assets/x.svg?raw'; <div set:html={svg} />` for inline SVG that can be themed via `currentColor` from CSS.

- **Scoped styles + `set:html`**: Astro's scoped styles don't apply to `set:html` content. Use `:global()` to target inlined SVG elements: `.hero :global(svg) { ... }`.

- **The `s = t(lang)` returns a union type** (`Strings = (typeof strings)[Locale]`), not an English-only literal type. Initial drafts that wrote `Strings = (typeof strings)['en']` failed to type-check Hindi returns.

## Content collections / i18n parity

- `scripts/i18n-check.mjs` enforces three rules:
  1. **File pairing**: every `*.en.md` requires a matching `*.hi.md` and vice versa.
  2. **Invariant frontmatter**: language-invariant fields (`day`, `order`, `startTime`, `endTime`, `location` for schedule entries; `order` for FAQ) must match between paired files.
  3. **Source-hash freshness**: each `*.hi.md` carries an `enHash: <sha256>` field that must match the SHA256 of the matching `*.en.md`.

- After editing English content, run `make rehash NAME=<basename>` to bump the hash on the matching Hindi file.

- The frontmatter parser in `i18n-check.mjs` has a **length guard on numeric coercion** (`/^-?\d+$/.test(value) && value.length <= 15`) — without it, an all-digit SHA256 hash gets coerced to `Number(0)` and the hash check breaks.

- `enHash` is declared **optional** at the Zod schema level (because schemas are shared across locales) but the `i18n-check` script enforces its presence on every `*.hi.md`.

## Apps Script (RSVP backend)

- **Two `.gs` files**: `lib.gs` is pure logic (testable in Node via `vm.runInNewContext`), `Code.gs` is the entry point with Sheet I/O. Apps Script loads both into one global namespace, so `Code.gs` calls `parsePayload`/`isAllowedOrigin`/`isThrottled` directly without imports.

- **No request headers**: Apps Script web apps don't reliably expose `e.requestHeaders`. The client sends `origin: location.origin` in the JSON body and `Code.gs` reads it from `parsed.value.origin`. `client.ts:74` does the spread; `Code.gs:doPost` does the check.

- **No HTTP status code**: `ContentService.createTextOutput` has no status-code setter — Apps Script always returns 200 unless it throws. Error responses use `{ status: 'error', code: '...' }` in the body.

- **POSTs return a 302 redirect** to `script.googleusercontent.com/...` — `curl` needs `-L` to follow it. Browsers follow automatically.

- **Sheet schema**: 14 columns. `A=timestamp, B=lead_name, C=additional_guests, D=day1_attending, E=day2_attending, F=dietary, G=dietary_other, H=arrival, I=departure, J=accommodation, K=whatsapp, L=notes, M=raw_json, N=requires_visa`. New columns are appended at the end to preserve existing-row alignment. **WhatsApp is at column K (index 10)** — that's the dedup key referenced by `lookupLastSubmissionMs` in `Code.gs` and the `latest`-view formula.

- **`latest` view formula** lives in `apps-script/README.md`. Use the **two-cell version** (`A1` for header, `A2` for body) — the single-cell version chokes with "ARRAY_LITERAL was missing values for one or more rows" because `FILTER` sometimes returns a 1D vector that doesn't stack with the 1×N header.

- **Manual deploy step**: `clasp push` uploads source, but the published web-app URL is pinned to a deployment version. To make changes live: `make script-push` → `make script-open` → *Deploy → Manage deployments → Edit (pencil) → New version → Deploy*. The URL stays the same; no GitHub secret update needed.

- **Defence-in-depth on RSVP**: client validation (`validate.ts`), server validation (`lib.gs:parsePayload`), `LockService.getScriptLock()` around the throttle-check + append, honeypot field (`favourite_pet`), per-WhatsApp throttle (10s), origin allow-list (sent in body).

## Google Sheets formulas

- `MATCH(array, array, 0)` does **not** natively iterate over an array first argument in Sheets. Wrap in `ARRAYFORMULA(MATCH(...))` to get an array result.
- `{header; body}` array literals fail with "missing values for one or more rows" when `FILTER` returns a single row (Sheets sometimes returns a 1D vector instead of a 1×N array). Workaround: split across two cells.

## Node tooling

- **Node 22.6+ required** for `--experimental-strip-types`. Project pins `>=22.11` via `.node-version`.
- `node --test <dir>` does **not** accept bare directory paths in Node 24 — use a glob: `node --test 'tests/**/*.test.mjs'`.

## Visual

- **Site-wide background**: `src/assets/motifs/hero-mustard-field-couple.jpg` (Gemini-generated painting). Rendered via Astro's `<Image>` in `Layout.astro`, `position: fixed` to the viewport bottom, `max-height: 65vh`. A cream gradient overlay (top fade to bottom transparent) keeps text readable as it scrolls over the upper portion of the image.
- **Footer** has a solid `var(--color-bg)` background to keep contact info readable over the figures' feet.
- All design tokens (colours, fonts, radii) are CSS custom properties in `src/styles/tokens.css`.
- Hindi typography uses `Tiro Devanagari Hindi` for headings and `Noto Sans Devanagari` for body — switched via `html[lang="hi"]` selector in `tokens.css`.

## Image generation

- The Gemini MCP server's `mcp__gemini__gemini-generate-image` works well for hero compositions. Prompts that emphasise "anonymous figures, viewed from behind, no facial features" sidestep likeness concerns and give the model latitude to compose freely. Style hint `"painterly cinematic illustration, watercolour"` produces pleasing results that complement the cream/red/gold palette.

## Local dev

- `make help` lists all targets.
- `make dev` and `make preview` bind to `0.0.0.0` so the dev server is reachable from another device on the local network (handy for testing Hindi rendering and responsive layout on a phone).

## CI

- `.github/workflows/pr-checks.yml`: runs on every PR + push to main. i18n parity → astro check → tests → build (with placeholder env vars).
- `.github/workflows/deploy.yml`: build + GitHub Pages deploy on push to main. `SITE_URL` is set from `${{ github.repository_owner }}.github.io`. `PUBLIC_APPS_SCRIPT_URL` injected from a repo secret.
- `.github/workflows/apps-script-push.yml`: manual `workflow_dispatch` only. Pushes Apps Script source via clasp; needs `CLASP_AUTH` and `APPS_SCRIPT_ID` secrets.
- Branch protection on `main` should require `pr-checks.yml` to pass.
