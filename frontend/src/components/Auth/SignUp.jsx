import { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import toast from "react-hot-toast";
import logo from "../../assets/images/BILLING LOGO .png";
import billingDashboardImage from "../../assets/images/billing-dashboard.jpg";

const Signup = () => {
  // Changed max steps to 3
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const { employerSignup } = useAuth();

  const strongPasswordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;

  const industries = {
    retail: ["Grocery Store", "Supermarket", "Mobile Shop","Clothing","Pharmacy"],
    food: ["Restaurant", "Cafe", "Bakery"],
    education: ["Acadamy"],
    technology: ["Software Development"],

  };

  const [formData, setFormData] = useState({
    businessName: "",
    businessType: "",
    industry: "",
    subIndustry: "",
    employees: "",
    firstName: "",
    lastName: "",
    email: "",
    mobile: "",
    password: "",
    confirmPassword: "",
    street: "",
    city: "",
    state: "",
    pincode: "",
    country: "",
    gstin: "",
    pan: "",
  });

  const handleChange = (e) => {
    const { name, value = e.target.value } = e.target;

    if (name === "industry") {
      setFormData({ ...formData, industry: value, subIndustry: "" });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const nextStep = () => {
    // Validation for Step 2 (Password)
    if (currentStep === 2) {
      if (!strongPasswordRegex.test(formData.password)) {
        toast.error("Password must contain uppercase, lowercase, number, special char & 8+ chars");
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        toast.error("Passwords do not match");
        return;
      }
    }

    setCurrentStep((prev) => prev + 1);
  };

  const prevStep = () => setCurrentStep((prev) => prev - 1);

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const labelToKey = (industry, subLabel) => {
        if (industry === "electronics" && subLabel === "Mobile Shop") return "mobile_shop";
        if (industry === "education") return "academy";
        if (industry === "grocery") return "grocery";
        if (industry === "restaurant") return "restaurant";
        return (subLabel || industry || "others").toLowerCase().replace(/\s+/g, "_");
      };

      const selectedKey = labelToKey(formData.industry, formData.subIndustry);
      localStorage.setItem("selectedIndustry", selectedKey);

      // Submit data
      await employerSignup({
        ...formData,
        industry: selectedKey,
        subIndustry: selectedKey
      });

      // Move to success step (Step 4 internally, but shows as completion)
      setCurrentStep(4);
    } catch (e) {
      toast.error(e?.msg || e?.message || "Signup failed");
    } finally {
      setIsLoading(false);
    }
  };



  // Updated progress calculation for 3 steps
  const totalSteps = 3;
  const progress = ((currentStep - 1) / totalSteps) * 100;

  return (
    <div className="min-h-screen flex bg-gray-50 text-gray-900">

      {/* ================= LEFT SIDE – SIGNUP FORM ================= */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6">
        <div className="w-full max-w-xl bg-white p-8 rounded-xl shadow-lg">
          <div className="flex justify-center mb-6">
            <img
              src={logo}
              alt="Logo"
              className="h-14 object-contain"
            />
          </div>

          {/* Progress - Only show if not completed */}
          {currentStep <= 3 && (
            <div className="mb-6">
              <div className="flex justify-between text-sm mb-1">
                <span>Step {currentStep} of {totalSteps}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-gray-200 h-2 rounded-full">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* STEP 1: Business Info */}
          {currentStep === 1 && (
            <>
              <h2 className="text-xl font-bold mb-4">Business Information</h2>

              <input
                name="businessName"
                placeholder="Business Name"
                value={formData.businessName}
                onChange={handleChange}
                className="input"
              />

              <select
                name="businessType"
                value={formData.businessType}
                onChange={handleChange}
                className="input">
                <option value="">Business Type</option>
                <option>Sole Proprietorship</option>
                <option>Partnership</option>
                <option>LLP</option>
                <option>Private Limited</option>
                <option>Public Limited</option>
                <option>OPC</option>
                <option>NGO</option>
                <option>Trust</option>
              </select>

              <select
                name="industry"
                value={formData.industry}
                onChange={handleChange}
                className="input">
                <option value="">Select Industry</option>
                {Object.keys(industries).map((key) => (
                  <option key={key} value={key}>{key.charAt(0).toUpperCase() + key.slice(1)}</option>
                ))}
              </select>

              {formData.industry && (
                <select
                  name="subIndustry"
                  value={formData.subIndustry}
                  onChange={handleChange}
                  className="input">
                  <option value="">Sub Industry</option>
                  {(formData.industry === "electronics"
                    ? ["Mobile Shop"]
                    : industries[formData.industry]
                  ).map((sub, i) => (
                    <option key={i}>{sub}</option>
                  ))}
                </select>
              )}

              <input
                name="employees"
                placeholder="Number of Employees"
                type="number"
                value={formData.employees}
                onChange={handleChange}
                className="input"
              />

              <button onClick={nextStep} className="btn w-full mt-4">Next</button>
            </>
          )}

          {/* STEP 2: Personal Info */}
          {currentStep === 2 && (
            <>
              <h2 className="text-xl font-bold mb-4">Personal Information</h2>

              <div className="grid grid-cols-2 gap-4">
                <input
                  name="firstName"
                  placeholder="First Name"
                  value={formData.firstName}
                  onChange={handleChange}
                  className="input"
                />
                <input
                  name="lastName"
                  placeholder="Last Name"
                  value={formData.lastName}
                  onChange={handleChange}
                  className="input"
                />
              </div>

              <input
                name="email"
                placeholder="Email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                className="input"
              />

              <input
                name="mobile"
                placeholder="Mobile"
                type="tel"
                value={formData.mobile}
                onChange={handleChange}
                className="input"
              />

              <input
                type="password"
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                className="input"
              />

              <input
                type="password"
                name="confirmPassword"
                placeholder="Confirm Password"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="input"
              />

              <div className="flex justify-between mt-4">
                <button onClick={prevStep} className="btn-gray">Back</button>
                <button onClick={nextStep} className="btn">Next</button>
              </div>
            </>
          )}

          {/* STEP 3: Address & Tax + Submit */}
          {currentStep === 3 && (
            <>
              <h2 className="text-xl font-bold mb-4">Address & Tax Details</h2>

              <input
                name="street"
                placeholder="Street Address"
                value={formData.street}
                onChange={handleChange}
                className="input"
              />

              <div className="grid grid-cols-2 gap-4">
                <input
                  name="city"
                  placeholder="City"
                  value={formData.city}
                  onChange={handleChange}
                  className="input"
                />
                <input
                  name="state"
                  placeholder="State"
                  value={formData.state}
                  onChange={handleChange}
                  className="input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <input
                  name="pincode"
                  placeholder="Pincode"
                  value={formData.pincode}
                  onChange={handleChange}
                  className="input"
                />
                <input
                  name="country"
                  placeholder="Country"
                  value={formData.country}
                  onChange={handleChange}
                  className="input"
                />
              </div>

              <div className="border-t my-4 pt-4">
                <p className="text-sm text-gray-600 mb-2">Tax Information (Optional)</p>
                <input
                  name="gstin"
                  placeholder="GSTIN (e.g., 22A... )"
                  value={formData.gstin}
                  onChange={handleChange}
                  className="input"
                />
                <input
                  name="pan"
                  placeholder="PAN"
                  value={formData.pan}
                  onChange={handleChange}
                  className="input"
                />
              </div>

              <div className="flex justify-between mt-4">
                <button onClick={prevStep} className="btn-gray">Back</button>
                <button onClick={handleSubmit} className="btn">
                  {isLoading ? "Creating Account..." : "Create Account"}
                </button>
              </div>
            </>
          )}

          {/* STEP 4: Success Message */}
          {currentStep === 4 && (
            <div className="text-center py-10">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800">
                Account Created Successfully!
              </h2>
              <p className="mt-2 text-gray-600">
                Redirecting to your dashboard...
              </p>
            </div>
          )}

        </div>
      </div>

      {/* ================= RIGHT SIDE – BILLING IMAGE ================= */}
      <div className="hidden lg:flex w-1/2 relative">
        <img
          src={billingDashboardImage}
          alt="Billing Dashboard"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-green-700/70 flex items-center justify-center p-12">
          <div className="text-white text-center max-w-lg">
            <h2 className="text-3xl font-bold mb-4">
              Smart Billing. Powerful Growth.
            </h2>
            <p className="text-lg">
              Manage GST invoices, inventory, reports and payments with a
              secure and scalable billing platform.
            </p>
          </div>
        </div>
      </div>

      {/* Styles */}
      <style>{`
        .input {
          width:100%;
          border:1px solid #d1d5db;
          padding:10px;
          border-radius:8px;
          margin-bottom:12px;
          outline:none;
        }
        .input:focus {
          border-color: #16a34a;
        }
        .btn {
          background:#16a34a;
          color:white;
          padding:10px 20px;
          border-radius:8px;
          font-weight:600;
        }
        .btn:hover {
          background:#15803d;
        }
        .btn-gray {
          background:#f3f4f6;
          color:#374151;
          padding:10px 20px;
          border-radius:8px;
          font-weight:600;
        }
        .btn-gray:hover {
          background:#e5e7eb;
        }
      `}</style>
    </div>
  );
};

export default Signup;
