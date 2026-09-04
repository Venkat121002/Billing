const admin = require("firebase-admin");
const dotenv = require("dotenv");
const path = require("path");
dotenv.config({ path: path.resolve(__dirname, "../.env.custom") });
const serviceAccount = require("../serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

if (process.env.FIRESTORE_EMULATOR_HOST) {
  console.log("Using Firestore emulator:", process.env.FIRESTORE_EMULATOR_HOST);
}

module.exports = { admin, db };
