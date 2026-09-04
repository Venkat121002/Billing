import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import API_URL from "../../config/api";
import BarcodeScanner from "../../components/Auth/BarcodeScanner";
import { useAuth } from "../../contexts/AuthContext";
import {
  ArrowLeft,
  Smartphone,
  Calendar,
  ShoppingCart,
  DollarSign,
  Tag,
  Cpu,
  HardDrive,
  Palette,
  User,
  FileText,
  Shield,
  Hash,
  Save,
  X,
  Receipt,
  ArrowRight,
  Check,
  MapPin,
  CreditCard,
  Clock,
  List
} from "lucide-react";
import BillingLayout from "../../Layout/BillingLayout/AdminLayout";
import toast from "react-hot-toast";
import { handleEnterToNext } from "../../utils/formUtils";



// InputField Component for consistency
const InputField = ({
  label,
  icon: Icon,
  value,
  onChange,
  type = "text",
  placeholder,
  required = false,
  className = "",
  readOnly = false,
}) => (
  <div className="flex flex-col gap-1.5">
    <label className="flex items-center gap-2 text-sm font-semibold text-green-800">
      {Icon && <Icon size={15} className="text-green-500" />}
      {label}
      {required && <span className="text-red-400 text-xs">*</span>}
    </label>
    <input
      type={type}
      value={value || ""}
      onChange={onChange}
      placeholder={placeholder || label}
      required={required}
      readOnly={readOnly}
      onKeyDown={handleEnterToNext}
      className={`px-4 py-3 rounded-xl border border-green-200 bg-white text-gray-700 placeholder-gray-400 
        focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-green-400 
        transition-all duration-200 hover:border-green-300 ${readOnly ? "bg-gray-50 cursor-not-allowed opacity-80" : ""} ${className}`}
    />
  </div>
);

const buyFieldConfig = {
  category: { label: "Category", icon: List, type: "select", options: ["Mobile", "Bluetooth", "Charger", "Headset", "Cable", "Adapter"] },
  brand: { label: "Brand", icon: Tag, type: "text" },
  model: { label: "Model", icon: Smartphone, type: "text" },
  stock: { label: "Stock (Quantity)", icon: HardDrive, type: "number" },
  ram: { label: "RAM (e.g. 8GB)", icon: Cpu, type: "number" },
  storage: { label: "Storage (e.g. 128GB)", icon: HardDrive, type: "number" },
  color: { label: "Color", icon: Palette, type: "text" },
  supplier: { label: "Supplier", icon: User, type: "select", options: [] },
  invoiceNo: { label: "Invoice No", icon: Receipt, type: "text" },
  dateOfPurchase: { label: "Date of Purchase", icon: Calendar, type: "date" },
  purchasePrice: { label: "Purchase Price (₹)", icon: DollarSign, type: "number" },
  purchaseGst: { label: "Purchase GST (%)", icon: FileText, type: "number", readOnly: true },
  purchaseGstAmount: { label: "Purchase GST Amount (₹)", icon: DollarSign, type: "number", readOnly: true },
  purchaseTotalAmount: { label: "Purchase Total Amount (₹)", icon: DollarSign, type: "number", readOnly: true },
  purchaseLocation: { label: "Purchase Location", icon: MapPin, type: "text" },
  paymentMethod: { label: "Payment Method", icon: CreditCard, type: "select", options: ["Cash", "UPI", "Card"] },
  isCredit: { label: "Purchase Credit?", icon: Clock, type: "select", options: ["No", "Yes"] },
};

const saleFieldConfig = {
  brand: { label: "Brand", icon: Tag, type: "text" },
  model: { label: "Model", icon: Smartphone, type: "text" },
  ram: { label: "RAM (e.g. 8GB)", icon: Cpu, type: "number" },
  storage: { label: "Storage (e.g. 128GB)", icon: HardDrive, type: "number" },
  color: { label: "Color", icon: Palette, type: "text" },
  salePrice: { label: "Sale Price (Excl. Tax) (₹)", icon: DollarSign, type: "number" },
  sgst: { label: "SGST (%)", icon: FileText, type: "number", readOnly: true },
  sgstAmount: { label: "SGST Amount (₹)", icon: DollarSign, type: "number", readOnly: true },
  cgst: { label: "CGST (%)", icon: FileText, type: "number", readOnly: true },
  cgstAmount: { label: "CGST Amount (₹)", icon: DollarSign, type: "number", readOnly: true },
  saleTotalPrice: { label: "Sale Total Price (Incl. Tax) (₹)", icon: DollarSign, type: "number", readOnly: true },
  gst: { label: "Total GST (%)", icon: FileText, type: "number", readOnly: true },
  warranty: { label: "Warranty (e.g. 1 Year)", icon: Shield, type: "text" },
};

