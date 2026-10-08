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

// "Remember me": the app reads the token from sessionStorage everywhere, so a
// remembered token (localStorage) is copied back in when a new browser session
// starts. Runs at import time, before anything reads the token.
const REMEMBER_KEY = "rememberedToken";
try {
  if (!sessionStorage.getItem("token")) {
    const remembered = localStorage.getItem(REMEMBER_KEY);
    if (remembered) sessionStorage.setItem("token", remembered);
  }
} catch { /* storage blocked: fall back to per-tab sessions */ }

// The POS keeps an unfinished cart in localStorage (shared by every account on
// this browser), so it is dropped whenever the signed-in account changes.
const POS_DRAFT_KEYS = ["pos-cart", "pos-cash", "pos-cash-edited"];

const clearToken = () => {
  sessionStorage.removeItem("token");
  try {
    localStorage.removeItem(REMEMBER_KEY);
    POS_DRAFT_KEYS.forEach((key) => localStorage.removeItem(key));
  } catch { /* ignore */ }
};

// Add token to headers
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("token");
  if (token) config.headers["x-auth-token"] = token;
  return config;
});

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // The current owner's plan capabilities ({key: {limit?, enabled?}}), used to
  // gate plan-limited screens/actions on the frontend (ModuleRoute, sidebar,
  // Credit pay-link buttons). `planCapabilitiesLoading` starts true so a route
  // guard can wait for it instead of flash-redirecting before it resolves.
  const [planCapabilities, setPlanCapabilities] = useState(null);
  const [planCapabilitiesLoading, setPlanCapabilitiesLoading] = useState(true);
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
            clearToken();
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
  async function employerLogin(email, password, loginType = 'admin', remember = false) {
    try {
      console.log("🚀 Logging in via Backend API...");

      const res = await api.post("auth/login", {
        email,
        password,
        loginType, // Backend might use this or ignore it
        remember
      });

      console.log("✅ Login Success:", res.data);

      const { token, user } = res.data;
      clearToken();
      sessionStorage.setItem("token", token);
      if (remember) {
        try { localStorage.setItem(REMEMBER_KEY, token); } catch { /* ignore */ }
      }
      setCurrentUser(user);

      // Straight to the dashboard; only an expired owner plan goes to the plans page.
      const expiry = user.Tenant?.subscription_expiry ? new Date(user.Tenant.subscription_expiry) : null;
      const status = String(user.Tenant?.subscription_status || "").toLowerCase();
      const planExpired = user.role === "owner" && (status !== "active" || (expiry && expiry < new Date()));
      navigate(planExpired ? "/pricing" : "/dashboard");

      return user;

    } catch (err) {
      console.error("Login Error:", err);
      // Ensure we throw an error object with a message property if possible
      throw err.response ? err.response.data : (err.message ? { msg: err.message } : err);
    }
  }

  // SIGNUP
  // SIGNUP OTP: separate codes by email and WhatsApp.
  // channel: "email" | "whatsapp" resends just one; omit to send both.
  async function sendSignupOtp(email, { mobile, channel } = {}) {
    try {
      const res = await api.post("otp/signup/send", { email, mobile, channel });
      return res.data;
    } catch (err) {
      throw err.response ? err.response.data : err;
    }
  }

  async function verifySignupOtp({ email, mobile, emailOtp, mobileOtp }) {
    try {
      const res = await api.post("otp/signup/verify", { email, mobile, emailOtp, mobileOtp });
      return res.data;
    } catch (err) {
      throw err.response ? err.response.data : err;
    }
  }

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
        plan: data.plan,
        verificationToken: data.verificationToken
      };

      const res = await api.post("auth/register", payload);

      console.log("✅ Signup Success:", res.data);
      const { token, user } = res.data;

      clearToken();
      sessionStorage.setItem("token", token);
      // The register response is minimal; load the full profile (incl. the auto-started
      // trial) so the dashboard guard sees an active subscription.
      let fullUser = user;
      try {
        const me = await api.get("auth/me");
        fullUser = me.data;
      } catch (meErr) {
        console.warn("Could not load full profile after signup:", meErr);
      }
      setCurrentUser(fullUser);
      navigate("/dashboard");

      return fullUser;

    } catch (err) {
      console.error("Signup Error:", err);
      throw err.response ? err.response.data : err;
    }
  }

  // GOOGLE LOGIN — disabled while Firebase is removed.
  // TODO: restore when a new Firebase project is configured (needs
  // firebase/auth + ../config/FirebaseConfig + a backend auth/google-login route).
  // async function employerGoogleSignIn() { ... }

  // GET SUBSCRIPTION PLANS (public — works logged out too; superadmin-controlled)
  async function getPlans() {
    try {
      const res = await api.get("billing/plans");
      return res.data;
    } catch (err) {
      throw err.response ? err.response.data : err;
    }
  }

  // Refetch the current owner's plan capabilities whenever their plan changes
  // (or on login / logout). Never throws — a failed fetch just leaves
  // capabilities permissive (see hasCapability/getCapabilityLimit below).
  const currentPlanKey = currentUser?.Tenant?.subscription_plan;
  useEffect(() => {
    let cancelled = false;
    if (!currentUser || !currentPlanKey) {
      setPlanCapabilities(null);
      setPlanCapabilitiesLoading(false);
      return;
    }
    setPlanCapabilitiesLoading(true);
    (async () => {
      try {
        const plans = await getPlans();
        const key = String(currentPlanKey).toLowerCase();
        const match = plans.find((p) => p.key === key) || plans.find((p) => p.key === "trial");
        const map = {};
        (match?.capabilities || []).forEach((c) => { map[c.key] = c; });
        if (!cancelled) setPlanCapabilities(map);
      } catch (err) {
        console.error("Could not load plan capabilities:", err);
        if (!cancelled) setPlanCapabilities(null);
      } finally {
        if (!cancelled) setPlanCapabilitiesLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.userId, currentPlanKey]);

  // Permissive by default (true/unlimited) while loading or on fetch failure —
  // a locked screen should never flash open-then-closed, and a backend hiccup
  // here should never lock someone out of something they're actually allowed.
  const hasCapability = (key) => planCapabilities?.[key]?.enabled !== false;
  const getCapabilityLimit = (key) => (planCapabilities ? planCapabilities[key]?.limit ?? null : null);

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
      clearToken();
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

    clearToken();
    setCurrentUser(null);
  }

  const value = {
    currentUser,
    employerLogin,
    employerSignup,
    sendSignupOtp,
    verifySignupOtp,
    getPlans,
    planCapabilities,
    planCapabilitiesLoading,
    hasCapability,
    getCapabilityLimit,
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
