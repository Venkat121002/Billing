import { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import API_URL from "../config/api";

const SuperAdminAuthContext = createContext();
export function useSuperAdminAuth() {
  return useContext(SuperAdminAuthContext);
}

const TOKEN_KEY = "superadmin_token";

export const superAdminApi = axios.create({
  baseURL: `${API_URL.endsWith("/") ? API_URL : `${API_URL}/`}superadmin/`,
});

superAdminApi.interceptors.request.use((config) => {
  const token = sessionStorage.getItem(TOKEN_KEY);
  if (token) config.headers["x-auth-token"] = token;
  return config;
});

// Kick back to the super admin login on an expired/invalid token instead of
// surfacing a raw 401 inside a data table.
superAdminApi.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      sessionStorage.removeItem(TOKEN_KEY);
      if (!window.location.pathname.endsWith("/superadmin/login")) {
        window.location.href = "/superadmin/login";
      }
    }
    return Promise.reject(err);
  }
);

export function SuperAdminAuthProvider({ children }) {
  const [email, setEmail] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = sessionStorage.getItem(TOKEN_KEY);
    const savedEmail = sessionStorage.getItem("superadmin_email");
    if (token && savedEmail) {
      setEmail(savedEmail);
    }
    setLoading(false);
  }, []);

  async function login(loginEmail, password) {
    try {
      const res = await superAdminApi.post("login", { email: loginEmail, password });
      const { token, email: returnedEmail } = res.data;
      sessionStorage.setItem(TOKEN_KEY, token);
      sessionStorage.setItem("superadmin_email", returnedEmail);
      setEmail(returnedEmail);
      navigate("/superadmin/dashboard");
      return true;
    } catch (err) {
      throw err.response ? err.response.data : { msg: err.message };
    }
  }

  function logout() {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem("superadmin_email");
    setEmail(null);
    navigate("/superadmin/login");
  }

  const value = { email, loading, login, logout };

  return (
    <SuperAdminAuthContext.Provider value={value}>
      {children}
    </SuperAdminAuthContext.Provider>
  );
}
