import React, { useState, useEffect } from "react";
import { EyeOffIcon, EyeIcon, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import toast from "react-hot-toast";
import icon1 from "../../assets/images/BILLING LOGO .png";

const Login = () => {
  const navigate = useNavigate();
  const { employerLogin, employerGoogleSignIn } = useAuth();

  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginType, setLoginType] = useState("admin");

  // Typing animation
  const fullText = "Secure • Smart • Automated Billing";
  const [typedText, setTypedText] = useState("");

  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      setTypedText(fullText.slice(0, index));
      index++;
      if (index > fullText.length) clearInterval(interval);
    }, 60);
    return () => clearInterval(interval);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    if (formData.email === "sabilling@swordnex.com") {
      navigate("/adminlogin");
      return;
    }

    if (!formData.email || !formData.password) {
      toast.error("Please enter both email and password.");
      return;
    }

    setIsLoading(true);
    try {
      await employerLogin(formData.email, formData.password, loginType);
      toast.success("Successfully logged in!");
    } catch (error) {
      console.error("Login component error:", error);

      const serverMsg = error?.msg || error?.message || "";
      let friendlyMsg = "Login failed";

      if (serverMsg.includes("EMAIL_NOT_FOUND")) {
        friendlyMsg = "Email is wrong";
      } else if (serverMsg.includes("INVALID_PASSWORD")) {
        friendlyMsg = "Password is wrong";
      } else if (serverMsg.includes("USER_DISABLED")) {
        friendlyMsg = "This account has been disabled";
      } else if (serverMsg) {
        friendlyMsg = serverMsg;
      }

      toast.error(friendlyMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      await employerGoogleSignIn();
      toast.success("Logged in with Google!");
    } catch (error) {
      toast.error(error.message || "Google sign-in failed.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen flex overflow-hidden">

      {/* ================= LEFT SIDE ================= */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 lg:px-20 bg-white">

        <div className="max-w-md w-full mx-auto">

          {/* Centered Logo */}
          <div className="flex justify-center  mb-8">
            <img src={icon1} alt="SwordNex" className="h-10 center" />
          </div>

          {/* Heading */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome back
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Sign in to manage your dashboard
            </p>
          </div>

          {/* Login Type Toggle */}
          <div className="flex bg-green-50 rounded-lg p-1 mb-6">
            <button
              type="button"
              onClick={() => setLoginType("admin")}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition ${loginType === "admin"
                ? "bg-white shadow text-green-700"
                : "text-gray-500"
                }`}
            >
              Admin
            </button>
            <button
              type="button"
              onClick={() => setLoginType("team")}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition ${loginType === "team"
                ? "bg-white shadow text-green-700"
                : "text-gray-500"
                }`}
            >
              Team
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">

            {/* Email */}
            <div>
              <label className="block text-sm mb-1 text-gray-700">
                {loginType === "admin"
                  ? "Email Address"
                  : "Email or Employee ID"}
              </label>
              <input
                type="text"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="name@company.com"
                className="w-full h-11 px-4 rounded-lg border border-gray-300 
                focus:ring-2 focus:ring-green-300 focus:border-green-600 
                outline-none text-black"
                required
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex justify-between mb-1">
                <label className="text-sm text-gray-700">Password</label>
                <Link
                  to="/forgot"
                  className="text-xs text-green-600 hover:underline"
                >
                  Forgot?
                </Link>
              </div>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter password"
                  className="w-full h-11 px-4 rounded-lg border border-gray-300 
                  focus:ring-2 focus:ring-green-300 focus:border-green-600 
                  outline-none pr-12 text-black"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-green-600"
                >
                  {showPassword ? (
                    <EyeOffIcon size={16} />
                  ) : (
                    <EyeIcon size={16} />
                  )}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg flex items-center justify-center transition"
            >
              {isLoading && (
                <Loader2 className="animate-spin mr-2 h-4 w-4" />
              )}
              Sign In
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">Or</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Google */}
          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full h-11 flex items-center justify-center gap-2 border border-gray-300 rounded-lg text-black hover:bg-gray-50 transition text-sm"
          >
            <img
              src="https://developers.google.com/identity/images/g-logo.png"
              alt="Google"
              className="h-4 w-4"
            />
            Continue with Google
          </button>

          <p className="text-center text-xs text-gray-500 mt-4">
            Don’t have an account?{" "}
            <Link to="/signup" className="text-green-600 font-medium">
              Register
            </Link>
          </p>

        </div>
      </div>

      {/* ================= RIGHT SIDE ================= */}
      <div className="hidden lg:flex w-1/2 items-center justify-center relative bg-gradient-to-br from-green-100 via-white to-green-50 overflow-hidden">

        <div className="absolute top-[-80px] right-[-80px] w-60 h-60 bg-green-300/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-100px] left-[-100px] w-72 h-72 bg-green-200/20 rounded-full blur-3xl"></div>

        <div className="relative z-10 text-center px-12 max-w-md">

          {/* Image via URL */}
          <img
            src="https://exclusive-harlequin-tuwmcrrggt.edgeone.app/3d-hand-with-safe-payment-confirmation-bill.jpg"
            alt="Billing Illustration"
            className="w-full max-w-md mb-8 object-contain drop-shadow-xl"
          />

          {/* Typing Text */}
          <h2 className="text-2xl font-bold text-green-800 min-h-[32px]">
            {typedText}
            <span className="animate-pulse">|</span>
          </h2>

          <p className="text-green-700 text-sm mt-4 leading-relaxed">
            Manage invoices, track payments in real-time, and grow your business
            with our automated billing platform.
          </p>

        </div>
      </div>

    </div>
  );
};

export default Login;
