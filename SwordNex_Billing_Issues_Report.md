# SwordNex Billing — Project Issues Report

**Prepared:** September 8, 2026
**Scope:** The full project folder (`D:\Swordnex\Billing Project\Billing` — root, `backend/`, `frontend/`, and `frontend/functions/`) plus the two existing project docs (`SwordNex_Billing_Project_Documentation.docx` and `project-documentation-page-directory.md`).
**Method:** Read the actual source files (not just the plans) across the root, backend, and frontend/functions folders, cross-checked them against each other and against the existing documentation, and verified a sample of previously-flagged bugs still reproduce in the current code.

A note on scope: the existing `SwordNex_Billing_Project_Documentation.docx` already contains a thorough page-by-page audit of the **frontend** (dead pages, duplicate files, routing bugs — its Appendix 9). This report does not repeat that work in full; Section 5 below summarizes and spot-verifies it, but the new material here is everything that doc didn't cover: the backend, the database architecture, security, and repository/requirements-level issues.

---

## 1. Executive Summary

The five issues most worth acting on first:

1. **A live production database password is committed in plaintext inside a tracked source file** (`frontend/functions/config/db.js`), not an ignored `.env` — meaning it is very likely already in git history.
2. **Firestore's security rules allow any signed-in user to read and write every document in the database**, with no restriction by tenant, owner, or company. Combined with the fact that some screens (Barcode Billing, the legacy Mobile billing prototype) talk to Firestore directly, this is a real cross-business data-exposure risk in a billing platform that handles other companies' financial records.
3. **Live Razorpay payment keys, Brevo email/SMTP credentials, and a Firebase Admin service-account key sit unencrypted on disk** in `backend/.env` and `backend/serviceAccountKey.json`. These particular files are correctly listed in `.gitignore`, so they likely aren't in git — but it's worth confirming, since adding a `.gitignore` rule after a file was already committed once doesn't remove it from history.
4. **The project has three different, half-finished database architectures at once** (PostgreSQL/Sequelize, Firebase Firestore, and MongoDB), spread across **three separate, diverging copies of the backend** (project root, `backend/`, and `frontend/functions/`). The current official documentation (`DATABASE_ARCHITECTURE.md`) describes the architecture from the stale copy, not the one that's actually deployed — so it currently gives an inaccurate answer to "where is my data."
5. **A large share of the original product requirements were never built.** The founding PRD (`project.md`, `README.md`) centers on attendance tracking, payroll with pay-slips, leave management, and digital signature/seal — none of which exist anywhere in the delivered six-industry platform. That may well have been an intentional pivot, but it doesn't appear to be written down anywhere as a decision.

Full detail follows below, organized by area.

---

## 2. Critical Security Issues

### 2.1 Database credentials committed to a tracked source file
`frontend/functions/config/db.js` (lines 5–9) contains real NeonDB/PostgreSQL host, username, and password values, written as comments directly above the `Sequelize` connection setup. Unlike the `.env` files (which are excluded by `.gitignore`), nothing in the repo excludes this file — it's a plain `.js` file in a normal source folder. If this repository has ever been pushed anywhere, or even just committed locally, that password is in git history and should be treated as compromised.

**Action:** Rotate the NeonDB password immediately, then scrub it from git history (`git filter-repo` or BFG), regardless of whether the remote has seen it yet.

### 2.2 Firestore security rules have no tenant isolation
`firestore.rules`:
```
match /{document=**} {
  allow read, write: if request.auth != null;
}
```
This grants **any authenticated user** — any business that has ever signed up — full read/write access to every document in the entire Firestore database, including every other tenant's invoices, customers, and financial records. The file's own comment acknowledges this is temporary ("Ideally, we should restrict by tenant or user ID"). The backend API does scope its own queries by `ownerId` (see `backend/utils/dbUtils.js`), but that scoping only exists in application code — anything that talks to Firestore directly bypasses it entirely, and per the existing documentation, `BarcodeBilling.jsx` and the legacy `mobilebilling.jsx` prototype do exactly that.

