# Database & Storage Architecture

This document explains where your application data is actually stored today. It describes the **real, deployed backend** (`backend/` — the folder Firebase Functions actually loads per `firebase.json`), not the older `frontend/functions/` copy or the root-level `server.js`, which are stale duplicates and are not part of the live data path.

## Summary

The backend runs in one of two database modes, controlled by a single environment variable:

| Mode | `DB_TYPE` | Where data lives | When to use |
|---|---|---|---|
| Local development | `mongodb` | Your local MongoDB (e.g. via MongoDB Compass, `mongodb://127.0.0.1:27017`) | Running the server on your own machine |
| Production | `firestore` | Google Cloud Firestore (project `swordnex-softwares`) | The deployed Firebase Function |

Switching modes never requires touching application code — only `backend/.env.custom` and a server restart.

Authentication credentials (email/password sign-in, session identity) follow the same split: in `mongodb` mode passwords are hashed locally with bcrypt and checked against MongoDB; in `firestore` mode sign-in goes through Firebase Authentication (tenant `SwordNexBilling-4pzp8`), same as before this dual-mode setup existed.

## How the switch works

`backend/server.js` reads `DB_TYPE` from `backend/.env.custom`:

```javascript
const DB_TYPE = process.env.DB_TYPE || 'firestore';
```

Every controller that reads or writes tenant data (products, customers, bills, GST bills, credit, cashbook, suppliers, trainers, clients, salesmen, sub-users, subscriptions, imports) branches on this same `DB_TYPE` check, so the two modes stay fully isolated from each other — **running locally in `mongodb` mode never reads or writes your production Firestore data**, and vice versa.

Two shared pieces make this possible:

- `backend/utils/dbUtils.js` — `getCollection()` / `fetchUnifiedData()` return either a real Firestore collection reference or a MongoDB-backed adapter, depending on `DB_TYPE`. Most controllers just call these and don't need to know which database is active.
- `backend/utils/mongoAdapter.js` — wraps Mongoose models (`backend/models/mongodb/*.js`) behind a Firestore-shaped API (`.collection()`, `.doc()`, `.get()`, `.set()`, `.where()`, batches, etc.), so the same controller code works against either database.

A few endpoints that don't go through a shared collection (owner/business-profile lookups in auth, billing subscription updates, sub-user management) have their own explicit `if (DB_TYPE === 'mongodb') { ... } else { ... }` branches instead — same effect, just written out per-endpoint. `backend/config/firebase.js` only initializes the Firebase Admin SDK the first time something actually calls Firestore, so a pure local-MongoDB session never needs valid production Firebase credentials on disk.

## Running locally (MongoDB)

1. Install and start MongoDB locally (e.g. MongoDB Community Server + Compass, default `mongodb://127.0.0.1:27017`).
2. `backend/.env.custom` should have:
   ```
   DB_TYPE=mongodb
   MONGODB_URI=mongodb://127.0.0.1:27017/swordnex_billing_dev
   ```
3. `cd backend && npm run dev`
4. Check `GET http://localhost:5003/health` — it reports `{"database":"mongodb","connected":true}` when MongoDB is reachable.

All data created while `DB_TYPE=mongodb` is stored in your local `swordnex_billing_dev` database, visible in MongoDB Compass. It never touches production Firestore.

## Running in production (Firestore)

Production sets `DB_TYPE=firestore` (or omits it — that's the default) and provides a valid `backend/serviceAccountKey.json`. Data is stored in Cloud Firestore under:

```
SwordNexBillingSoftware/{tenantId}/owner/{ownerId}/{collection}
SwordNexBillingSoftware/{tenantId}/owner/{ownerId}/subuser/{subuserId}/{collection}
```

Check `GET /health` or `GET /health/firebase` on the deployed function to confirm connectivity.

## What's *not* part of the live data path

The following were all **removed** in the Sept 2026 cleanup (they are still recoverable from git history if ever needed):

- **PostgreSQL / Sequelize** — the `pg` / `pg-hstore` / `sequelize` / `sqlite3` dependencies, `backend/config/db.js`, and the Sequelize models in `backend/models/*.js` are gone. Only `backend/models/mongodb/` remains. `backend/server.js` never loaded any of it.
- **`frontend/functions/`** — the entire earliest-generation copy of the backend (its own `app.js`, `config/`, `controllers/`, etc.), including the `config/db.js` that the *old* version of this document mistakenly described as the live data path. Firebase deploys `backend/` only (see `firebase.json`).
- **The root-level duplicate backend** — `server.js`, `.env`, `database.sqlite`, `create_test_user.js` at the project root were a stale, incomplete copy of `backend/`. Removed. Run the backend from `backend/` only.
- **`/auth` and `/api/auth`** routes (`backend/routes/auth.js`, `backend/controllers/authController.js`) — a legacy Postgres-backed auth flow, never mounted in `server.js`. The frontend calls `/v2/auth/*` exclusively (see `frontend/src/config/api.js`). Removed.

## Frontend: how it picks a backend

`frontend/src/config/api.js` picks the backend URL by build mode:

```javascript
const API_URL = import.meta.env.MODE === 'development'
  ? "http://localhost:5003/v2"        // your local backend, DB_TYPE=mongodb
  : "https://billingapi-q27upobcwq-uc.a.run.app/v2";  // production, DB_TYPE=firestore
```

So `npm run dev` on the frontend talks to your local Mongo-backed server automatically, and a production build talks to the deployed Firestore-backed function — no manual switching needed on the frontend side.

All screens that read or write billing data (products, bills, GST bills, customers, credit, etc.) go through this backend API rather than talking to Firestore directly, which is what keeps local testing from touching production data.
