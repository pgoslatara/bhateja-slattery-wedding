# Pre-launch checklist

Manual user actions still needed before the site can serve real guests.
Items marked ✅ have already been done.

## Apps Script + Google Sheet

- [ ] Create the Google Sheet that holds RSVP submissions
- [ ] One-time `clasp login` locally; create `.clasp.json` at the **repo root** (gitignored) with `{"scriptId":"<scriptId>","rootDir":"./apps-script"}`
- [ ] `make script-push` (uploads `Code.gs` + `lib.gs` + `appsscript.json`)
- [ ] In the Apps Script editor: *Deploy → New deployment → Web app* (Execute as: **Me**, Access: **Anyone**)
- [ ] Copy the resulting `https://script.google.com/macros/s/.../exec` URL — that's `PUBLIC_APPS_SCRIPT_URL`
- [ ] After the first real submission lands in `submissions`, manually create the `latest` tab using the **two-cell formula** in `apps-script/README.md` (single-cell variant fails with an array-literal error)
- [ ] If an older Sheet header already exists from a previous deployment (with `day1_attending` between columns C and E), delete column D from `submissions` and rerun `make script-push` — the column count and `whatsapp` index shifted when the Mehendi event was dropped
- [ ] If the live `submissions` sheet still has a `day2_attending` header in column D, rename it manually to `wedding_attending`. `createSubmissionsSheet` only writes the header on first creation, so existing sheets keep the old label until edited by hand. Data values are unchanged.

## GitHub setup

- ✅ `apps-script/Code.gs` `ALLOWED_ORIGINS` set to `https://pgoslatara.github.io`
- [ ] *Settings → Pages → Build and deployment → Source: GitHub Actions*
- [ ] *Settings → Secrets and variables → Actions* — add `PUBLIC_APPS_SCRIPT_URL`
- [ ] (Optional, for the manual `apps-script-push.yml` workflow) Add `CLASP_AUTH` (entire `~/.clasprc.json` contents) and `APPS_SCRIPT_ID`
- [ ] *Settings → Branches → main* — add a branch protection rule requiring `pr-checks.yml` to pass

## Content

- ✅ `src/content/site.yaml` couple names + venue updated
- [ ] Real schedule times in `src/content/schedule/02-ceremony.{en,hi}.md` (currently `TBD`)
  - After editing the `.en.md`, run `make rehash NAME=02-ceremony`
