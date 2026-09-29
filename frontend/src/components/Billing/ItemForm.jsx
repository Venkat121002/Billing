import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../contexts/AuthContext";
import {
  ArrowLeft,
  ArrowRight,
  ScanBarcode,
  Package,
  ShoppingCart,
  DollarSign,
  Tag,
  Box,
  FileText,
  Calendar,
  Layers,
  AlertTriangle,
  User,
  Hash,
  Building2,
  Clock,
  Save,
  X,
} from "lucide-react";
import BillingLayout from "../../Layout/BillingLayout/AdminLayout";
import toast from "react-hot-toast";
import API_URL from "../../config/api";
import { resolveIndustryProfile } from "../../config/industryProfiles";
import { CLOTHING_SIZE_OPTIONS } from "../../config/itemCategories";
import useItemCategories from "../../hooks/useItemCategories";

// Per-industry visual theme for this screen. Every value is a complete
// literal Tailwind class string (see IndustryGstBill.jsx for why). Only
// green/pink are exercised today — grocery/pharmacy/petshop share green,
// clothing is pink; any other theme value falls back to green.
const THEMES = {
  green: {
    labelText: "text-green-800",
    labelIcon: "text-green-500",
    inputBorder: "border-green-200 focus:ring-green-300 focus:border-green-400 hover:border-green-300",
    pageBg: "bg-gradient-to-br from-green-50 via-white to-green-50",
    headerBg: "bg-gradient-to-r from-green-500 to-green-600",
    backBtn: "text-green-700",
    formCard: "border-green-100",
    calloutBox: "bg-gradient-to-r from-green-50 to-emerald-50 border-green-200",
    calloutLabel: "text-green-700",
    calloutIcon: "text-green-500",
    barcodeInput: "border-green-300 focus:ring-green-300 focus:border-green-400 hover:border-green-400",
    tabsWrap: "bg-green-50",
    tabActive: "bg-green-600 text-white shadow-md",
    tabInactive: "text-green-700 hover:bg-green-100",
    sectionHeading: "text-green-700 border-green-100",
    sectionIcon: "text-green-500",
    calcGstAmt: "text-green-600",
    calcGrandTotal: "text-green-700",
    divider: "border-green-100",
    submitBtn: "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700",
  },
  pink: {
    labelText: "text-[#f74faf]",
    labelIcon: "text-[#f74faf]",
    inputBorder: "border-[#f74faf]/20 focus:ring-[#f74faf]/40 focus:border-[#f74faf] hover:border-[#f74faf]/40",
    pageBg: "bg-gradient-to-br from-[#f74faf]/10 via-white to-[#f74faf]/5",
    headerBg: "bg-[#f74faf]",
    backBtn: "text-[#f74faf]",
    formCard: "border-[#f74faf]/10",
    calloutBox: "bg-gradient-to-r from-[#f74faf]/10 to-[#f74faf]/5 border-[#f74faf]/20",
    calloutLabel: "text-[#f74faf]",
    calloutIcon: "text-[#f74faf]",
    barcodeInput: "border-[#f74faf]/20 focus:ring-[#f74faf]/10 focus:border-[#f74faf] hover:border-[#f74faf]/40",
    tabsWrap: "bg-[#f74faf]/5",
    tabActive: "bg-[#f74faf] text-white shadow-md",
    tabInactive: "text-[#f74faf] hover:bg-[#f74faf]/10",
    sectionHeading: "text-[#f74faf] border-[#f74faf]/10",
    sectionIcon: "text-[#f74faf]",
    calcGstAmt: "text-[#f74faf]",
    calcGrandTotal: "text-[#f74faf]",
    divider: "border-[#f74faf]/10",
    submitBtn: "bg-[#f74faf] hover:opacity-90",
  },
};

