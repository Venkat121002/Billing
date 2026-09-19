import { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const AuthContext = createContext();
export function useAuth() {
  return useContext(AuthContext);
}

import API_URL from "../config/api";

const api = axios.create({
  baseURL: API_URL.endsWith('/') ? API_URL : `${API_URL}/`,
});

// Add token to headers
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("token");
  if (token) config.headers["x-auth-token"] = token;
  return config;
});

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Check auth on load
  useEffect(() => {
    const initAuth = async () => {
      console.log("🔐 initAuth: Starting...");
      try {
        // 1. Check Local Token (Backend Session)
        const token = sessionStorage.getItem("token");
        console.log("🎫 Local Token check:", token ? "Token present" : "No token");

        if (token) {
          try {
            // Note: Ensure /auth/me exists in your backend and returns user data
            const res = await api.get("auth/me");
            const userData = res.data;
            console.log("👤 Backend User fetched:", userData.uid || userData.userId);
            setCurrentUser(userData);
          } catch (e) {
            console.error("❌ Backend fetch failed:", e);
            sessionStorage.removeItem("token");
            setCurrentUser(null);
          }
        }
      } catch (error) {
        console.error("❌ Auth initialization failure:", error);
      } finally {
        console.log("🔓 Unlocking App (loading=false)");
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // LOGIN
  async function employerLogin(email, password, loginType = 'admin') {
    try {
      console.log("🚀 Logging in via Backend API...");

      const res = await api.post("auth/login", {
        email,
        password,
        loginType // Backend might use this or ignore it
      });

      console.log("✅ Login Success:", res.data);

      const { token, user } = res.data;
      sessionStorage.setItem("token", token);
      setCurrentUser(user);

      // Navigate based on user state
      if (user.Tenant && user.Tenant.subscription_status === "pending") {
        navigate("/pricing");
      } else {
        navigate("/dashboard");
      }

      return user;

    } catch (err) {
      console.error("Login Error:", err);
      // Ensure we throw an error object with a message property if possible
      throw err.response ? err.response.data : (err.message ? { msg: err.message } : err);
    }
  }

  // SIGNUP
  async function employerSignup(data) {
    try {
      console.log("🚀 Registering via Backend API...");

      const payload = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
        mobile: data.mobile,
        businessName: data.businessName,
        businessType: data.businessType,
        industry: data.industry,
        subIndustry: data.subIndustry,
        employees: data.employees,
        street: data.street,
        city: data.city,
        state: data.state,
        pincode: data.pincode,
        country: data.country,
        gstin: data.gstin,
        pan: data.pan,
        plan: data.plan
      };

      const res = await api.post("auth/register", payload);

      console.log("✅ Signup Success:", res.data);
      const { token, user } = res.data;

      sessionStorage.setItem("token", token);
      setCurrentUser(user);
      navigate("/dashboard");

      return user;

    } catch (err) {
      console.error("Signup Error:", err);
      throw err.response ? err.response.data : err;
    }
  }

  // GOOGLE LOGIN — disabled while Firebase is removed.
  // TODO: restore when a new Firebase project is configured (needs
  // firebase/auth + ../config/FirebaseConfig + a backend auth/google-login route).
  // async function employerGoogleSignIn() { ... }

  // CREATE SUBSCRIPTION ORDER
  async function createSubscriptionOrder(data) {
    try {
      const res = await api.post("billing/create-order", data);
      return res.data;
    } catch (err) {
      throw err.response ? err.response.data : err;
    }
  }

  // VERIFY PAYMENT & UPDATE SUBSCRIPTION
  async function verifySubscriptionPayment(data) {
    try {
      const res = await api.post("billing/verify-payment", data);

      // Refresh user data to reflect new subscription
      const userRes = await api.get("auth/me");
      setCurrentUser(userRes.data);

      return res.data;
    } catch (err) {
      throw err.response ? err.response.data : err;
    }
  }

  // START TRIAL
  async function startTrial() {
    try {
      const res = await api.post("billing/activate-trial");

      // Refresh user data
      const userRes = await api.get("auth/me");
      setCurrentUser(userRes.data);
      return userRes.data;
    } catch (err) {
      throw err.response ? err.response.data : err;
    }
  }

  async function updateProfile(data) {
    try {
      const url = "auth/update-profile";
      console.log(`📝 [AuthContext] Updating Profile: PUT ${api.defaults.baseURL}${url}`, data);
      const res = await api.put(url, data);
      console.log("✅ [AuthContext] Profile Update Success:", res.data);

      // Refresh user data
      const userRes = await api.get("auth/me");
      setCurrentUser(userRes.data);

      return res.data;
    } catch (err) {
      console.error("❌ [AuthContext] Profile Update Failed:", err);
      throw err.response ? err.response.data : err;
    }
  }

  // SELECT INDUSTRY (one-time company-profile setting; backend rejects if already set)
  async function selectIndustry(industry) {
    try {
      const res = await api.post("auth/select-industry", { industry });

      // Refresh user data so resolveIndustryProfile() picks it up everywhere
      const userRes = await api.get("auth/me");
      setCurrentUser(userRes.data);

      return res.data;
    } catch (err) {
      throw err.response ? err.response.data : err;
    }
  }

  // SUPPORT REQUESTS (general messages + industry-change requests → super admin inbox)
  async function createSupportRequest(data) {
    try {
      const res = await api.post("support-requests", data);
      return res.data;
    } catch (err) {
      throw err.response ? err.response.data : err;
    }
  }

  async function getMySupportRequests() {
    try {
      const res = await api.get("support-requests/mine");
      return res.data;
    } catch (err) {
      throw err.response ? err.response.data : err;
    }
  }

  // CREATE SUB-USER (For Settings Page)
  async function createSubUser(data) {
    try {
      const res = await api.post("users/create", data);
      return res.data;
    } catch (err) {
      throw err.response ? err.response.data : err;
    }
  }

  // UPDATE SUB-USER
  async function updateSubUser(id, data) {
    try {
      const res = await api.put(`users/${id}`, data);
      return res.data;
    } catch (err) {
      throw err.response ? err.response.data : err;
    }
  }

  // DELETE SUB-USER
  async function deleteSubUser(id) {
    try {
      const res = await api.delete(`users/${id}`);
      return res.data;
    } catch (err) {
      throw err.response ? err.response.data : err;
    }
  }

  // GET SUB-USERS
  async function getSubUsers() {
    try {
      const res = await api.get("users");
      return res.data;
    } catch (err) {
      throw err.response ? err.response.data : err;
    }
  }

  // RECORD PAYMENT (Invoice & Email)
  async function recordPayment(data) {
    try {
      const res = await api.post("billing/payment-success", data);
      return res.data;
    } catch (err) {
      console.error("Record Payment Failed:", err);
      // Don't throw drastically as payment itself was successful
    }
  }

  // DELETE ACCOUNT
  async function deleteAccount() {
    try {
      // 1. Call Backend to delete data
      await api.delete("auth/delete-account");

      // 2. Cleanup Local State
      sessionStorage.removeItem("token");
      setCurrentUser(null);
    } catch (err) {
      console.error("Backend Delete Failed:", err);
      throw err.response ? err.response.data : err;
    }
  }

  async function logout() {
    try {
      if (sessionStorage.getItem("token")) {
        await api.post("auth/logout");
      }
    } catch (err) {
      console.error("Backend Logout Failed (Session time not recorded):", err);
    }

    sessionStorage.removeItem("token");
    setCurrentUser(null);
  }

  const value = {
    currentUser,
    employerLogin,
    employerSignup,
    createSubscriptionOrder,
    verifySubscriptionPayment,
    startTrial,
    getSubUsers,
    createSubUser,
    updateSubUser,
    deleteSubUser,
    updateProfile,
    selectIndustry,
    createSupportRequest,
    getMySupportRequests,
    recordPayment,
    deleteAccount,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
