import React, { useState } from "react";
import { EyeIcon, EyeOffIcon, Loader2, Lock, Mail, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";
import { useSuperAdminAuth } from "../../contexts/SuperAdminAuthContext";
import { ThemeToggle } from "../../components/SuperAdmin/theme";
import { buttonClass, inputClass } from "../../components/SuperAdmin/shared";

const SuperAdminLogin = () => {
  const { login } = useSuperAdminAuth();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      toast.error("Enter both email and password");
      return;
    }
    setIsLoading(true);
    try {
      await login(formData.email, formData.password);
      toast.success("Welcome back, super admin");
    } catch (err) {
      toast.error(err?.msg || "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 sa-dark:bg-slate-950 text-gray-800 sa-dark:text-slate-200 relative overflow-hidden flex items-center justify-center px-4">
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[640px] h-[640px] rounded-full bg-emerald-300/30 sa-dark:bg-emerald-600/20 blur-3xl" />
      <ThemeToggle className="absolute top-4 right-4" />

      <div className="relative w-full max-w-sm">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="h-12 w-12 rounded-xl bg-emerald-50 sa-dark:bg-emerald-500/15 text-emerald-600 sa-dark:text-emerald-300 flex items-center justify-center mb-4">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 sa-dark:text-white">SwordNex Billing super admin</h1>
          <p className="text-sm text-gray-500 sa-dark:text-slate-400 mt-1">Every store, plan and record in one console</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 bg-white sa-dark:bg-slate-900/70 border border-gray-200 sa-dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <label className="block">
            <span className="block text-xs mb-1 text-gray-500 sa-dark:text-slate-400">Email</span>
            <span className="relative block">
              <Mail className="w-4 h-4 text-gray-400 sa-dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                name="email"
                autoComplete="username"
                autoFocus
                value={formData.email}
                onChange={handleChange}
                placeholder="admin@example.com"
                className={`${inputClass} w-full pl-9 py-2.5`}
                required
              />
            </span>
          </label>

          <label className="block">
            <span className="block text-xs mb-1 text-gray-500 sa-dark:text-slate-400">Password</span>
            <span className="relative block">
              <Lock className="w-4 h-4 text-gray-400 sa-dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete="current-password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                className={`${inputClass} w-full pl-9 pr-10 py-2.5`}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 sa-dark:text-slate-500 hover:text-gray-700 sa-dark:hover:text-slate-300"
              >
                {showPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
              </button>
            </span>
          </label>

          <button type="submit" disabled={isLoading} className={`${buttonClass.primary} w-full py-2.5`}>
            {isLoading && <Loader2 className="animate-spin h-4 w-4" />}
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
};

export default SuperAdminLogin;
