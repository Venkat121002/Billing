import React, { useState, useMemo, useEffect } from "react";
import axios from "axios";
import API_URL from "../../config/api";
import { useAuth } from "../../contexts/AuthContext";
import {
  PlusCircle,
  Edit3,
  Trash2,
  Search,
  Package,
  AlertCircle,
  PackagePlus,
  UserPlus,
  PackageCheck,
  Building2,
  Hash,
  FileText,
  Phone,
  Mail,
  CreditCard,
  MapPin,
  PackageX,
  ListFilter,
  SortAsc,
  SortDesc,
  Eye,
  Archive,
  CircleX,
  Briefcase,
  RefreshCcw,
  Loader2,
  TrendingUp,
  Box,
  ChevronDown,
  X,
  Check,
  Camera,
} from "lucide-react";
import BillingLayout from "../../Layout/BillingLayout/AdminLayout";
import { useNavigate } from "react-router-dom";
import { resolveIndustryProfile } from "../../config/industryProfiles";
import DemandForecastModal from "../AI/DemandForecastModal";
import ReceiptScannerModal from "../AI/ReceiptScannerModal";


// Per-industry visual theme. Every value is a complete literal Tailwind
// class string — see IndustryGstBill.jsx for why. Only green/pink are
// exercised today (grocery/pharmacy/petshop share green, clothing is pink);
// any other theme value falls back to green.
const THEMES = {
  green: {
    pageBg: "bg-gradient-to-br from-green-50/80 via-white to-emerald-50/60",
    loadingBg: "bg-gradient-to-br from-green-50 to-emerald-50",
    loadingIconBg: "bg-emerald-100",
    loadingIcon: "text-emerald-600",
    retryBtn: "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200",
    headerBorder: "border-emerald-100",
    headerIconBg: "bg-gradient-to-br from-emerald-500 to-green-600 shadow-emerald-200",
    addSupplierBtn: "text-emerald-600 border-emerald-200 hover:bg-emerald-50",
    addItemBtn: "bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 shadow-emerald-200 hover:shadow-emerald-300",
    statBg1: "from-emerald-500 to-green-500",
    statBg2: "from-teal-500 to-cyan-500",
    statBg3: "from-green-500 to-emerald-500",
    cardHoverShadow: "hover:shadow-emerald-50",
    modalIconBg: "bg-emerald-100 text-emerald-600",
    fieldLabel: "text-emerald-800",
    fieldIcon: "text-emerald-500",
    fieldInput: "border-emerald-100 focus:ring-emerald-500/20 focus:border-emerald-500",
    submitBtn: "bg-emerald-600 hover:bg-emerald-700",
    searchFocus: "focus:ring-emerald-500 focus:border-emerald-500",
    filterChip: "bg-emerald-50 text-emerald-700",
    rowHover: "hover:bg-green-50/50",
    inStockBadge: "bg-emerald-50 text-emerald-700",
    inStockDot: "bg-emerald-500",
    subtotalText: "text-green-700",
    viewBtnHover: "hover:text-emerald-600 hover:bg-emerald-50",
    addQtyBtnHover: "hover:text-green-600 hover:bg-green-50",
    modalHeaderBg: "bg-gradient-to-r from-emerald-600 to-green-600",
    detailSkuText: "text-emerald-200",
    detailInStockText: "text-emerald-600",
    detailInStockBadge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    detailEditBtn: "text-emerald-700 bg-emerald-50 hover:bg-emerald-100",
    qtyAvatarWrap: "bg-emerald-50",
    qtyAvatarBg: "bg-emerald-100 text-emerald-700",
    qtyNewTotal: "text-emerald-600",
    qtySubmitBtn: "bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 shadow-emerald-200",
  },
  pink: {
    pageBg: "bg-gradient-to-br from-[#f74faf]/10 via-white to-[#f74faf]/5",
    loadingBg: "bg-gradient-to-br from-[#f74faf]/10 to-[#f74faf]/5",
    loadingIconBg: "bg-[#f74faf]/10",
    loadingIcon: "text-[#f74faf]",
    retryBtn: "bg-[#f74faf] hover:opacity-90 shadow-[#f74faf]/20",
    headerBorder: "border-[#f74faf]/20",
    headerIconBg: "bg-[#f74faf] shadow-[#f74faf]/20",
    addSupplierBtn: "text-[#f74faf] border-[#f74faf]/20 hover:bg-[#f74faf]/5",
    addItemBtn: "bg-[#f74faf] hover:opacity-90 shadow-[#f74faf]/20",
    statBg1: "bg-[#f74faf]",
    statBg2: "bg-[#f74faf]",
    statBg3: "bg-[#f74faf]",
    cardHoverShadow: "hover:shadow-[#f74faf]/10",
    modalIconBg: "bg-[#f74faf]/10 text-[#f74faf]",
    fieldLabel: "text-[#f74faf]",
    fieldIcon: "text-[#f74faf]",
    fieldInput: "border-[#f74faf]/20 focus:ring-[#f74faf]/20 focus:border-[#f74faf]",
    submitBtn: "bg-[#f74faf] hover:opacity-90",
    searchFocus: "focus:ring-[#f74faf] focus:border-[#f74faf]",
    filterChip: "bg-[#f74faf]/10 text-[#f74faf]",
    rowHover: "hover:bg-[#f74faf]/5",
    inStockBadge: "bg-[#f74faf]/10 text-[#f74faf]",
    inStockDot: "bg-[#f74faf]",
    subtotalText: "text-[#f74faf]",
    viewBtnHover: "hover:text-[#f74faf] hover:bg-[#f74faf]/5",
    addQtyBtnHover: "hover:text-[#f74faf] hover:bg-[#f74faf]/5",
    modalHeaderBg: "bg-[#f74faf]",
    detailSkuText: "text-white/80",
    detailInStockText: "text-[#f74faf]",
    detailInStockBadge: "bg-[#f74faf]/10 text-[#f74faf] border-[#f74faf]/20",
    detailEditBtn: "text-[#f74faf] bg-[#f74faf]/10 hover:bg-[#f74faf]/20",
    qtyAvatarWrap: "bg-[#f74faf]/10",
    qtyAvatarBg: "bg-[#f74faf]/20 text-[#f74faf]",
    qtyNewTotal: "text-[#f74faf]",
    qtySubmitBtn: "bg-[#f74faf] hover:opacity-90 shadow-[#f74faf]/20",
  },
};

