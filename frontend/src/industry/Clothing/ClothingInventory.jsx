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
  DollarSign,
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
  ShoppingCart,
  Tag,
  Layers,
  BarChart3,
  Smartphone,
} from "lucide-react";
import BillingLayout from "../../Layout/BillingLayout/AdminLayout";
import { useNavigate } from "react-router-dom";

const ClothingInventory = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);

  //  New State for View & Stock
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

  const columns = useMemo(() => {
      return [
        { key: "name", label: "Product Name" },
        { key: "category", label: "Category" },
        { key: "description", label: "Size" },
   
        { key: "salePrice", label: "Price" },
        { key: "quantity", label: "Stock" },
        { key: "barcode", label: "Barcode" },
      ];
    }, []);

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

  // Update default sort key when industry changes
  useEffect(() => {
    setSortConfig({ key: "name", direction: "ascending" });
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [currentUser]);

  const fetchProducts = async () => {
    // If not logged in, stop loading and return
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
    () => [
      "",
      ...new Set(products.map((p) => p.category).filter(Boolean)),
    ],
    [products]
  );

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
      const lowerSearchTerm = searchTerm.toLowerCase();
      P = P.filter((p) => {
        const term = lowerSearchTerm;
        return (
          p.name?.toLowerCase().includes(term) ||
          p.sku?.toLowerCase().includes(term) ||
          p.category?.toLowerCase().includes(term) ||
          p.brand?.toLowerCase().includes(term) ||
          p.model?.toLowerCase().includes(term) ||
          p.imei1?.toLowerCase().includes(term) ||
          p.imei2?.toLowerCase().includes(term)
        );
      });
    }
    if (filterCategory) {
      P = P.filter((p) => p.category === filterCategory);
    }
    if (filterStockStatus) {
      if (filterStockStatus === "inStock") {
        P = P.filter((p) => {
          const totalItems = (Number(p.quantity) || 0) * (Number(p.unit) || 1);
          return totalItems > (Number(p.reorderLevel) || 0);
        });
      } else if (filterStockStatus === "low") {
        P = P.filter((p) => {
          const totalItems = (Number(p.quantity) || 0) * (Number(p.unit) || 1);
          const reorder = Number(p.reorderLevel) || 0;
          return totalItems > 0 && totalItems <= reorder;
        });
      } else if (filterStockStatus === "outOfStock") {
        P = P.filter((p) => ((Number(p.quantity) || 0) * (Number(p.unit) || 1)) === 0);
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
      if (valA < valB)
        return sortConfig.direction === "ascending" ? -1 : 1;
      if (valA > valB)
        return sortConfig.direction === "ascending" ? 1 : -1;
      return 0;
    });
  }, [
    products,
    searchTerm,
    filterCategory,
    filterStockStatus,
    sortConfig,
  ]);

  const requestSort = (key) => {
    let direction = "ascending";
    if (
      sortConfig.key === key &&
      sortConfig.direction === "ascending"
    ) {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  const getSortIndicator = (key) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === "ascending" ? (
        <SortAsc
          size={14}
          className="inline ml-1 text-emerald-600"
        />
      ) : (
        <SortDesc
          size={14}
          className="inline ml-1 text-emerald-600"
        />
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
      new Map(
        filteredAndSortedProducts.map((p) => [p.id, p])
      ).values()
    );

    let totalPurchaseValue = 0;
    let totalPurchaseGst = 0;

    uniqueProducts.forEach(p => {
      const purchasePrice = Number(p.purchasePrice) || 0;
      const quantity = Number(p.quantity) || 0;
      const purchaseGstRate = Number(p.purchaseGST) || 0;

      const itemSubtotal = purchasePrice * quantity;
      const itemGstAmount = (itemSubtotal * purchaseGstRate) / 100;

      totalPurchaseValue += (itemSubtotal + itemGstAmount);
      totalPurchaseGst += itemGstAmount;
    });

    const totalQuantity = uniqueProducts.reduce((sum, p) => {
      const totalItems = (Number(p.quantity) || 0) * (Number(p.unit) || 1);
      return sum + totalItems;
    }, 0);

    const lowStockCount = uniqueProducts.filter((p) => {
      const totalItems = (Number(p.quantity) || 0) * (Number(p.unit) || 1);
      const reorder = Number(p.reorderLevel) || 0;
      return totalItems > 0 && totalItems <= reorder;
    }).length;

    const outOfStockCount = uniqueProducts.filter((p) => {
      const totalItems = (Number(p.quantity) || 0) * (Number(p.unit) || 1);
      return totalItems === 0;
    }).length;

    const totalBrands = new Set(
      uniqueProducts.map((p) => p.brand).filter(Boolean)
    ).size;
    const totalModels = new Set(
      uniqueProducts.map((p) => p.model).filter(Boolean)
    ).size;

    return {
      totalSKUs: uniqueProducts.length,
      totalQuantity,
      totalValue: totalPurchaseValue,
      totalGst: totalPurchaseGst,
      lowStockCount,
      outOfStockCount,
      totalBrands,
      totalModels,
    };
  }, [filteredAndSortedProducts]);

  if (isLoading) {
    return (
      <BillingLayout>
        <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] bg-gradient-to-br from-[#f74faf]/10 to-[#f74faf]/5">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-[#f74faf]/10 flex items-center justify-center mb-6">
              <Loader2 className="w-10 h-10 text-[#f74faf] animate-spin" />
            </div>
          </div>
          <p className="text-gray-700 text-xl font-semibold">
            Loading Inventory...
          </p>
          <p className="text-gray-400 mt-2 text-sm">
            Fetching your product data
          </p>
        </div>
      </BillingLayout>
    );
  }

  if (error && !products.length) {
    return (
      <BillingLayout>
        <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] p-8 bg-gradient-to-br from-[#f74faf]/10 to-[#f74faf]/5 text-center">
          <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mb-6">
            <CircleX className="w-10 h-10 text-red-500" />
          </div>
          <p className="text-red-600 text-xl font-bold">
            Error Loading Inventory
          </p>
          <p className="text-gray-500 mt-2 mb-6 max-w-md">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center px-8 py-3 bg-[#f74faf] text-white rounded-xl hover:opacity-90 transition-all duration-200 font-bold shadow-lg shadow-[#f74faf]/20"
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
      <div className="bg-gradient-to-br from-[#f74faf]/10 via-white to-[#f74faf]/5 min-h-screen">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-md border-b border-[#f74faf]/20 sticky top-0 z-10 shadow-sm">
          <div className="px-6 md:px-8 py-5">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg bg-[#f74faf] shadow-[#f74faf]/20"
                >
                  
                    <Archive size={24} className="text-white" />
                  
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Clothing Inventory
                  </h1>
                  <p className="text-gray-500 text-sm mt-0.5">
                      Manage your collections and track stock levels
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsSupplierModalOpen(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-white text-[#f74faf] border border-[#f74faf]/20 rounded-xl shadow-sm hover:bg-[#f74faf]/5 transition-all font-medium"
                >
                  <UserPlus size={20} />
                  Suppliers
                </button>
                <button
                  onClick={() => navigate("/add-product")}
                  className="flex items-center px-6 py-3 text-white rounded-2xl transition-all duration-300 font-bold shadow-lg active:scale-95 bg-[#f74faf] hover:opacity-90 shadow-[#f74faf]/20"
                >
                  <PlusCircle className="w-5 h-5 mr-2" />
                  New Product
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            { [
                {
                  title: "Total Collections",
                  value: inventorySummary.totalSKUs,
                  icon: Package,
                  color: "[#f74faf]",
                  bg: "bg-[#f74faf]",
                },
                {
                  title: "Total Quantity",
                  value:
                    inventorySummary.totalQuantity.toLocaleString(),
                  icon: Box,
                  color: "[#f74faf]",
                  bg: "bg-[#f74faf]",
                },
                {
                  title: "Inventory Value",
                  value: `₹${inventorySummary.totalValue.toLocaleString()}`,
                  icon: TrendingUp,
                  color: "[#f74faf]",
                  bg: "bg-[#f74faf]",
                },
                {
                  title: "Low Stock",
                  value: inventorySummary.lowStockCount,
                  icon: AlertCircle,
                  color: "amber",
                  bg: "from-amber-500 to-orange-500",
                },
              ]
            .map((stat, idx) => (
              <div
                key={idx}
                className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm hover:shadow-xl hover:shadow-violet-500/10 transition-all duration-500 group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div
                    className={`w-12 h-12 rounded-2xl ${stat.bg} flex items-center justify-center shadow-md group-hover:rotate-6 transition-transform duration-300`}
                  >
                    <stat.icon size={18} className="text-white" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900 mb-1">
                  {stat.value}
                </p>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {stat.title}
                </p>
              </div>
            ))}
          </div>
          {isSupplierModalOpen && (
            <div className="fixed inset-0 bg-black/50 flex justify-center items-center p-4 z-50 overflow-y-auto">
              <div className="bg-white rounded-2xl w-full max-w-2xl p-6 animate-fade-in relative my-8">
                <button
                  onClick={() => setIsSupplierModalOpen(false)}
                  className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>

                <div className="flex items-center gap-3 mb-6 border-b border-[#f74faf]/10 pb-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#f74faf]/10 text-[#f74faf] flex items-center justify-center shadow-inner">
                    <UserPlus size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Add New Supplier</h2>
                    <p className="text-[#f74faf]/80 text-sm">Grow your sourcing network</p>
                  </div>
                </div>

                <form onSubmit={handleSaveSupplier} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="flex flex-col gap-1.5">
                    <label className="flex items-center gap-2 text-sm font-semibold text-[#f74faf]">
                      <Briefcase size={15} className="text-[#f74faf]" />
                      Supplier Name <span className="text-red-400 text-xs">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={supplierFormData.name}
                      onChange={(e) => setSupplierFormData({ ...supplierFormData, name: e.target.value })}
                      className="px-4 py-3 rounded-xl border border-[#f74faf]/20 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-[#f74faf]/20 focus:border-[#f74faf] transition-all"
                      placeholder="Enter supplier name"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5 font-sans">
                    <label className="flex items-center gap-2 text-sm font-semibold text-[#f74faf]">
                      <Building2 size={15} className="text-[#f74faf]" />
                      Company Name
                    </label>
                    <input
                      type="text"
                      value={supplierFormData.company}
                      onChange={(e) => setSupplierFormData({ ...supplierFormData, company: e.target.value })}
                      className="px-4 py-3 rounded-xl border border-[#f74faf]/20 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-[#f74faf]/20 focus:border-[#f74faf] transition-all"
                      placeholder="Enter company name"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5 font-sans">
                    <label className="flex items-center gap-2 text-sm font-semibold text-[#f74faf]">
                      <Hash size={15} className="text-[#f74faf]" />
                      Supplier Code
                    </label>
                    <input
                      type="text"
                      value={supplierFormData.code}
                      onChange={(e) => setSupplierFormData({ ...supplierFormData, code: e.target.value })}
                      className="px-4 py-3 rounded-xl border border-[#f74faf]/20 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-[#f74faf]/20 focus:border-[#f74faf] transition-all"
                      placeholder="e.g. SUP001"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5 font-sans">
                    <label className="flex items-center gap-2 text-sm font-semibold text-[#f74faf]">
                      <FileText size={15} className="text-[#f74faf]" />
                      GST Number
                    </label>
                    <input
                      type="text"
                      value={supplierFormData.gst}
                      onChange={(e) => setSupplierFormData({ ...supplierFormData, gst: e.target.value })}
                      className="px-4 py-3 rounded-xl border border-[#f74faf]/20 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-[#f74faf]/20 focus:border-[#f74faf] transition-all font-mono"
                      placeholder="22AAAAA0000A1Z5"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5 font-sans">
                    <label className="flex items-center gap-2 text-sm font-semibold text-[#f74faf]">
                      <FileText size={15} className="text-[#f74faf]" />
                      PAN Number
                    </label>
                    <input
                      type="text"
                      value={supplierFormData.pan}
                      onChange={(e) => setSupplierFormData({ ...supplierFormData, pan: e.target.value })}
                      className="px-4 py-3 rounded-xl border border-[#f74faf]/20 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-[#f74faf]/20 focus:border-[#f74faf] transition-all font-mono"
                      placeholder="ABCDE1234F"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5 font-sans">
                    <label className="flex items-center gap-2 text-sm font-semibold text-[#f74faf]">
                      <Phone size={15} className="text-[#f74faf]" />
                      Mobile Number
                    </label>
                    <input
                      type="text"
                      value={supplierFormData.mobile}
                      onChange={(e) => setSupplierFormData({ ...supplierFormData, mobile: e.target.value })}
                      className="px-4 py-3 rounded-xl border border-[#f74faf]/20 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-[#f74faf]/20 focus:border-[#f74faf] transition-all"
                      placeholder="10 digit mobile"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5 font-sans">
                    <label className="flex items-center gap-2 text-sm font-semibold text-[#f74faf]">
                      <Mail size={15} className="text-[#f74faf]" />
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={supplierFormData.email}
                      onChange={(e) => setSupplierFormData({ ...supplierFormData, email: e.target.value })}
                      className="px-4 py-3 rounded-xl border border-[#f74faf]/20 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-[#f74faf]/20 focus:border-[#f74faf] transition-all"
                      placeholder="supplier@email.com"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5 font-sans">
                    <label className="flex items-center gap-2 text-sm font-semibold text-[#f74faf]">
                      <CreditCard size={15} className="text-[#f74faf]" />
                      Payment Mode
                    </label>
                    <select
                      value={supplierFormData.paymentMode}
                      onChange={(e) => setSupplierFormData({ ...supplierFormData, paymentMode: e.target.value })}
                      className="px-4 py-3 rounded-xl border border-[#f74faf]/20 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-[#f74faf]/20 focus:border-[#f74faf] transition-all"
                    >
                      <option value="Cash">Cash</option>
                      <option value="UPI">UPI</option>
                      <option value="Card">Card</option>
                      <option value="Net Banking">Net Banking</option>
                      <option value="Credit">Credit</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5 font-sans md:col-span-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-[#f74faf]">
                      <MapPin size={15} className="text-[#f74faf]" />
                      Billing Address
                    </label>
                    <textarea
                      rows="3"
                      value={supplierFormData.address}
                      onChange={(e) => setSupplierFormData({ ...supplierFormData, address: e.target.value })}
                      className="px-4 py-3 rounded-xl border border-[#f74faf]/20 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-[#f74faf]/20 focus:border-[#f74faf] transition-all resize-none"
                      placeholder="Enter full address..."
                    ></textarea>
                  </div>

                  <div className="flex justify-end gap-3 md:col-span-2 pt-4 border-t border-[#f74faf]/10 mt-2">
                    <button
                      type="button"
                      onClick={() => setIsSupplierModalOpen(false)}
                      className="px-6 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-xl bg-[#f74faf] text-white hover:opacity-90 transition-all shadow-md font-bold"
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
                <Search
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  placeholder={
                     "Search products by name, SKU, or category..."
                  }
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none text-sm font-medium text-gray-900 transition-all duration-200 placeholder:text-gray-400"
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
                    onChange={(e) =>
                      setFilterCategory(e.target.value)
                    }
                    className="appearance-none pl-4 pr-10 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none text-sm font-medium text-gray-700 cursor-pointer min-w-[160px]"
                  >
                    <option value="">All Categories</option>
                    {categories.map(
                      (cat) =>
                        cat && (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        )
                    )}
                  </select>
                  <ChevronDown
                    size={16}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  />
                </div>
                <div className="relative">
                  <select
                    value={filterStockStatus}
                    onChange={(e) =>
                      setFilterStockStatus(e.target.value)
                    }
                    className="appearance-none pl-4 pr-10 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none text-sm font-medium text-gray-700 cursor-pointer min-w-[160px]"
                  >
                    <option value="">All Status</option>
                    <option value="inStock">In Stock</option>
                    <option value="low">Low Stock</option>
                    <option value="outOfStock">
                      Out of Stock
                    </option>
                  </select>
                  <ChevronDown
                    size={16}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  />
                </div>
              </div>
            </div>
            {(searchTerm || filterCategory || filterStockStatus) && (
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                <span className="text-xs text-gray-500 font-medium">
                  Active filters:
                </span>
                {searchTerm && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium">
                    Search: &quot;{searchTerm}&quot;
                    <button onClick={() => setSearchTerm("")}>
                      <X size={12} />
                    </button>
                  </span>
                )}
                {filterCategory && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium">
                    {filterCategory}
                    <button
                      onClick={() => setFilterCategory("")}
                    >
                      <X size={12} />
                    </button>
                  </span>
                )}
                {filterStockStatus && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium">
                    {filterStockStatus === "inStock"
                      ? "In Stock"
                      : filterStockStatus === "low"
                        ? "Low Stock"
                        : "Out of Stock"}
                    <button
                      onClick={() => setFilterStockStatus("")}
                    >
                      <X size={12} />
                    </button>
                  </span>
                )}
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setFilterCategory("");
                    setFilterStockStatus("");
                  }}
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
                    <th className="px-5 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-5 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredAndSortedProducts.length > 0 ? (
                    filteredAndSortedProducts.map((product) => {
                      let statusConfig = {
                        class: "bg-gray-100 text-gray-600",
                        text: "N/A",
                        dot: "bg-gray-400",
                      };
                      if ((product.quantity || 0) === 0) {
                        statusConfig = {
                          class: "bg-red-50 text-red-700",
                          text: "Out of Stock",
                          dot: "bg-red-500",
                        };
                      } else if (
                        (product.quantity || 0) > 0 &&
                        (product.quantity || 0) <=
                        (product.reorderLevel || 0)
                      ) {
                        statusConfig = {
                          class: "bg-amber-50 text-amber-700",
                          text: "Low Stock",
                          dot: "bg-amber-500",
                        };
                      } else if (
                        (product.quantity || 0) >
                        (product.reorderLevel || 0)
                      ) {
                        statusConfig = {
                          class: "bg-emerald-50 text-emerald-700",
                          text: "In Stock",
                          dot: "bg-emerald-500",
                        };
                      }

                      return (
                        <tr
                          key={product.id}
                          className="hover:bg-green-50/50 transition-colors duration-150 group/row"
                        >
                          {columns.map((col) => {
                            const val = product[col.key];
                            const price = Number(product.salePrice) || 0;
                            const quantity = Number(product.quantity) || 0;
                            const unit = Number(product.unit) || 1;
                            const totalItems = quantity * unit;
                            const gst = Number(product.gstRate) || Number(product.gst) || Number(product.salesGst) || 0;
                            const subtotal = price * totalItems;
                            const gstAmountVal = (subtotal * gst) / 100;
                            const totalVal = subtotal + gstAmountVal;

                            if (col.key === "subtotal") {
                              return (
                                <td
                                  key={col.key}
                                  className="px-5 py-4 whitespace-nowrap text-sm text-green-700 font-medium"
                                >
                                  ₹{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                              );
                            }
                            if (col.key === "gstAmount") {
                              return (
                                <td
                                  key={col.key}
                                  className="px-5 py-4 whitespace-nowrap text-sm text-orange-600 font-medium"
                                >
                                  ₹{gstAmountVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                              );
                            }
                            if (col.key === "total") {
                              return (
                                <td
                                  key={col.key}
                                  className="px-5 py-4 whitespace-nowrap text-sm text-gray-900 font-bold"
                                >
                                  ₹{totalVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                              );
                            }
                            if (col.key === "quantity") {
                              return (
                                <td
                                  key={col.key}
                                  className="px-5 py-4 whitespace-nowrap"
                                >
                                  <span
                                    className={`text-sm font-bold ${Number(totalItems) === 0
                                      ? "text-red-600"
                                      : "text-gray-900"
                                      }`}
                                  >
                                    {totalItems || 0}
                                  </span>
                                </td>
                              );
                            }
                            if (col.key === "ram") {
                              return (
                                <td
                                  key={col.key}
                                  className="px-5 py-4 whitespace-nowrap text-sm text-gray-700 font-medium"
                                >
                                  {product.ram || "—"}/{product.storage || "—"}
                                </td>
                              );
                            }
                            if (col.key === "imei1") {
                              return (
                                <td
                                  key={col.key}
                                  className="px-5 py-4 whitespace-nowrap"
                                >
                                  <code className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-md font-mono">
                                    {val || "—"}
                                  </code>
                                </td>
                              );
                            }
                            return (
                              <td
                                key={col.key}
                                className="px-5 py-4 whitespace-nowrap text-sm text-gray-700 font-medium"
                              >
                                {val || "—"}
                              </td>
                            );
                          })}
                          <td className="px-5 py-4 whitespace-nowrap text-center">
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full ${statusConfig.class}`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`}
                              />
                              {statusConfig.text}
                            </span>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() =>
                                  openDetailModal(product)
                                }
                                className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all duration-200"
                                title="View Details"
                              >
                                <Eye size={16} />
                              </button>
                              <button
                                onClick={() =>
                                  navigate("/add-product", {
                                    state: {
                                      product: product,
                                      productId: product.id,
                                    },
                                  })
                                }
                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                                title="Edit Product"
                              >
                                <Edit3 size={16} />
                              </button>
                              <button
                                onClick={() =>
                                  handleOpenQuantityModal(
                                    product
                                  )
                                }
                                className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200"
                                title="Add Quantity"
                              >
                                <PlusCircle size={16} />
                              </button>
                              <button
                                onClick={() =>
                                  handleDelete(product.id)
                                }
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
                      <td
                        colSpan={columns.length + 2}
                        className="px-5 py-16 text-center"
                      >
                        <div className="flex flex-col items-center">
                          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                            <Package
                              size={28}
                              className="text-gray-400"
                            />
                          </div>
                          <p className="text-gray-900 text-lg font-semibold mb-1">
                            No products found
                          </p>
                          <p className="text-gray-500 text-sm mb-6">
                            {searchTerm ||
                              filterCategory ||
                              filterStockStatus
                              ? "Try adjusting your search or filters."
                              : "Get started by adding your first product."}
                          </p>
                          {!searchTerm &&
                            !filterCategory &&
                            !filterStockStatus && (
                              <button
                                onClick={() =>
                                  navigate("/add-product")
                                }
                                className="flex items-center px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors text-sm font-semibold"
                              >
                                <PlusCircle
                                  size={16}
                                  className="mr-2"
                                />
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
              <div className="px-6 py-4 border-t border-[#f74faf]/10 bg-[#f74faf]/5">
                <p className="text-xs text-[#f74faf] font-bold uppercase tracking-widest">
                  Showing {filteredAndSortedProducts.length} of{" "}
                  {products.length} products
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ===== Detail Modal ===== */}
        {isDetailModalOpen && currentProduct && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm overflow-y-auto h-full w-full flex items-start justify-center z-50 p-4 pt-[5vh]">
            <div className="relative bg-white rounded-2xl w-full max-w-xl mx-auto shadow-2xl overflow-hidden">
              {/* Detail Header */}
              <div
                className={"bg-[#f74faf] p-6 text-white"
                  }
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center text-2xl font-bold">
                      { currentProduct.name
                      
                        ?.charAt(0)
                        ?.toUpperCase() || "?"}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">
                        {currentProduct.name}
                      </h2>
                      <code
                        className={ "text-white/60 text-sm"}
                      >
                        {currentProduct.sku ||
                          "No ID"}
                      </code>
                    </div>
                  </div>
                  <button
                    onClick={closeDetailModal}
                    className="text-white/70 hover:text-white hover:bg-white/20 rounded-lg p-2 transition-all"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="p-6 max-h-[60vh] overflow-y-auto">
                {/* Status Banner */}
                <div
                  className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${(currentProduct.quantity || 0) === 0
                    ? "bg-red-50 text-red-700 border border-red-200"
                    : (currentProduct.quantity || 0) <=
                      (currentProduct.reorderLevel || 0)
                      ? "bg-amber-50 text-amber-700 border border-amber-200"
                      : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    }`}
                >
                  {(currentProduct.quantity || 0) === 0 ? (
                    <PackageX size={20} />
                  ) : (currentProduct.quantity || 0) <=
                    (currentProduct.reorderLevel || 0) ? (
                    <AlertCircle size={20} />
                  ) : (
                    <PackageCheck size={20} />
                  )}
                  <span className="font-semibold text-sm">
                    {(currentProduct.quantity || 0) === 0
                      ? "This item is out of stock."
                      : (currentProduct.quantity || 0) <=
                        (currentProduct.reorderLevel || 0)
                        ? "Low stock. Consider reordering."
                        : "Sufficient stock available."}
                  </span>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-4">
                  { [
                      {
                        label: "Category",
                        value:
                          currentProduct.category || "—",
                      },
                      {
                        label: "Supplier",
                        value:
                          currentProduct.supplier || "—",
                      },
                      {
                        label: "Purchase Price",
                        value: `₹${(
                          currentProduct.purchasePrice ||
                          0
                        ).toLocaleString()}`,
                      },
                      {
                        label: "Sale Price",
                        value: `₹${(
                          currentProduct.salePrice || 0
                        ).toLocaleString()}`,
                      },
                      {
                        label: "Sales GST",
                        value: `${currentProduct.salesGst ||
                          currentProduct.gstRate ||
                          currentProduct.gst ||
                          0
                          }%`,
                      },
                      {
                        label: "Purchase GST",
                        value: `${currentProduct.purchaseGst
                          }%`,
                      },
                      {
                        label: "Current Stock",
                        value: `${((Number(currentProduct.quantity) || 0) * (Number(currentProduct.unit) || 1)).toLocaleString()} ${currentProduct.unitOfMeasurement || "pcs"}`,
                        highlight: true,
                      },
                      {
                        label: "Reorder Level",
                        value: `${(currentProduct.reorderLevel || 0).toLocaleString()} ${currentProduct.unitOfMeasurement || "pcs"}`,
                      },
                      {
                        label: "Unit",
                        value:
                          currentProduct.unitOfMeasurement ||
                          "pcs",
                      },
                    ].map((item, idx) => {
                      const label = item.label;
                      const totalItems = (Number(currentProduct.quantity) || 0) * (Number(currentProduct.unit) || 1);
                      const reorder = Number(currentProduct.reorderLevel) || 0;
                      const isHighlightField = item.highlight;
                      const isLow = totalItems > 0 && totalItems <= reorder;
                      const isOut = totalItems === 0;

                      return (
                      <div
                        key={idx}
                        className="p-3 bg-gray-50 rounded-xl"
                      >
                        <p className="text-xs text-gray-500 font-medium mb-1">
                          {item.label}
                        </p>
                        <p className={`text-sm font-semibold ${
                          isHighlightField ? (isOut ? "text-red-600" : isLow ? "text-amber-600" : "text-[#f74faf]") : "text-gray-900"
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
                      Description
                    </p>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {currentProduct.description}
                    </p>
                  </div>
                )}
              </div>

              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                <button
                  onClick={() => {
                    closeDetailModal();
                    navigate("/add-product", {
                      state: {
                        product: currentProduct,
                        productId: currentProduct.id,
                      },
                    });
                  }}
                  className={"px-5 py-2.5 text-sm font-semibold text-[#f74faf] bg-[#f74faf]/10 hover:bg-[#f74faf]/20 rounded-xl transition-all flex items-center gap-2"}
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
              <div
                className="px-6 py-4 text-white bg-[#f74faf]"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
                      <PlusCircle size={18} />
                    </div>
                    <h2 className="text-lg font-bold">
                      Add Quantity
                    </h2>
                  </div>
                  <button
                    onClick={() => setQuantityModalOpen(false)}
                    className="text-white/70 hover:text-white hover:bg-white/20 rounded-lg p-1.5 transition-all"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="flex items-center gap-3 p-3 bg-[#f74faf]/10 rounded-xl mb-5">
                  <div className="w-10 h-10 rounded-lg bg-[#f74faf]/20 flex items-center justify-center text-[#f74faf] font-bold text-sm">
                    { selectedProduct?.name
                    
                      ?.charAt(0)
                      ?.toUpperCase() || "?"}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      { selectedProduct?.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      Current stock:{" "}
                      <span className="font-semibold">
                        {selectedProduct?.quantity || 0}
                      </span>
                    </p>
                  </div>
                </div>

                <label className="text-sm font-semibold text-gray-700 mb-2 block">
                  Quantity to Add
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="Enter quantity"
                  value={addQuantity}
                  onChange={(e) => setAddQuantity(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#f74faf] focus:border-[#f74faf] focus:outline-none text-sm mb-2 transition-all"
                  autoFocus
                />
                {addQuantity && Number(addQuantity) > 0 && (
                  <p className="text-xs text-[#f74faf] font-medium">
                    New total:{" "}
                    {(selectedProduct?.quantity || 0) +
                      Number(addQuantity)}
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
                  className={`px-6 py-2.5 text-sm font-bold text-white rounded-xl transition-all shadow-lg shadow-[#f74faf]/20 flex items-center gap-2 ${isUpdatingQuantity
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-[#f74faf] hover:opacity-90"
                  }`}
                  onClick={handleAddQuantity}
                  disabled={isUpdatingQuantity}
                >
                  {isUpdatingQuantity ? (
                    <Loader2
                      size={16}
                      className="animate-spin"
                    />
                  ) : (
                    <Check size={16} />
                  )}
                  {isUpdatingQuantity
                    ? "Adding..."
                    : "Add Stock"}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </BillingLayout>
  );
};

export default ClothingInventory;