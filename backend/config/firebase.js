const admin = require('firebase-admin');
const path = require('path');

/**
 * Firebase Admin / Firestore (production database when DB_TYPE=firestore).
 *
 * Credentials, in order:
 *   1. FIREBASE_SERVICE_ACCOUNT_PATH (or ./serviceAccountKey.json, gitignored)
 *   2. Application Default Credentials (Cloud Functions / Cloud Run)
 *
 * If FIREBASE_PROJECT_ID is set, a key belonging to a different project is rejected,
 * so a stale key can never point production at the wrong Firebase project.
 */
let initError = null;
try {
  if (!admin.apps.length) {
    const keyPath = path.resolve(
      __dirname,
      '..',
      process.env.FIREBASE_SERVICE_ACCOUNT_PATH || 'serviceAccountKey.json'
    );
    let options;
    try {
      const serviceAccount = require(keyPath);
      const expected = process.env.FIREBASE_PROJECT_ID;
      if (expected && serviceAccount.project_id !== expected) {
        throw new Error(
          `Service account key is for project "${serviceAccount.project_id}" but FIREBASE_PROJECT_ID is "${expected}"`
        );
      }
      options = { credential: admin.credential.cert(serviceAccount), projectId: serviceAccount.project_id };
    } catch (err) {
      if (err.code !== 'MODULE_NOT_FOUND') throw err;
      options = { credential: admin.credential.applicationDefault(), projectId: process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT };
    }
    admin.initializeApp(options);
    console.log(`🔥 Firebase Admin initialized (project: ${admin.app().options.projectId})`);
  }
} catch (err) {
  initError = err;
  console.warn('⚠️  Firebase Admin not initialized:', err.message);
}

// Lazy Firestore handle: only touched on first real use, so DB_TYPE=mongodb dev works without credentials.
let _db = null;
const db = new Proxy({}, {
  get(_target, prop) {
    if (initError) throw new Error('Firestore is unavailable: ' + initError.message);
    if (!_db) {
      _db = admin.firestore();
      _db.settings({ ignoreUndefinedProperties: true });
    }
    const value = _db[prop];
    return typeof value === 'function' ? value.bind(_db) : value;
  }
});

module.exports = { admin, db };
