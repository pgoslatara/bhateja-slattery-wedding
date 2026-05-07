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

## Manual smoke test

After every redeploy, post a test payload from the terminal:

```bash
curl -X POST "$PUBLIC_APPS_SCRIPT_URL" \
  -H "Origin: https://<your-username>.github.io" \
  -H "Content-Type: text/plain" \
  -d '{"leadName":"Test","whatsapp":"+919999999999","day1Attending":"yes","day2Attending":"no","accommodation":"sorted","additionalGuests":[],"dietary":[],"dietaryOther":"","arrival":"","departure":"","notes":"","honeypot":""}'
```

Expected: `{"status":"ok"}` and a new row in the `submissions` tab.

[clasp]: https://github.com/google/clasp
