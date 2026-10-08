import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import API_URL from "../../config/api";
import { useAuth } from "../../contexts/AuthContext";
import {
  Smartphone,
  PlusCircle,
  Edit3,
  Trash2,
  Search,
  Loader2,
  AlertCircle,
  Eye,
  X,
  Check,
  RefreshCcw,
  Tag,
  Layers,
  DollarSign,
  TrendingUp,
  Box,
  Package,
  PackageX,
  PackagePlus,
  UserPlus,
  Building2,
  Briefcase,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Hash,
  FileText,
  Camera
} from "lucide-react";
import BillingLayout from "../../Layout/BillingLayout/AdminLayout";
import { useNavigate } from "react-router-dom";
import ReceiptScannerModal from "../../components/AI/ReceiptScannerModal";
import BarcodeScanner from "../../components/Auth/BarcodeScanner";

const MobileInventory = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [mobiles, setMobiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState(null);

  // Camera Barcode Scanner State
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const [cameraScanTarget, setCameraScanTarget] = useState(null); // 'search' | 'imei1' | 'imei2'

  // New State for View & Stock
  const [viewProduct, setViewProduct] = useState(null);
  const [stockProduct, setStockProduct] = useState(null);
  const [addStockQty, setAddStockQty] = useState("");
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [isOcrModalOpen, setIsOcrModalOpen] = useState(false);
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

  const initialFormState = {
    brand: "",
    model: "",
    ram: "",
    storage: "",
    color: "",
    imei1: "",
    imei2: "",
    purchasePrice: "",
    salePrice: "",
    gst: "",
    stock: "",
    warranty: "",
    category: "Mobile",
  };

  const EDITABLE_FIELDS = [
    "brand",
    "model",
    "ram",
    "storage",
    "color",
    "imei1",
    "imei2",
    "purchasePrice",
    "salePrice",
    "gst",
    "stock",
    "warranty",
  ];

  const [formData, setFormData] = useState(initialFormState);

  const handleAddStock = async (e) => {
    e.preventDefault();
    if (!stockProduct || !addStockQty || isNaN(addStockQty) || Number(addStockQty) <= 0) return;

    const token = sessionStorage.getItem("token");
    const targetId = stockProduct.id || stockProduct._id;
    try {
      const currentQty = Number(stockProduct.quantity) || Number(stockProduct.stock) || 0;
      const newQty = currentQty + Number(addStockQty);
      await axios.put(`${API_URL}/products/${targetId}`, {
        quantity: newQty,
        stock: newQty
      }, {
        headers: { "x-auth-token": token },
      });
      fetchMobiles();
      setStockProduct(null);
      setAddStockQty("");
    } catch (err) {
      console.error("Stock update error:", err);
      alert("Failed to update stock");
    }
  };

  /* ---------------- FETCH DATA ---------------- */

  const fetchMobiles = async () => {
    if (!currentUser) return;

    const token = sessionStorage.getItem("token");
    if (!token) {
      setError("Please log in to view inventory.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    console.log("📱 MobileInventory: Fetching products...");
    try {
      const res = await axios.get(`${API_URL}/products`, {
        headers: { "x-auth-token": token },
      });
      console.log("✅ MobileInventory: Found", res.data?.length || 0, "products");
      setMobiles((res.data || []).map(p => ({
        ...p,
        id: p.id || p._id,
        stock: (p.stock !== undefined && p.stock !== null) ? p.stock : (p.quantity ?? 0),
        quantity: (p.quantity !== undefined && p.quantity !== null) ? p.quantity : (p.stock ?? 0),
        brand: p.brand || p.name?.split(' ')[0] || "Unknown",
        model: p.model || p.name?.split(' ').slice(1).join(' ') || ""
      })));
      setError(null);
    } catch (err) {
      console.error("Error fetching mobiles:", err);
      setError("Failed to load inventory.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMobiles();
  }, [currentUser]);

  /* ---------------- STATS CALCULATION ---------------- */

  const inventorySummary = useMemo(() => {
    const totalQuantity = mobiles.reduce(
      (sum, p) => sum + (Number(p.quantity) || 0),
      0
    );
    const totalValue = mobiles.reduce(
      (sum, p) => sum + (Number(p.quantity) || 0) * (Number(p.salePrice) || 0),
      0
    );
    const lowStockCount = mobiles.filter(
      (p) => Number(p.quantity) > 0 && Number(p.quantity) <= (Number(p.reorderLevel) || 5)
    ).length;
    const outOfStockCount = mobiles.filter(
      (p) => Number(p.quantity) === 0
    ).length;

    const uniqueBrands = new Set(mobiles.map(p => p.brand).filter(Boolean)).size;
    const uniqueModels = new Set(mobiles.map(p => p.model).filter(Boolean)).size;

    return {
      totalDevices: totalQuantity,
      totalBrands: uniqueBrands,
      totalModels: uniqueModels,
      totalValue,
      lowStockCount,
      outOfStockCount
    };
  }, [mobiles]);

  /* ---------------- FORM HANDLING ---------------- */

  const handleChange = (e) => {
    const { name, value } = e.target;
    // Auto-split if user scans or pastes a string containing both IMEIs
    if (name === "imei1") {
      const imeis = (value || "").match(/\b\d{15}\b/g) || [];
      if (imeis.length >= 2) {
        setFormData((prev) => ({
          ...prev,
          imei1: imeis[0],
          imei2: imeis[1]
        }));
        return;
      }
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImeiKeyDown = (field) => (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (field === "imei1") {
        const next = document.getElementById("modal-input-imei2");
        if (next) next.focus();
      }
    }
  };

  const handleCameraScan = (scannedCode) => {
    if (!scannedCode) return;
    const clean = String(scannedCode).trim();
    const imeis = clean.match(/\b\d{15}\b/g) || [];

    if (cameraScanTarget === "search") {
      setSearchTerm(imeis[0] || clean);
    } else if (cameraScanTarget === "imei1" || cameraScanTarget === "imei2") {
      if (imeis.length >= 2) {
        setFormData((prev) => ({
          ...prev,
          imei1: imeis[0],
          imei2: imeis[1]
        }));
      } else {
        setFormData((prev) => ({
          ...prev,
          [cameraScanTarget]: imeis[0] || clean
        }));
      }
    }

    setShowCameraScanner(false);
    setCameraScanTarget(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) return;
    const token = sessionStorage.getItem("token");

    const data = {
      brand: formData.brand || "",
      model: formData.model || "",
      ram: formData.ram || "",
      storage: formData.storage || "",
      color: formData.color || "",
      imei1: formData.imei1 || "",
      imei2: formData.imei2 || "",
      purchasePrice: Number(formData.purchasePrice) || 0,
      salePrice: Number(formData.salePrice) || 0,
      gst: Number(formData.gst) || 0,
      quantity: Number(formData.stock) || 0,
      stock: Number(formData.stock) || 0,
      warranty: formData.warranty || "",
      name: `${formData.brand || ""} ${formData.model || ""}`.trim() || formData.model || formData.brand || "Mobile Device",
      category: formData.category || "Mobile",
    };

    try {
      if (editingId) {
        await axios.put(`${API_URL}/products/${editingId}`, data, {
          headers: { "x-auth-token": token },
        });
      } else {
        await axios.post(`${API_URL}/products`, data, {
          headers: { "x-auth-token": token },
        });
      }
      await fetchMobiles();
      resetForm();
    } catch (err) {
      console.error("Error saving mobile:", err);
      alert(err.response?.data?.msg || err.message || "Failed to save mobile.");
    }
  };

  const resetForm = () => {
    setFormData(initialFormState);
    setEditingId(null);
    setIsModalOpen(false);
  };

  const handleEdit = (mobile) => {
    const targetId = mobile.id || mobile._id;
    setEditingId(targetId);
    setFormData({
      brand: mobile.brand ?? (mobile.name ? mobile.name.split(' ')[0] : "") ?? "",
      model: mobile.model ?? (mobile.name ? mobile.name.split(' ').slice(1).join(' ') : "") ?? "",
      ram: mobile.ram ?? "",
      storage: mobile.storage ?? "",
      color: mobile.color ?? "",
      imei1: mobile.imei1 ?? "",
      imei2: mobile.imei2 ?? "",
      purchasePrice: mobile.purchasePrice ?? "",
      salePrice: mobile.salePrice ?? "",
      gst: mobile.gst ?? "",
      stock: (mobile.stock !== undefined && mobile.stock !== null) ? mobile.stock : (mobile.quantity ?? ""),
      warranty: mobile.warranty ?? "",
      category: mobile.category || "Mobile",
    });
    setIsModalOpen(true);
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

  const handleDelete = async (target) => {
    const id = typeof target === 'object' ? (target?.id || target?._id) : target;
    if (!id) return;
    if (!window.confirm("Are you sure you want to delete this device?")) return;
    const token = sessionStorage.getItem("token");
    try {
      await axios.delete(`${API_URL}/products/${id}`, {
        headers: { "x-auth-token": token },
      });
      fetchMobiles();
    } catch (err) {
      console.error("Error deleting:", err);
      alert("Failed to delete.");
    }
  };

  /* ---------------- FILTER ---------------- */

  const filteredMobiles = useMemo(() => {
    return mobiles.filter(
      (m) =>
        m.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.imei1?.includes(searchTerm)
    );
  }, [mobiles, searchTerm]);

  /* ---------------- LOADING ---------------- */

  if (isLoading) {
    return (
      <BillingLayout>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="animate-spin text-emerald-600" size={40} />
        </div>
      </BillingLayout>
    );
  }

  /* ---------------- UI ---------------- */

  return (
    <BillingLayout>
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-white p-6">

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg shadow-blue-200">
              <Smartphone className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Mobile Inventory</h1>
              <p className="text-gray-500 text-sm">Track devices, IMEIs, and stock</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsOcrModalOpen(true)}
              className="flex items-center gap-2 px-5 py-3 bg-white text-emerald-700 border border-emerald-300 rounded-xl shadow-sm hover:bg-emerald-50 transition-all font-semibold"
            >
              <Camera size={20} className="text-emerald-600" />
              Scan Wholesale Bill (OCR)
            </button>
            <button
              onClick={() => setIsSupplierModalOpen(true)}
              className="flex items-center gap-2 px-5 py-3 bg-white text-emerald-600 border border-emerald-200 rounded-xl shadow-sm hover:bg-emerald-50 transition-all font-medium"
            >
              <UserPlus size={20} />
              Add Supplier
            </button>
            <button
              onClick={() => navigate("/add-product")}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-600 text-white rounded-xl shadow-lg shadow-blue-200 hover:shadow-xl hover:scale-[1.02] transition-all font-medium"
            >
              <PlusCircle size={20} />
              Add Mobile
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          {[
            {
              title: "Total Devices",
              value: inventorySummary.totalDevices.toLocaleString(),
              icon: Smartphone,
              color: "blue",
              bg: "from-blue-500 to-indigo-600",
            },
            {
              title: "Total Brands",
              value: inventorySummary.totalBrands,
              icon: Tag,
              color: "indigo",
              bg: "from-indigo-500 to-violet-600",
            },
            {
              title: "Total Models",
              value: inventorySummary.totalModels,
              icon: Layers,
              color: "violet",
              bg: "from-violet-500 to-purple-600",
            },
            {
              title: "Inventory Value",
              value: `₹${inventorySummary.totalValue.toLocaleString()}`,
              icon: DollarSign,
              color: "emerald",
              bg: "from-emerald-500 to-green-600",
            },
            {
              title: "Low Stock",
              value: inventorySummary.lowStockCount,
              icon: AlertCircle,
              color: "amber",
              bg: "from-amber-500 to-orange-500",
            },
          ].map((stat, idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-blue-50 transition-all duration-300 group"
            >
              <div className="flex items-start justify-between mb-3">
                <div
                  className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.bg} flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300`}
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

        {/* Search */}
        <div className="mb-6 relative">
          <Search className="absolute left-3 top-3 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search by Brand, Model or IMEI..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-12 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
          />
          <button
            type="button"
            onClick={() => { setCameraScanTarget("search"); setShowCameraScanner(true); }}
            className="absolute right-3 top-2.5 p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
            title="Scan Barcode / IMEI with Camera"
          >
            <Camera size={18} />
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 text-left text-sm">
              <tr>
                <th className="p-3">Brand</th>
                <th className="p-3">Model</th>
                <th className="p-3">RAM</th>
                <th className="p-3">Storage</th>
                <th className="p-3">Color</th>
                <th className="p-3">IMEI 1</th>
                <th className="p-3">Stock</th>
                <th className="p-3">Sale ₹</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredMobiles.map((mobile) => (
                <tr key={mobile.id || mobile._id} className="border-t">
                  <td className="p-3">{mobile.brand}</td>
                  <td className="p-3">{mobile.model}</td>
                  <td className="p-3">{mobile.ram}</td>
                  <td className="p-3">{mobile.storage}</td>
                  <td className="p-3">{mobile.color}</td>
                  <td className="p-3">{mobile.imei1}</td>
                  <td className="p-3 font-bold">{mobile.stock}</td>
                  <td className="p-3">₹{mobile.salePrice}</td>
                  <td className="p-3 flex justify-center gap-2">
                    <button title="View Details" onClick={() => setViewProduct(mobile)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
                      <Eye size={18} />
                    </button>
                    <button title="Edit" onClick={() => handleEdit(mobile)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                      <Edit3 size={18} />
                    </button>
                    <button title="Add Stock" onClick={() => { setStockProduct(mobile); setAddStockQty(""); }} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
                      <PackagePlus size={18} />
                    </button>
                    <button title="Delete" onClick={() => handleDelete(mobile.id || mobile._id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ... existing table ... */}

        {/* View Details Modal */}
        {viewProduct && (
          <div className="fixed inset-0 bg-black/50 flex justify-center items-center p-4 z-50">
            <div className="bg-white rounded-2xl w-full max-w-lg p-6 animate-fade-in relative">
              <button onClick={() => setViewProduct(null)} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Smartphone size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{viewProduct.brand} {viewProduct.model}</h2>
                  <p className="text-blue-600 font-medium">{viewProduct.color} • {viewProduct.storage} • {viewProduct.ram}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-500 uppercase">First IMEI</p>
                    <p className="font-mono font-medium">{viewProduct.imei1 || "N/A"}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-500 uppercase">Second IMEI</p>
                    <p className="font-mono font-medium">{viewProduct.imei2 || "N/A"}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-500 uppercase">Purchase Price</p>
                    <p className="font-medium">₹{viewProduct.purchasePrice}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-500 uppercase">Sale Price</p>
                    <p className="font-medium text-emerald-600">₹{viewProduct.salePrice}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-500 uppercase">Current Stock</p>
                    <p className="font-bold text-lg">{viewProduct.quantity || 0}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-500 uppercase">GST</p>
                    <p className="font-medium">{viewProduct.gst}%</p>
                  </div>
                </div>
                {viewProduct.supplier && (
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-500 uppercase">Supplier</p>
                    <p className="font-medium">{viewProduct.supplier}</p>
                  </div>
                )}
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-500 uppercase">Warranty</p>
                  <p className="font-medium">{viewProduct.warranty || "No Warranty Info"}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Stock Modal */}
        {stockProduct && (
          <div className="fixed inset-0 bg-black/50 flex justify-center items-center p-4 z-50">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 animate-fade-in relative">
              <button onClick={() => setStockProduct(null)} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
              <h2 className="text-xl font-bold mb-1">Add Stock</h2>
              <p className="text-gray-500 text-sm mb-6">Update inventory for <span className="font-semibold text-gray-900">{stockProduct.brand} {stockProduct.model}</span></p>

              <form onSubmit={handleAddStock}>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Current Stock: <span className="text-blue-600 font-bold">{stockProduct.quantity || 0}</span></label>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Quantity to Add</label>
                  <input
                    type="number"
                    min="1"
                    value={addStockQty}
                    onChange={(e) => setAddStockQty(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none text-lg"
                    placeholder="Enter quantity..."
                    autoFocus
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => setStockProduct(null)} className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50">Cancel</button>
                  <button type="submit" className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 font-medium shadow-lg shadow-emerald-200">Update Stock</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add / Edit Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/40 flex justify-center items-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-fade-in border border-gray-100">
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {editingId ? "Edit Mobile Configuration" : "Add New Mobile Device"}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">Review and update technical and pricing details</p>
                </div>
                <button
                  onClick={resetForm}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Modal Body - Scrollable */}
              <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
                <form
                  id="mobile-edit-form"
                  onSubmit={handleSubmit}
                  className="grid grid-cols-1 md:grid-cols-2 gap-6"
                >
                  {/* Category Selection - Always at top */}
                  <div className="flex flex-col gap-1.5 md:col-span-2">
                    <label className="text-xs font-bold text-emerald-600 uppercase tracking-widest ml-1">
                      Category
                    </label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
                    >
                      {["Mobile", "Bluetooth", "Charger", "Headset", "Cable", "Adapter"].map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>

                  {EDITABLE_FIELDS
                    .filter(field => {
                      // Only show mobile specific fields for "Mobile" category
                      if (formData.category !== "Mobile" && ["ram", "storage", "imei1", "imei2"].includes(field)) {
                        return false;
                      }
                      return true;
                    })
                    .map((field) => (
                      <div key={field} className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">
                          {field.replace(/([A-Z])/g, ' $1').trim()}
                        </label>
                        <div className="relative">
                          <input
                            id={`modal-input-${field}`}
                            name={field}
                            type={field.toLowerCase().includes("price") || field === "gst" || field === "stock" ? "number" : "text"}
                            value={formData[field] ?? ""}
                            onChange={handleChange}
                            onKeyDown={field === "imei1" || field === "imei2" ? handleImeiKeyDown(field) : undefined}
                            placeholder={`Enter ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}...`}
                            className={`w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-700 placeholder-gray-400 
                                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm ${
                                       field === "imei1" || field === "imei2" ? "pr-11 font-mono tracking-wider" : ""
                                     }`}
                          />
                          {(field === "imei1" || field === "imei2") && (
                            <button
                              type="button"
                              onClick={() => { setCameraScanTarget(field); setShowCameraScanner(true); }}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                              title={`Scan ${field.toUpperCase()} with Camera`}
                            >
                              <Camera size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                </form>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-white">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-3 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  form="mobile-edit-form"
                  type="submit"
                  className="px-10 py-3 bg-blue-600 text-white rounded-xl flex items-center gap-2 hover:bg-blue-700 font-bold shadow-lg shadow-blue-200 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Check size={20} />
                  {editingId ? "Update Device" : "Save Device"}
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Supplier Modal */}
        {isSupplierModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex justify-center items-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-2xl w-full max-w-2xl p-6 animate-fade-in relative my-8">
              <button
                onClick={() => setIsSupplierModalOpen(false)}
                className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <UserPlus size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Add New Supplier</h2>
                  <p className="text-gray-500 text-sm">Save supplier details for purchase</p>
                </div>
              </div>

              <form onSubmit={handleSaveSupplier} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="flex flex-col gap-1.5 font-sans">
                  <label className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
                    <Briefcase size={15} className="text-emerald-500" />
                    Supplier Name <span className="text-red-400 text-xs">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={supplierFormData.name}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, name: e.target.value })}
                    className="px-4 py-3 rounded-xl border border-emerald-100 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    placeholder="Enter supplier name"
                  />
                </div>

                <div className="flex flex-col gap-1.5 font-sans">
                  <label className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
                    <Building2 size={15} className="text-emerald-500" />
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={supplierFormData.company}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, company: e.target.value })}
                    className="px-4 py-3 rounded-xl border border-emerald-100 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    placeholder="Enter company name"
                  />
                </div>

                <div className="flex flex-col gap-1.5 font-sans">
                  <label className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
                    <Hash size={15} className="text-emerald-500" />
                    Supplier Code
                  </label>
                  <input
                    type="text"
                    value={supplierFormData.code}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, code: e.target.value })}
                    className="px-4 py-3 rounded-xl border border-emerald-100 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    placeholder="e.g. SUP001"
                  />
                </div>

                <div className="flex flex-col gap-1.5 font-sans">
                  <label className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
                    <FileText size={15} className="text-emerald-500" />
                    GST Number
                  </label>
                  <input
                    type="text"
                    value={supplierFormData.gst}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, gst: e.target.value })}
                    className="px-4 py-3 rounded-xl border border-emerald-100 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono"
                    placeholder="22AAAAA0000A1Z5"
                  />
                </div>

                <div className="flex flex-col gap-1.5 font-sans">
                  <label className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
                    <FileText size={15} className="text-emerald-500" />
                    PAN Number
                  </label>
                  <input
                    type="text"
                    value={supplierFormData.pan}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, pan: e.target.value })}
                    className="px-4 py-3 rounded-xl border border-emerald-100 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono"
                    placeholder="ABCDE1234F"
                  />
                </div>

                <div className="flex flex-col gap-1.5 font-sans">
                  <label className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
                    <Phone size={15} className="text-emerald-500" />
                    Mobile Number
                  </label>
                  <input
                    type="text"
                    value={supplierFormData.mobile}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, mobile: e.target.value })}
                    className="px-4 py-3 rounded-xl border border-emerald-100 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    placeholder="10 digit mobile"
                  />
                </div>

                <div className="flex flex-col gap-1.5 font-sans">
                  <label className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
                    <Mail size={15} className="text-emerald-500" />
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={supplierFormData.email}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, email: e.target.value })}
                    className="px-4 py-3 rounded-xl border border-emerald-100 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    placeholder="supplier@email.com"
                  />
                </div>

                <div className="flex flex-col gap-1.5 font-sans">
                  <label className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
                    <CreditCard size={15} className="text-emerald-500" />
                    Payment Mode
                  </label>
                  <select
                    value={supplierFormData.paymentMode}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, paymentMode: e.target.value })}
                    className="px-4 py-3 rounded-xl border border-emerald-100 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  >
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="Card">Card</option>
                    <option value="Net Banking">Net Banking</option>
                    <option value="Credit">Credit</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5 font-sans md:col-span-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
                    <MapPin size={15} className="text-emerald-500" />
                    Billing Address
                  </label>
                  <textarea
                    rows="3"
                    value={supplierFormData.address}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, address: e.target.value })}
                    className="px-4 py-3 rounded-xl border border-emerald-100 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none"
                    placeholder="Enter full address..."
                  ></textarea>
                </div>

                <div className="flex justify-end gap-3 md:col-span-2 pt-4 border-t border-gray-100 mt-2">
                  <button
                    type="button"
                    onClick={() => setIsSupplierModalOpen(false)}
                    className="px-6 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-md font-medium"
                  >
                    Save Supplier
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Camera Barcode / IMEI Scanner Modal */}
        {showCameraScanner && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <BarcodeScanner
              onScan={handleCameraScan}
              onClose={() => { setShowCameraScanner(false); setCameraScanTarget(null); }}
              title={
                cameraScanTarget === "search"
                  ? "Scan Phone IMEI or Barcode to Search"
                  : `Scan ${cameraScanTarget?.toUpperCase()} with Camera`
              }
            />
          </div>
        )}

        {/* Wholesale Invoice OCR Modal */}
        <ReceiptScannerModal
          isOpen={isOcrModalOpen}
          onClose={() => setIsOcrModalOpen(false)}
          businessType="mobile_shop"
          onInventorySaved={() => {
            fetchMobiles();
            setIsOcrModalOpen(false);
          }}
        />

      </div>
    </BillingLayout>
  );
};

export default MobileInventory;

