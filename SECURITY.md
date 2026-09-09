# Security Notes & Credential Rotation Checklist

_Last updated: 2026-09-09_

This file tracks known credential exposures and the actions required to close them.
It exists because several secrets were committed or stored in plaintext during
early development.

## 1. Exposed credentials — ROTATION REQUIRED

These values were present in committed source (`frontend/functions/config/db.js`,
now deleted) and/or in plaintext env files. The leaked strings remain in git
history — we chose **not** to rewrite history, so the only thing that makes them
safe is rotating them at the provider.

| Credential | Where it leaked | Status | Action owner |
|---|---|---|---|
| NeonDB / Postgres password (`npg_7vkzPuwpRZX9`), host `ep-empty-art-a1j1uytp-pooler...`, user `neondb_owner` | `frontend/functions/config/db.js`, committed in **both** commits `e25e993` and `574495b`, pushed to `github.com/Venkat121002/Billing` | ☐ ROTATE in Neon dashboard (or delete the project entirely — Postgres is no longer used by this codebase) | project owner |
| Razorpay **live** keys (`RAZORPAY_KEY_ID=rzp_live_...`, `RAZORPAY_KEY_SECRET`) | `backend/.env` (gitignored, plaintext on disk) | ☐ ROTATE in Razorpay dashboard | project owner |
| Brevo API key (`BREVO_API_KEY=xkeysib-...`) and SMTP password (`BREVO_SMTP_PASSWORD=xsmtpsib-...`) | `backend/.env` (gitignored, plaintext; same key reused for API + SMTP) | ☐ ROTATE in Brevo, use separate keys for API vs SMTP if possible | project owner |
| Firebase Admin service-account key | `backend/serviceAccountKey.json` (gitignored) | ☐ Confirm it was never committed (`git log --all -- backend/serviceAccountKey.json`); move it out of any cloud-synced folder; rotate the key in the Google Cloud console if in doubt | project owner |
| `JWT_SECRET` | Was the placeholder `dev_secret_key_please_change` in `backend/.env` and a low-entropy string in `backend/.env.custom` | ✅ Replaced locally with a 64-hex-char random value. **The deployed Cloud Function must set its own strong `JWT_SECRET`** (Firebase env config / deployed `.env.custom`) — do not reuse the value in this repo's local files | project owner (deploy) |

Rotating `JWT_SECRET` invalidates all existing login sessions — users will need
to sign in again. That is expected.

## 2. Verifying history

The repo has been pushed to a public-capable GitHub remote. To check exactly what
a given secret's exposure looks like:

```bash
git log --all -p -- frontend/functions/config/db.js
git log --all -- backend/.env backend/serviceAccountKey.json
```

If you later decide to scrub history, use `git filter-repo` or BFG and
force-push — coordinate with anyone else who has a clone (they must re-clone).

## 3. Firestore security rules

`firestore.rules` now scopes every read/write to the authenticated user's own
`owner/{ownerId}` (or `subuser/{subuserId}`) path under
`SwordNexBillingSoftware/{tenantId}/...`, with a default-deny for everything else.
Any client code that talks to Firestore directly (rather than through the backend
REST API) must write under that path shape or it will be denied.

## 4. Env file layout (post-cleanup)

- `backend/.env.custom` — **authoritative** for local dev; loaded by `backend/server.js`
  (`dotenv.config({ path: '.env.custom' })`). Holds `DB_TYPE`, local Mongo URI,
  test payment keys.
- `backend/.env` — holds the live Razorpay/Brevo values used for the deployed
  environment. Plaintext, gitignored. Rotate per the table above.
- `backend/.env.example` — committed template with placeholders only. Never put
  real values here.
