import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  User,
  Shield,
  Bell,
  CreditCard,
  Globe,
  Lock,
  Mail,
  Building,
  Phone,
  MapPin,
  FileText,
  LogOut,
  Trash2,
  Users,
  Download,
  Pencil,
  Monitor,
  ShoppingCart,
  Smartphone,
  Store,
  MoreHorizontal,
  Check,
} from "lucide-react";
import ThemeToggle from "../components/atoms/ThemeToggle";
import AdminLayout from "../Layout/AdminLayout";
import BillingLayout from "../Layout/BillingLayout/AdminLayout";
import Swal from "sweetalert2";

const BUSINESS_TYPES = [
  {
    id: "grocery",
    label: "Grocery",
    description: "Supermarket, kirana & daily essentials",
    icon: ShoppingCart,
    color: "emerald",
    gradient: "from-emerald-500 to-green-600",
    bg: "bg-emerald-50",
    border: "border-emerald-500",
    text: "text-emerald-700",
    ring: "ring-emerald-500/20",
  },
  {
    id: "mobile_shop",
    label: "Mobile Shop",
    description: "Phones, accessories & repairs",
    icon: Smartphone,
    color: "blue",
    gradient: "from-blue-500 to-indigo-600",
    bg: "bg-blue-50",
    border: "border-blue-500",
    text: "text-blue-700",
    ring: "ring-blue-500/20",
  },
  {
    id: "retail_shop",
    label: "Retail Shop",
    description: "General merchandise & retail",
    icon: Store,
    color: "violet",
    gradient: "from-violet-500 to-purple-600",
    bg: "bg-violet-50",
    border: "border-violet-500",
    text: "text-violet-700",
    ring: "ring-violet-500/20",
  },
  {
    id: "other",
    label: "Other",
    description: "Custom business category",
    icon: MoreHorizontal,
    color: "amber",
    gradient: "from-amber-500 to-orange-600",
    bg: "bg-amber-50",
    border: "border-amber-500",
    text: "text-amber-700",
    ring: "ring-amber-500/20",
  },
];

