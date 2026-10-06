import React, { useRef, useState } from "react";
import { EyeOffIcon, EyeIcon, Loader2, Mail, Lock, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import toast from "react-hot-toast";
import AuthShell, { AuthField, authInputClass, authInputErrorClass, authButtonClass } from "./AuthShell";

const Login = () => {
  const { employerLogin } = useAuth();

  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // This page is owner/admin login only — team members use /team-login.
  const loginType = "admin";

  const [remember, setRemember] = useState(false);

  // Validation / sign-in errors shown on the page instead of toasts:
  // { email, password } under the fields, `form` above the Sign in button.
  const [errors, setErrors] = useState({});
  const formRef = useRef(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (errors[name] || errors.form) setErrors(({ [name]: _removed, form: _form, ...rest }) => rest);
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    const found = {};
    if (!formData.email.trim()) found.email = "Please enter your email address.";
    if (!formData.password) found.password = "Please enter your password.";
    setErrors(found);
    if (Object.keys(found).length) {
      formRef.current?.elements?.namedItem(Object.keys(found)[0])?.focus();
      return;
    }

    setIsLoading(true);
    try {
      await employerLogin(formData.email, formData.password, loginType, remember);
      toast.success("Successfully logged in!");
    } catch (error) {
      console.error("Login component error:", error);

      const serverMsg = error?.msg || error?.message || "";

      if (serverMsg.includes("EMAIL_NOT_FOUND")) {
        setErrors({ email: "No account found with this email." });
        formRef.current?.elements?.namedItem("email")?.focus();
        return;
      }
      if (serverMsg.includes("INVALID_PASSWORD")) {
        setErrors({ password: "Incorrect password. Try again or reset it." });
        formRef.current?.elements?.namedItem("password")?.focus();
        return;
      }

      let friendlyMsg = "Login failed. Please try again.";

      if (serverMsg.includes("USER_DISABLED")) {
        friendlyMsg = "This account has been disabled";
      } else if (serverMsg) {
        friendlyMsg = serverMsg;
      }

      setErrors({ form: friendlyMsg });
    } finally {
      setIsLoading(false);
    }
  };

  // Google sign-in is disabled while Firebase is removed.
  // TODO: restore handleGoogleLogin + employerGoogleSignIn when a new
  // Firebase project is configured.

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to manage your billing dashboard."
      footer={
        <>
          <p>
            Don’t have an account?{" "}
            <Link to="/signup" className="font-semibold text-green-700 hover:underline">
              Create one
            </Link>
          </p>
          <p>
            Team member?{" "}
            <Link to="/team-login" className="font-semibold text-green-700 hover:underline">
              Sign in here
            </Link>
          </p>
        </>
      }
    >
      <form ref={formRef} onSubmit={handleLogin} className="space-y-5" noValidate>
        <AuthField label="Email address" icon={Mail} error={errors.email}>
          <input
            type="text"
            name="email"
            autoComplete="username"
            autoFocus
            value={formData.email}
            onChange={handleChange}
            placeholder="name@company.com"
            className={`${authInputClass} ${errors.email ? authInputErrorClass : ""}`}
            required
          />
        </AuthField>

        <AuthField
          label="Password"
          icon={Lock}
          error={errors.password}
          right={
            <Link to="/forgot" className="text-sm font-medium text-green-700 hover:text-green-800 hover:underline">
              Forgot password?
            </Link>
          }
        >
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            autoComplete="current-password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Enter your password"
            className={`${authInputClass} pr-12 ${errors.password ? authInputErrorClass : ""}`}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-400 hover:text-green-700"
          >
            {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
          </button>
        </AuthField>

        <label className="flex cursor-pointer select-none items-center gap-2.5 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 accent-green-600"
          />
          Remember me for 30 days
        </label>

        {errors.form && (
          <p role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            {errors.form}
          </p>
        )}

        <button type="submit" disabled={isLoading} className={authButtonClass}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isLoading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </AuthShell>
  );
};

export default Login;
