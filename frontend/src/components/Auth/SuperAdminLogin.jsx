import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { Eye, EyeOff, Shield, Mail, Lock } from "lucide-react";
import icon from "../../assets/images/BILLING LOGO .png";

const API_URL = import.meta.env.VITE_API_URL || "/api";

const SuperAdminLogin = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        email: "",
        password: ""
    });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (!formData.email || !formData.password) {
            setError("Please enter both email and password");
            return;
        }

        setLoading(true);

        try {
            const res = await axios.post(`${API_URL}/superadmin/login`, formData);

            // Store token and user info
            sessionStorage.setItem("token", res.data.token);
            sessionStorage.setItem("superAdminLoggedIn", "true");
            sessionStorage.setItem("superAdmin", JSON.stringify(res.data.superAdmin));

            // Navigate to SuperAdmin dashboard
            navigate("/superadmin");
        } catch (err) {
            setError(err.response?.data?.msg || "Login failed. Please check your credentials.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <img src={icon} alt="Logo" className="h-16 mx-auto mb-4" />
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">SuperAdmin Login</h1>
                    <p className="text-gray-500">Access the admin control panel</p>
                </div>

                {/* Login Form */}
                <div className="bg-white rounded-2xl shadow-xl border border-green-100 p-8">
                    <div className="flex items-center justify-center mb-6">
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                            <Shield className="w-7 h-7 text-white" />
                        </div>
                    </div>

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Email Address
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition text-gray-900"
                                    placeholder="superadmin@example.com"
                                    autoComplete="email"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition text-gray-900"
                                    placeholder="Enter your password"
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-lg shadow-green-200 disabled:opacity-50 disabled:cursor-not-allowed mt-6"
                        >
                            {loading ? "Logging in..." : "Login to SuperAdmin"}
                        </button>
                    </form>

                    {/* Register Link */}
                    <div className="mt-6 text-center">
                        <p className="text-gray-600 text-sm">
                            Don't have an account?{" "}
                            <Link to="/superadmin/register" className="text-green-600 font-semibold hover:text-green-700">
                                Register here
                            </Link>
                        </p>
                    </div>
                </div>

                {/* Back to Main Login */}
                <div className="mt-6 text-center">
                    <Link to="/login" className="text-gray-500 text-sm hover:text-gray-700">
                        ← Back to Tenant Login
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default SuperAdminLogin;


