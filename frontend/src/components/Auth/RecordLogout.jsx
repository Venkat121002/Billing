import { db } from "../config/FirebaseConfig";
import { collection, query, where, getDocs, updateDoc, serverTimestamp } from "firebase/firestore";

export const recordLogout = async (email) => {
  try {
    const q = query(
      collection(db, "userSessions"),
      where("email", "==", email),
      where("logoutTime", "==", null) // only active session
    );
    const querySnapshot = await getDocs(q);

    querySnapshot.forEach(async (doc) => {
      await updateDoc(doc.ref, {
        logoutTime: serverTimestamp(),
        active: false, // mark inactive
      });
    });
  } catch (error) {
    console.error("Logout update failed:", error);
  }
};