**Action:** This is the single highest-priority fix in the project given it's a multi-tenant billing product. Rules should scope every read/write to the requesting user's own owner/tenant path before this goes anywhere near real customer data (if it hasn't already).

### 2.3 Live payment and email credentials stored in plaintext
`backend/.env` contains a **live** (not test) Razorpay key pair, a Brevo transactional-email API key, and the same key reused as an SMTP password. These are correctly excluded from git by `.gitignore`, but they sit unencrypted on a machine/synced folder, and `backend/server.js` only loads `.env.custom` at startup (`dotenv.config({ path: '.env.custom' })`) — meaning it's unclear whether `.env`'s values are even the ones actually in effect at runtime, versus the placeholder test values in `.env.custom`. Worth clarifying which file is authoritative before rotating anything.

### 2.4 Weak, "please change" JWT signing secret still in use
`backend/.env`: `JWT_SECRET=dev_secret_key_please_change` — a well-known placeholder string, still active, verified as the value `backend/middleware/auth.js` uses to sign and check every login token. `backend/.env.custom` uses a slightly better but still low-entropy, guessable value. The root-level `.env` has a proper 64-character random secret, but it's unclear anything actually loads that file. Whichever secret is genuinely in effect for the running server should be replaced with a long random value, and the three inconsistent copies reconciled.

### 2.5 Firebase Admin service-account key stored beside the code
`backend/serviceAccountKey.json` is a Firebase Admin SDK private key sitting directly in the backend folder. It's gitignored, but its presence in a folder that may be synced to cloud storage or shared casually is worth flagging — this key grants full administrative access to the Firebase project.

---

## 3. Architecture & Documentation Are Out of Sync With Each Other

This is the most structurally important finding, because it explains several of the other issues below.

### 3.1 Three separate copies of the backend exist
- **`backend/`** — the one Firebase actually deploys (`firebase.json` → `functions.source: "backend"`), and the one `backend/server.js`/`backend/index.js` (exporting the `billingApi` Cloud Function) reflects. This is the current, "real" backend.
- **Project root** (`server.js`, `.env`, `database.sqlite`, `create_test_user.js`, `out.txt`) — a smaller, older duplicate of the backend sitting loose at the top level of the repo. Its `server.js` is missing several routes that `backend/server.js` has (suppliers, users, OTP, trainers, import, returns, clients, salesman) and still actively tries to sync a Sequelize/Postgres connection on startup.
- **`frontend/functions/`** — a *third*, apparently earliest-generation copy, with its own `app.js`, `index.js`, `config/`, `controllers/`, `middleware/`, `models/`, `routes/`, and `node_modules`. This is almost certainly what an earlier Firebase Functions setup looked like before the project moved to `backend/`.

Nothing in the repo marks any of these as deprecated. A new developer (or a future audit) has no way to tell which one is current without reading `firebase.json` closely, as this report had to.

### 3.2 `DATABASE_ARCHITECTURE.md` describes the wrong (stale) backend
That document tells you, in plain language, that "your application is configured to save data to PostgreSQL," and points at `frontend/functions/config/db.js` as the proof. But:
- `frontend/functions/config/db.js` isn't part of the deployed backend at all (see 3.1).
- Even inside that stale file, the code is broken: the `DB_HOST`/`DB_USER`/`DB_PASS`/`DB_NAME` constants are commented out (right above the leaked credentials in 2.1), so calling `getSequelize()` would throw `DB_HOST is not defined`.
- The *actual* deployed backend (`backend/server.js`) defaults to `DB_TYPE = process.env.DB_TYPE || 'firestore'`, and its Sequelize/Postgres loading code is explicitly commented out.

**In short: the documentation that exists specifically to answer "where is my data" is currently answering it incorrectly.** This should be rewritten from the real `backend/` codebase, not the stale `frontend/functions/` one.

### 3.3 Three coexisting database stacks with no single source of truth
`backend/package.json` depends on all three data layers at once: `sequelize` + `pg` + `pg-hstore` + `sqlite3` (relational), `firebase-admin` (Firestore), and `mongoose` (MongoDB). `backend/models/` holds Sequelize models (`user.js`, `tenant.js`, `subscription.js`, `invoice.js`, `site.js`, `superAdmin.js`) that appear to be dead code (never required by the active `server.js`), while `backend/models/mongodb/` holds a second, mostly-parallel set of 14 Mongoose models for the same concepts, and every route file is separately named `firestore*Routes.js` and talks to Firestore directly in the default case. `IMPLEMENTATION_SUMMARY.md` calls the Mongo/Firestore dual-mode setup "COMPLETE & PRODUCTION READY," but the naming throughout the routes/controllers layer (`firestoreProductRoutes.js`, `firestoreBillingController.js`, etc.) still assumes Firestore is the only backend, which will read confusingly to anyone maintaining this in MongoDB mode.

**Recommendation:** Pick one database going forward, delete or clearly archive the other two model sets and their dependencies, and update `DATABASE_ARCHITECTURE.md` to match reality. Right now three different documents (`DATABASE_ARCHITECTURE.md`, `IMPLEMENTATION_SUMMARY.md`, and the original `project.md`/`README.md` PRD) each describe a different database as "the" architecture.

---

## 4. Backend Code Issues

- **`frontend/functions/config/db.js` is broken as written** — see 3.2. If this file is ever reached at runtime, it throws immediately.
- **Duplicate, byte-identical route files**: `backend/routes/firestoreClientRouter.js` and `firestoreClientRoutes.js` are line-for-line identical (verified); the same naming pattern (`firestoreTrainerRouter.js` / `firestoreTrainerRoutes.js`) appears again at identical file sizes. Only the `*Routes.js` versions are wired into `server.js` — the `*Router.js` files are unused duplicates.
- **Backup files committed alongside the live version**: `backend/controllers/firestoreAuthController.backup.js` (next to `firestoreAuthController.js`) and `frontend/src/pages/Settings.backup.jsx` (next to `Settings.jsx`, 62KB vs 95KB) are both sitting in the working source tree rather than in version-control history where a backup belongs. This is an easy source of someone editing or shipping the wrong copy.
- **No real automated test suite.** `backend/package.json`'s `test` script is the default stub (`"echo \"Error: no test specified\" && exit 1"`), yet the backend folder contains roughly 30 loose, ad-hoc `debug_*.js` / `test_*.js` scripts (and `frontend/functions/` has another ~15 of its own, e.g. `check_status.js`, `clean_ghost_user.js`, `fix_enum.js`). Several are literal duplicates: `test_me_endpoint.js` alongside `test_me_endpoint - Copy.js`, and `frontend/functions/test_load.js` alongside `test-load.js`. None of this is wired into `npm test` or CI — it's all manual, one-off scripts a developer presumably ran by hand during debugging and never removed.
- **The Electron desktop entry point is broken.** Root `main.js`:
  ```js
  function createWindow() {
    const win = new BrowserWindow({ width: 1200, height: 800 });
    win.loadURL('https://swordnex-softwares.web.app');
    mainWindow.loadFile('frontend/build/index.html'); // mainWindow is never defined
  }
  ```
  `mainWindow` doesn't exist anywhere in this file (the variable is `win`), so this throws a `ReferenceError` the moment the window is created — and even if that were fixed, calling both `loadURL` (a remote URL) and `loadFile` (a local file) back-to-back is contradictory. If the packaged desktop app (there's Electron build tooling in the root `package.json`) is meant to actually ship, this needs a real fix, not just a typo correction.
