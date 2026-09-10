// Backend base URL. Override per environment with VITE_API_URL
// (e.g. in frontend/.env or the deploy config). Defaults to the local
// MongoDB backend started by `cd backend && npm run dev`.
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5003/v2";

export default API_URL;
