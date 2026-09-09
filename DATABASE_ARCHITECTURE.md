# Database & Storage Architecture

This describes the backend in `backend/` (the only backend). As of the Sept 2026
"fresh start", **Firebase is removed** and the app runs on **MongoDB only**.

## Summary

| Concern | Where it lives |
|---|---|
| All tenant data (products, customers, bills, GST bills, credit, cashbook, suppliers, trainers, clients, salesmen, sub-users, subscriptions, returns, imports) | Local MongoDB — `mongodb://127.0.0.1:27017/swordnex_billing_dev` by default |
| Auth (email/password sign-in, sessions) | Self-hosted: passwords hashed with bcrypt in MongoDB, session identity is a JWT signed with `JWT_SECRET` |
| Payments (Razorpay) | Integration code kept, **disabled** until `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` are set (endpoints return `503`) |
| Transactional email (Brevo) | Integration code kept, **no-op** (logs instead of sending) until `BREVO_API_KEY` is set |

`DB_TYPE` still exists and defaults to `mongodb`. The `firestore` code paths are
dormant — `backend/config/firebase.js` is a dependency-free stub that throws if
any Firestore/Firebase-Admin call is actually made. There is no `firebase`,
`firebase-admin`, or `firebase-functions` dependency anymore.

## Data layout in MongoDB

Every document carries `{ tenantId, ownerId, subuserId? }`. `TENANT_ID` (from
`backend/.env.custom`) is the top-level partition key for a deployment — keep it
stable; changing it hides all existing data under a new tenant.

- `backend/models/mongodb/*.js` — 14 Mongoose models (`Owner`, `SubUser`, `Product`,
  `Customer`, `GstBill`, `Bill`, `Transaction`, `Credit`, `Supplier`, `Trainer`,
  `Client`, `Salesman`, `InventoryReturn`, `SubscriptionDetail`), all indexed on
  `{ tenantId, ownerId }`.
- `backend/utils/dbUtils.js` — `getCollection()` / `fetchUnifiedData()` resolve the
  right model and scope every query to the caller's owner/sub-user.
- `backend/utils/mongoAdapter.js` — a Firestore-shaped wrapper (`.collection()`,
  `.doc()`, `.where()`, `.get()`, `.set()`, `.add()`, batches, `FieldValue`) so the
  controllers read the same in either mode. Kept so Firebase can be re-added later.

## Running locally

1. Install and start MongoDB (default `mongodb://127.0.0.1:27017`).
2. `cp backend/.env.example backend/.env.custom` and fill it in (at minimum
   `DB_TYPE`, `MONGODB_URI`, `TENANT_ID`, `JWT_SECRET`).
3. `cd backend && npm run dev`
4. `GET http://localhost:5003/health` → `{"database":"mongodb","connected":true}`.

## Frontend → backend

`frontend/src/config/api.js`:

```javascript
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5003/v2";
```

Every screen reads/writes through this REST API. No screen talks to a database
directly anymore (the last direct-Firestore screens — barcode billing, the
industry billing/GST screens, the loyalty updater — were migrated during the
fresh start).

## Re-introducing Firebase later

1. `npm i firebase-admin` in `backend/`.
2. Restore the real `backend/config/firebase.js` (see git history around commit
   `d6995a7`) and a `serviceAccountKey.json` for the new project.
3. Set `DB_TYPE=firestore` and provide the new project's config.
4. On the frontend, re-add `src/config/FirebaseConfig.js`, the `firebase` /
   `react-firebase-hooks` deps, and the Google sign-in path in `AuthContext.jsx` /
   `Login.jsx` (marked with `TODO` comments).