- [ ] Decide whether to expand FAQ + travel content (currently minimal — sufficient for v1, but consider adding gifts and accommodation logistics)
- [ ] **Photo album setup** — see the [Photo album setup](#photo-album-setup) section below. Two albums (Google Photos + iCloud) cover Android, iPhone, and web users; the Photos page auto-renders QR codes when the URLs are set.
- [ ] **Donation QR setup** — see the [Donation QR setup](#donation-qr-setup) section below. The Donations page renders a QR code per currency (EUR/INR/USD) and shows no bank text, so the values in `site.yaml` must be correct before going live.

## Photo album setup

The Photos page renders QR codes for two albums — one for Android/web guests (Google Photos) and one for iPhone/iPad guests (iCloud). Both are optional; the page falls back to the "Photos coming soon" placeholder if neither URL is set, and to a single QR card if only one is set.

### Google Photos shared album (Android, web, anyone with a Google account)

1. Open [photos.google.com](https://photos.google.com) and sign in.
2. Click **+ Create → Album**, give it a name (e.g. "Apeksha & Padraic Wedding 2027").
3. Open the album → click the **share** icon (top right) → **Share**.
4. **Toggle "Collaborate" ON** — this is the critical step that lets guests add their own photos to the album.
5. Click **Get link** → copy the URL (looks like `https://photos.app.goo.gl/AbCdEfGh1234`).
6. Paste into `src/content/site.yaml`:

   ```yaml
   photoAlbums:
     googlePhotos: 'https://photos.app.goo.gl/AbCdEfGh1234'
   ```

**Storage trick that solves the "Padraic doesn't have Drive space" problem**: when a guest contributes via the collaborator link, their photos stay in *their own* Google library — the shared album just references them. Padraic's storage usage = only photos he uploads himself.

### iCloud shared album (iPhone, iPad, Mac)

1. On iPhone or Mac → Photos app → tap **+** → **New Shared Album**.
2. Name it (e.g. "Apeksha & Padraic Wedding 2027").
3. Open the album → tap the **people icon** (top right) → toggle **Public Website** ON.
4. The toggle reveals a `https://www.icloud.com/sharedalbum/#...` link — tap **Copy Link**.
5. Paste into `src/content/site.yaml`:

   ```yaml
   photoAlbums:
     googlePhotos: '...'   # already set above
     icloud: 'https://www.icloud.com/sharedalbum/#B0aBcDeFgHiJkLm'
   ```

**Important caveat**: iCloud public-website mode is **read-only for non-Apple users**. Android/web guests can VIEW via this link but cannot upload. To upload, an Apple-device user must accept the album invitation directly (sent via Messages/email separately). For best results, send the invite link to Apple-device guests via WhatsApp before the wedding.

### Verify

After committing the URL changes, run `make build` locally — the page generates QR codes from the URLs at build time (via the `qrcode` npm package). Visit `/photos/` and `/hi/photos/` to confirm both QR cards render.

To test the QR codes: open your phone camera, point at the screen, scan one. Should open the corresponding album.

## Donation QR setup

The Donations page renders one QR code per configured currency in `src/content/site.yaml`. No bank details are rendered as text — guests scan with their banking / payment app. QRs are baked at build time, so any change to the values requires a rebuild + redeploy.

### EUR — Revolut payment link

Encodes a `https://revolut.me/<handle>` URL. Scanning with any camera app opens the link, which lets the sender pay from Revolut (or any card) without needing IBAN/BIC details.

```yaml
donations:
  eur:
    revolutUrl: https://revolut.me/pgslattery
```

### INR — UPI deep link

Encodes a `upi://pay?pa=…&pn=…&cu=INR` link. Scanned by PhonePe, GPay, Paytm, BHIM, etc.

```yaml
  inr:
    name: Apeksha Bhateja           # payee display name (required)
    upi: apeksha@upi                # the UPI ID / VPA (required)
```

### USD — Wise payment link

No standardised QR exists for ACH/wire, so we encode a Wise "pay me" URL instead. Set this up at [wise.com/pay/me](https://wise.com/pay/me) — it generates a permanent personal link that supports inbound USD (and many other currencies).

```yaml
  usd:
    wiseUrl: https://wise.com/pay/me/PADRAICSLATTERY
```

### Verify

After committing the values, run `make build` locally, then visit `/donations/` and `/hi/donations/`. **Scan each QR with a real device before pushing to main**:

- **EUR**: open the camera app on any phone → confirm it offers to open the Revolut URL → tap through and confirm the destination handle matches.
- **INR**: open PhonePe / GPay → confirm the payee name and UPI ID match.
- **USD**: open the camera app on any phone → confirm it offers to open the Wise URL → tap through and confirm the destination account matches.

A wrong IBAN or UPI ID baked into a public QR is hard to recall — verify before pushing to `main` (which auto-deploys via `.github/workflows/deploy.yml`).

## Quality

- [ ] **Have a native Hindi speaker review** the translations in `src/content/**/*.hi.md` and `src/i18n/strings.ts`. CI catches drift, not bad translations. The Hindi was seeded by an LLM.

## Smoke test

After deploy, walk through the test plan in `docs/superpowers/plans/2026-05-06-wedding-website.md` Task 28:

- All 14 pages render (7 EN + 7 HI)
- Donation QRs scan cleanly on a real device for each currency (EUR / INR / USD) — see [Donation QR setup](#donation-qr-setup)
- Language toggle works on every page; auto-detect respects browser locale (`navigator.language`)
- RSVP form submits successfully (real submission lands in the Sheet's `submissions` tab and the `latest` view picks it up)
- Throttle works: re-submitting same WhatsApp within 10s returns `{"status":"error","code":"throttled"}`. After 10s it succeeds again.
- `curl https://pgoslatara.github.io/bhateja-slattery-wedding/robots.txt` → `User-agent: *` / `Disallow: /`
- Lighthouse mobile audit: accessibility score ≥ 95
- Tag the release: `git tag -a v1.0.0 -m "Wedding site v1.0.0 — public launch"; git push origin v1.0.0`

## Manual smoke-test command

After every Apps Script redeploy, post a test payload from the terminal:

```bash
curl -L -X POST "$PUBLIC_APPS_SCRIPT_URL" \
  -H "Content-Type: text/plain" \
  -d '{"leadName":"Smoke Test","whatsapp":"+919999999999","weddingAttending":"no","accommodation":"sorted","requiresVisa":"no","additionalGuests":[],"dietary":[],"dietaryOther":"","arrival":"","departure":"","notes":"","honeypot":"","origin":"https://pgoslatara.github.io"}'
```

Expected: `{"status":"ok"}` and a new row in `submissions`. Note `-L` to follow the 302 to `script.googleusercontent.com`.