// Column groups — see UNIFICATION_PLAN.md §2. Batch/Expiry columns are
// spliced in for industries whose profile turns that field group on.
const BASE_COLUMNS = [
  { key: "name", label: "Product" },
  { key: "sku", label: "SKU" },
  { key: "category", label: "Category" },
];
const BATCH_EXPIRY_COLUMNS = [
  { key: "brandName", label: "Brand / Mfr." },
  { key: "batchNumber", label: "Batch No." },
  { key: "expiryDate", label: "Expiry" },
];
const TRAILING_COLUMNS = [
  { key: "subtotal", label: "Subtotal" },
  { key: "gstAmount", label: "GST" },
  { key: "total", label: "Total" },
  { key: "quantity", label: "Total Items" },
];

const IndustryInventory = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const profile = resolveIndustryProfile(currentUser);
  const theme = THEMES[profile.theme] || THEMES.green;
  const groups = profile.itemFieldGroups || {};

  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [showDemandModal, setShowDemandModal] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);

  const [supplierFormData, setSupplierFormData] = useState({
    name: "",
    company: "",
    code: "",
    gst: "",
    pan: "",
    mobile: "",
    email: "",
    address: "",
    paymentMode: "Cash",
  });

  const columns = useMemo(() => [
    ...BASE_COLUMNS,
    ...(groups.batchExpiry ? BATCH_EXPIRY_COLUMNS : []),
    ...TRAILING_COLUMNS,
  ], [groups.batchExpiry]);

  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [quantityModalOpen, setQuantityModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [addQuantity, setAddQuantity] = useState("");
  const [isUpdatingQuantity, setIsUpdatingQuantity] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStockStatus, setFilterStockStatus] = useState("");
  const [sortConfig, setSortConfig] = useState({
    key: "name",
    direction: "ascending",
  });

  useEffect(() => {
    fetchProducts();
  }, [currentUser]);

  const fetchProducts = async () => {
    if (!currentUser) {
      setIsLoading(false);
      return;
    }

    const token = sessionStorage.getItem("token");
    if (!token) {
      setError("Please log in to view inventory.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const res = await axios.get(`${API_URL}/products`, {
        headers: { "x-auth-token": token },
      });
      setProducts(res.data);
      setError(null);
    } catch (err) {
      console.error("Error fetching products:", err);
      setError("Failed to load products.");
    } finally {
      setIsLoading(false);
    }
  };

  const categories = useMemo(
    () => ["", ...new Set(products.map((p) => p.category).filter(Boolean))],
    [products]
  );

  // Real total on-hand count — quantity × unit (e.g. 5 cartons × 10/carton =
  // 50 items). Used consistently for filters, stats, and status everywhere
  // below (some industry copies of this screen only applied the multiplier
  // in the table cells, not in the low-stock/out-of-stock checks — fixed
  // here, see UNIFICATION_PLAN.md Phase 4).
  const totalItemsOf = (p) => (Number(p?.quantity) || 0) * (Number(p?.unit) || 1);

  const handleOpenQuantityModal = (product) => {
    setSelectedProduct(product);
    setAddQuantity("");
    setQuantityModalOpen(true);
  };

  const handleAddQuantity = async () => {
    if (!currentUser || !selectedProduct || isUpdatingQuantity) return;
    const token = sessionStorage.getItem("token");

    if (!addQuantity || isNaN(addQuantity) || Number(addQuantity) <= 0)
      return alert("Enter a valid number");

    setIsUpdatingQuantity(true);
    try {
      const updatedQuantity =
        (Number(selectedProduct.quantity) || 0) + Number(addQuantity);

      await axios.put(
        `${API_URL}/products/${selectedProduct.id}`,
        { quantity: updatedQuantity },
        { headers: { "x-auth-token": token } }
      );

      fetchProducts();
      setQuantityModalOpen(false);
      setSelectedProduct(null);
      setAddQuantity("");
    } catch (err) {
      console.error(err);
      alert(
        "Failed to update quantity: " +
        (err.response?.data?.msg || err.message)
      );
    } finally {
      setIsUpdatingQuantity(false);
    }
  };

  const openDetailModal = (product) => {
    setCurrentProduct(product);
    setIsDetailModalOpen(true);
  };

  const closeDetailModal = () => {
    setIsDetailModalOpen(false);
    setCurrentProduct(null);
  };

  const handleSaveSupplier = async (e) => {
    e.preventDefault();
    const token = sessionStorage.getItem("token");
    try {
      await axios.post(`${API_URL}/suppliers`, supplierFormData, {
        headers: { "x-auth-token": token },
      });
      alert("Supplier added successfully!");
      setIsSupplierModalOpen(false);
      setSupplierFormData({
        name: "",
        company: "",
        code: "",
        gst: "",
        pan: "",
        mobile: "",
        email: "",
        address: "",
        paymentMode: "Cash",
      });
    } catch (err) {
      console.error("Save supplier error:", err);
      alert("Failed to save supplier");
    }
  };

  const handleDelete = async (productId) => {
    if (!currentUser) {
      alert("Authentication error.");
      return;
    }

    const token = sessionStorage.getItem("token");

    if (
      window.confirm(
        "Are you sure you want to delete this product? This action cannot be undone."
      )
    ) {
      try {
        await axios.delete(`${API_URL}/products/${productId}`, {
          headers: { "x-auth-token": token },
        });
        fetchProducts();
      } catch (err) {
        console.error("Error deleting product:", err);
        alert(
          `Failed to delete product: ${err.response?.data?.msg || err.message
          }`
        );
      }
    }
  };

  const filteredAndSortedProducts = useMemo(() => {
    let P = [...products];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      P = P.filter(
        (p) =>
          p.name?.toLowerCase().includes(term) ||
          p.sku?.toLowerCase().includes(term) ||
          p.category?.toLowerCase().includes(term) ||
          p.brandName?.toLowerCase().includes(term) ||
          p.batchNumber?.toLowerCase().includes(term) ||
          p.hsnSac?.toLowerCase().includes(term) ||
          p.drugLicenseNumber?.toLowerCase().includes(term)
      );
    }
    if (filterCategory) {
      P = P.filter((p) => p.category === filterCategory);
    }
    if (filterStockStatus) {
      if (filterStockStatus === "inStock") {
        P = P.filter((p) => totalItemsOf(p) > (Number(p.reorderLevel) || 0));
      } else if (filterStockStatus === "low") {
        P = P.filter((p) => {
          const t = totalItemsOf(p);
          return t > 0 && t <= (Number(p.reorderLevel) || 0);
        });
      } else if (filterStockStatus === "outOfStock") {
        P = P.filter((p) => totalItemsOf(p) === 0);
      }
    }

    return P.sort((a, b) => {
      const valA = a[sortConfig.key];
      const valB = b[sortConfig.key];

      if (typeof valA === "string" && typeof valB === "string") {
        return sortConfig.direction === "ascending"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }
      if (valA < valB) return sortConfig.direction === "ascending" ? -1 : 1;
      if (valA > valB) return sortConfig.direction === "ascending" ? 1 : -1;
      return 0;
    });
  }, [products, searchTerm, filterCategory, filterStockStatus, sortConfig]);

  const requestSort = (key) => {
    let direction = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  const getSortIndicator = (key) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === "ascending" ? (
        <SortAsc size={14} className="inline ml-1 text-emerald-600" />
      ) : (
        <SortDesc size={14} className="inline ml-1 text-emerald-600" />
      );
    }
    return (
      <ListFilter
        size={14}
        className="inline ml-1 opacity-0 group-hover:opacity-50 transition-opacity"
      />
    );
  };

  const inventorySummary = useMemo(() => {
    const uniqueProducts = Array.from(
      new Map(filteredAndSortedProducts.map((p) => [p.id, p])).values()
    );

    let totalPurchaseValue = 0;
    let totalPurchaseGst = 0;

    uniqueProducts.forEach((p) => {
      const purchasePrice = Number(p.purchasePrice) || 0;
      const quantity = Number(p.quantity) || 0;
      const purchaseGstRate = Number(p.purchaseGst || p.purchaseGST) || 0;

      const itemSubtotal = purchasePrice * quantity;
      const itemGstAmount = (itemSubtotal * purchaseGstRate) / 100;

      totalPurchaseValue += itemSubtotal + itemGstAmount;
      totalPurchaseGst += itemGstAmount;
    });

    const totalQuantity = uniqueProducts.reduce(
      (sum, p) => sum + totalItemsOf(p),
      0
    );

    const lowStockCount = uniqueProducts.filter((p) => {
      const t = totalItemsOf(p);
      return t > 0 && t <= (Number(p.reorderLevel) || 0);
    }).length;

    const outOfStockCount = uniqueProducts.filter(
      (p) => totalItemsOf(p) === 0
    ).length;

    return {
      totalSKUs: uniqueProducts.length,
      totalQuantity,
      totalValue: totalPurchaseValue,
      totalGst: totalPurchaseGst,
      lowStockCount,
      outOfStockCount,
    };
  }, [filteredAndSortedProducts]);

  if (isLoading) {
    return (
      <BillingLayout>
        <div className={`flex flex-col items-center justify-center h-[calc(100vh-200px)] ${theme.loadingBg}`}>
          <div className="relative">
            <div className={`w-20 h-20 rounded-full ${theme.loadingIconBg} flex items-center justify-center mb-6`}>
              <Loader2 className={`w-10 h-10 ${theme.loadingIcon} animate-spin`} />
            </div>
          </div>
          <p className="text-gray-700 text-xl font-semibold">Loading Inventory...</p>
          <p className="text-gray-400 mt-2 text-sm">Fetching your product data</p>
        </div>
      </BillingLayout>
    );
  }

  if (error && !products.length) {
    return (
      <BillingLayout>
        <div className={`flex flex-col items-center justify-center h-[calc(100vh-200px)] p-8 ${theme.loadingBg} text-center`}>
          <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mb-6">
            <CircleX className="w-10 h-10 text-red-500" />
          </div>
          <p className="text-red-600 text-xl font-bold">Error Loading Inventory</p>
          <p className="text-gray-500 mt-2 mb-6 max-w-md">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className={`flex items-center px-8 py-3 text-white rounded-xl transition-all duration-200 font-semibold shadow-lg ${theme.retryBtn}`}
          >
            <RefreshCcw className="w-5 h-5 mr-2" />
            Try Again
          </button>
        </div>
      </BillingLayout>
    );
  }

  return (
    <BillingLayout>
      <div className={`${theme.pageBg} min-h-screen`}>
        {/* Header */}
        <div className={`bg-white/80 backdrop-blur-sm border-b ${theme.headerBorder} sticky top-0 z-10`}>
          <div className="px-6 md:px-8 py-5">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ${theme.headerIconBg}`}>
                  <Archive size={24} className="text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
                  <p className="text-gray-500 text-sm mt-0.5">
                    Manage and track your product stock levels
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowDemandModal(true)}
                  className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl shadow-md transition-all font-semibold"
                >
                  <TrendingUp size={18} />
                  Restock Forecast (AI)
                </button>
                <button
                  type="button"
                  onClick={() => setShowScannerModal(true)}
                  className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl shadow-md transition-all font-semibold"
                >
                  <Camera size={18} />
                  Scan Inward Bill (OCR)
                </button>

                <button
                  onClick={() => setIsSupplierModalOpen(true)}
                  className={`flex items-center gap-2 px-6 py-3 bg-white border rounded-xl shadow-sm transition-all font-medium ${theme.addSupplierBtn}`}
                >
                  <UserPlus size={20} />
                  Add Supplier
                </button>
                <button
                  onClick={() => navigate("/add-product")}
                  className={`flex items-center px-6 py-3 text-white rounded-xl transition-all duration-200 font-semibold shadow-lg active:scale-[0.98] hover:shadow-xl ${theme.addItemBtn}`}
                >
                  <PackagePlus className="w-5 h-5 mr-2" />
                  Add Product
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 md:px-8 py-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 text-red-700 rounded-xl font-medium border border-red-200 flex items-center gap-3">
              <AlertCircle size={20} />
              {error}
            </div>
          )}

          {/* ===== Stats Cards ===== */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              { title: "Total SKUs", value: inventorySummary.totalSKUs, icon: Package, bg: theme.statBg1 },
              { title: "Total Quantity", value: inventorySummary.totalQuantity.toLocaleString(), icon: Box, bg: theme.statBg2 },
              { title: "Inventory Value", value: `₹${inventorySummary.totalValue.toLocaleString()}`, icon: TrendingUp, bg: theme.statBg3 },
              { title: "Low Stock", value: inventorySummary.lowStockCount, icon: AlertCircle, bg: "bg-gradient-to-br from-amber-500 to-orange-500" },
              { title: "Out of Stock", value: inventorySummary.outOfStockCount, icon: PackageX, bg: "bg-gradient-to-br from-red-500 to-rose-500" },
            ].map((stat, idx) => (
              <div
                key={idx}
                className={`bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg ${theme.cardHoverShadow} transition-all duration-300 group`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div
                    className={`w-10 h-10 rounded-xl ${stat.bg.startsWith("bg-") ? stat.bg : `bg-gradient-to-br ${stat.bg}`} flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300`}
                  >
                    <stat.icon size={18} className="text-white" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</p>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{stat.title}</p>
              </div>
            ))}
          </div>

          {isSupplierModalOpen && (
            <div className="fixed inset-0 bg-black/50 flex justify-center items-center p-4 z-50">
              <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[calc(100vh-2rem)] flex flex-col animate-fade-in relative overflow-hidden">
                <div className="flex items-center justify-between gap-3 px-6 pt-6 pb-4 border-b border-gray-100 shrink-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-12 h-12 shrink-0 rounded-xl ${theme.modalIconBg} flex items-center justify-center`}>
                      <UserPlus size={24} />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-xl font-bold text-gray-900">Add New Supplier</h2>
                      <p className="text-gray-500 text-sm">Save supplier details for purchase</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsSupplierModalOpen(false)}
                    className="shrink-0 p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                  >
                    <X size={22} />
                  </button>
                </div>

                <form onSubmit={handleSaveSupplier} className="flex flex-col min-h-0 flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4 px-6 py-5 overflow-y-auto">
                  {[
                    { key: "name", label: "Supplier Name", icon: Briefcase, required: true, placeholder: "Enter supplier name" },
                    { key: "company", label: "Company Name", icon: Building2, placeholder: "Enter company name" },
                    { key: "code", label: "Supplier Code", icon: Hash, placeholder: "e.g. SUP001" },
                    { key: "gst", label: "GST Number", icon: FileText, placeholder: "22AAAAA0000A1Z5", mono: true },
                    {
                      key: "pan",
                      label: groups.batchExpiry ? "Drug License Number" : "PAN Number",
                      icon: FileText,
                      placeholder: groups.batchExpiry ? "TN-DL-45678" : "ABCDE1234F",
                      mono: true,
                    },
                    { key: "mobile", label: "Mobile Number", icon: Phone, placeholder: "10 digit mobile" },
                    { key: "email", label: "Email Address", icon: Mail, placeholder: "supplier@email.com", type: "email" },
                  ].map((f) => (
                    <div key={f.key} className="flex flex-col gap-1.5 font-sans">
                      <label className={`flex items-center gap-2 text-sm font-semibold ${theme.fieldLabel}`}>
                        <f.icon size={15} className={theme.fieldIcon} />
                        {f.label} {f.required && <span className="text-red-400 text-xs">*</span>}
                      </label>
                      <input
                        type={f.type || "text"}
                        required={f.required}
                        value={supplierFormData[f.key]}
                        onChange={(e) => setSupplierFormData({ ...supplierFormData, [f.key]: e.target.value })}
                        className={`w-full h-12 px-4 rounded-xl border ${theme.fieldInput} bg-gray-50/50 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all ${f.mono ? "uppercase tracking-wide placeholder:normal-case" : ""}`}
                        placeholder={f.placeholder}
                      />
                    </div>
                  ))}

                  <div className="flex flex-col gap-1.5 font-sans">
                    <label className={`flex items-center gap-2 text-sm font-semibold ${theme.fieldLabel}`}>
                      <CreditCard size={15} className={theme.fieldIcon} />
                      Payment Mode
                    </label>
                    <select
                      value={supplierFormData.paymentMode}
                      onChange={(e) => setSupplierFormData({ ...supplierFormData, paymentMode: e.target.value })}
                      className={`w-full h-12 px-4 rounded-xl border ${theme.fieldInput} bg-gray-50/50 text-sm text-gray-900 focus:outline-none focus:ring-2 transition-all`}
                    >
                      <option value="Cash">Cash</option>
                      <option value="UPI">UPI</option>
                      <option value="Card">Card</option>
                      <option value="Net Banking">Net Banking</option>
                      <option value="Credit">Credit</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5 font-sans md:col-span-2">
                    <label className={`flex items-center gap-2 text-sm font-semibold ${theme.fieldLabel}`}>
                      <MapPin size={15} className={theme.fieldIcon} />
                      Billing Address
                    </label>
                    <textarea
                      rows="3"
                      value={supplierFormData.address}
                      onChange={(e) => setSupplierFormData({ ...supplierFormData, address: e.target.value })}
                      className={`w-full px-4 py-3 rounded-xl border ${theme.fieldInput} bg-gray-50/50 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all resize-none`}
                      placeholder="Enter full address..."
                    ></textarea>
                  </div>
                </div>

                  <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-white shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsSupplierModalOpen(false)}
                      className="px-6 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className={`px-6 py-2.5 rounded-xl text-white transition-all shadow-md font-medium ${theme.submitBtn}`}
                    >
                      Save Supplier
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ===== Search & Filters ===== */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products by name, SKU, category, batch…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full pl-11 pr-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:ring-2 ${theme.searchFocus} focus:outline-none text-sm font-medium text-gray-900 transition-all duration-200 placeholder:text-gray-400`}
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="relative">
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className={`appearance-none pl-4 pr-10 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:ring-2 ${theme.searchFocus} focus:outline-none text-sm font-medium text-gray-700 cursor-pointer min-w-[160px]`}
                  >
                    <option value="">All Categories</option>
                    {categories.map((cat) => cat && (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
                <div className="relative">
                  <select
                    value={filterStockStatus}
                    onChange={(e) => setFilterStockStatus(e.target.value)}
                    className={`appearance-none pl-4 pr-10 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:ring-2 ${theme.searchFocus} focus:outline-none text-sm font-medium text-gray-700 cursor-pointer min-w-[160px]`}
                  >
                    <option value="">All Status</option>
                    <option value="inStock">In Stock</option>
                    <option value="low">Low Stock</option>
                    <option value="outOfStock">Out of Stock</option>
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>
            {(searchTerm || filterCategory || filterStockStatus) && (
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                <span className="text-xs text-gray-500 font-medium">Active filters:</span>
                {searchTerm && (
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${theme.filterChip}`}>
                    Search: &quot;{searchTerm}&quot;
                    <button onClick={() => setSearchTerm("")}><X size={12} /></button>
                  </span>
                )}
                {filterCategory && (
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${theme.filterChip}`}>
                    {filterCategory}
                    <button onClick={() => setFilterCategory("")}><X size={12} /></button>
                  </span>
                )}
                {filterStockStatus && (
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${theme.filterChip}`}>
                    {filterStockStatus === "inStock" ? "In Stock" : filterStockStatus === "low" ? "Low Stock" : "Out of Stock"}
                    <button onClick={() => setFilterStockStatus("")}><X size={12} /></button>
                  </span>
                )}
                <button
                  onClick={() => { setSearchTerm(""); setFilterCategory(""); setFilterStockStatus(""); }}
                  className="text-xs text-gray-500 hover:text-gray-700 underline ml-2"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>

          {/* ===== Products Table ===== */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b border-gray-100">
                    {columns.map((col) => (
                      <th
                        key={col.key}
                        onClick={() => requestSort(col.key)}
                        className="px-5 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50 group transition-colors select-none"
                      >
                        <span className="flex items-center gap-1">
                          {col.label}
                          {getSortIndicator(col.key)}
                        </span>
                      </th>
                    ))}
                    <th className="px-5 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-5 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredAndSortedProducts.length > 0 ? (
                    filteredAndSortedProducts.map((product) => {
                      const totalItems = totalItemsOf(product);
                      let statusConfig = { class: "bg-gray-100 text-gray-600", text: "N/A", dot: "bg-gray-400" };
                      if (totalItems === 0) {
                        statusConfig = { class: "bg-red-50 text-red-700", text: "Out of Stock", dot: "bg-red-500" };
                      } else if (totalItems <= (Number(product.reorderLevel) || 0)) {
                        statusConfig = { class: "bg-amber-50 text-amber-700", text: "Low Stock", dot: "bg-amber-500" };
                      } else {
                        statusConfig = { class: theme.inStockBadge, text: "In Stock", dot: theme.inStockDot };
                      }

                      return (
                        <tr key={product.id} className={`${theme.rowHover} transition-colors duration-150 group/row`}>
                          {columns.map((col) => {
                            const val = product[col.key];
                            const price = Number(product.salePrice) || 0;
                            const gst = Number(product.gstRate) || Number(product.gst) || Number(product.salesGst) || 0;
                            const subtotal = price * totalItems;
                            const gstAmountVal = (subtotal * gst) / 100;
                            const totalVal = subtotal + gstAmountVal;

                            if (col.key === "subtotal") {
                              return (
                                <td key={col.key} className={`px-5 py-4 whitespace-nowrap text-sm font-medium ${theme.subtotalText}`}>
                                  ₹{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                              );
                            }
                            if (col.key === "gstAmount") {
                              return (
                                <td key={col.key} className="px-5 py-4 whitespace-nowrap text-sm text-orange-600 font-medium">
                                  ₹{gstAmountVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                              );
                            }
                            if (col.key === "total") {
                              return (
                                <td key={col.key} className="px-5 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">
                                  ₹{totalVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                              );
                            }
                            if (col.key === "quantity") {
                              return (
                                <td key={col.key} className="px-5 py-4 whitespace-nowrap">
                                  <span className={`text-sm font-bold ${totalItems === 0 ? "text-red-600" : "text-gray-900"}`}>
                                    {totalItems || 0}
                                  </span>
                                </td>
                              );
                            }
                            if (col.key === "expiryDate") {
                              const isExpired = val && new Date(val) < new Date();
                              return (
                                <td key={col.key} className={`px-5 py-4 whitespace-nowrap text-sm font-medium ${isExpired ? "text-red-600" : "text-gray-700"}`}>
                                  {val || "—"}
                                </td>
                              );
                            }
                            return (
                              <td key={col.key} className="px-5 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">
                                {val || "—"}
                              </td>
                            );
                          })}
                          <td className="px-5 py-4 whitespace-nowrap text-center">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full ${statusConfig.class}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
                              {statusConfig.text}
                            </span>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => openDetailModal(product)}
                                className={`p-2 text-gray-400 rounded-lg transition-all duration-200 ${theme.viewBtnHover}`}
                                title="View Details"
                              >
                                <Eye size={16} />
                              </button>
                              <button
                                onClick={() => navigate("/add-product", { state: { product, productId: product.id } })}
                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                                title="Edit Product"
                              >
                                <Edit3 size={16} />
                              </button>
                              <button
                                onClick={() => handleOpenQuantityModal(product)}
                                className={`p-2 text-gray-400 rounded-lg transition-all duration-200 ${theme.addQtyBtnHover}`}
                                title="Add Quantity"
                              >
                                <PlusCircle size={16} />
                              </button>
                              <button
                                onClick={() => handleDelete(product.id)}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                                title="Delete Product"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={columns.length + 2} className="px-5 py-16 text-center">
                        <div className="flex flex-col items-center">
                          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                            <Package size={28} className="text-gray-400" />
                          </div>
                          <p className="text-gray-900 text-lg font-semibold mb-1">No products found</p>
                          <p className="text-gray-500 text-sm mb-6">
                            {searchTerm || filterCategory || filterStockStatus
                              ? "Try adjusting your search or filters."
                              : "Get started by adding your first product."}
                          </p>
                          {!searchTerm && !filterCategory && !filterStockStatus && (
                            <button
                              onClick={() => navigate("/add-product")}
                              className={`flex items-center px-5 py-2.5 text-white rounded-xl transition-colors text-sm font-semibold ${theme.submitBtn}`}
                            >
                              <PlusCircle size={16} className="mr-2" />
                              Add Product
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {filteredAndSortedProducts.length > 0 && (
              <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50">
                <p className="text-xs text-gray-500 font-medium">
                  Showing {filteredAndSortedProducts.length} of {products.length} products
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ===== Detail Modal ===== */}
        {isDetailModalOpen && currentProduct && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm overflow-y-auto h-full w-full flex items-start justify-center z-50 p-4 pt-[5vh]">
            <div className="relative bg-white rounded-2xl w-full max-w-xl mx-auto shadow-2xl overflow-hidden">
              <div className={`${theme.modalHeaderBg} p-6 text-white`}>
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center text-2xl font-bold">
                      {currentProduct.name?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">{currentProduct.name}</h2>
                      <code className={`${theme.detailSkuText} text-sm`}>
                        {currentProduct.sku || "No ID"}
                      </code>
                    </div>
                  </div>
                  <button onClick={closeDetailModal} className="text-white/70 hover:text-white hover:bg-white/20 rounded-lg p-2 transition-all">
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="p-6 max-h-[60vh] overflow-y-auto">
                {(() => {
                  const t = totalItemsOf(currentProduct);
                  const isOut = t === 0;
                  const isLow = !isOut && t <= (Number(currentProduct.reorderLevel) || 0);
                  return (
                    <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${isOut ? "bg-red-50 text-red-700 border border-red-200"
                        : isLow ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : `${theme.detailInStockBadge} border`
                      }`}>
                      {isOut ? <PackageX size={20} /> : isLow ? <AlertCircle size={20} /> : <PackageCheck size={20} />}
                      <span className="font-semibold text-sm">
                        {isOut ? "This item is out of stock." : isLow ? "Low stock. Consider reordering." : "Sufficient stock available."}
                      </span>
                    </div>
                  );
                })()}

                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: "Category", value: currentProduct.category || "—" },
                    { label: "Supplier", value: currentProduct.supplier || "—" },
                    { label: "Purchase Price", value: `₹${(currentProduct.purchasePrice || 0).toLocaleString()}` },
                    { label: "Sale Price", value: `₹${(currentProduct.salePrice || 0).toLocaleString()}` },
                    { label: "Sales GST", value: `${currentProduct.salesGst || currentProduct.gstRate || currentProduct.gst || 0}%` },
                    { label: "Purchase GST", value: `${currentProduct.purchaseGst || 0}%` },
                    {
                      label: "Current Stock",
                      value: `${totalItemsOf(currentProduct).toLocaleString()} ${currentProduct.unitOfMeasurement || "pcs"}`,
                      highlight: true,
                    },
                    { label: "Reorder Level", value: `${(currentProduct.reorderLevel || 0).toLocaleString()} ${currentProduct.unitOfMeasurement || "pcs"}` },
                    { label: "Unit", value: currentProduct.unitOfMeasurement || "pcs" },
                    ...(groups.batchExpiry ? [
                      { label: "Brand / Manufacturer", value: currentProduct.brandName || currentProduct.pharmaCompany || "—" },
                      { label: "Batch Number", value: currentProduct.batchNumber || "—" },
                      { label: "Manufacturing Date", value: currentProduct.mfgDate || "—" },
                      { label: "Expiry Date", value: currentProduct.expiryDate || "—" },
                      { label: "HSN/SAC", value: currentProduct.hsnSac || "—" },
                      { label: "License / Reg. No.", value: currentProduct.drugLicenseNumber || "—" },
                    ] : []),
                  ].map((item, idx) => {
                    const t = totalItemsOf(currentProduct);
                    const isOut = t === 0;
                    const isLow = !isOut && t <= (Number(currentProduct.reorderLevel) || 0);
                    return (
                      <div key={idx} className="p-3 bg-gray-50 rounded-xl">
                        <p className="text-xs text-gray-500 font-medium mb-1">{item.label}</p>
                        <p className={`text-sm font-semibold ${item.highlight
                            ? (isOut ? "text-red-600" : isLow ? "text-amber-600" : theme.detailInStockText)
                            : "text-gray-900"
                          }`}>
                          {item.value}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {currentProduct.description && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-500 font-medium mb-1">
                      {groups.variants ? "Size" : "Description"}
                    </p>
                    <p className="text-sm text-gray-700 leading-relaxed">{currentProduct.description}</p>
                  </div>
                )}
              </div>

              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                <button
                  onClick={() => {
                    closeDetailModal();
                    navigate("/add-product", { state: { product: currentProduct, productId: currentProduct.id } });
                  }}
                  className={`px-5 py-2.5 text-sm font-semibold rounded-xl transition-all flex items-center gap-2 ${theme.detailEditBtn}`}
                >
                  <Edit3 size={14} />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={closeDetailModal}
                  className="px-6 py-2.5 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===== Add Quantity Modal ===== */}
        {quantityModalOpen && selectedProduct && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
              <div className={`px-6 py-4 text-white ${theme.modalHeaderBg}`}>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
                      <PlusCircle size={18} />
                    </div>
                    <h2 className="text-lg font-bold">Add Quantity</h2>
                  </div>
                  <button onClick={() => setQuantityModalOpen(false)} className="text-white/70 hover:text-white hover:bg-white/20 rounded-lg p-1.5 transition-all">
                    <X size={18} />
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className={`flex items-center gap-3 p-3 ${theme.qtyAvatarWrap} rounded-xl mb-5`}>
                  <div className={`w-10 h-10 rounded-lg ${theme.qtyAvatarBg} flex items-center justify-center font-bold text-sm`}>
                    {selectedProduct?.name?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{selectedProduct?.name}</p>
                    <p className="text-xs text-gray-500">
                      Current stock: <span className="font-semibold">{selectedProduct?.quantity || 0}</span>
                    </p>
                  </div>
                </div>

                <label className="text-sm font-semibold text-gray-700 mb-2 block">Quantity to Add</label>
                <input
                  type="number"
                  min="1"
                  placeholder="Enter quantity"
                  value={addQuantity}
                  onChange={(e) => setAddQuantity(e.target.value)}
                  className={`w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 ${theme.searchFocus} focus:outline-none text-sm mb-2 transition-all`}
                  autoFocus
                />
                {addQuantity && Number(addQuantity) > 0 && (
                  <p className={`text-xs font-medium ${theme.qtyNewTotal}`}>
                    New total: {(selectedProduct?.quantity || 0) + Number(addQuantity)}
                  </p>
                )}
              </div>
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                <button
                  className="px-5 py-2.5 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all"
                  onClick={() => setQuantityModalOpen(false)}
                  disabled={isUpdatingQuantity}
                >
                  Cancel
                </button>
                <button
                  className={`px-6 py-2.5 text-sm font-semibold text-white rounded-xl transition-all shadow-lg flex items-center gap-2 ${isUpdatingQuantity ? "bg-gray-400 cursor-not-allowed" : theme.qtySubmitBtn
                    }`}
                  onClick={handleAddQuantity}
                  disabled={isUpdatingQuantity}
                >
                  {isUpdatingQuantity ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  {isUpdatingQuantity ? "Adding..." : "Add Stock"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Demand Forecasting & Restock Modal (Phase 2 AI) */}
        <DemandForecastModal
          isOpen={showDemandModal}
          onClose={() => setShowDemandModal(false)}
        />

        {/* Phase 3 Feature 11: AI Receipt & Inward Bill Scanner Modal */}
        <ReceiptScannerModal
          isOpen={showScannerModal}
          onClose={() => setShowScannerModal(false)}
          onInventorySaved={() => {
            fetchProducts();
            setShowScannerModal(false);
          }}
        />
      </div>
    </BillingLayout>

  );
};

export default IndustryInventory;
