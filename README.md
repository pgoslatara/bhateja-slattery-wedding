# website-wedding

Wedding website for Apeksha and Padraic — 27 February 2027, Gurgaon.

See `docs/superpowers/specs/2026-05-06-wedding-website-design.md` for the full spec.

## Quickstart

```bash
make setup     # install deps + husky hook
make dev       # run dev server at http://localhost:4321
```

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