- **Root-level files shadow the real backend.** A second `server.js`, `.env`, `database.sqlite`, and `create_test_user.js` sit at the project root, separate from their `backend/` counterparts, with the root `server.js` missing routes the backend version has (see 3.1). Anyone running `node server.js` from the project root instead of `backend/` would get a stale, incomplete API without any obvious warning.

---

## 5. Frontend Issues (previously documented — summarized and spot-checked)

The existing `SwordNex_Billing_Project_Documentation.docx` (Appendix, Section 9) already catalogs these in detail from a page-by-page code review. Categories, for reference:

- **Dead/orphaned screens**: `components/Billing/Billing.jsx`, `Inventory.jsx`, `record.jsx` (2,989 lines, fully built, never routed to); `industry/mobile/AllBarcodesPage.jsx` (entirely commented out); `Layout/Layout.jsx`'s second sidebar shell and both `NavigationBar.jsx` files (unused, one references components it never imports).
- **Duplicate/stale files**: `industry/academy/academy record.jsx` (note the space) duplicating `academyRecord.jsx`; `components/Billing/BillingHistory.jsx`, which despite its name is an unused third copy of the password-reset flow (there are three total: `Auth/forgot.jsx`, `Auth/ChangePassword.jsx`, and this file).
- **Routing bugs** — I spot-checked two of these against the current code and both reproduce exactly as documented:
  - `industry/Clothing/ClothingBarcode.jsx` checks `industry !== "grocery_store"` (confirmed at lines 99, 127, 134, 142, 149, 166, 173, 184) to decide whether to show Mobile's IMEI/Color fields. Since a real Clothing tenant's industry value is `"clothing"`, not `"grocery_store"`, this condition is always true — the page always shows IMEI fields, never clothing-appropriate ones.
  - `industry/SoftwareDevelopment/SoftwareDevelopmentInventory.jsx` line 103: `const handleDelete = async (id) => {o` — a stray `o` character sits immediately after the opening brace. This is a bare, undeclared identifier reference that throws `ReferenceError: o is not defined` the moment a user clicks delete on a service.
  - (Not independently re-verified here, but documented in the docx: a similar industry-string mismatch in `groceryGstBill.jsx`'s router, likely routing Grocery tenants to the generic GST screen instead of their own.)
- **Data-source inconsistency**: `components/Billing/BarcodeBilling.jsx` still reads/writes Firestore directly while the rest of the app (Add Product, Reports, Dashboard, Credit Ledger, GST billing) goes through the backend REST API — products added the normal way may not show up when scanning at checkout. This also matters more than the original doc could say, given the open Firestore rules in 2.2 above.
- **Incomplete placeholders**: `pages/Profile.jsx` and `pages/Branding.jsx` are both empty files.
- **Unregistered routes**: `SuperAdminLogin.jsx` and `SuperAdminRegister.jsx` are fully built but not registered in `App.jsx` — I checked and confirmed neither name appears there — even though the SuperAdmin console redirects to that login URL on a missing session, so that redirect currently has nowhere to go.

---

## 6. Repository Hygiene

- **Log and crash-output files living in the working tree**: `frontend/build_err.log` (28KB), `frontend/build_log.txt` (15KB), root `out.txt` (a captured crash trace showing the backend failing to start because Razorpay's `key_id` wasn't loaded — direct evidence of the `.env` / `.env.custom` loading confusion in 2.3), and both a root and a `backend/` copy of `firestore-debug.log`. `.gitignore` does exclude `*.log` and `*.txt`, so these won't get committed going forward, but they're clutter worth deleting.
- **Duplicated `database.sqlite`** at both the project root and in `backend/` (identical file size), a leftover from the earlier SQL-based setup.
- **A stray Vite timestamp artifact** (`frontend/vite.config.js.timestamp-....mjs`) is present despite being gitignored — harmless, but a sign local build artifacts aren't being cleaned between runs.

---

## 7. Product & Requirements Gaps

- **The founding PRD describes a different product than what was built.** Both `project.md` and `README.md` (near-duplicates of each other) lay out an "Educational Admin Software" centered on GST billing, **attendance tracking** (students & employees), **payroll with automatic leave deduction and pay-slips**, and **digital signature/institutional seal** on documents. None of these — attendance, payroll, leave tracking, or signature/seal — appear anywhere in the actual six-industry platform per the page-directory audit. The product clearly evolved into something broader and arguably better (a multi-industry billing suite), but that pivot away from four fairly major original requirements doesn't appear to be documented as a deliberate decision anywhere. Worth confirming with whoever owns the roadmap that this was intentional, and updating the PRD to reflect current scope (or reopening those features if they're still wanted).
- **The requirements docs themselves are corrupted.** Both `project.md` and `README.md` end with the same garbled, letter-spaced text — `P a y s l i p G e n e r a t i o n . j s x #   T r i g g e r   w o r k f l o w` repeated twice — which reads like an accidental paste of binary/encoded content (possibly from a CI trigger commit) rather than intended documentation. These files need a cleanup pass regardless of the scope question above.
- **No single reconciled "how this system actually works" reference exists for a new developer.** Between the original PRD, `DATABASE_ARCHITECTURE.md`, and `IMPLEMENTATION_SUMMARY.md`, there are three different, partially contradictory stories about the tech stack and database. This report and the existing page-directory doc together should make it possible to write one accurate version, but as of today none exists.

