import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import toast from "react-hot-toast";
import icon1 from "../../assets/images/BILLING LOGO .png";
import bg from "../../assets/images/03-Sky2.jpg";
import axios from "axios";

const Onboarding = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    job_title: "",
    company_size: "",
    discovery_source: ""
  });

  const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "/api",
  });

  api.interceptors.request.use((config) => {
    const token = sessionStorage.getItem("token");
    if (token) config.headers["x-auth-token"] = token;
    return config;
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post("/auth/onboarding", formData);
      toast.success("Profile updated!");
      navigate("/pricing");
    } catch (error) {
      console.error("Onboarding error:", error);
      if (error.response) {
        console.error("Error Response:", error.response.data);
        toast.error(`Error: ${error.response.data.msg || "Server Error"}`);
      } else {
        toast.error("Failed to connect to server. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    navigate("/pricing");
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-green-50 to-white">

      {/* ================= LEFT SECTION ================= */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center py-12 px-6 sm:px-10 lg:px-16">

        <div className="w-full max-w-md mx-auto">

          {/* Logo */}
          <div className="text-center mb-8">
            <img
              src={icon1}
              alt="SwordNex"
              className="h-12 w-auto mx-auto mb-6"
            />

            <h2 className="text-3xl font-bold text-gray-800">
              Tell us about yourself
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              Help us personalize your experience.
            </p>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-2xl shadow-lg border border-green-100 p-8">

            <form onSubmit={handleSubmit} className="space-y-6">

              {/* Job Title */}
              <div>
                <label
                  htmlFor="job_title"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Job Title
                </label>

                <input
                  id="job_title"
                  name="job_title"
                  type="text"
                  required
                  value={formData.job_title}
                  onChange={handleChange}
                  placeholder="e.g. CEO, Manager, Accountant"
                  className="w-full rounded-xl border border-green-200 bg-white px-4 py-2.5 text-gray-800 placeholder:text-gray-400 shadow-sm focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none"
                />
              </div>

              {/* Discovery Source */}
              <div>
                <label
                  htmlFor="discovery_source"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  How did you hear about us?
                </label>

                <select
                  id="discovery_source"
                  name="discovery_source"
                  required
                  value={formData.discovery_source}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-green-200 bg-white px-4 py-2.5 text-gray-800 shadow-sm focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none"
                >
                  <option value="">Select source</option>
                  <option value="Google Search">Google Search</option>
                  <option value="Social Media">Social Media</option>
                  <option value="Friend/Referral">Friend / Referral</option>
                  <option value="Advertisement">Advertisement</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Buttons */}
              <div className="flex flex-col gap-4 pt-2">

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center gap-2 py-3 rounded-xl text-sm font-semibold text-white bg-green-600 hover:bg-green-700 transition disabled:opacity-50"
                >
                  {loading ? "Saving..." : "Continue to Pricing"}
                </button>

                <button
                  type="button"
                  onClick={handleSkip}
                  className="w-full py-2 text-sm font-medium text-green-600 hover:text-green-800 transition"
                >
                  Skip for now
                </button>

              </div>

            </form>

          </div>
        </div>
      </div>

      {/* ================= RIGHT SECTION ================= */}
      <div className="hidden lg:flex w-1/2 relative bg-gradient-to-br from-green-400 via-green-500 to-green-700">

        <img
          src={bg}
          alt="Background"
          className="absolute inset-0 w-full h-full object-cover opacity-30"
        />

        <div className="relative z-10 flex items-center justify-center w-full p-12">
          <div className="bg-white/20 backdrop-blur-xl p-10 rounded-2xl shadow-xl text-center max-w-lg">

            <h2 className="text-white text-3xl font-bold mb-4">
              Almost there!
            </h2>

            <p className="text-green-100 text-lg">
              Just a few more details to help us serve you better.
            </p>

          </div>
        </div>

      </div>

    </div>
  );

};

export default Onboarding;
