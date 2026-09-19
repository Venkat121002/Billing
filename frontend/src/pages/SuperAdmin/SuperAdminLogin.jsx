import React, { useState } from "react";
import { ShieldCheck, Loader2, EyeIcon, EyeOffIcon } from "lucide-react";
import toast from "react-hot-toast";
import { useSuperAdminAuth } from "../../contexts/SuperAdminAuthContext";

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
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="h-12 w-12 rounded-xl bg-emerald-600/20 flex items-center justify-center mb-4">
            <ShieldCheck className="h-6 w-6 text-emerald-500" />
          </div>
          <h1 className="text-xl font-semibold text-white">Super Admin</h1>
          <p className="text-sm text-gray-500 mt-1">Platform control panel</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div>
            <label className="block text-xs mb-1 text-gray-400">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="admin@example.com"
              className="w-full h-10 px-3 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs mb-1 text-gray-400">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full h-10 px-3 pr-10 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-none"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                {showPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-10 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg flex items-center justify-center transition disabled:opacity-60"
          >
            {isLoading && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
};

export default SuperAdminLogin;
