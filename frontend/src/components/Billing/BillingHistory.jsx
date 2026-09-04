import { useState, useEffect, useRef } from "react";
import { Mail, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";
import {
  sendPasswordResetEmail,
  confirmPasswordReset,
  verifyPasswordResetCode,
} from "firebase/auth";
import { useNavigate, useSearchParams } from "react-router-dom";
import { auth, db } from "../../config/FirebaseConfig";
import { collection, query, where, getDocs } from "firebase/firestore";

const ChangePassword = () => {
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
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;

  const handleSendResetEmail = async () => {
    if (!email.trim()) {
      toast.error("Enter your email first!");
      return;
    }

    setIsLoading(true);
    try {
      const q = query(collection(db, "clients"), where("email", "==", email));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        toast.error("No account found with this email!");
        setIsLoading(false);
        return;
      }

      const actionCodeSettings = {
        url: `${window.location.origin}/forgot-password`,
        handleCodeInApp: true,
      };

      await sendPasswordResetEmail(auth, email, actionCodeSettings);

      setIsEmailSent(true);
      toast.success("Password reset email sent!");
    } catch (error) {
      toast.error(error.message || "Failed to send reset email.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const oobCode = searchParams.get("oobCode");
    if (oobCode) {
      const verifyCode = async () => {
        try {
          const userEmail = await verifyPasswordResetCode(auth, oobCode);
          setEmail(userEmail);
          setIsCodeVerified(true);
          toast.success("Reset link verified.");
          setTimeout(() => {
            passwordInputRef.current?.focus();
          }, 100);
        } catch {
          toast.error("Invalid or expired link.");
          navigate("/change", { replace: true });
        }
      };
      verifyCode();
    }
  }, [searchParams]);

  const checkPasswordStrength = (pass) => {
    if (!pass) return setPasswordStrength("");
    if (pass.length < 6) return setPasswordStrength("Weak");
    if (strongPasswordRegex.test(pass)) return setPasswordStrength("Strong");
    return setPasswordStrength("Medium");
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Passwords do not match!");
      return;
    }

    if (!strongPasswordRegex.test(password)) {
      toast.error(
        "Password must include uppercase, lowercase, number & special character."
      );
      return;
    }

    setIsLoading(true);
    try {
      const oobCode = searchParams.get("oobCode");
      if (!oobCode) {
        toast.error("Invalid reset code.");
        return;
      }

      await confirmPasswordReset(auth, oobCode, password);

      toast.success("Password reset successful!");
      navigate("/login");
    } catch (error) {
      toast.error("Reset failed. Link may have expired.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-white px-4 py-12">
      <div className="w-full max-w-md">

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-green-100 p-8">

          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center bg-green-100 p-3 rounded-xl mb-4">
              <ShieldCheck className="text-green-600" size={24} />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">
              Secure Password Reset
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Protect your account with a strong password
            </p>
          </div>

          {!isCodeVerified ? (
            <form className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  Registered Email
                </label>
                <div className="relative">
                  <Mail className="h-5 w-5 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full rounded-lg border border-green-200 py-2.5 pl-10 pr-3 focus:border-green-500 focus:ring-1 focus:ring-green-500 text-gray-800"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleSendResetEmail}
                disabled={isLoading}
                className="w-full flex justify-center items-center rounded-lg bg-green-600 px-4 py-2.5 text-white font-semibold hover:bg-green-700 transition disabled:opacity-50"
              >
                {isLoading && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
                Send Reset Link
              </button>

              {isEmailSent && (
                <div className="bg-green-50 border border-green-200 p-4 rounded-lg text-sm text-green-700 text-center">
                  Reset link sent to <strong>{email}</strong>
                </div>
              )}
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-6">

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <input
                    ref={passwordInputRef}
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      checkPasswordStrength(e.target.value);
                    }}
                    className="w-full rounded-lg border border-green-200 py-2.5 px-3 pr-10 focus:border-green-500 focus:ring-1 focus:ring-green-500"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-3 text-gray-500"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {passwordStrength && (
                  <div className="mt-2">
                    <div className="h-2 rounded-full bg-gray-200">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          passwordStrength === "Weak"
                            ? "w-1/3 bg-red-500"
                            : passwordStrength === "Medium"
                            ? "w-2/3 bg-green-600"
                            : "w-full bg-green-500"
                        }`}
                      />
                    </div>
                    <p className="text-xs mt-1 text-gray-600">
                      {passwordStrength} password
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-lg border border-green-200 py-2.5 px-3 pr-10 focus:border-green-500 focus:ring-1 focus:ring-green-500"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-3 text-gray-500"
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
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center rounded-lg bg-green-600 px-4 py-2.5 text-white font-semibold hover:bg-green-700 transition disabled:opacity-50"
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

export default ChangePassword;
