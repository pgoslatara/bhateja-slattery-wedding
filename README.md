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
