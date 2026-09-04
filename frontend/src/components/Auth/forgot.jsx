import { useState, useEffect, useRef } from "react";
import { Mail, Eye, EyeOff, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import axios from "axios";
import { useNavigate, useSearchParams } from "react-router-dom";

import API_URL from "../../config/api";

const api = axios.create({
  baseURL: API_URL.endsWith('/') ? API_URL : `${API_URL}/`,
});


const ForgotPassword = () => {

  const [email, setEmail] = useState("");
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [isCodeVerified, setIsCodeVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState("");
  const navigate = useNavigate();
  const passwordInputRef = useRef(null);
  const [searchParams] = useSearchParams();

  const strongPasswordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

  const handleSendResetEmail = async () => {
    if (!email.trim()) {
      toast.error("Enter your email first!");
      return;
    }

    setIsLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });

      setIsEmailSent(true);
      toast.success("Password reset email sent! Please check your inbox.");
    } catch (error) {
      console.error("Error sending password reset email:", error);
      if (error.response) {
        console.error("Server Response:", error.response.data);
      }
      toast.error(error.response?.data?.msg || error.message || "Failed to send reset email. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Automatically set the email if it's in the URL from the reset link
  useEffect(() => {
    const oobCode = searchParams.get('oobCode');
    if (oobCode) {
      setIsCodeVerified(true);
      setTimeout(() => {
        passwordInputRef.current?.focus();
      }, 100);
    }
  }, [searchParams]);

  const checkPasswordStrength = (pass) => {
    if (!pass) {
      setPasswordStrength("");
      return;
    }
    if (pass.length < 6) {
      setPasswordStrength("Weak");
    } else if (strongPasswordRegex.test(pass)) {
      setPasswordStrength("Strong");
    } else {
      setPasswordStrength("Medium");
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Passwords do not match!");
      return;
    }

    if (!strongPasswordRegex.test(password)) {
      toast.error("Password must be at least 8 chars, include uppercase, lowercase, number & special character.");
      return;
    }

    setIsLoading(true);
    try {
      const oobCode = searchParams.get('oobCode');
      if (!oobCode) {
        toast.error("Invalid or missing reset code.");
        setIsLoading(false);
        return;
      }

      await api.post("/auth/reset-password", {
        token: oobCode,
        password
      });

      toast.success("Password has been reset successfully! Please log in.");
      navigate("/login");

    } catch (error) {
      console.error("Password update error:", error);
      toast.error(error.response?.data?.msg || "Password reset failed! The link may have expired.");
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-green-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-[#111111]">
            Forgot Password
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Reset your account password securely
          </p>
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-xl border border-green-500">
          {!isCodeVerified ? (
            <form className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-[#666666] mb-1">
                  Business Email
                </label>
                <div className="relative">
                  <Mail className="h-5 w-5 text-[#666666] absolute left-3 top-3" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="block w-full rounded-lg border border-green-500 py-2.5 pl-10 pr-3 text-[#111111] placeholder:text-[#666666] focus:border-green-500 focus:ring-1 focus:ring-green-500 sm:text-sm"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleSendResetEmail}
                disabled={isLoading}
                className="flex w-full justify-center items-center rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A73E8] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
                Send Password Reset Email
              </button>
              {isEmailSent && (
                <p className="text-sm text-center text-gray-700 pt-4">
                  An email has been sent to <strong>{email}</strong>. Please click the link in the email to proceed.
                </p>
              )}
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-6">
              <p className="text-sm text-center text-green-700">Link verified for <strong>{email}</strong>. You can now set a new password.</p>
              <div className="relative">
                <label className="block text-sm font-medium text-[#666666] mb-1">
                  New Password
                </label>
                {/* <input ref={passwordInputRef} /> removed stray input */}
                <input
                  ref={passwordInputRef}
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    checkPasswordStrength(e.target.value);
                  }}
                  placeholder="••••••••"
                  className="block w-full rounded-lg border border-green-500 py-2.5 pl-3 pr-10 text-[#111111]"
                />
                <button
                  type="button"
                  className="absolute right-3 top-[36px]"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
                {passwordStrength && (
                  <p
                    className={`text-sm font-medium ${passwordStrength === "Weak"
                      ? "text-red-500"
                      : passwordStrength === "Medium"
                        ? "text-green-500"
                        : "text-green-600"
                      }`}
                  >
                    {passwordStrength} password
                  </p>
                )}
              </div>

              <div className="relative">
                <label className="block text-sm font-medium text-[#666666] mb-1">
                  Confirm Password
                </label>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full rounded-lg border border-green-500 py-2.5 pl-3 pr-10 text-[#111111]"
                />
                <button
                  type="button"
                  className="absolute right-3 top-[36px]"
                  onClick={() =>
                    setShowConfirmPassword(!showConfirmPassword)
                  }
                >
                  {showConfirmPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="flex w-full justify-center items-center rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
                Reset Password
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
