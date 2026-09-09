// Toggle between local development (MongoDB) and production (Firestore)
const API_URL = import.meta.env.MODE === 'development'
  ? "http://localhost:5003/v2"  // Local MongoDB backend
  : "https://billingapi-q27upobcwq-uc.a.run.app/v2";  // Production Firestore

export default API_URL;