function Settings() {
  const {
    currentUser,
    logout,
    deleteAccount,
    createSubUser,
    updateSubUser,
    deleteSubUser,
    updateProfile,
  } = useAuth();
  const userData = currentUser;
  const navigate = useNavigate();

  const [teamMembers, setTeamMembers] = useState([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [billingHistory, setBillingHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Business Type
  const [businessType, setBusinessType] = useState("");
  const [businessTypeSaving, setBusinessTypeSaving] = useState(false);

  // Edit States
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [infoForm, setInfoForm] = useState({});

  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [addressForm, setAddressForm] = useState({});

  // Invoice Settings
  const [isEditingInvoice, setIsEditingInvoice] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({
    prefix: "INV",
    sequence: 1,
  });

  // Loyalty Settings
  const [isEditingLoyalty, setIsEditingLoyalty] = useState(false);
  const [loyaltyForm, setLoyaltyForm] = useState({
    enabled: false,
    spendPerPoint: 100,
    redemptionThreshold: 100,
    redemptionAmount: 10,
  });

  useEffect(() => {
    if (userData) {
      setBusinessType(userData.businessType || "");
      setInfoForm({
        businessName: userData.businessName || "",
        phone: userData.phone || "",
        pan: userData.pan || "",
      });
      setAddressForm({
        street: userData.address?.street || "",
        city: userData.address?.city || "",
        state: userData.address?.state || "",
        country: userData.address?.country || "",
        pincode: userData.address?.pincode || "",
        gstin: userData.gstin || "",
      });
      setLoyaltyForm({
        enabled: userData.loyaltySettings?.enabled || false,
        spendPerPoint: userData.loyaltySettings?.spendPerPoint || 100,
        redemptionThreshold:
          userData.loyaltySettings?.redemptionThreshold || 100,
        redemptionAmount: userData.loyaltySettings?.redemptionAmount || 10,
      });
      setInvoiceForm({
        prefix:
          userData.invoiceSettings?.prefix ||
          (userData.businessName
            ? userData.businessName.substring(0, 3).toUpperCase()
            : "INV"),
        sequence: userData.invoiceSettings?.sequence || 1,
      });
    }
  }, [userData]);

  const handleBusinessTypeSelect = async (typeId) => {
    setBusinessType(typeId);
    setBusinessTypeSaving(true);
    try {
      await updateProfile({ businessType: typeId });
      Swal.fire({
        icon: "success",
        title: "Updated!",
        text: "Business type has been saved.",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Failed to update business type.", "error");
    } finally {
      setBusinessTypeSaving(false);
    }
  };

  const handleInfoSave = async () => {
    try {
      await updateProfile({
        businessName: infoForm.businessName,
        phone: infoForm.phone,
        pan: infoForm.pan,
      });
      setIsEditingInfo(false);
      Swal.fire("Success", "Account information updated!", "success");
    } catch (err) {
      Swal.fire("Error", "Failed to update information.", "error");
    }
  };

  const handleAddressSave = async () => {
    try {
      await updateProfile({
        address: {
          street: addressForm.street,
          city: addressForm.city,
          state: addressForm.state,
          country: addressForm.country,
          pincode: addressForm.pincode,
        },
        gstin: addressForm.gstin,
      });
      setIsEditingAddress(false);
      Swal.fire("Success", "Address updated!", "success");
    } catch (err) {
      Swal.fire("Error", "Failed to update address.", "error");
    }
  };

  const handleLoyaltySave = async () => {
    try {
      await updateProfile({
        loyaltySettings: {
          enabled: loyaltyForm.enabled,
          spendPerPoint: Number(loyaltyForm.spendPerPoint),
          redemptionThreshold: Number(loyaltyForm.redemptionThreshold),
          redemptionAmount: Number(loyaltyForm.redemptionAmount),
        },
      });
      setIsEditingLoyalty(false);
      Swal.fire("Success", "Loyalty settings updated!", "success");
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Failed to update loyalty settings.", "error");
    }
  };

  const handleInvoiceSave = async () => {
    try {
      await updateProfile({
        invoiceSettings: {
          prefix: invoiceForm.prefix,
          sequence: Number(invoiceForm.sequence),
        },
      });
      setIsEditingInvoice(false);
      Swal.fire("Success", "Invoice settings updated!", "success");
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Failed to update invoice settings.", "error");
    }
  };

  // Api instance
  const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "/api",
  });
  api.interceptors.request.use((config) => {
    const token = sessionStorage.getItem("token");
    if (token) config.headers["x-auth-token"] = token;
    return config;
  });

  const handleDownloadInvoice = async (invoiceId, invoiceNumber) => {
    try {
      const res = await api.get(`/billing/invoice/${invoiceId}/download`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Invoice-${invoiceNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      console.error("Download failed", err);
      alert("Failed to download invoice.");
    }
  };

  useEffect(() => {
    const fetchTeam = async () => {
      setTeamLoading(true);
      try {
        const res = await api.get("/users");
        const filteredMembers = res.data.filter(
          (member) => member.id !== userData.id
        );
        setTeamMembers(filteredMembers);
      } catch (err) {
        console.error("Failed to fetch team", err);
      } finally {
        setTeamLoading(false);
      }
    };

    const fetchHistory = async () => {
      setHistoryLoading(true);
      try {
        const res = await api.get("/billing/history");
        setBillingHistory(res.data);
      } catch (err) {
        console.error("Failed to fetch history", err);
      } finally {
        setHistoryLoading(false);
      }
    };

    if (userData) {
      fetchTeam();
      fetchHistory();
    }
  }, [userData]);

  const handleDeleteAccount = async () => {
    const result = await Swal.fire({
      title: "Delete Account?",
      html: `
        <p>Do you want to delete your entire account data?</p>
        <ul style="text-align:left">
          <li><strong>Business Name:</strong> ${userData.businessName}</li>
          <li><strong>Email:</strong> ${userData.email}</li>
          <li><strong>Phone:</strong> ${userData.phone || "Not set"}</li>
          <li><strong>GSTIN:</strong> ${userData.gstin || "Not set"}</li>
          <li><strong>Address:</strong> ${userData.address?.street || ""}, ${userData.address?.city || ""}, ${userData.address?.state || ""}, ${userData.address?.country || ""} - ${userData.address?.pincode || ""}</li>
          <li><strong>Subscriptions:</strong> ${userData.subscriptions?.join(", ") || "None"}</li>
          <li><strong>Inventory Items:</strong> ${userData.inventory?.length || 0}</li>
        </ul>
        <p>This action cannot be undone!</p>
      `,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "OK",
      cancelButtonText: "Cancel",
    });

    if (result.isConfirmed) {
      try {
        await deleteAccount();
        Swal.fire(
          "Deleted!",
          "Your account has been deleted successfully.",
          "success"
        );
        navigate("/login");
      } catch (err) {
        Swal.fire(
          "Error",
          err.msg || "Unable to delete account. Please try again later.",
          "error"
        );
      }
    }
  };

  const handleAddUser = async () => {
    const { value: formValues } = await Swal.fire({
      title:
        '<h2 class="text-xl font-bold text-slate-800">Add New Team Member</h2>',
      html: `
        <div class="flex flex-col gap-4 text-left">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
            <input id="swal-name" class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none" placeholder="e.g. John Doe">
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Employee ID</label>
              <input id="swal-empid" class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none" placeholder="e.g. EMP-001">
            </div>
             <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Location</label>
              <input id="swal-location" class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none" placeholder="e.g. New York">
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
            <input id="swal-email" class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none" placeholder="john@company.com">
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <div class="relative">
              <input id="swal-password" type="text" class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none font-mono" placeholder="Set a strong password">
              <p class="text-xs text-slate-500 mt-1">Password is visible for you to copy/share.</p>
            </div>
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Create User",
      confirmButtonColor: "#0d9488",
      cancelButtonColor: "#64748b",
      customClass: {
        popup: "rounded-xl",
        title: "text-left",
      },
      preConfirm: () => {
        const name = document.getElementById("swal-name").value;
        const email = document.getElementById("swal-email").value;
        const password = document.getElementById("swal-password").value;
        const location = document.getElementById("swal-location").value;
        const employee_id = document.getElementById("swal-empid").value;

        if (!name || !email || !password) {
          Swal.showValidationMessage(
            "Name, Email, and Password are required"
          );
          return false;
        }

        const strongPasswordRegex =
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!strongPasswordRegex.test(password)) {
          Swal.showValidationMessage(
            "Password too weak! Needs 8+ chars, uppercase, lowercase, number, special char."
          );
          return false;
        }

        return [name, email, password, location, employee_id];
      },
    });

    if (formValues) {
      const [name, email, password, location, employee_id] = formValues;
      if (!name || !email || !password) {
        Swal.fire({
          icon: "error",
          title: "Missing Details",
          text: "Name, Email, and Password are required.",
          confirmButtonColor: "#0d9488",
        });
        return;
      }
      try {
        await createSubUser({ name, email, password, location, employee_id });
        Swal.fire({
          icon: "success",
          title: "User Created!",
          text: `${name} has been added to the team.`,
          confirmButtonColor: "#0d9488",
        });
        const res = await api.get("/users");
        setTeamMembers(res.data);
      } catch (err) {
        Swal.fire({
          icon: "error",
          title: "Creation Failed",
          text: err.msg || "Failed to create user",
          confirmButtonColor: "#EF4444",
        });
      }
    }
  };

  const handleEditUser = async (member) => {
    const { value: formValues } = await Swal.fire({
      title:
        '<h2 class="text-xl font-bold text-slate-800">Edit Team Member</h2>',
      html: `
        <div class="flex flex-col gap-4 text-left">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
            <input id="swal-edit-name" class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none" value="${member.name}" placeholder="e.g. John Doe">
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Employee ID</label>
              <input id="swal-edit-empid" class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none" value="${member.employee_id || ""}" placeholder="e.g. EMP-001">
            </div>
             <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Location</label>
              <input id="swal-edit-location" class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none" value="${member.location || ""}" placeholder="e.g. New York">
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
            <input id="swal-edit-email" class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none" value="${member.email}" placeholder="john@company.com">
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">New Password (Optional)</label>
            <div class="relative">
              <input id="swal-edit-password" type="text" class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none font-mono" placeholder="Leave blank to keep current">
            </div>
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Update User",
      confirmButtonColor: "#0d9488",
      cancelButtonColor: "#64748b",
      customClass: {
        popup: "rounded-xl",
        title: "text-left",
      },
      preConfirm: () => {
        const name = document.getElementById("swal-edit-name").value;
        const email = document.getElementById("swal-edit-email").value;
        const password = document.getElementById("swal-edit-password").value;
        const location = document.getElementById("swal-edit-location").value;
        const employee_id =
          document.getElementById("swal-edit-empid").value;

        if (!name || !email) {
          Swal.showValidationMessage("Name and Email are required");
          return false;
        }

        if (password) {
          const strongPasswordRegex =
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
          if (!strongPasswordRegex.test(password)) {
            Swal.showValidationMessage(
              "Password too weak! Needs 8+ chars, uppercase, lowercase, number, special char."
            );
            return false;
          }
        }

        return { name, email, password, location, employee_id };
      },
    });

    if (formValues) {
      try {
        await updateSubUser(member.id, formValues);
        Swal.fire({
          icon: "success",
          title: "User Updated!",
          text: `Details for ${formValues.name} have been updated.`,
          confirmButtonColor: "#0d9488",
        });
        const res = await api.get("/users");
        setTeamMembers(res.data);
      } catch (err) {
        Swal.fire({
          icon: "error",
          title: "Update Failed",
          text: err.msg || "Failed to update user",
          confirmButtonColor: "#EF4444",
        });
      }
    }
  };

  const handleDeleteUser = async (member) => {
    const result = await Swal.fire({
      title: "Delete Team Member?",
      text: `Are you sure you want to remove ${member.name}? This cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, Delete",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#EF4444",
      cancelButtonColor: "#64748b",
    });

    if (result.isConfirmed) {
      try {
        await deleteSubUser(member.id);
        Swal.fire("Deleted!", `${member.name} has been removed.`, "success");
        const res = await api.get("/users");
        setTeamMembers(res.data);
      } catch (err) {
        Swal.fire({
          icon: "error",
          title: "Delete Failed",
          text: err.msg || "Failed to delete user",
          confirmButtonColor: "#EF4444",
        });
      }
    }
  };

  if (!userData) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center animate-pulse">
            <Building className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-sm font-medium text-slate-500">
            Loading settings...
          </p>
        </div>
      </div>
    );
  }

  const selectedType = BUSINESS_TYPES.find((t) => t.id === businessType);

  return (
    <BillingLayout>
      <div className="min-h-screen bg-gray-50/60 -m-4 p-4 md:p-6 lg:p-8">
        {/* ── HEADER ── */}
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center shadow-md shadow-emerald-200/60">
              <Building className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                Settings
              </h1>
              <p className="text-sm text-gray-400">
                Manage your business preferences
              </p>
            </div>
          </div>
        </header>

        {/* ── BUSINESS TYPE SELECTOR ── */}
        <section className="bg-white rounded-xl border border-gray-100 p-5 md:p-6 mb-6 hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                <Store className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900">
                  Business Type
                </h2>
                <p className="text-[11px] text-gray-400">
                  Select the category that best describes your business
                </p>
              </div>
            </div>
            {selectedType && (
              <span
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg ${selectedType.bg} ${selectedType.text}`}
              >
                {selectedType.label}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {BUSINESS_TYPES.map((type) => {
              const isSelected = businessType === type.id;
              const IconComponent = type.icon;

              return (
                <button
                  key={type.id}
                  onClick={() => handleBusinessTypeSelect(type.id)}
                  disabled={businessTypeSaving}
                  className={`
                    relative text-left p-4 rounded-xl border-2 transition-all duration-200
                    ${isSelected
                      ? `${type.border} ${type.bg} ring-4 ${type.ring}`
                      : "border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50/50"
                    }
                    ${businessTypeSaving ? "opacity-60 cursor-wait" : "cursor-pointer active:scale-[0.98]"}
                    group
                  `}
                >
                  {/* Selected checkmark */}
                  {isSelected && (
                    <div
                      className={`absolute top-3 right-3 w-5 h-5 rounded-full bg-gradient-to-br ${type.gradient} flex items-center justify-center shadow-sm`}
                    >
                      <Check className="w-3 h-3 text-white" strokeWidth={3} />
                    </div>
                  )}

                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-all
                    ${isSelected
                        ? `bg-gradient-to-br ${type.gradient} shadow-sm`
                        : `${type.bg} group-hover:scale-105`
                      }
                  `}
                  >
                    <IconComponent
                      className={`w-5 h-5 ${isSelected ? "text-white" : type.text
                        }`}
                    />
                  </div>

                  <h3
                    className={`text-sm font-bold mb-0.5 ${isSelected ? type.text : "text-gray-800"
                      }`}
                  >
                    {type.label}
                  </h3>
                  <p
                    className={`text-[11px] leading-relaxed ${isSelected ? type.text + " opacity-70" : "text-gray-400"
                      }`}
                  >
                    {type.description}
                  </p>
                </button>
              );
            })}
          </div>

          {businessType === "other" && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Specify your business type
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Electronics, Bakery, Pharmacy..."
                  defaultValue={userData.customBusinessType || ""}
                  id="custom-business-type"
                  className="flex-1 h-9 px-3 text-sm bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 focus:outline-none transition-all"
                />
                <button
                  onClick={async () => {
                    const val = document.getElementById(
                      "custom-business-type"
                    ).value;
                    if (!val.trim()) return;
                    try {
                      await updateProfile({ customBusinessType: val.trim() });
                      Swal.fire({
                        icon: "success",
                        title: "Saved!",
                        text: "Custom business type updated.",
                        timer: 1500,
                        showConfirmButton: false,
                      });
                    } catch {
                      Swal.fire("Error", "Failed to save.", "error");
                    }
                  }}
                  className="h-9 px-4 text-xs font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-colors active:scale-95"
                >
                  Save
                </button>
              </div>
            </div>
          )}
        </section>

        {/* ── MAIN GRID ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left Column */}
          <div className="space-y-5 lg:col-span-2">
            {/* App Preferences */}
            <div className="bg-white rounded-xl border border-gray-100 p-5 md:p-6 hover:shadow-sm transition-shadow">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                  <Monitor className="w-4 h-4 text-gray-600" />
                </div>
                <h2 className="text-sm font-bold text-gray-900">
                  App Preferences
                </h2>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50/80 border border-gray-100">
                <div>
                  <h3 className="text-sm font-semibold text-gray-800">
                    Dark Mode
                  </h3>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Switch between light and dark themes
                  </p>
                </div>
                <ThemeToggle />
              </div>
            </div>

            {/* Account Information */}
            <div className="bg-white rounded-xl border border-gray-100 p-5 md:p-6 hover:shadow-sm transition-shadow">
              <div className="flex justify-between items-center mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                    <User className="w-4 h-4 text-emerald-600" />
                  </div>
                  <h2 className="text-sm font-bold text-gray-900">
                    Account Information
                  </h2>
                </div>
                {!isEditingInfo ? (
                  <button
                    onClick={() => setIsEditingInfo(true)}
                    className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 px-3 py-1.5 rounded-lg hover:bg-emerald-50 transition-colors"
                  >
                    Edit
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsEditingInfo(false)}
                      className="text-xs font-medium text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleInfoSave}
                      className="text-xs font-semibold text-white bg-emerald-600 px-4 py-1.5 rounded-lg hover:bg-emerald-700 transition-colors"
                    >
                      Save
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {
                    label: "Business Name",
                    key: "businessName",
                    editable: true,
                  },
                  {
                    label: "Email",
                    value: userData.email,
                    editable: false,
                    note: "Cannot change",
                  },
                  { label: "Phone", key: "phone", editable: true },
                  {
                    label: "PAN Number",
                    key: "pan",
                    editable: true,
                    uppercase: true,
                    placeholder: "ABCDE1234F",
                  },
                ].map((field, i) => (
                  <div key={i}>
                    <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                      {field.label}
                    </label>
                    {isEditingInfo && field.editable ? (
                      <input
                        className={`w-full h-10 px-3 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all ${field.uppercase ? "uppercase" : ""
                          }`}
                        value={infoForm[field.key] || ""}
                        placeholder={field.placeholder || ""}
                        onChange={(e) =>
                          setInfoForm({
                            ...infoForm,
                            [field.key]: e.target.value,
                          })
                        }
                      />
                    ) : (
                      <div
                        className={`h-10 flex items-center px-3 text-sm rounded-lg bg-gray-50 border border-gray-100 ${field.uppercase ? "uppercase" : ""
                          } ${!field.editable ? "opacity-60" : ""}`}
                      >
                        <span className="text-gray-800 font-medium">
                          {field.value ||
                            infoForm[field.key] ||
                            userData[field.key] ||
                            "Not set"}
                        </span>
                        {field.note && (
                          <span className="text-[10px] text-gray-400 ml-auto">
                            {field.note}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Business Address */}
            <div className="bg-white rounded-xl border border-gray-100 p-5 md:p-6 hover:shadow-sm transition-shadow">
              <div className="flex justify-between items-center mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-blue-600" />
                  </div>
                  <h2 className="text-sm font-bold text-gray-900">
                    Business Address
                  </h2>
                </div>
                {!isEditingAddress ? (
                  <button
                    onClick={() => setIsEditingAddress(true)}
                    className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 px-3 py-1.5 rounded-lg hover:bg-emerald-50 transition-colors"
                  >
                    Edit
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsEditingAddress(false)}
                      className="text-xs font-medium text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddressSave}
                      className="text-xs font-semibold text-white bg-emerald-600 px-4 py-1.5 rounded-lg hover:bg-emerald-700 transition-colors"
                    >
                      Save
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {
                    label: "Street",
                    key: "street",
                    span: 2,
                    dataPath: "address.street",
                  },
                  { label: "City", key: "city", dataPath: "address.city" },
                  { label: "State", key: "state", dataPath: "address.state" },
                  {
                    label: "Country",
                    key: "country",
                    dataPath: "address.country",
                  },
                  {
                    label: "Pincode",
                    key: "pincode",
                    dataPath: "address.pincode",
                  },
                  {
                    label: "GSTIN / Tax ID",
                    key: "gstin",
                    uppercase: true,
                    placeholder: "22AAAAA0000A1Z5",
                  },
                ].map((field, i) => (
                  <div
                    key={i}
                    className={field.span === 2 ? "md:col-span-2" : ""}
                  >
                    <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                      {field.label}
                    </label>
                    {isEditingAddress ? (
                      <input
                        className={`w-full h-10 px-3 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all ${field.uppercase ? "uppercase" : ""
                          }`}
                        value={addressForm[field.key] || ""}
                        placeholder={field.placeholder || ""}
                        onChange={(e) =>
                          setAddressForm({
                            ...addressForm,
                            [field.key]: e.target.value,
                          })
                        }
                      />
                    ) : (
                      <div
                        className={`h-10 flex items-center px-3 text-sm rounded-lg bg-gray-50 border border-gray-100 ${field.uppercase ? "uppercase" : ""
                          }`}
                      >
                        <span className="text-gray-800 font-medium">
                          {addressForm[field.key] || "Not set"}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Security */}
            <div className="bg-white rounded-xl border border-gray-100 p-5 md:p-6 hover:shadow-sm transition-shadow">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-red-500" />
                </div>
                <h2 className="text-sm font-bold text-gray-900">Security</h2>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-gray-50/80 border border-gray-100">
                <div>
                  <h3 className="text-sm font-semibold text-gray-800">
                    Password
                  </h3>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Last changed:{" "}
                    {userData.lastPasswordChange || "Never"}
                  </p>
                </div>
                <button
                  onClick={() => navigate("/change")}
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 px-3 py-1.5 rounded-lg hover:bg-emerald-50 transition-colors"
                >
                  Change
                </button>
              </div>
            </div>

            {/* Loyalty Program */}
            <div className="bg-white rounded-xl border border-gray-100 p-5 md:p-6 hover:shadow-sm transition-shadow">
              <div className="flex justify-between items-center mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
                    <CreditCard className="w-4 h-4 text-violet-600" />
                  </div>
                  <h2 className="text-sm font-bold text-gray-900">
                    Loyalty Program
                  </h2>
                </div>
                {!isEditingLoyalty ? (
                  <button
                    onClick={() => setIsEditingLoyalty(true)}
                    className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 px-3 py-1.5 rounded-lg hover:bg-emerald-50 transition-colors"
                  >
                    Edit
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsEditingLoyalty(false)}
                      className="text-xs font-medium text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleLoyaltySave}
                      className="text-xs font-semibold text-white bg-emerald-600 px-4 py-1.5 rounded-lg hover:bg-emerald-700 transition-colors"
                    >
                      Save
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50/80 border border-gray-100">
                  <input
                    type="checkbox"
                    disabled={!isEditingLoyalty}
                    checked={loyaltyForm.enabled}
                    onChange={(e) =>
                      setLoyaltyForm({
                        ...loyaltyForm,
                        enabled: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 cursor-pointer"
                  />
                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      Enable Loyalty Program
                    </p>
                    <p className="text-[11px] text-gray-400">
                      Reward returning customers with points
                    </p>
                  </div>
                </div>

                {loyaltyForm.enabled && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {[
                        {
                          label: "Spend for 1 Point (₹)",
                          key: "spendPerPoint",
                          prefix: "₹",
                        },
                        {
                          label: "Points to Redeem",
                          key: "redemptionThreshold",
                          suffix: "Pts",
                        },
                        {
                          label: "Redemption Amount (₹)",
                          key: "redemptionAmount",
                          prefix: "₹",
                        },
                      ].map((field, i) => (
                        <div key={i}>
                          <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                            {field.label}
                          </label>
                          {isEditingLoyalty ? (
                            <input
                              type="number"
                              className="w-full h-10 px-3 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all"
                              value={loyaltyForm[field.key]}
                              onChange={(e) =>
                                setLoyaltyForm({
                                  ...loyaltyForm,
                                  [field.key]: e.target.value,
                                })
                              }
                            />
                          ) : (
                            <div className="h-10 flex items-center px-3 text-sm rounded-lg bg-gray-50 border border-gray-100">
                              <span className="text-gray-800 font-medium">
                                {field.prefix || ""}
                                {loyaltyForm[field.key]}
                                {field.suffix ? ` ${field.suffix}` : ""}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="p-3 rounded-lg bg-violet-50/60 border border-violet-100">
                      <p className="text-[11px] text-violet-600 font-medium">
                        💡 Example: Customer spends ₹
                        {loyaltyForm.spendPerPoint} → earns 1 point. At{" "}
                        {loyaltyForm.redemptionThreshold} points → gets ₹
                        {loyaltyForm.redemptionAmount} discount.
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Invoice Settings */}
            <div className="bg-white rounded-xl border border-gray-100 p-5 md:p-6 hover:shadow-sm transition-shadow">
              <div className="flex justify-between items-center mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-cyan-50 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-cyan-600" />
                  </div>
                  <h2 className="text-sm font-bold text-gray-900">
                    Invoice Settings
                  </h2>
                </div>
                {!isEditingInvoice ? (
                  <button
                    onClick={() => setIsEditingInvoice(true)}
                    className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 px-3 py-1.5 rounded-lg hover:bg-emerald-50 transition-colors"
                  >
                    Edit
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsEditingInvoice(false)}
                      className="text-xs font-medium text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleInvoiceSave}
                      className="text-xs font-semibold text-white bg-emerald-600 px-4 py-1.5 rounded-lg hover:bg-emerald-700 transition-colors"
                    >
                      Save
                    </button>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                    Invoice Prefix
                  </label>
                  {isEditingInvoice ? (
                    <input
                      className="w-full h-10 px-3 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all uppercase"
                      value={invoiceForm.prefix}
                      placeholder="INV"
                      onChange={(e) =>
                        setInvoiceForm({
                          ...invoiceForm,
                          prefix: e.target.value,
                        })
                      }
                    />
                  ) : (
                    <div className="h-10 flex items-center px-3 text-sm rounded-lg bg-gray-50 border border-gray-100 uppercase">
                      <span className="text-gray-800 font-medium">
                        {invoiceForm.prefix || "INV"}
                      </span>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                    Next Invoice Number
                  </label>
                  {isEditingInvoice ? (
                    <input
                      type="number"
                      className="w-full h-10 px-3 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all"
                      value={invoiceForm.sequence}
                      onChange={(e) =>
                        setInvoiceForm({
                          ...invoiceForm,
                          sequence: e.target.value,
                        })
                      }
                    />
                  ) : (
                    <div className="h-10 flex items-center px-3 text-sm rounded-lg bg-gray-50 border border-gray-100">
                      <span className="text-gray-800 font-medium">
                        {invoiceForm.sequence}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-5">
            {/* Account Status */}
            <div className="bg-white rounded-xl border border-gray-100 p-5 md:p-6 hover:shadow-sm transition-shadow">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-emerald-600" />
                </div>
                <h2 className="text-sm font-bold text-gray-900">
                  Account Status
                </h2>
              </div>
              <div className="space-y-3">
                {[
                  {
                    label: "Verification",
                    value:
                      userData.gstin && userData.pan
                        ? "Verified"
                        : "Pending",
                    color:
                      userData.gstin && userData.pan
                        ? "text-emerald-600"
                        : "text-amber-600",
                    bg:
                      userData.gstin && userData.pan
                        ? "bg-emerald-50"
                        : "bg-amber-50",
                  },
                  {
                    label: "Created",
                    value: new Date(
                      userData.createdAt
                    ).toLocaleDateString(),
                    color: "text-gray-700",
                  },
                  {
                    label: "Last Login",
                    value: new Date(
                      userData.lastLogin
                    ).toLocaleString(),
                    color: "text-gray-700",
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0"
                  >
                    <span className="text-xs font-medium text-gray-500">
                      {item.label}
                    </span>
                    <span
                      className={`text-xs font-semibold ${item.color} ${item.bg
                        ? `${item.bg} px-2 py-0.5 rounded-md`
                        : ""
                        }`}
                    >
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Team Management */}
            {userData.role === "TenantAdmin" && (
              <div className="bg-white rounded-xl border border-gray-100 p-5 md:p-6 hover:shadow-sm transition-shadow">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Users className="w-4 h-4 text-blue-600" />
                  </div>
                  <h2 className="text-sm font-bold text-gray-900">
                    Team Management
                  </h2>
                </div>
                <p className="text-[11px] text-gray-400 mb-4">
                  Add collaborators to your account
                </p>
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={handleAddUser}
                    className="h-9 px-4 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors active:scale-95"
                  >
                    Add User
                  </button>
                  <button
                    onClick={() => navigate("/session-records")}
                    className="h-9 px-4 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200 active:scale-95"
                  >
                    Activity Logs
                  </button>
                </div>

                <div className="border-t border-gray-100 pt-4">
                  <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">
                    Current Team
                  </h3>
                  {teamLoading ? (
                    <div className="flex items-center gap-2 py-4">
                      <div className="w-4 h-4 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
                      <span className="text-xs text-gray-400">Loading...</span>
                    </div>
                  ) : teamMembers.length === 0 ? (
                    <div className="text-center py-6">
                      <Users className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                      <p className="text-xs text-gray-400">
                        No team members yet
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {teamMembers.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-gray-50/80 border border-gray-100 hover:bg-gray-50 transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-gray-800 truncate">
                              {member.name}
                            </p>
                            <p className="text-[10px] text-gray-400 truncate">
                              {member.employee_id || "—"} · {member.email}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 ml-2 shrink-0">
                            <button
                              onClick={() => handleEditUser(member)}
                              className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-white hover:shadow-sm text-gray-400 hover:text-emerald-600 transition-all"
                              title="Edit"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(member)}
                              className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-red-50 text-gray-400 hover:text-red-600 transition-all"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}


            {/* Support */}
            <div className="bg-white rounded-xl border border-gray-100 p-5 md:p-6 hover:shadow-sm transition-shadow">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                  <Mail className="w-4 h-4 text-green-600" />
                </div>
                <h2 className="text-sm font-bold text-gray-900">Support</h2>
              </div>
              <p className="text-[11px] text-gray-400 mb-3">
                Need help? Reach out to our team.
              </p>
              <a href="tel:+919486106953">
                <button className="h-9 px-4 text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors border border-emerald-200">
                  Contact Support
                </button>
              </a>
            </div>

            {/* Subscription */}
            <div className="bg-white rounded-xl border border-gray-100 p-5 md:p-6 hover:shadow-sm transition-shadow">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                </div>
                <h2 className="text-sm font-bold text-gray-900">
                  Subscription
                </h2>
              </div>
              <div className="mb-4">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                  Current Plan
                </p>
                <div className="flex items-center gap-2">
                  <p className="text-lg font-extrabold text-gray-900 capitalize">
                    {userData.Tenant?.subscription_plan || "Free"}
                  </p>
                  {userData.Tenant?.subscription_status === "Trial" && (
                    <span className="text-[10px] font-semibold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md">
                      Trial
                    </span>
                  )}
                </div>
                {userData.Tenant?.subscription_expiry && (
                  <p className="text-[11px] text-gray-400 mt-1">
                    Expires:{" "}
                    {new Date(
                      userData.Tenant.subscription_expiry
                    ).toLocaleDateString()}
                  </p>
                )}
              </div>
              <button
                onClick={() => navigate("/pricing")}
                className="h-9 px-4 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors active:scale-95"
              >
                Upgrade Plan
              </button>
            </div>

            {/* Billing History */}
            <div className="bg-white rounded-xl border border-gray-100 p-5 md:p-6 hover:shadow-sm transition-shadow">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-gray-600" />
                </div>
                <h2 className="text-sm font-bold text-gray-900">
                  Billing History
                </h2>
              </div>
              {historyLoading ? (
                <div className="flex items-center gap-2 py-4">
                  <div className="w-4 h-4 border-2 border-gray-200 border-t-gray-600 rounded-full animate-spin" />
                  <span className="text-xs text-gray-400">Loading...</span>
                </div>
              ) : billingHistory.length === 0 ? (
                <div className="text-center py-6">
                  <FileText className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-xs text-gray-400">No invoices yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {billingHistory.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-gray-50/80 border border-gray-100"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-semibold text-gray-800">
                            {item.invoice_number}
                          </p>
                          <span className="text-[10px] font-medium bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded">
                            {item.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {new Date(
                            item.invoice_date
                          ).toLocaleDateString()}{" "}
                          · ₹{item.amount}
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          handleDownloadInvoice(
                            item.id,
                            item.invoice_number
                          )
                        }
                        className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-all shrink-0 ml-2"
                        title="Download PDF"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Delete Account */}
            {userData.role === "TenantAdmin" && (
              <div className="bg-white rounded-xl border border-red-100 p-5 md:p-6 hover:shadow-sm transition-shadow">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </div>
                  <h2 className="text-sm font-bold text-gray-900">
                    Danger Zone
                  </h2>
                </div>
                <p className="text-[11px] text-gray-400 mb-4 leading-relaxed">
                  Permanently delete your account and all associated data.
                  This action cannot be undone.
                </p>
                <button
                  onClick={handleDeleteAccount}
                  className="h-9 px-4 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors active:scale-95"
                >
                  Delete Account
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="h-6" />
      </div>
    </BillingLayout>
  );
}

export default Settings;