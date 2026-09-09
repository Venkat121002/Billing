const admin = require("firebase-admin");
const dotenv = require("dotenv");
const path = require("path");
dotenv.config({ path: path.resolve(__dirname, "../.env.custom") });

// Initialize Firebase Admin eagerly, same as before, with one change: if
// serviceAccountKey.json is missing or invalid, don't crash the whole server at
// require-time. A developer working purely in local MongoDB mode (DB_TYPE=mongodb)
// shouldn't need production Firebase credentials on disk at all — every controller
// only reaches Firestore/Firebase Auth code from inside a `DB_TYPE === 'firestore'`
// branch, so this module is required unconditionally but its Firestore/Auth calls
// are not. `admin` itself is exported unchanged (no proxying) so existing Firestore
// call sites (admin.auth(), admin.firestore.FieldValue, ...) keep working exactly as
// before in production/Firestore mode.
let initError = null;
try {
  const serviceAccount = require("../serviceAccountKey.json");
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }
} catch (err) {
  initError = err;
  console.warn(
    "⚠️  Firebase Admin not initialized (serviceAccountKey.json missing or invalid). " +
    "This is fine for local MongoDB-only development (DB_TYPE=mongodb), but any " +
    "Firestore/Firebase Auth call will fail until a valid service account key is present:",
    err.message
  );
}

if (process.env.FIRESTORE_EMULATOR_HOST) {
  console.log("Using Firestore emulator:", process.env.FIRESTORE_EMULATOR_HOST);
}

// Lazily resolve the Firestore instance itself, so admin.firestore() (which needs a
// successfully initialized app) is only called the first time something actually
// touches `db` — not merely by requiring this module.
let _db = null;
function getFirestoreDb() {
  if (initError) {
    throw new Error("Firestore is unavailable: " + initError.message);
  }
  if (!_db) {
    _db = admin.firestore();
  }
  return _db;
}

// Proxy so existing call sites (`db.collection(...)`, `db.batch()`, etc.) keep working
// unchanged, but Firestore is only touched on first real use.
const db = new Proxy({}, {
  get(_target, prop) {
    const realDb = getFirestoreDb();
    const value = realDb[prop];
    return typeof value === 'function' ? value.bind(realDb) : value;
  }
});

module.exports = { admin, db };
