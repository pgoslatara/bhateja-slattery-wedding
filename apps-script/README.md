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
`latest` tab manually with this single-cell formula in `A1`:

```
=ARRAYFORMULA(
  IFERROR(
    SORT(
      QUERY(
        {submissions!A:M, ARRAYFORMULA(MATCH(submissions!K:K, submissions!K:K, 0))},
        "SELECT Col1,Col2,Col3,Col4,Col5,Col6,Col7,Col8,Col9,Col10,Col11,Col12,Col13 WHERE Col14 = ROW(Col14) AND Col1 IS NOT NULL ORDER BY Col1 DESC LABEL Col1 'timestamp', Col2 'lead_name', Col3 'additional_guests', Col4 'day1', Col5 'day2', Col6 'dietary', Col7 'dietary_other', Col8 'arrival', Col9 'departure', Col10 'accommodation', Col11 'whatsapp', Col12 'notes', Col13 'raw_json'",
        1),
      2, TRUE)))
```

This uses `MATCH(K:K, K:K, 0)` to keep only each WhatsApp number's first
occurrence (because `submissions` is appended chronologically, that's the
oldest), then sorts by `lead_name`. To get the *newest* per WhatsApp instead,
sort `submissions` descending by timestamp first or use a more elaborate
formula. For ~60 guests either approach is fine.

## Manual smoke test

After every redeploy, post a test payload from the terminal:

```bash
curl -X POST "$PUBLIC_APPS_SCRIPT_URL" \
  -H "Content-Type: text/plain" \
  -d '{"leadName":"Test","whatsapp":"+919999999999","day1Attending":"yes","day2Attending":"no","accommodation":"sorted","additionalGuests":[],"dietary":[],"dietaryOther":"","arrival":"","departure":"","notes":"","honeypot":"","origin":"https://<your-username>.github.io"}'
```

Expected: `{"status":"ok"}` and a new row in the `submissions` tab. The
`origin` field in the body must match an entry in `ALLOWED_ORIGINS` in
`Code.gs` — the server reads it from the body because Apps Script web apps
don't expose request headers.

[clasp]: https://github.com/google/clasp