const AddMobile = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const editingMobile = location.state?.mobile;
  const editingMobileId = location.state?.mobileId;

  const [activeTab, setActiveTab] = useState("buy");
  const [isSubmitting, setIsSubmitting] = useState(false);


  const [suppliers, setSuppliers] = useState([]);
  const [showScanner, setShowScanner] = useState(false);

  const [formData, setFormData] = useState({
    brand: "",
    model: "",
    ram: "",
    storage: "",
    color: "",
    imei1: "",
    imei2: "",
    stock: "1",
    imeiList: [{ imei1: "", imei2: "", color: "" }],
    supplier: "",
    invoiceNo: "",
    dop: "",
    purchasePrice: "",
    purchaseGst: "",
    purchaseGstAmount: "",
    purchaseTotalAmount: "",
    salePrice: "",
    sgst: "",
    sgstAmount: "",
    cgst: "",
    cgstAmount: "",
    gst: "",
    saleTotalPrice: "",
    warranty: "",
    category: "Mobile",
    purchaseLocation: "",
    paymentMethod: "Cash",
    isCredit: "No",
    dueSession: "",
    dueAmount: "",
    totalDueAmount: "",
  });

  // Step Validation Logic
  const validateBuyStep = () => {
    const requiredFields = [
      { key: "brand", label: "Brand" },
      { key: "model", label: "Model" },
      { key: "stock", label: "Stock" },
      { key: "purchasePrice", label: "Purchase Price" },
    ];

    if (formData.category === "Mobile") {
      requiredFields.push({ key: "imei1", label: "IMEI 1" });
    }

    for (const field of requiredFields) {
      if (!formData[field.key]) {
        toast.error(`${field.label} is required`);
        return false;
      }
    }

    if (parseInt(formData.stock) <= 0) {
      toast.error("Stock must be at least 1");
      return false;
    }

    if (parseFloat(formData.purchasePrice) < 0) {
      toast.error("Purchase price cannot be negative");
      return false;
    }

    return true;
  };

  const validateSaleStep = () => {
    if (!formData.salePrice || parseFloat(formData.salePrice) <= 0) {
      toast.error("Sale price must be greater than 0");
      return false;
    }
    return true;
  };

  // Load existing data for editing or set defaults from settings
  useEffect(() => {
    if (editingMobile && editingMobileId) {
      setFormData({
        brand: editingMobile.brand || "",
        model: editingMobile.model || "",
        ram: editingMobile.ram || "",
        storage: editingMobile.storage || "",
        color: editingMobile.color || "",
        imei1: editingMobile.imei1 || "",
        imei2: editingMobile.imei2 || "",
        supplier: editingMobile.supplier || "",
        invoiceNo: editingMobile.invoiceNo || "",
        dop: editingMobile.dop || "",
        purchasePrice: editingMobile.purchasePrice?.toString() || "",
        purchaseGst: editingMobile.purchaseGst?.toString() || "",
        purchaseGstAmount: editingMobile.purchaseGstAmount?.toString() || "",
        purchaseTotalAmount: editingMobile.purchaseTotalAmount?.toString() || "",
        salePrice: editingMobile.salePrice?.toString() || "",
        sgst: editingMobile.sgst?.toString() || "",
        sgstAmount: editingMobile.sgstAmount?.toString() || "",
        cgst: editingMobile.cgst?.toString() || "",
        cgstAmount: editingMobile.cgstAmount?.toString() || "",
        gst: editingMobile.gst?.toString() || "",
        saleTotalPrice: editingMobile.saleTotalPrice?.toString() || "",
        warranty: editingMobile.warranty || "",
        category: editingMobile.category || "Mobile",
        purchaseLocation: editingMobile.purchaseLocation || "",
        paymentMethod: editingMobile.paymentMethod || "Cash",
        isCredit: editingMobile.isCredit || "No",
        dueSession: editingMobile.dueSession || "",
        dueAmount: editingMobile.dueAmount || "",
        totalDueAmount: editingMobile.totalDueAmount || "",
        stock: "1",
        imeiList: [{ imei1: editingMobile.imei1 || "", imei2: editingMobile.imei2 || "", color: editingMobile.color || "" }],
      });
    } else if (currentUser?.Tenant) {
      const pGst = currentUser.Tenant.purchase_gst || 0;
      const sGst = currentUser.Tenant.sales_gst || 0;
      setFormData(prev => ({
        ...prev,
        purchaseGst: pGst.toString(),
        gst: sGst.toString(),
        sgst: (sGst / 2).toString(),
        cgst: (sGst / 2).toString(),
      }));
    }
  }, [editingMobile, editingMobileId, currentUser]);

  useEffect(() => {
    const fetchSuppliers = async () => {
      const token = sessionStorage.getItem("token");
      try {
        const res = await axios.get(`${API_URL}/suppliers`, {
          headers: { "x-auth-token": token },
        });
        setSuppliers(res.data);
      } catch (err) {
        console.error("Fetch suppliers error:", err);
      }
    };
    fetchSuppliers();
  }, []);

  // Handle auto-calculations for taxes and totals (Buy & Sale)
  useEffect(() => {
    setFormData(prev => {
      const updates = {};
      const tenant = currentUser?.Tenant;

      // Buy Details Logic
      const pPrice = parseFloat(prev.purchasePrice) || 0;
      const pGstRate = parseFloat(prev.purchaseGst) || 0;
      const isPInclusive = tenant?.purchase_tax_type === "inclusive";

      let pGstAmt, pTotal;
      if (isPInclusive) {
        // Price already includes Tax
        pTotal = pPrice;
        pGstAmt = pTotal - (pTotal / (1 + pGstRate / 100));
      } else {
        // Price + Tax
        pGstAmt = (pPrice * pGstRate) / 100;
        pTotal = pPrice + pGstAmt;
      }

      const fpGstAmt = pGstAmt.toFixed(2);
      const fpTotal = pTotal.toFixed(2);

      if (prev.purchaseGstAmount !== fpGstAmt) updates.purchaseGstAmount = fpGstAmt;
      if (prev.purchaseTotalAmount !== fpTotal) updates.purchaseTotalAmount = fpTotal;

      // Sale Details Logic
      const sPrice = parseFloat(prev.salePrice) || 0;
      const sgstR = parseFloat(prev.sgst) || 0;
      const cgstR = parseFloat(prev.cgst) || 0;
      const totalGstR = sgstR + cgstR;
      const isSInclusive = tenant?.sales_tax_type === "inclusive";

      let sGstAmt, cGstAmt, sTotal;
      if (isSInclusive) {
        // Price already includes Tax
        sTotal = sPrice;
        const totalTaxAmount = sTotal - (sTotal / (1 + totalGstR / 100));
        sGstAmt = totalTaxAmount * (sgstR / totalGstR || 0.5);
        cGstAmt = totalTaxAmount * (cgstR / totalGstR || 0.5);
      } else {
        // Price + Tax
        sGstAmt = (sPrice * sgstR) / 100;
        cGstAmt = (sPrice * cgstR) / 100;
        sTotal = sPrice + sGstAmt + cGstAmt;
      }

      const fsGstAmt = sGstAmt.toFixed(2);
      const fcGstAmt = cGstAmt.toFixed(2);
      const fTotalGstR = totalGstR.toFixed(2);
      const fSTotal = sTotal.toFixed(2);

      if (prev.sgstAmount !== fsGstAmt) updates.sgstAmount = fsGstAmt;
      if (prev.cgstAmount !== fcGstAmt) updates.cgstAmount = fcGstAmt;
      if (prev.gst !== fTotalGstR) updates.gst = fTotalGstR;
      if (prev.saleTotalPrice !== fSTotal) updates.saleTotalPrice = fSTotal;

      return Object.keys(updates).length > 0 ? { ...prev, ...updates } : prev;
    });
  }, [formData.purchasePrice, formData.purchaseGst, formData.salePrice, formData.sgst, formData.cgst, currentUser]);

  const handleChange = (field) => (e) => {
    const { value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };

      if (field === "stock" && prev.category !== "Mobile") {
        const count = parseInt(value) || 1;
        const currentList = [...prev.imeiList];
        if (count > currentList.length) {
          for (let i = currentList.length; i < count; i++) {
            currentList.push({ imei1: "", imei2: "", color: prev.color || "" });
          }
        } else if (count < currentList.length) {
          currentList.length = count;
        }
        updated.imeiList = currentList;
      }
      return updated;
    });
  };

  const addIMEIRow = () => {
    setFormData(prev => ({
      ...prev,
      imeiList: [...prev.imeiList, { imei1: "", imei2: "", color: prev.color || "" }],
      stock: (prev.imeiList.length + 1).toString()
    }));
  };

  const removeIMEIRow = (index) => {
    setFormData(prev => {
      if (prev.imeiList.length <= 1) {
        toast.error("At least one IMEI row is required");
        return prev;
      }
      const newList = [...prev.imeiList];
      newList.splice(index, 1);
      return { ...prev, imeiList: newList, stock: newList.length.toString() };
    });
  };

  const handleIMEIChange = (index, field) => (e) => {
    const { value } = e.target;
    setFormData((prev) => {
      const newList = [...prev.imeiList];
      newList[index] = { ...newList[index], [field]: value };

      // Keep top-level fields in sync with the first entry for legacy support/single scan
      if (index === 0) {
        return { ...prev, imeiList: newList, [field]: value };
      }
      return { ...prev, imeiList: newList };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (activeTab === "buy") {
      if (validateBuyStep()) {
        setActiveTab("sale");
      }
      return;
    }

    // Now in sale tab, validate sale details before saving
    if (!validateSaleStep()) {
      return;
    }

    if (!currentUser) {
      toast.error("Authentication error");
      return;
    }

    if (formData.category === "Mobile" && !formData.imei1) {
      toast.error("IMEI 1 is required");
      return;
    }

    const token = sessionStorage.getItem("token");
    if (!token) {
      toast.error("Session expired");
      return;
    }

    setIsSubmitting(true);

    try {
      const baseMobileData = {
        ...formData,
        purchasePrice: Number(formData.purchasePrice || 0),
        purchaseGst: Number(formData.purchaseGst || 0),
        purchaseGstAmount: Number(formData.purchaseGstAmount || 0),
        purchaseTotalAmount: Number(formData.purchaseTotalAmount || 0),
        salePrice: Number(formData.salePrice || 0),
        sgst: Number(formData.sgst || 0),
        sgstAmount: Number(formData.sgstAmount || 0),
        cgst: Number(formData.cgst || 0),
        cgstAmount: Number(formData.cgstAmount || 0),
        gst: Number(formData.gst || 0),
        saleTotalPrice: Number(formData.saleTotalPrice || 0),
        name: `${formData.brand} ${formData.model}`,
        category: formData.category || "Mobile",
        purchaseLocation: formData.purchaseLocation,
        paymentMethod: formData.paymentMethod,
        isCredit: formData.isCredit,
        dueSession: formData.dueSession,
        dueAmount: Number(formData.dueAmount || 0),
        totalDueAmount: Number(formData.totalDueAmount || 0),
        updatedAt: new Date().toISOString(),
      };

      // Remove imeiList and stock from individual product data
      delete baseMobileData.imeiList;
      delete baseMobileData.stock;

      const token = sessionStorage.getItem("token");
      const config = {
        headers: { "x-auth-token": token },
      };

      if (editingMobileId) {
        const finalData = {
          ...baseMobileData,
          imei1: formData.category === "Mobile" ? formData.imeiList[0].imei1 : "",
          imei2: formData.category === "Mobile" ? formData.imeiList[0].imei2 : "",
          quantity: formData.category === "Mobile" ? 1 : Number(formData.stock),
        };
        await axios.put(`${API_URL}/products/${editingMobileId}`, finalData, config);
        toast.success("Product updated successfully!");
        navigate("/inventory");
        return;
      } else if (formData.category === "Mobile") {
        // Save each IMEI set as a new product
        const savePromises = formData.imeiList.map(async (imeiSet) => {
          if (!imeiSet.imei1) return null;
          const finalData = {
            ...baseMobileData,
            imei1: imeiSet.imei1,
            imei2: imeiSet.imei2,
            color: imeiSet.color || formData.color,
            quantity: 1,
            createdAt: new Date().toISOString(),
          };
          return axios.post(`${API_URL}/products`, finalData, config);
        });

        await Promise.all(savePromises.filter(p => p !== null));
        toast.success(`${formData.imeiList.filter(i => i.imei1).length} device(s) added successfully!`);
      } else {
        // Accessories: Save single record with quantity
        const finalData = {
          ...baseMobileData,
          imei1: "",
          imei2: "",
          quantity: Number(formData.stock),
          createdAt: new Date().toISOString(),
        };
        await axios.post(`${API_URL}/products`, finalData, config);
        toast.success("Product added successfully!");
      }

      // Reset form instead of navigating
      setFormData({
        brand: "",
        model: "",
        ram: "",
        storage: "",
        color: "",
        imei1: "",
        imei2: "",
        stock: "1",
        imeiList: [{ imei1: "", imei2: "" }],
        supplier: "",
        invoiceNo: "",
        dop: "",
        purchasePrice: "",
        purchaseGst: currentUser.Tenant?.purchase_gst?.toString() || "",
        purchaseGstAmount: "",
        purchaseTotalAmount: "",
        salePrice: "",
        sgst: (currentUser.Tenant?.sales_gst / 2 || 0).toString(),
        sgstAmount: "",
        cgst: (currentUser.Tenant?.sales_gst / 2 || 0).toString(),
        cgstAmount: "",
        gst: (currentUser.Tenant?.sales_gst || 0).toString(),
        saleTotalPrice: "",
        warranty: "",
        category: "Mobile",
        purchaseLocation: "",
        paymentMethod: "Cash",
        isCredit: "No",
        dueSession: "",
        dueAmount: "",
        totalDueAmount: "",
      });
      setActiveTab("buy");
    } catch (err) {
      console.error("Save error:", err);
      toast.error(err.response?.data?.msg || "Failed to save mobile");
    } finally {
      setIsSubmitting(false);
    }
  };


  const handleScan = async (barcodeValue) => {
    try {
      const token = sessionStorage.getItem("token");

      const res = await axios.get(
        `${API_URL}/products/barcode/${barcodeValue}`,
        { headers: { "x-auth-token": token } }
      );

      const product = res.data;

      setFormData({
        brand: product.brand || "",
        model: product.model || "",
        ram: product.ram || "",
        storage: product.storage || "",
        color: product.color || "",
        imei1: product.imei1 || "",
        imei2: product.imei2 || "",
        supplier: product.supplier || "",
        purchasePrice: product.purchasePrice?.toString() || "",
        purchaseGst: product.purchaseGst?.toString() || "",
        purchaseGstAmount: product.purchaseGstAmount?.toString() || "",
        purchaseTotalAmount: product.purchaseTotalAmount?.toString() || "",
        salePrice: product.salePrice?.toString() || "",
        sgst: product.sgst?.toString() || "",
        sgstAmount: product.sgstAmount?.toString() || "",
        cgst: product.cgst?.toString() || "",
        cgstAmount: product.cgstAmount?.toString() || "",
        gst: product.gst?.toString() || "",
        saleTotalPrice: product.saleTotalPrice?.toString() || "",
        warranty: product.warranty || "",
      });

      toast.success("Product loaded successfully!");
      setShowScanner(false);

    } catch (error) {
      toast.error("Product not found");
    }
  };

  return (
    <BillingLayout>
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50">

        {/* HEADER */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 px-8 py-6 shadow-lg">
          <div className="flex items-center justify-between max-w-5xl mx-auto">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <Smartphone size={26} className="text-green-100" />
                {editingMobileId ? "Edit Mobile Device" : "Add New Mobile"}
              </h1>
              <p className="text-green-100 text-sm mt-1 ml-10">
                Manage mobile device stock & pricing
              </p>
            </div>

            <button
              onClick={() => navigate("/inventory")}
              className="flex items-center gap-2 bg-white/90 backdrop-blur px-5 py-2.5 rounded-xl text-green-700 font-medium hover:bg-white hover:shadow-md transition-all duration-200"
            >
              <ArrowLeft size={16} />
              Back
            </button>
          </div>
        </div>

        {/* FORM */}
        <div className="px-8 py-10 max-w-5xl mx-auto">
          {/* Progress Indicator */}
          <div className="mb-10 flex items-center justify-center gap-4">
            <div className={`flex items-center gap-3 px-6 py-3 rounded-2xl transition-all duration-300 ${activeTab === "buy" ? "bg-green-600 text-white shadow-lg scale-105" : "bg-green-100 text-green-700"}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${activeTab === "buy" ? "bg-white text-green-600" : "bg-green-600 text-white"}`}>
                {activeTab === "sale" ? <Check size={18} /> : "1"}
              </div>
              <span className="font-bold tracking-wide uppercase text-sm">Buy Details</span>
            </div>

            <div className="h-px w-16 bg-green-200"></div>

            <div className={`flex items-center gap-3 px-6 py-3 rounded-2xl transition-all duration-300 ${activeTab === "sale" ? "bg-green-600 text-white shadow-lg scale-105" : "bg-gray-100 text-gray-400"}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${activeTab === "sale" ? "bg-white text-green-600" : "bg-gray-300 text-white"}`}>
                2
              </div>
              <span className="font-bold tracking-wide uppercase text-sm">Sale Details</span>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="bg-white p-10 rounded-3xl shadow-xl border border-green-100 space-y-8"
          >
            {/* IMEI Section - Conditionally Visible */}
            {formData.category === "Mobile" && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6">
                <label className="flex items-center gap-2 text-green-700 font-bold text-lg mb-4">
                  <Smartphone size={22} className="text-green-500" />
                  IMEI & Color Details
                </label>
                <div className="flex gap-3 mb-6">
                  <button
                    type="button"
                    onClick={() => setShowScanner(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors shadow-sm"
                  >
                    <Hash size={18} />
                    Scan Barcode
                  </button>
                  <button
                    type="button"
                    onClick={addIMEIRow}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors shadow-sm"
                  >
                    <Check size={18} />
                    Add New Device
                  </button>
                </div>

                {showScanner && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="bg-white p-6 rounded-xl">
                      <BarcodeScanner onScan={handleScan} />
                      <button
                        onClick={() => setShowScanner(false)}
                        className="mt-4 px-4 py-2 bg-red-500 text-white rounded"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-6">
                  {formData.imeiList.map((imeiSet, index) => (
                    <div key={index} className="p-5 bg-white/70 rounded-2xl border border-green-100 shadow-sm relative group">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-bold text-green-700 uppercase tracking-wider bg-green-100 px-3 py-1 rounded-full">
                          Device #{index + 1}
                        </span>
                        {formData.imeiList.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeIMEIRow(index)}
                            className="text-red-400 hover:text-red-600 transition-colors p-1"
                            title="Remove Device"
                          >
                            <X size={18} />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <InputField
                          label={`IMEI 1`}
                          icon={Hash}
                          value={imeiSet.imei1}
                          onChange={handleIMEIChange(index, "imei1")}
                          placeholder="Enter IMEI 1"
                          required
                          className="tracking-widest"
                        />
                        <InputField
                          label={`IMEI 2`}
                          icon={Hash}
                          value={imeiSet.imei2}
                          onChange={handleIMEIChange(index, "imei2")}
                          placeholder="IMEI 2 (Optional)"
                          className="tracking-widest"
                        />
                        <InputField
                          label={`Color`}
                          icon={Palette}
                          value={imeiSet.color}
                          onChange={handleIMEIChange(index, "color")}
                          placeholder="Device Color"
                          required
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            { /*Barcode Generation*/}
            { /*Barcode Generation removed*/}

            {/* Tabs */}
            <div className="flex gap-3 bg-green-50 p-1.5 rounded-xl w-fit">

              <button
                type="button"
                onClick={() => setActiveTab("buy")}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all duration-200 ${activeTab === "buy"
                  ? "bg-green-600 text-white shadow-md"
                  : "bg-transparent text-green-700 hover:bg-green-100"
                  }`}
              >
                <ShoppingCart size={16} />
                Buy Details
              </button>

              <button
                type="button"
                onClick={() => {
                  if (validateBuyStep()) setActiveTab("sale");
                }}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all duration-200 ${activeTab === "sale"
                  ? "bg-green-600 text-white shadow-md"
                  : "bg-transparent text-green-700 hover:bg-green-100"
                  }`}
              >
                <DollarSign size={16} />
                Sale Details
              </button>
            </div>


            {/* Tab Content */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {activeTab === "buy" ? (
                Object.entries(buyFieldConfig)
                  .filter(([field]) => {
                    if (formData.category === "Mobile" && (field === "stock" || field === "color")) {
                      return false;
                    }
                    if (formData.category !== "Mobile" && (field === "ram" || field === "storage")) {
                      return false;
                    }
                    return true;
                  })
                  .map(([field, config]) => (
                    config.type === "select" ? (
                      <div key={field} className="flex flex-col gap-1.5">
                        <label className="flex items-center gap-2 text-sm font-semibold text-green-800">
                          {config.icon && <config.icon size={15} className="text-green-500" />}
                          {config.label}
                        </label>
                        <select
                          value={formData[field]}
                          onChange={handleChange(field)}
                          className="px-4 py-3 rounded-xl border border-green-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-green-400 transition-all duration-200 hover:border-green-300"
                        >
                          {field === "supplier" ? (
                            <>
                              <option value="">Select Supplier</option>
                              {suppliers.map(s => (
                                <option key={s.id} value={s.company || s.name}>
                                  {s.company ? `${s.company} (${s.name})` : s.name}
                                </option>
                              ))}
                            </>
                          ) : (
                            config.options.map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))
                          )}
                        </select>
                      </div>
                    ) : (
                      <InputField
                        key={field}
                        label={config.label}
                        icon={config.icon}
                        type={config.type}
                        value={formData[field]}
                        onChange={handleChange(field)}
                        placeholder={config.label}
                        readOnly={config.readOnly || (field === "stock" && !!editingMobileId)}
                        className={config.readOnly ? "font-bold text-green-600" : ""}
                      />
                    )
                  ))
              ) : (
                Object.entries(saleFieldConfig).map(([field, config]) => (
                  <InputField
                    key={field}
                    label={config.label}
                    icon={config.icon}
                    type={config.type}
                    value={formData[field]}
                    onChange={handleChange(field)}
                    placeholder={config.label}
                    readOnly={config.readOnly}
                    className={config.readOnly ? "font-bold text-emerald-600" : ""}
                  />
                ))
              )}

              {/* Conditional Credit Fields */}
              {activeTab === "buy" && formData.isCredit === "Yes" && (
                <>
                  <InputField
                    label="Due Session"
                    icon={Clock}
                    value={formData.dueSession}
                    onChange={handleChange("dueSession")}
                    placeholder="e.g. 1 Month"
                  />
                  <InputField
                    label="Due Amount (₹)"
                    icon={DollarSign}
                    type="number"
                    value={formData.dueAmount}
                    onChange={handleChange("dueAmount")}
                    placeholder="Enter current due"
                  />
                  <InputField
                    label="Total Due Amount (₹)"
                    icon={DollarSign}
                    type="number"
                    value={formData.totalDueAmount}
                    onChange={handleChange("totalDueAmount")}
                    placeholder="Enter total due"
                  />
                </>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="flex justify-end gap-4 pt-6 border-t border-green-50">
              <button
                type="button"
                onClick={() => navigate("/inventory")}
                className="flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-all duration-200 font-medium"
              >
                <X size={16} />
                Cancel
              </button>

              {activeTab === "buy" ? (
                <button
                  type="button"
                  onClick={() => {
                    if (validateBuyStep()) setActiveTab("sale");
                  }}
                  className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-200 font-medium shadow-md hover:shadow-lg"
                >
                  <ArrowRight size={16} />
                  Next
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-200 font-medium shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Save size={16} />
                  {isSubmitting ? "Saving..." : editingMobileId ? "Update Device" : "Save Device"}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </BillingLayout>
  );
};

export default AddMobile;
