// src/components/Auth/AdminLogin.jsx
import { useState } from "react";
import axios from "axios";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth } from "../../config/FirebaseConfig";
import { useNavigate } from "react-router-dom";

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "/api",
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      const user = userCredential.user;

      if (user) {
        const res = await api.post("/auth/super-login", {
          email: user.email,
        });

        sessionStorage.setItem("token", res.data.token);
        sessionStorage.setItem("superAdminLoggedIn", "true");
        navigate("/superadmin");
      }
    } catch (err) {
      if (
        err.code === "auth/invalid-credential" ||
        err.code === "auth/user-not-found" ||
        err.code === "auth/wrong-password"
      ) {
        setError("Invalid email or password.");
      } else {
        setError(`Login Error: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError("Please enter your email to reset password");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage("Password reset email sent! Please check your inbox.");
      setError("");
    } catch {
      setError("Error sending password reset email.");
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">

      {/* LEFT SIDE - LOGIN */}
      <div className="flex flex-col w-full lg:w-1/2 bg-white px-6 py-8 md:px-12 lg:px-24">

        {/* Logo */}
        <header className="flex items-center gap-2 mb-12">
          <div className="text-blue-600">
            <svg className="size-8" fill="currentColor" viewBox="0 0 48 48">
              <path d="M6 6H42L36 24L42 42H6L12 24L6 6Z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold tracking-tight">
            SwordNex Billing
          </h2>
        </header>

        <div className="max-w-md w-full mx-auto my-auto">

          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Welcome back</h1>
            <p className="text-gray-500">
              Sign in to manage your billing system.
            </p>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg p-3">
              {error}
            </div>
          )}

          {message && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-600 text-sm rounded-lg p-3">
              {message}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">

            <div>
              <label className="block text-sm font-medium mb-2">
                Email Address
              </label>
              <input
                type="email"
                placeholder="admin@swordnex.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-12 px-4 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none"
                required
              />
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm font-medium">Password</label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-sm font-semibold text-blue-600 hover:underline"
                >
                  Forgot password?
                </button>
              </div>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-12 px-4 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full h-12 text-white font-bold rounded-lg transition ${loading
                ? "bg-blue-300 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 shadow-lg"
                }`}
            >
              {loading ? "Authenticating..." : "Sign In"}
            </button>

          </form>

          <footer className="mt-10 text-xs text-gray-400">
            © {new Date().getFullYear()} SwordNex Technologies Private Limited
          </footer>

        </div>
      </div>

      {/* RIGHT SIDE - MARKETING DESIGN */}
      <div className="hidden lg:flex flex-col w-1/2 bg-gradient-to-br from-blue-100 via-white to-blue-50 relative overflow-hidden items-center justify-center p-12">

        <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-blue-400/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-blue-300/10 rounded-full blur-3xl"></div>

        <div className="relative z-10 max-w-xl text-center">

          <div className="relative group mb-12">

            <img
              className="rounded-xl shadow-2xl border border-white/50 w-full max-w-md mx-auto transform transition-transform duration-300 group-hover:scale-[1.02]"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBCiWgvzw7PkWX1BVnyJLXQ3f2KXmwoK0tONWsy16ZUXzuopK_d-aIjHUgoTqSieWgsqP5JNuvBjH8i2KGdU4kLd5CUs9zWTaTyaxZrK8KxTSeHOr0H4p-Hb8ASjZN5M2uQq-uMnBltS5xZ21mwG4tTXtOufkdZfZBijE6gi5fBj8vgyc35WraiBqs-b4lCVtoNpoCq59xSTpUa_27rokQrLeA-X8Cz0sNXY96AZX7uTUcYxtDyl2eqadV0bDNwkAewoMsi-oHLevKb"
              alt="Billing Dashboard"
            />

            <div className="absolute -bottom-6 -right-6 w-48 shadow-2xl rounded-lg border border-white/50 overflow-hidden">
              <img
                className="w-full"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuC01pebJT26E4nJb8PzCwlhz4TMmbPOxyjFi5sO_jW9fzq2byLeeQbKtqH_0OT-t5SHGSguMDVXP4Gt0o73bLyYGq64x8ePRg2igmDqVZibJyNvxO5urtML2pvLjWd_BJG10J-unnVOTUuh1zs5l8EnLP0BLEYLh2yYoIXl0ENJOo4s5omxBNnM3FNRMJ8GdzRagUDJpqsLHD6ST9GM7mDd981KTjO9bPePb4xKoR9mIEaPo-HdvbyWwu4QaWo-vmjwvWWM_JtZ9ph7"
                alt="Mobile Billing"
              />
            </div>

          </div>

          <h2 className="text-3xl font-bold mb-4">
            Simplify your billing workflow
          </h2>

          <p className="text-lg text-gray-600">
            Manage invoices, track payments in real-time, and grow your business
            with automated billing solutions.
          </p>

        </div>
      </div>

    </div>
  );
};

export default AdminLogin;
