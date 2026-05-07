# Project Context

## What this is

Bilingual (English + Hindi) wedding website for **Apeksha and Padraic**. Wedding date: **27 February 2027** at a single venue in **Gurgaon, India**. Two-day event (mehendi 26 Feb, ceremony 27 Feb). About 60 guests, mostly India + some in Europe.

The couple lives in **Amsterdam** — that's the personal context behind any "where they live" decorative touches.

## User

The user is **Padraic Slattery** (the groom — `partner2` in `site.yaml`). Data engineering consultant. Prefers UK English, Conventional Commits, terse responses. Comfortable with the full developer workflow (`git`, `gh`, `make`, `npm`).

## Tech stack

- **Astro 5** static site → **GitHub Pages** under `https://pgoslatara.github.io/website-wedding/`
- **TypeScript** components, **Zod** schemas for content validation
- **Markdown/YAML** content with CI-enforced translation parity
- **Google Apps Script** web app + **Google Sheet** as the RSVP backend
- **GitHub Actions** for CI + deploy
- **Node 22.6+** required (uses `--experimental-strip-types` for `.ts` test fixtures)

## Where things live

| What | Where |
|---|---|
| Page components (shared, take `lang` prop) | `src/components/pages/<X>Page.astro` |
| Route wrappers (thin, one per locale) | `src/pages/<x>.astro` and `src/pages/hi/<x>.astro` |
| Layout + Header + Footer + LangToggle | `src/components/{Layout,Header,Footer,LangToggle}.astro` |
| Translation strings (EN + HI) | `src/i18n/strings.ts` |
| URL helpers (locale-aware) | `src/i18n/urls.ts` |
| Content (paired `.en.md` / `.hi.md`) | `src/content/{pages,schedule,faq}/*.{en,hi}.md` |
| Site-wide config (names, date, venue, contact) | `src/content/site.yaml` |
| Zod schemas + site config schema | `src/content/config.ts` |
| Design tokens + global styles | `src/styles/{tokens,global}.css` |
| Hero / decorative motifs | `src/assets/motifs/` |
| RSVP validation (TS, Node-test) | `src/components/rsvp/validate.ts` |
| RSVP form markup | `src/components/rsvp/RsvpForm.astro` |
| RSVP submission client | `src/components/rsvp/client.ts` |
| Apps Script source | `apps-script/{Code.gs,lib.gs,appsscript.json,README.md}` |
| i18n parity scripts | `scripts/i18n-{check,rehash}.mjs` |
| Tests | `tests/*.test.mjs` |
| CI workflows | `.github/workflows/{deploy,pr-checks,apps-script-push}.yml` |
| Husky pre-commit hook | `.husky/pre-commit` (runs `i18n:check` only) |
| Spec | `docs/superpowers/specs/2026-05-06-wedding-website-design.md` |
| Plan | `docs/superpowers/plans/2026-05-06-wedding-website.md` |

## Status

Implementation complete (27 of 28 plan tasks done). Task 28 is a manual user smoke test on the deployed site. See [`pre-launch.md`](pre-launch.md) for the remaining manual actions before going live.

## Deliberate non-goals (v1)

- "Edit my RSVP" UI — guests resubmit the form to update answers
- Per-guest invitation codes (designed as a non-breaking later addition)
- Photo upload by guests
- Story / about-us page, gift registry, password gate
- SEO, sitemap, hreflang, analytics

## Deliberately deferred

- **Self-hosted fonts** (currently using Google Fonts CDN) — see `public/fonts/README.md`.
- **Decorative SVG motifs** (mehendi watermark, marigold garland, paisley dividers, mandala, diya spinner) — design brief intentionally thin in v1.
- **Lucide icons** — `lucide-static` is in `package.json` but no icons are rendered yet.
