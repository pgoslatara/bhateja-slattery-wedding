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
| 2 | `additional_guests` | JSON array of strings |
| 3 | `day1_attending` | `yes` / `no` |
| 4 | `day2_attending` | `yes` / `no` |
| 5 | `dietary` | JSON array (e.g. `["vegetarian","glutenFree"]`) |
| 6 | `dietary_other` | Free text |
| 7 | `arrival` | Free text |
| 8 | `departure` | Free text |
| 9 | `accommodation` | `sorted` / `recommended` / `help` |
| 10 | `whatsapp` | Used as the dedup key |
| 11 | `notes` | Free text |
| 12 | `raw_json` | Full original payload (forensic backup) |

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

```
=IFERROR(
  LET(
    raw,  SORT(FILTER(submissions!A2:M, submissions!A2:A <> ""), 1, FALSE),
    keys, INDEX(raw, 0, 11),
    mask, ARRAYFORMULA(MATCH(keys, keys, 0)) = SEQUENCE(ROWS(keys)),
    FILTER(raw, mask)
  )
)
```

How it works:

1. `FILTER(submissions!A2:M, ...)` drops empty trailing rows.
2. `SORT(..., 1, FALSE)` orders all submissions by timestamp **descending** —
   newest first.
3. `ARRAYFORMULA(MATCH(keys, keys, 0)) = SEQUENCE(ROWS(keys))` is the
   canonical "first-occurrence" mask. The `ARRAYFORMULA` wrap is required
   because Sheets' `MATCH` doesn't natively iterate over an array first
   argument. Because the rows are already sorted newest-first, the first
   occurrence of each WhatsApp number is its *latest* submission.

The view updates live as new rows land in `submissions`. If a guest resubmits
with the same WhatsApp number, their newer row replaces the older one in
`latest` automatically. The full audit trail is always preserved in
`submissions`.

## Manual smoke test

After every redeploy, post a test payload from the terminal:

```bash
curl -L -X POST "$PUBLIC_APPS_SCRIPT_URL" \
  -H "Content-Type: text/plain" \
  -d '{"leadName":"Test","whatsapp":"+919999999999","day1Attending":"yes","day2Attending":"no","accommodation":"sorted","additionalGuests":[],"dietary":[],"dietaryOther":"","arrival":"","departure":"","notes":"","honeypot":"","origin":"https://pgoslatara.github.io"}'
```

Expected: `{"status":"ok"}` and a new row in the `submissions` tab. The
`origin` field in the body must match an entry in `ALLOWED_ORIGINS` in
`Code.gs` — the server reads it from the body because Apps Script web apps
don't expose request headers.

[clasp]: https://github.com/google/clasp
