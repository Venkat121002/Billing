import React, { useState, useEffect } from "react";
import { EyeOffIcon, EyeIcon, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import toast from "react-hot-toast";
import icon1 from "../../assets/images/BILLING LOGO .png";

// Sub-user / staff sign-in — split out of Login.jsx so the owner login page
// no longer needs an Admin/Team toggle. Same flow, fixed loginType="team".
const TeamLogin = () => {
  const { employerLogin } = useAuth();

  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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

    if (!formData.email || !formData.password) {
      toast.error("Please enter both your email/employee ID and password.");
      return;
    }

    setIsLoading(true);
    try {
      await employerLogin(formData.email.trim(), formData.password, "team");
      toast.success("Successfully logged in!");
    } catch (error) {
      console.error("Team login error:", error);

      const serverMsg = error?.msg || error?.message || "";
      let friendlyMsg = "Login failed";

      if (serverMsg.includes("EMAIL_NOT_FOUND")) {
        friendlyMsg = "Email or employee ID is wrong";
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

  return (
    <div className="h-screen flex overflow-hidden">

      {/* ================= LEFT SIDE ================= */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 lg:px-20 bg-white">

        <div className="max-w-md w-full mx-auto">

          <div className="flex justify-center mb-8">
            <img src={icon1} alt="SwordNex" className="h-10 center" />
          </div>

          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              Team Sign In
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Sign in to your workspace
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">

            <div>
              <label className="block text-sm mb-1 text-gray-700">Email or Employee ID</label>
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

          <p className="text-center text-xs text-gray-500 mt-4">
            Not a team member?{" "}
            <Link to="/login" className="text-green-600 font-medium">
              Admin sign in
            </Link>
          </p>

        </div>
      </div>

      {/* ================= RIGHT SIDE ================= */}
      <div className="hidden lg:flex w-1/2 items-center justify-center relative bg-gradient-to-br from-green-100 via-white to-green-50 overflow-hidden">

        <div className="absolute top-[-80px] right-[-80px] w-60 h-60 bg-green-300/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-100px] left-[-100px] w-72 h-72 bg-green-200/20 rounded-full blur-3xl"></div>

        <div className="relative z-10 text-center px-12 max-w-md">

          <img
            src="https://exclusive-harlequin-tuwmcrrggt.edgeone.app/3d-hand-with-safe-payment-confirmation-bill.jpg"
            alt="Billing Illustration"
            className="w-full max-w-md mb-8 object-contain drop-shadow-xl"
          />

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

export default TeamLogin;