---

## 8. Recommended Priority Order

**This week (security):**
1. Rotate the NeonDB/Postgres password exposed in `frontend/functions/config/db.js` and purge it from git history.
2. Lock down `firestore.rules` to scope every read/write by the authenticated user's own tenant/owner path.
3. Confirm `backend/.env` and `serviceAccountKey.json` were never committed to git (adding `.gitignore` after the fact doesn't retroactively remove history); rotate the live Razorpay and Brevo keys as a precaution given how many places they're duplicated across `.env` files.
4. Replace the `JWT_SECRET` placeholder value with a strong random secret, and make sure only one `.env` file is authoritative.

**Next (architecture clarity):**
5. Decide on one database (Firestore or MongoDB, given Postgres/Sequelize is already dead in the active backend) and remove the other two model sets and dependencies.
6. Delete or clearly archive `frontend/functions/` and the root-level duplicate `server.js`/`.env`/`database.sqlite`/`create_test_user.js` once confirmed unused, so there's exactly one backend.
7. Rewrite `DATABASE_ARCHITECTURE.md` from the real `backend/` code.

**Then (cleanup):**
8. Remove `.backup.js`/`.backup.jsx` files, duplicate route files, and the dead/orphaned frontend pages cataloged in the existing docx appendix.
9. Fix the two confirmed frontend bugs in Section 5 (ClothingBarcode IMEI fields, SoftwareDevelopmentInventory delete handler) plus the groceryGstBill routing bug.
10. Fix or remove the Electron `main.js` entry point.
11. Consolidate the ~45 ad-hoc debug/test scripts into an actual test suite (or delete the ones no longer needed) and wire a real `npm test`.
12. Clean up `project.md`/`README.md` (corrupted trailing text) and decide/document whether attendance, payroll, and signature/seal are in or out of scope going forward.
