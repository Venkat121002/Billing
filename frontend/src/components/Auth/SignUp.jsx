import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import toast from "react-hot-toast";
import {
  EyeIcon,
  EyeOffIcon,
  Loader2,
  Mail,
  Lock,
  Phone,
  Building2,
  User,
  Check,
  X,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import AuthShell, { AuthField, authInputClass, authPlainInputClass, authInputErrorClass, authButtonClass } from "./AuthShell";

const BUSINESS_TYPES = [
  "Sole Proprietorship",
  "Partnership",
  "LLP",
  "Private Limited",
  "Public Limited",
  "OPC",
  "NGO",
  "Trust",
];

const PASSWORD_RULES = [
  { label: "8+ characters", test: (p) => p.length >= 8 },
  { label: "Uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { label: "Lowercase letter", test: (p) => /[a-z]/.test(p) },
  { label: "Number", test: (p) => /\d/.test(p) },
  { label: "Special (@$!%*?&)", test: (p) => /[@$!%*?&]/.test(p) },
];

const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;

function Section({ title, hint, children }) {
  return (
    <section>
      <div className="mb-4 flex items-baseline justify-between border-b border-gray-100 pb-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-800">{title}</h2>
        {hint && <span className="text-xs text-gray-400">{hint}</span>}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

const Required = () => <span className="text-red-500">*</span>;

const Signup = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);
  const { employerSignup, sendSignupOtp, verifySignupOtp } = useAuth();

  // Email + WhatsApp verification: the whole form is filled first, then
  // "Create account" opens a popup for the two codes. Both must be entered.
  const [otpOpen, setOtpOpen] = useState(false);
  const [codes, setCodes] = useState({ email: "", whatsapp: "" });
  const [verified, setVerified] = useState({ email: "", mobile: "", token: "" });
  const [resendIn, setResendIn] = useState({ email: 0, whatsapp: 0 });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (resendIn.email <= 0 && resendIn.whatsapp <= 0) return;
    const t = setTimeout(
      () => setResendIn((r) => ({ email: Math.max(0, r.email - 1), whatsapp: Math.max(0, r.whatsapp - 1) })),
      1000
    );
    return () => clearTimeout(t);
  }, [resendIn]);

  // Industry is not chosen at signup — it's a one-time selection made later
  // in Settings > Company Profile. Registration only collects business basics.
  const [formData, setFormData] = useState({
    businessName: "",
    businessType: "",
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
    country: "India",
    gstin: "",
    pan: "",
  });

  // Validation messages are shown under each field ({ fieldName: message }),
  // not as toasts. A field's message clears as soon as it is edited.
  const [errors, setErrors] = useState({});
  const formRef = useRef(null);
  const err = (name) => (errors[name] ? authInputErrorClass : "");

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (errors[name]) setErrors(({ [name]: _removed, ...rest }) => rest);
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const normalizedEmail = () => formData.email.trim().toLowerCase();
  const mobileDigits = () => formData.mobile.replace(/\D/g, "");

  // Returns every problem at once, in form order.
  const validate = () => {
    const e = {};
    if (!formData.businessName.trim()) e.businessName = "Please enter your business name.";
    if (!formData.businessType) e.businessType = "Please choose your business type.";
    if (!formData.firstName.trim()) e.firstName = "Please enter your first name.";
    if (!formData.email.trim()) e.email = "Please enter your email address.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail())) e.email = "Please enter a valid email address.";
    if (!mobileDigits()) e.mobile = "Please enter your WhatsApp number.";
    else if (!/^\d{10,15}$/.test(mobileDigits())) e.mobile = "Enter a valid number (10 to 15 digits).";
    if (!formData.password) e.password = "Please create a password.";
    else if (!strongPasswordRegex.test(formData.password)) e.password = "Password doesn't meet all the rules below.";
    if (!formData.confirmPassword) e.confirmPassword = "Please re-enter your password.";
    else if (formData.password !== formData.confirmPassword) e.confirmPassword = "Passwords do not match.";
    return e;
  };

  const focusField = (name) => {
    const input = formRef.current?.elements?.namedItem(name);
    input?.scrollIntoView({ behavior: "smooth", block: "center" });
    input?.focus({ preventScroll: true });
  };

  const createAccount = async (verificationToken) => {
    setIsLoading(true);
    try {
      await employerSignup({ ...formData, verificationToken });
      setOtpOpen(false);
      setDone(true);
    } catch (e) {
      const msg = e?.msg || e?.message || "Signup failed";
      if (/already exists/i.test(msg)) {
        setOtpOpen(false);
        setErrors({ email: "An account with this email already exists. Sign in instead." });
        focusField("email");
      } else {
        toast.error(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // channel: "email" | "whatsapp" resends one code; omitted sends both.
  const requestOtp = async (channel) => {
    setIsLoading(true);
    try {
      await sendSignupOtp(normalizedEmail(), { mobile: mobileDigits(), channel });
      if (channel) {
        setCodes((c) => ({ ...c, [channel]: "" }));
        setResendIn((r) => ({ ...r, [channel]: 30 }));
        toast.success(channel === "email" ? "New email code sent" : "New WhatsApp code sent");
      } else {
        setCodes({ email: "", whatsapp: "" });
        setResendIn({ email: 30, whatsapp: 30 });
        setOtpOpen(true);
        toast.success("Codes sent to your email and WhatsApp");
      }
    } catch (e) {
      toast.error(e?.msg || e?.message || "Could not send the code");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isLoading) return;
    const found = validate();
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) {
      focusField(first);
      return;
    }
    // Already verified this exact email + number (e.g. the first create
    // attempt failed)? Skip straight to creating the account.
    if (verified.token && verified.email === normalizedEmail() && verified.mobile === mobileDigits()) {
      createAccount(verified.token);
    } else {
      requestOtp();
    }
  };

  const setCode = (channel) => (e) =>
    setCodes((c) => ({ ...c, [channel]: e.target.value.replace(/\D/g, "") }));

  const confirmOtp = async () => {
    if (!/^\d{6}$/.test(codes.email) || !/^\d{6}$/.test(codes.whatsapp)) {
      toast.error("Enter both 6-digit codes");
      return;
    }
    setIsLoading(true);
    let token;
    try {
      ({ verificationToken: token } = await verifySignupOtp({
        email: normalizedEmail(),
        mobile: mobileDigits(),
        emailOtp: codes.email,
        mobileOtp: codes.whatsapp,
      }));
      setVerified({ email: normalizedEmail(), mobile: mobileDigits(), token });
    } catch (e) {
      toast.error(e?.msg || e?.message || "Verification failed");
      setIsLoading(false);
      return;
    }
    await createAccount(token);
  };

  if (done) {
    return (
      <AuthShell title="You're all set" subtitle="Your account has been created.">
        <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          Redirecting to your dashboard...
        </div>
      </AuthShell>
    );
  }

  const password = formData.password;
  const passwordsMismatch = formData.confirmPassword && formData.confirmPassword !== password;

  return (
    <AuthShell
      wide
      title="Create your account"
      subtitle="Start your 14-day free trial. It takes about a minute."
      footer={
        <p>
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-green-700 hover:underline">
            Sign in
          </Link>
        </p>
      }
    >
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-8" noValidate>
        {/* ---------- Business ---------- */}
        <Section title="Business details">
          <AuthField label={<>Business name <Required /></>} error={errors.businessName} icon={Building2}>
            <input
              name="businessName"
              autoComplete="organization"
              autoFocus
              value={formData.businessName}
              onChange={handleChange}
              placeholder="Company Name "
              className={`${authInputClass} ${err("businessName")}`}
            />
          </AuthField>

          <div className="grid gap-4 sm:grid-cols-2">
            <AuthField label={<>Business type <Required /></>} error={errors.businessType}>
              <select
                name="businessType"
                value={formData.businessType}
                onChange={handleChange}
                className={`${authPlainInputClass} ${formData.businessType ? "" : "text-gray-400"} ${err("businessType")}`}
              >
                <option value="">Select type</option>
                {BUSINESS_TYPES.map((t) => (
                  <option key={t} value={t} className="text-gray-900">
                    {t}
                  </option>
                ))}
              </select>
            </AuthField>
            <AuthField label="Number of employees">
              <input
                name="employees"
                type="number"
                min="0"
                value={formData.employees}
                onChange={handleChange}
                placeholder="e.g. 5"
                className={authPlainInputClass}
              />
            </AuthField>
          </div>
        </Section>

        {/* ---------- Account ---------- */}
        <Section title="Your account" hint="We'll verify your email & WhatsApp">
          <div className="grid gap-4 sm:grid-cols-2">
            <AuthField label={<>First name <Required /></>} error={errors.firstName} icon={User}>
              <input
                name="firstName"
                autoComplete="given-name"
                value={formData.firstName}
                onChange={handleChange}
                placeholder="First name"
                className={`${authInputClass} ${err("firstName")}`}
              />
            </AuthField>
            <AuthField label="Last name">
              <input
                name="lastName"
                autoComplete="family-name"
                value={formData.lastName}
                onChange={handleChange}
                placeholder="Last name"
                className={authPlainInputClass}
              />
            </AuthField>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <AuthField label={<>Email address <Required /></>} error={errors.email} icon={Mail}>
              <input
                name="email"
                type="email"
                autoComplete="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="name@company.com"
                className={`${authInputClass} ${err("email")}`}
              />
            </AuthField>
            <AuthField label={<>WhatsApp number <Required /></>} error={errors.mobile} icon={Phone}>
              <input
                name="mobile"
                type="tel"
                autoComplete="tel"
                value={formData.mobile}
                onChange={handleChange}
                placeholder="10-digit mobile number"
                className={`${authInputClass} ${err("mobile")}`}
              />
            </AuthField>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <AuthField label={<>Password <Required /></>} error={errors.password} icon={Lock}>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete="new-password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Create a password"
                className={`${authInputClass} pr-12 ${err("password")}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-400 hover:text-green-700"
              >
                {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
              </button>
            </AuthField>
            <AuthField label={<>Confirm password <Required /></>} error={errors.confirmPassword} icon={Lock}>
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                autoComplete="new-password"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Re-enter password"
                className={`${authInputClass} pr-12 ${err("confirmPassword") || (passwordsMismatch ? authInputErrorClass : "")}`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                tabIndex={-1}
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-400 hover:text-green-700"
              >
                {showConfirmPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
              </button>
            </AuthField>
          </div>

          {/* Live password checklist */}
          <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
            {PASSWORD_RULES.map(({ label, test }) => {
              const ok = test(password);
              return (
                <li key={label} className={`flex items-center gap-1 ${ok ? "text-green-700" : errors.password ? "text-red-500" : "text-gray-400"}`}>
                  {ok ? <Check size={13} /> : <span className="inline-block h-1.5 w-1.5 rounded-full bg-gray-300 mx-[3.5px]" />}
                  {label}
                </li>
              );
            })}
            {passwordsMismatch && !errors.confirmPassword && <li className="text-red-500">Passwords don't match</li>}
          </ul>
        </Section>

        {/* ---------- Address & tax ---------- */}
        <Section title="Address & tax" hint="Optional · you can add this later in Settings">
          <AuthField label="Street address">
            <input
              name="street"
              autoComplete="street-address"
              value={formData.street}
              onChange={handleChange}
              placeholder="Door no, street, area"
              className={authPlainInputClass}
            />
          </AuthField>

          <div className="grid gap-4 sm:grid-cols-2">
            <AuthField label="City">
              <input name="city" autoComplete="address-level2" value={formData.city} onChange={handleChange} placeholder="City" className={authPlainInputClass} />
            </AuthField>
            <AuthField label="State">
              <input name="state" autoComplete="address-level1" value={formData.state} onChange={handleChange} placeholder="State" className={authPlainInputClass} />
            </AuthField>
            <AuthField label="Pincode">
              <input name="pincode" autoComplete="postal-code" inputMode="numeric" value={formData.pincode} onChange={handleChange} placeholder="Pincode" className={authPlainInputClass} />
            </AuthField>
            <AuthField label="Country">
              <input name="country" autoComplete="country-name" value={formData.country} onChange={handleChange} placeholder="Country" className={authPlainInputClass} />
            </AuthField>
            <AuthField label="GSTIN">
              <input name="gstin" value={formData.gstin} onChange={handleChange} placeholder="e.g. 33ABCDE1234F1Z5" className={`${authPlainInputClass} uppercase placeholder:normal-case`} />
            </AuthField>
            <AuthField label="PAN">
              <input name="pan" value={formData.pan} onChange={handleChange} placeholder="e.g. ABCDE1234F" className={`${authPlainInputClass} uppercase placeholder:normal-case`} />
            </AuthField>
          </div>
        </Section>

        <div className="space-y-3">
          <button type="submit" disabled={isLoading} className={authButtonClass}>
            {isLoading && !otpOpen && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading && !otpOpen ? "Sending verification codes..." : "Create account"}
          </button>
          <p className="text-center text-xs text-gray-400">
            We'll send a 6-digit code to your email and WhatsApp to confirm they're yours.
          </p>
        </div>
      </form>

      {/* ---------- OTP popup ---------- */}
      {otpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
            <button
              type="button"
              onClick={() => !isLoading && setOtpOpen(false)}
              aria-label="Close"
              className="absolute right-4 top-4 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <X size={18} />
            </button>

            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 text-green-700">
              <ShieldCheck size={24} />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Verify your email and WhatsApp</h2>
            <p className="mt-1 text-sm text-gray-500">
              We sent two different 6-digit codes. Both expire in 5 minutes.
            </p>

            <div className="mt-6 space-y-4">
              {[
                { channel: "email", label: "Email code", sentTo: formData.email },
                { channel: "whatsapp", label: "WhatsApp code", sentTo: formData.mobile },
              ].map(({ channel, label, sentTo }, i) => (
                <div key={channel}>
                  <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
                    <label htmlFor={`otp-${channel}`} className="font-medium text-gray-700">
                      {label} <span className="font-normal text-gray-400">· {sentTo}</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => requestOtp(channel)}
                      disabled={resendIn[channel] > 0 || isLoading}
                      className="shrink-0 font-medium text-green-700 hover:underline disabled:text-gray-400 disabled:no-underline"
                    >
                      {resendIn[channel] > 0 ? `Resend in ${resendIn[channel]}s` : "Resend"}
                    </button>
                  </div>
                  <input
                    id={`otp-${channel}`}
                    inputMode="numeric"
                    autoComplete={channel === "email" ? "one-time-code" : "off"}
                    maxLength={6}
                    placeholder="••••••"
                    value={codes[channel]}
                    onChange={setCode(channel)}
                    onKeyDown={(e) => e.key === "Enter" && confirmOtp()}
                    className={`${authPlainInputClass} text-center text-lg font-semibold tracking-[0.5em]`}
                    autoFocus={i === 0}
                  />
                </div>
              ))}
            </div>

            <button type="button" onClick={confirmOtp} disabled={isLoading} className={`${authButtonClass} mt-6`}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? "Creating your account..." : "Verify & create account"}
            </button>

            <button
              type="button"
              onClick={() => setOtpOpen(false)}
              disabled={isLoading}
              className="mt-3 w-full text-center text-sm font-medium text-gray-500 hover:text-gray-700"
            >
              Change email or number
            </button>
          </div>
        </div>
      )}
    </AuthShell>
  );
};

export default Signup;
