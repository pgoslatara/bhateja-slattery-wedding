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

## Sheet structure

The script creates the `submissions` tab automatically on the first POST. The
columns are:

| # | Column | Notes |
|---|---|---|
| 0 | `timestamp` | ISO-8601 string set by the server |
| 1 | `lead_name` | |
| 2 | `additional_guests` | JSON array of `{ name, dietary, dietaryOther }` objects |
| 3 | `wedding_attending` | `yes` / `no` |
| 4 | `dietary` | JSON array (e.g. `["vegetarian","glutenFree"]`) |
| 5 | `dietary_other` | Free text |
| 6 | `arrival` | Free text |
| 7 | `departure` | Free text |
| 8 | `accommodation` | `sorted` / `recommended` / `help` |
| 9 | `whatsapp` | Used as the dedup key |
| 10 | `notes` | Free text |
| 11 | `raw_json` | Full original payload (forensic backup) |
| 12 | `requires_visa` | `yes` / `no` — whether the guest needs an Indian visa |

### Add a `latest` view

Per the spec, the working view for tracking RSVPs is the *latest* submission
per WhatsApp number (guests can resubmit to update their answers). Create a
`latest` tab manually and paste two formulas — one for the header, one for
the body. Splitting them avoids a Sheets array-literal column-mismatch error
that occurs when stacking the header onto a single-row FILTER result.

**In `A1`** (header — copies the column labels from `submissions`):

```
=submissions!A1:M1
```

**In `A2`** (body — deduped, latest-per-WhatsApp rows, spills downward):

Paste as a single line — multi-line copies from markdown sometimes introduce
stray whitespace that Sheets rejects:

```
=IFERROR(LET(sorted,SORT(FILTER(submissions!A2:M,submissions!A2:A<>""),1,FALSE),keys,CHOOSECOLS(sorted,10),first,MAP(keys,LAMBDA(k,MATCH(k,keys,0))),FILTER(sorted,first=SEQUENCE(ROWS(keys)))))
```

How it works:

1. `FILTER(submissions!A2:M, ...)` drops empty trailing rows.
2. `SORT(..., 1, FALSE)` orders all submissions by timestamp **descending** —
   newest first.
3. `CHOOSECOLS(sorted, 10)` extracts the `whatsapp` column as a vertical
   vector. (Note: `INDEX(sorted, 0, 10)` works on sheet ranges but returns a
   1-row vector — not a column — when applied to the *result* of `SORT`/`FILTER`,
   collapsing downstream masks. `CHOOSECOLS` is the reliable column-picker
   for in-memory arrays.)
4. `MAP(keys, LAMBDA(k, MATCH(k, keys, 0)))` returns, for each row, the
   position of the *first* occurrence of that WhatsApp number in the sorted
   list. `MAP`/`LAMBDA` forces per-element iteration; `ARRAYFORMULA(MATCH(keys,
   keys, 0))` silently collapses to a single scalar when both arguments are
   the same vector and leaves only row 1 surviving.
5. Comparing `first` to `SEQUENCE(ROWS(keys))` yields TRUE only for rows that
   are themselves the first occurrence of their key. Because rows are sorted
   newest-first, that is each guest's *latest* submission.

The view updates live as new rows land in `submissions`. If a guest resubmits
with the same WhatsApp number, their newer row replaces the older one in
`latest` automatically. The full audit trail is always preserved in
`submissions`.

## Email notifications

After every successful write to `submissions` **from a production origin**,
the script sends a plain-text notification email to each address in
`NOTIFY_EMAILS` (top of `Code.gs`) using `MailApp.sendEmail`. Submissions from
`DEV_ORIGINS` (local Astro dev server) are written to the sheet but do **not**
trigger notifications, so you can smoke-test the form without spamming
inboxes. To add or remove recipients, edit the array and run `make
script-push` followed by a new deployment version (see *Re-deploying after
Code.gs changes* above). Likewise, adding a new production origin (e.g. a
custom domain) means appending to `PROD_ORIGINS`.

The mail send is wrapped in `try/catch` — if MailApp throws (quota exceeded,
transient error), the RSVP row is still saved and the failure is recorded via
`Logger.log`. Consumer Google accounts have a daily quota of ~100 messages
across all recipients; each address in `NOTIFY_EMAILS` counts separately.

The first time the deployment runs after this change is applied, Apps Script
will prompt the script owner to re-authorize the project (the `MailApp` scope
was not previously requested). Open the editor (`make script-open`), run
`doPost` manually once, and accept the new permission. Subsequent submissions
will go through without further interaction.

## Manual smoke test

After every redeploy, post a test payload from the terminal:

```bash
curl -L -X POST "$PUBLIC_APPS_SCRIPT_URL" \
  -H "Content-Type: text/plain" \
  -d '{"leadName":"Test","whatsapp":"+919999999999","weddingAttending":"yes","accommodation":"sorted","requiresVisa":"no","additionalGuests":[],"dietary":[],"dietaryOther":"","arrival":"","departure":"","notes":"","honeypot":"","origin":"https://pgoslatara.github.io"}'
```

Expected: `{"status":"ok"}` and a new row in the `submissions` tab. The
`origin` field in the body must match an entry in `ALLOWED_ORIGINS` in
`Code.gs` — the server reads it from the body because Apps Script web apps
don't expose request headers.

[clasp]: https://github.com/google/clasp
