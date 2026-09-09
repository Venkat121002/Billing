/**
 * Firebase Admin is not used in this MongoDB-only build.
 *
 * This stub keeps `const { db, admin } = require('../config/firebase')` working at
 * module load (every consumer only destructures here), so the server boots without
 * the `firebase-admin` package or a service-account key. Any actual Firestore /
 * Firebase Auth call — all of which live inside `DB_TYPE === 'firestore'` branches
 * that are never taken — throws a clear error at runtime.
 *
 * To re-introduce Firebase later: `npm i firebase-admin`, restore the real
 * initialization here (see git history for commit d6995a7), and set DB_TYPE=firestore.
 */
const notAvailable = () => {
  throw new Error(
    'Firebase Admin is not available in this MongoDB-only build (DB_TYPE must be "mongodb").'
  );
};

const admin = new Proxy(function () {}, { get: notAvailable, apply: notAvailable });
const db = new Proxy({}, { get: notAvailable, apply: notAvailable });

module.exports = { admin, db };
