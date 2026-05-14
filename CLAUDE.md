# Claude — project guide

This is a bilingual (English + Hindi) wedding website for Apeksha and Padraic, deployed to GitHub Pages at `https://pgoslatara.github.io/bhateja-slattery-wedding/`.

## Read first

Before exploring the codebase or making non-trivial changes, read:

1. [`memory/project-context.md`](memory/project-context.md) — what this site is, who the user is, where things live, current status.
2. [`memory/patterns.md`](memory/patterns.md) — non-obvious framework mechanics (Astro 5 i18n quirks, Apps Script gotchas, Sheets formula footguns, Node tooling nuances).
3. [`memory/pre-launch.md`](memory/pre-launch.md) — manual user actions still needed before going live.

The authoritative design docs are:

- Spec: [`docs/superpowers/specs/2026-05-06-wedding-website-design.md`](docs/superpowers/specs/2026-05-06-wedding-website-design.md)
- Plan: [`docs/superpowers/plans/2026-05-06-wedding-website.md`](docs/superpowers/plans/2026-05-06-wedding-website.md)

## Quick facts

- Couple's name order is **always "Apeksha and Padraic"** — never the other order.
- Tech: Astro 5 → GitHub Pages, RSVP via Google Apps Script + Sheet.
- Local dev: `make setup`, `make dev`, `make preview`, `make check`.
- All content is paired `.en.md` / `.hi.md` files; CI enforces translation parity.
- After editing any `.en.md`, run `make rehash NAME=<basename>` to update the matching `.hi.md`'s `enHash`.
- Pre-commit hook runs `npm run i18n:check` only (fast). Full check is `make check`.
- Privacy is by-obscurity — `noindex` + `robots.txt`. There is no password gate by design.

## Updating this memory

When you learn something non-obvious during a session — a framework gotcha, a tooling quirk, a project convention — add it to `memory/patterns.md` immediately. When the project state changes (new pages, new content categories, deferred items resolved), update `memory/project-context.md`. Both files are the per-session "did I miss anything?" reference.