// Moved outside the component so it doesn't re-create on every render.
// `theme` is threaded through as a prop since this lives at module scope.
const InputField = ({
  label,
  icon: Icon,
  value,
  onChange,
  type = "text",
  placeholder,
  required = false,
  className = "",
  autoFocus = false,
  readOnly = false,
  list,
  theme,
}) => (
  <div className="flex flex-col gap-1.5">
    <label className={`flex items-center gap-2 text-sm font-semibold ${theme.labelText}`}>
      {Icon && <Icon size={15} className={theme.labelIcon} />}
      {label}
      {required && <span className="text-red-400 text-xs">*</span>}
    </label>
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder || label}
      required={required}
      autoFocus={autoFocus}
      readOnly={readOnly}
      list={list}
      className={`px-4 py-3 rounded-xl border ${theme.inputBorder} bg-white text-gray-700 placeholder-gray-400
        focus:outline-none focus:ring-2
        transition-all duration-200 ${className}`}
    />
  </div>
);

const ADD_NEW = "__add_new__";

// Dropdown fed from the store's Category → Product list (Settings →
// Categories & Products). When `onAdd` is given, a "+ Add new" option swaps
// the select for a text box that saves the new name to that list.
const SelectField = ({ label, icon: Icon, value, options, onChange, onAdd, disabled, placeholder, theme }) => {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  // Keep a value that's no longer in the list (e.g. an older product) selectable.
  const allOptions = value && !options.includes(value) ? [value, ...options] : options;
  const inputClass = `px-4 py-3 rounded-xl border ${theme.inputBorder} bg-white text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 transition-all duration-200`;

  const submit = async () => {
    const name = draft.trim();
    if (!name) return;
    setSaving(true);
    try {
      await onAdd(name);
      setAdding(false);
      setDraft("");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label className={`flex items-center gap-2 text-sm font-semibold ${theme.labelText}`}>
        {Icon && <Icon size={15} className={theme.labelIcon} />}
        {label}
      </label>
      {adding ? (
        <div className="flex gap-2">
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); submit(); }
              if (e.key === "Escape") setAdding(false);
            }}
            placeholder={`New ${label.toLowerCase()} name`}
            maxLength={100}
            className={`flex-1 min-w-0 ${inputClass}`}
          />
          <button
            type="button"
            onClick={submit}
            disabled={saving || !draft.trim()}
            className={`px-4 rounded-xl text-white font-medium disabled:opacity-50 ${theme.submitBtn}`}
          >
            {saving ? "..." : "Add"}
          </button>
          <button
            type="button"
            onClick={() => { setAdding(false); setDraft(""); }}
            className="px-3 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200"
            aria-label="Cancel"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <select
          value={value}
          disabled={disabled}
          onChange={(e) => (e.target.value === ADD_NEW ? setAdding(true) : onChange(e.target.value))}
          className={`${inputClass} ${value ? "" : "text-gray-400"} disabled:bg-gray-50 disabled:cursor-not-allowed`}
        >
          <option value="">{placeholder || `Select ${label.toLowerCase()}`}</option>
          {allOptions.map((opt) => (
            <option key={opt} value={opt} className="text-gray-700">{opt}</option>
          ))}
          {onAdd && <option value={ADD_NEW} className="text-gray-700">+ Add new {label.toLowerCase()}…</option>}
        </select>
      )}
    </div>
  );
};

// Field configs — outside the component, they never change.
const buyFieldConfig = {
  category: { label: "Category", icon: Tag, type: "text" },
  productType: { label: "Product", icon: Box, type: "text" },
  name: { label: "Brand Name", icon: Package, type: "text" },
  sku: { label: "SKU", icon: Hash, type: "text" },
  barcode: { label: "Barcode", icon: ScanBarcode, type: "text" },
  supplier: { label: "Supplier", icon: User, type: "text" },
  purchasePrice: { label: "Purchase Price (₹)", icon: DollarSign, type: "number" },
  purchaseGst: { label: "Purchase GST (%)", icon: FileText, type: "number" },
  quantity: { label: "Quantity", icon: Box, type: "number" },
  purchaseDate: { label: "Purchase Date", icon: Calendar, type: "date" },
  description: { label: "Description", icon: FileText, type: "text" },
  unit: { label: "Unit", icon: Layers, type: "text" },
  reorderLevel: { label: "Reorder Level", icon: AlertTriangle, type: "number" },
};

