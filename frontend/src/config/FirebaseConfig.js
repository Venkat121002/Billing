import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBd1k1J2-LCsXLnNEsM0g9evcdBcDVl5kY",
  authDomain: "swordnex-softwares.firebaseapp.com",
  projectId: "swordnex-softwares",
  storageBucket: "swordnex-softwares.firebasestorage.app",
  messagingSenderId: "65221983089",
  appId: "1:65221983089:web:c3aa6cc28dd46b60ab14d0",
  measurementId: "G-2R1MCPFES9"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Firebase Authentication
export const auth = getAuth(app);

// 🔥 REAL TENANT ID → MUST MATCH GOOGLE CLOUD
auth.tenantId = "SwordNexBilling-4pzp8";

// Google Provider
export const provider = new GoogleAuthProvider();
provider.setCustomParameters({
  tenantId: "SwordNexBilling-4pzp8",
  prompt: "select_account",
});

// Firestore & Storage
export const db = getFirestore(app);
export const storage = getStorage(app);

// Functions
import { getFunctions } from "firebase/functions";
export const functions = getFunctions(app);

export default app;