// Batch/Expiry field group — shown for industries whose profile sets
// itemFieldGroups.batchExpiry (pharmacy, petshop). See UNIFICATION_PLAN.md §2.
const batchExpiryFieldConfig = {
  pharmaCompany: { label: "Manufacturer / Brand", icon: Building2, type: "text" },
  drugLicenseNumber: { label: "Supplier License / Reg. No.", icon: FileText, type: "text" },
  hsnSac: { label: "HSN Code", icon: FileText, type: "text" },
  batchNumber: { label: "Batch Number", icon: Hash, type: "text" },
  mfgDate: { label: "Manufacturing Date", icon: Calendar, type: "date" },
  expiryDate: { label: "Expiry Date", icon: Calendar, type: "date" },
};

const saleFieldConfig = {
  salesPrice: { label: "Sales Price (₹)", icon: DollarSign, type: "number" },
  salesGst: { label: "Sales GST (%)", icon: FileText, type: "number" },
  salesDate: { label: "Sales Date", icon: Calendar, type: "date" },
};

const ItemForm = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const profile = resolveIndustryProfile(currentUser);
  const theme = THEMES[profile.theme] || THEMES.green;
  const groups = profile.itemFieldGroups || {};
  const { categories: categoryData, save: saveCategories } = useItemCategories(currentUser);
  const canEditCategories = currentUser?.role === "owner" || currentUser?.role === "TenantAdmin";
  const itemLabel = profile.roleLabels?.item || "Product";
  // The "variants" group repurposes the Description field as a Size picker
  // (clothing) instead of adding a whole new field — see UNIFICATION_PLAN.md §2.
  const descriptionField = groups.variants
    ? { label: "Size", icon: FileText, type: "text" }
    : buyFieldConfig.description;

  const editingProduct = location.state?.product;
  const editingProductId = location.state?.productId;

  const [activeTab, setActiveTab] = useState("buy");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [suppliers, setSuppliers] = useState([]);

  useEffect(() => {
    const fetchSuppliers = async () => {
      if (!currentUser) return;
      const token = sessionStorage.getItem("token");
      if (!token) return;

      try {
        const res = await axios.get(`${API_URL}/suppliers`, {
          headers: { "x-auth-token": token },
        });
        const userId = currentUser?.uid || currentUser?.userId;
        const role = currentUser?.role;
        const filtered = res.data.filter((item) => {
          if (role === "owner" || role === "TenantAdmin") {
            return item.source === "Owner" || item.createdBy === userId;
          }
          return item.createdBy === userId;
        });
        setSuppliers(filtered);
      } catch (err) {
        console.error("Error fetching suppliers:", err);
      }
    };
    fetchSuppliers();
  }, [currentUser]);

  const [buyData, setBuyData] = useState({
    category: "",
    productType: "",
    name: "",
    sku: "",
    barcode: "",
    supplier: "",
    purchasePrice: "",
    purchaseGst: "",
    quantity: "",
    purchaseDate: "",
    description: "",
    unit: "",
    reorderLevel: "",
    purchaseGstAmount: "0.00",
    purchaseTotalAmount: "0.00",
    // Batch/Expiry group fields — present for every industry (schema is
    // shared) but only rendered/populated when groups.batchExpiry is on.
    pharmaCompany: "",
    drugLicenseNumber: "",
    hsnSac: "",
    batchNumber: "",
    mfgDate: "",
    expiryDate: "",
  });

  const [saleData, setSaleData] = useState({
    salesPrice: "",
    salesGst: "",
    salesDate: "",
    salesGstAmount: "0.00",
    salesTotalAmount: "0.00",
  });

  const defaultsApplied = useRef(false);

  // Fetch settings for GST
  useEffect(() => {
    if (!defaultsApplied.current && !editingProduct && currentUser?.Tenant) {
      const pGst = currentUser.Tenant.purchase_gst || 0;
      const sGst = currentUser.Tenant.sales_gst || 0;
      setBuyData(prev => ({ ...prev, purchaseGst: pGst ? pGst.toString() : "" }));
      setSaleData(prev => ({ ...prev, salesGst: sGst ? sGst.toString() : "" }));
      defaultsApplied.current = true;
    }
  }, [currentUser, editingProduct]);

  // Auto-generate barcode for new products
  useEffect(() => {
    if (!editingProductId) {
      const newBarcode = `BAR-${Date.now().toString().slice(-8)}`;
      setBuyData((prev) => ({ ...prev, barcode: newBarcode }));
    }
  }, [editingProductId]);

  // Auto-calculate reorder level based on total items for new products
  // (or when it hasn't been set yet on an existing one).
  useEffect(() => {
    const totalItems = (parseFloat(buyData.quantity) || 0) * (parseFloat(buyData.unit) || 0);
    if (totalItems > 0 && (!editingProductId || !buyData.reorderLevel || buyData.reorderLevel === "0")) {
      const newReorderLevel = Math.ceil(totalItems * 0.1); // 10% rule
      setBuyData(prev => ({ ...prev, reorderLevel: newReorderLevel.toString() }));
    }
  }, [buyData.quantity, buyData.unit, editingProductId]);

  // Handle auto-calculations for Buy Data
  useEffect(() => {
    const tenant = currentUser?.Tenant;
    const pPrice = parseFloat(buyData.purchasePrice) || 0;
    const pGstLimit = parseFloat(buyData.purchaseGst) || 0;

    const isPInclusive = tenant?.purchase_tax_type === "inclusive";

    let pGstAmt = 0;
    let pTotal = 0;
    if (isPInclusive) {
      pGstAmt = pPrice - (pPrice / (1 + pGstLimit / 100));
      pTotal = pPrice; // Inclusive means base + GST = purchase price
    } else {
      pGstAmt = (pPrice * pGstLimit) / 100;
      pTotal = pPrice + pGstAmt; // Exclusive means base + GST = grand total
    }

    setBuyData(prev => {
      const newGstAmt = pGstAmt.toFixed(2);
      const newTotal = pTotal.toFixed(2);
      if (prev.purchaseGstAmount === newGstAmt && prev.purchaseTotalAmount === newTotal) {
        return prev;
      }
      return {
        ...prev,
        purchaseGstAmount: newGstAmt,
        purchaseTotalAmount: newTotal,
      };
    });
  }, [buyData.purchasePrice, buyData.purchaseGst, currentUser]);

  // Handle auto-calculations for Sale Data
  useEffect(() => {
    const tenant = currentUser?.Tenant;
    const sPrice = parseFloat(saleData.salesPrice) || 0;
    const sGstLimit = parseFloat(saleData.salesGst) || 0;
    const isSInclusive = tenant?.sales_tax_type === "inclusive";

    let sGstAmt = 0;
    let sTotal = 0;
    if (isSInclusive) {
      sTotal = sPrice;
      sGstAmt = sTotal - (sTotal / (1 + sGstLimit / 100));
    } else {
      sGstAmt = (sPrice * sGstLimit) / 100;
      sTotal = sPrice + sGstAmt;
    }

    setSaleData(prev => {
      const newGstAmt = sGstAmt.toFixed(2);
      const newTotal = sTotal.toFixed(2);
      if (prev.salesGstAmount === newGstAmt && prev.salesTotalAmount === newTotal) {
        return prev;
      }
      return {
        ...prev,
        salesGstAmount: newGstAmt,
        salesTotalAmount: newTotal,
      };
    });
  }, [saleData.salesPrice, saleData.salesGst, currentUser]);

  useEffect(() => {
    if (editingProduct && editingProductId) {
      setBuyData({
        category: editingProduct.category || "",
        productType: editingProduct.productType || "",
        name: editingProduct.name ? editingProduct.name.charAt(0).toUpperCase() + editingProduct.name.slice(1) : "",
        sku: editingProduct.sku || "",
        barcode: editingProduct.barcode || "",
        supplier: editingProduct.supplier || "",
        purchasePrice: editingProduct.purchasePrice?.toString() || "",
        purchaseGst: editingProduct.purchaseGst?.toString() || "",
        quantity: editingProduct.quantity?.toString() || "",
        purchaseDate: editingProduct.purchaseDate || "",
        description: editingProduct.description || "",
        unit: editingProduct.unit || "",
        reorderLevel: editingProduct.reorderLevel?.toString() || "",
        pharmaCompany: editingProduct.pharmaCompany || "",
        drugLicenseNumber: editingProduct.drugLicenseNumber || "",
        hsnSac: editingProduct.hsnSac || "",
        batchNumber: editingProduct.batchNumber || "",
        mfgDate: editingProduct.mfgDate || "",
        expiryDate: editingProduct.expiryDate || "",
      });

      setSaleData({
        salesPrice: editingProduct.salePrice?.toString() || "",
        salesGst: editingProduct.salesGst?.toString() || "",
        salesDate: editingProduct.salesDate || "",
      });
    }
  }, [editingProduct, editingProductId]);

  const handleBuyChange = (field) => (e) => {
    const val = e.target.value;
    setBuyData((prev) => ({ ...prev, [field]: val }));
  };

  const setCategory = (category) =>
    setBuyData((prev) => ({
      ...prev,
      category,
      // Clear a product that doesn't belong to the newly picked category.
      productType: (categoryData[category] || []).includes(prev.productType) ? prev.productType : "",
    }));

  const addCategory = async (name) => {
    const existing = Object.keys(categoryData).find((c) => c.toLowerCase() === name.toLowerCase());
    try {
      if (!existing) await saveCategories({ ...categoryData, [name]: [] });
      setCategory(existing || name);
      if (!existing) toast.success(`Category "${name}" added`);
    } catch (err) {
      toast.error(err.response?.data?.msg || "Failed to add category");
      throw err;
    }
  };

  const addProductType = async (name) => {
    const list = categoryData[buyData.category] || [];
    const existing = list.find((p) => p.toLowerCase() === name.toLowerCase());
    try {
      if (!existing) await saveCategories({ ...categoryData, [buyData.category]: [...list, name] });
      setBuyData((prev) => ({ ...prev, productType: existing || name }));
      if (!existing) toast.success(`Product "${name}" added to ${buyData.category}`);
    } catch (err) {
      toast.error(err.response?.data?.msg || "Failed to add product");
      throw err;
    }
  };

  const handleSaleChange = (field) => (e) => {
    const val = e.target.value;
    setSaleData((prev) => ({ ...prev, [field]: val }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) {
      toast.error("Authentication error");
      return;
    }

    const token = sessionStorage.getItem("token");
    if (!token) {
      toast.error("No auth token found. Please login again.");
      return;
    }

    if (activeTab === "buy") {
      setActiveTab("sale");
      window.scrollTo(0, 0);
      return;
    }

    setIsSubmitting(true);

    try {
      const productData = {
        ...buyData,
        ...saleData,
        purchasePrice: Number(buyData.purchasePrice),
        salePrice: Number(saleData.salesPrice),
        purchaseGst: Number(buyData.purchaseGst),
        salesGst: Number(saleData.salesGst),
        quantity: Number(buyData.quantity),
        reorderLevel: Number(buyData.reorderLevel),
        updatedAt: new Date().toISOString(),
      };

      const config = {
        headers: {
          "Content-Type": "application/json",
          "x-auth-token": token,
        },
      };

      if (editingProductId) {
        await axios.put(
          `${API_URL}/products/${editingProductId}`,
          productData,
          config
        );
        toast.success(`${itemLabel} updated!`);
      } else {
        productData.createdAt = new Date().toISOString();
        await axios.post(`${API_URL}/products`, productData, config);
        toast.success(`${itemLabel} added!`);
      }

      navigate("/inventory");
    } catch (err) {
      console.error("Product Save Error:", err);
      const msg = err.response?.data?.msg || `Failed to save ${itemLabel.toLowerCase()}`;
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BillingLayout>
      <div className={`min-h-screen ${theme.pageBg}`}>
        {/* HEADER */}
        <div className={`${theme.headerBg} px-8 py-6 shadow-lg`}>
          <div className="flex items-center justify-between max-w-5xl mx-auto">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <Package size={26} className="text-white/80" />
                {editingProductId ? `Edit ${itemLabel}` : `Add New ${itemLabel}`}
              </h1>
              <p className="text-white/80 text-sm mt-1 ml-10">
                Manage {itemLabel.toLowerCase()} inventory & pricing
              </p>
            </div>

            <button
              onClick={() => navigate("/inventory")}
              className={`flex items-center gap-2 bg-white/90 backdrop-blur px-5 py-2.5 rounded-xl ${theme.backBtn} font-medium hover:bg-white hover:shadow-md transition-all duration-200`}
            >
              <ArrowLeft size={16} />
              Back
            </button>
          </div>
        </div>

        {/* FORM */}
        <div className="px-8 py-10 max-w-5xl mx-auto">
          <form
            onSubmit={handleSubmit}
            className={`bg-white p-10 rounded-3xl shadow-xl border ${theme.formCard} space-y-8`}
          >
            {/* Barcode Section */}
            <div className={`${theme.calloutBox} border rounded-2xl p-6`}>
              <label className={`flex items-center gap-2 ${theme.calloutLabel} font-bold text-lg mb-4`}>
                <ScanBarcode size={22} className={theme.calloutIcon} />
                Barcode
              </label>

              <div className="flex gap-3">
                <div className="flex-1">
                  <input
                    type="text"
                    value={buyData.barcode}
                    onChange={handleBuyChange("barcode")}
                    placeholder="Scan or enter barcode"
                    className={`w-full px-4 py-3 rounded-xl border ${theme.barcodeInput} outline-none text-lg tracking-widest bg-white transition-all duration-200`}
                    autoFocus
                  />
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className={`flex gap-3 ${theme.tabsWrap} p-1.5 rounded-xl w-fit`}>
              <button
                type="button"
                onClick={() => setActiveTab("buy")}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all duration-200 ${activeTab === "buy" ? theme.tabActive : `bg-transparent ${theme.tabInactive}`
                  }`}
              >
                <ShoppingCart size={16} />
                Purchase Details
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("sale")}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all duration-200 ${activeTab === "sale" ? theme.tabActive : `bg-transparent ${theme.tabInactive}`
                  }`}
              >
                <DollarSign size={16} />
                Sales Details
              </button>
            </div>

            {/* Purchase Fields */}
            {activeTab === "buy" && (
              <div>
                <h3 className={`flex items-center gap-2 ${theme.sectionHeading} font-bold text-lg mb-5 pb-2 border-b`}>
                  <ShoppingCart size={20} className={theme.sectionIcon} />
                  Purchase Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {Object.keys(buyData).map((field) => {
                    if (field === "barcode") return null;
                    if (field === "category") {
                      return (
                        <SelectField
                          key={field}
                          label="Category"
                          icon={Tag}
                          value={buyData.category}
                          options={Object.keys(categoryData).sort()}
                          onChange={setCategory}
                          onAdd={canEditCategories ? addCategory : undefined}
                          theme={theme}
                        />
                      );
                    }
                    if (field === "productType") {
                      return (
                        <SelectField
                          key={field}
                          label="Product"
                          icon={Box}
                          value={buyData.productType}
                          options={(categoryData[buyData.category] || []).slice().sort()}
                          onChange={(val) => setBuyData((prev) => ({ ...prev, productType: val }))}
                          onAdd={canEditCategories && buyData.category ? addProductType : undefined}
                          disabled={!buyData.category}
                          placeholder={buyData.category ? "Select product" : "Select a category first"}
                          theme={theme}
                        />
                      );
                    }
                    if (field === "description") {
                      return (
                        <InputField
                          key={field}
                          label={descriptionField.label}
                          icon={descriptionField.icon}
                          type={descriptionField.type}
                          value={buyData.description}
                          onChange={handleBuyChange("description")}
                          placeholder={descriptionField.label}
                          list={groups.variants ? "size-list" : undefined}
                          theme={theme}
                        />
                      );
                    }
                    const batchField = batchExpiryFieldConfig[field];
                    if (batchField) {
                      if (!groups.batchExpiry) return null;
                      return (
                        <InputField
                          key={field}
                          label={batchField.label}
                          icon={batchField.icon}
                          type={batchField.type}
                          value={buyData[field]}
                          onChange={handleBuyChange(field)}
                          placeholder={batchField.label}
                          theme={theme}
                        />
                      );
                    }
                    const config = buyFieldConfig[field];
                    if (!config) return null; // Skip calculated fields not in config

                    const listId = field === "supplier" ? "supplier-list" : undefined;

                    return (
                      <InputField
                        key={field}
                        label={config.label}
                        icon={config.icon}
                        type={config.type}
                        value={buyData[field]}
                        onChange={handleBuyChange(field)}
                        placeholder={config.label}
                        readOnly={config.readOnly}
                        list={listId}
                        theme={theme}
                      />
                    );
                  })}
                  {/* Additional calculated fields for clarity */}
                  <InputField
                    label="GST Amount (₹)"
                    icon={DollarSign}
                    value={buyData.purchaseGstAmount}
                    readOnly
                    className={`font-bold ${theme.calcGstAmt}`}
                    theme={theme}
                  />
                  <InputField
                    label="Grand Total (₹)"
                    icon={DollarSign}
                    value={buyData.purchaseTotalAmount}
                    readOnly
                    className={`font-bold ${theme.calcGrandTotal}`}
                    theme={theme}
                  />
                  <InputField
                    label="Total Items"
                    icon={Layers}
                    value={((parseFloat(buyData.quantity) || 0) * (parseFloat(buyData.unit) || 0)) || 0}
                    readOnly
                    className="font-bold text-blue-600"
                    theme={theme}
                  />
                </div>

                {groups.variants && (
                  <datalist id="size-list">
                    {CLOTHING_SIZE_OPTIONS.map(size => (
                      <option key={size} value={size} />
                    ))}
                  </datalist>
                )}
              </div>
            )}

            {/* Sales Fields */}
            {activeTab === "sale" && (
              <div>
                <h3 className={`flex items-center gap-2 ${theme.sectionHeading} font-bold text-lg mb-5 pb-2 border-b`}>
                  <DollarSign size={20} className={theme.sectionIcon} />
                  Sales Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {Object.keys(saleData).map((field) => {
                    const config = saleFieldConfig[field];
                    if (!config) return null; // Skip calculated fields not in config
                    return (
                      <InputField
                        key={field}
                        label={config.label}
                        icon={config.icon}
                        type={config.type}
                        value={saleData[field]}
                        onChange={handleSaleChange(field)}
                        placeholder={config.label}
                        readOnly={config.readOnly}
                        theme={theme}
                      />
                    );
                  })}
                  <InputField
                    label="GST Amount (₹)"
                    icon={DollarSign}
                    value={saleData.salesGstAmount}
                    readOnly
                    className={`font-bold ${theme.calcGstAmt}`}
                    theme={theme}
                  />
                  <InputField
                    label="Grand Total (₹)"
                    icon={DollarSign}
                    value={saleData.salesTotalAmount}
                    readOnly
                    className={`font-bold ${theme.calcGrandTotal}`}
                    theme={theme}
                  />
                </div>
              </div>
            )}

            <datalist id="supplier-list">
              {suppliers.map((s) => (
                <option key={s.id} value={s.name} />
              ))}
            </datalist>

            {/* Divider */}
            <div className={`border-t ${theme.divider}`}></div>

            {/* Buttons */}
            <div className="flex justify-end gap-4 pt-2">
              <button
                type="button"
                onClick={() => navigate("/inventory")}
                className="flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-all duration-200 font-medium"
              >
                <X size={16} />
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className={`flex items-center gap-2 px-8 py-3 text-white rounded-xl ${theme.submitBtn} transition-all duration-200 font-medium shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed`}
              >
                {activeTab === "buy" ? (
                  <ArrowRight size={16} />
                ) : (
                  <Save size={16} />
                )}
                {isSubmitting
                  ? "Saving..."
                  : activeTab === "buy"
                    ? "Next: Sales Details"
                    : editingProductId
                      ? `Update ${itemLabel}`
                      : `Save ${itemLabel}`}
              </button>
            </div>
          </form>
        </div>
      </div>
    </BillingLayout>
  );
};

export default ItemForm;
