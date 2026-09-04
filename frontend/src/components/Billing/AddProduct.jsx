import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../contexts/AuthContext";
import {
  ArrowLeft,
  ArrowRight,
  ScanBarcode,
  Smartphone,
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
  Palette,
  HardDrive,
  Cpu,
  Shield,
  Hash,
  Save,
  X,
} from "lucide-react";
import BillingLayout from "../../Layout/BillingLayout/AdminLayout";
import toast from "react-hot-toast";
import API_URL from "../../config/api";

// ✅ MOVED OUTSIDE the component so it doesn't re-create on every render
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
}) => (
  <div className="flex flex-col gap-1.5">
    <label className="flex items-center gap-2 text-sm font-semibold text-green-800">
      {Icon && <Icon size={15} className="text-green-500" />}
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
      className={`px-4 py-3 rounded-xl border border-green-200 bg-white text-gray-700 placeholder-gray-400 
        focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-green-400 
        transition-all duration-200 hover:border-green-300 ${className}`}
    />
  </div>
);

const groceryData = {
  "Food & Staples": ["Rice", "Wheat", "Atta", "Dals & Pulses", "Flour", "Sugar"],
  "Snacks & Packaged Foods": ["Chips", "Biscuits", "Namkeen", "Instant noodles", "Chocolates"],
  "Beverages": ["Soft drinks", "Juice", "Tea", "Coffee", "Energy drinks"],
  "Spices & Seasonings": ["Turmeric", "Chilli powder", "Masala", "Salt", "Pickle masala"],
  "Oils & Fats": ["Cooking oil", "Ghee", "Butter"],
  "Dairy Products": ["Milk", "Curd", "Paneer", "Cheese"],
  "Bakery Items": ["Bread", "Cakes", "Buns", "Rusk"],
  "Ready-to-Eat / Packaged": ["Pickles", "Sauces", "Jam", "Instant food"],
  "Household Items": ["Detergent", "Dishwash", "Floor cleaner", "Cleaning liquids"],
  "Personal Care": ["Shampoo", "Soap", "Toothpaste", "Face wash"],
  "Fruits & Vegetables": ["Fresh vegetables", "Fruits"],
  "Meat & Eggs": ["Eggs", "Chicken", "Meat"]
};

// ✅ Field configs also moved outside - they never change
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

const saleFieldConfig = {
  salesPrice: { label: "Sales Price (₹)", icon: DollarSign, type: "number" },
  salesGst: { label: "Sales GST (%)", icon: FileText, type: "number", readOnly: true },
  salesDate: { label: "Sales Date", icon: Calendar, type: "date" },
};

const mobileFieldConfig = {
  brand: { label: "Brand", icon: Tag, type: "text" },
  model: { label: "Model", icon: Smartphone, type: "text" },
  ram: { label: "RAM (e.g. 8GB)", icon: Cpu, type: "text" },
  storage: { label: "Storage (e.g. 128GB)", icon: HardDrive, type: "text" },
  color: { label: "Color", icon: Palette, type: "text" },
  supplier: { label: "Supplier", icon: User, type: "text" },
  purchasePrice: { label: "Purchase Price (₹)", icon: DollarSign, type: "number" },
  salePrice: { label: "Sale Price (₹)", icon: DollarSign, type: "number" },
  gst: { label: "GST (%)", icon: FileText, type: "number" },
  warranty: { label: "Warranty (e.g. 1 Year)", icon: Shield, type: "text" },
};

const AddProduct = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const editingProduct = location.state?.product;
  const editingProductId = location.state?.productId;

  const [isMobileIndustry, setIsMobileIndustry] = useState(false);
  const [activeTab, setActiveTab] = useState("buy");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [suppliers, setSuppliers] = useState([]);

  useEffect(() => {
    if (currentUser) {
      const userIndustry =
        currentUser.industry || currentUser.companyDetails?.industry;
      if (userIndustry) {
        const isMobile =
          userIndustry.toLowerCase().includes("mobile") ||
          userIndustry.toLowerCase() === "mobile_shop";
        setIsMobileIndustry(isMobile);
      }
    }
  }, [currentUser]);

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

  const [mobileData, setMobileData] = useState({
    brand: "",
    model: "",
    ram: "",
    storage: "",
    color: "",
    imei1: "",
    imei2: "",
    supplier: "",
    purchasePrice: "",
    salePrice: "",
    gst: "",
    warranty: "",
  });

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
  useEffect(() => {
    if (editingProductId) return; // Only for new products
    const totalItems = (parseFloat(buyData.quantity) || 0) * (parseFloat(buyData.unit) || 0);
    if (totalItems > 0) {
      const newReorderLevel = Math.ceil(totalItems * 0.1); // 10% rule
      setBuyData(prev => ({ ...prev, reorderLevel: newReorderLevel.toString() }));
    }
  }, [buyData.quantity, buyData.unit, editingProductId]);

  // Handle auto-calculations for Buy Data
  useEffect(() => {
    const tenant = currentUser?.Tenant;
    const pPrice = parseFloat(buyData.purchasePrice) || 0;
    const pGstLimit = parseFloat(buyData.purchaseGst) || 0;
    const pQty = parseFloat(buyData.quantity) || 0;
    const unitVal = parseFloat(buyData.unit);
    const pUnit = isNaN(unitVal) ? 1 : unitVal;
    const multiplier = pQty * pUnit;

    const isPInclusive = tenant?.purchase_tax_type === "inclusive";

    let pGstAmt, pTotal;
    if (isPInclusive) {
      const unitTotal = pPrice;
      const unitGst = unitTotal - (unitTotal / (1 + pGstLimit / 100));
      pTotal = unitTotal * multiplier;
      pGstAmt = unitGst * multiplier;
    } else {
      const unitGst = (pPrice * pGstLimit) / 100;
      const unitTotal = pPrice + unitGst;
      pTotal = unitTotal * multiplier;
      pGstAmt = unitGst * multiplier;
    }

    setBuyData(prev => ({
      ...prev,
      purchaseGstAmount: pGstAmt.toFixed(2),
      purchaseTotalAmount: pTotal.toFixed(2),
    }));
  }, [buyData.purchasePrice, buyData.purchaseGst, buyData.quantity, buyData.unit, currentUser]);

  // Handle auto-calculations for Sale Data
  useEffect(() => {
    const tenant = currentUser?.Tenant;
    const sPrice = parseFloat(saleData.salesPrice) || 0;
    const sGstLimit = parseFloat(saleData.salesGst) || 0;
    const isSInclusive = tenant?.sales_tax_type === "inclusive";

    let sGstAmt, sTotal;
    if (isSInclusive) {
      sTotal = sPrice;
      sGstAmt = sTotal - (sTotal / (1 + sGstLimit / 100));
    } else {
      sGstAmt = (sPrice * sGstLimit) / 100;
      sTotal = sPrice + sGstAmt;
    }

    setSaleData(prev => ({
      ...prev,
      salesGstAmount: sGstAmt.toFixed(2),
      salesTotalAmount: sTotal.toFixed(2),
    }));
  }, [saleData.salesPrice, saleData.salesGst, currentUser]);

  useEffect(() => {
    if (editingProduct && editingProductId) {
      setBuyData({
        category: editingProduct.category || "",
        productType: editingProduct.productType || "",
        name: editingProduct.name.chatAt(0).toUpperCase() + editingProduct.name.slice(1) || "",
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
      });

      setSaleData({
        salesPrice: editingProduct.salePrice?.toString() || "",
        salesGst: editingProduct.salesGst?.toString() || "",
        salesDate: editingProduct.salesDate || "",
      });

      setMobileData({
        brand: editingProduct.brand || "",
        model: editingProduct.model || "",
        ram: editingProduct.ram || "",
        storage: editingProduct.storage || "",
        color: editingProduct.color || "",
        imei1: editingProduct.imei1 || "",
        imei2: editingProduct.imei2 || "",
        supplier: editingProduct.supplier || "",
        purchasePrice: editingProduct.purchasePrice?.toString() || "",
        salePrice: editingProduct.salePrice?.toString() || "",
        gst: editingProduct.gst?.toString() || "",
        warranty: editingProduct.warranty || "",
      });
    }
  }, [editingProduct, editingProductId]);

  // ✅ Stable handler functions using callback pattern
  const handleMobileChange = (field) => (e) => {
    const val = e.target.value;
    setMobileData((prev) => ({ ...prev, [field]: val }));
  };

  const handleBuyChange = (field) => (e) => {
    const val = e.target.value;
    setBuyData((prev) => ({ ...prev, [field]: val }));
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

    if (!isMobileIndustry && activeTab === "buy") {
      setActiveTab("sale");
      window.scrollTo(0, 0);
      return;
    }

    setIsSubmitting(true);

    try {
      let productData = {};

      if (isMobileIndustry) {
        if (!mobileData.imei1) {
          toast.error("IMEI 1 is required");
          setIsSubmitting(false);
          return;
        }

        productData = {
          ...mobileData,
          purchasePrice: Number(mobileData.purchasePrice || 0),
          salePrice: Number(mobileData.salePrice || 0),
          gst: Number(mobileData.gst || 0),
          name: `${mobileData.brand} ${mobileData.model}`,
          quantity: 1,
          updatedAt: new Date().toISOString(),
        };
      } else {
        productData = {
          ...buyData,
          ...saleData,
          purchasePrice: Number(buyData.purchasePrice || 0),
          salePrice: Number(saleData.salesPrice || 0),
          purchaseGst: Number(buyData.purchaseGst || 0),
          salesGst: Number(saleData.salesGst || 0),
          quantity: Number(buyData.quantity || 0),
          reorderLevel: Number(buyData.reorderLevel || 0),
          updatedAt: new Date().toISOString(),
        };
      }

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
        toast.success("Product updated!");
      } else {
        productData.createdAt = new Date().toISOString();
        await axios.post(`${API_URL}/products`, productData, config);
        toast.success("Product added!");
      }

      navigate("/inventory");
    } catch (err) {
      console.error("Product Save Error:", err);
      const msg = err.response?.data?.msg || "Failed to save product";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
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
                {isMobileIndustry ? (
                  <Smartphone size={26} className="text-green-100" />
                ) : (
                  <Package size={26} className="text-green-100" />
                )}
                {editingProductId
                  ? isMobileIndustry
                    ? "Edit Mobile Device"
                    : "Edit Product"
                  : isMobileIndustry
                    ? "Add New Mobile"
                    : "Add New Product"}
              </h1>
              <p className="text-green-100 text-sm mt-1 ml-10">
                {isMobileIndustry
                  ? "Manage mobile device stock & pricing"
                  : "Manage product inventory & pricing"}
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
          <form
            onSubmit={handleSubmit}
            className="bg-white p-10 rounded-3xl shadow-xl border border-green-100 space-y-8"
          >
            {isMobileIndustry ? (
              <>
                {/* IMEI Section */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6">
                  <label className="flex items-center gap-2 text-green-700 font-bold text-lg mb-4">
                    <Smartphone size={22} className="text-green-500" />
                    IMEI Details
                  </label>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <InputField
                      label="IMEI 1"
                      icon={Hash}
                      value={mobileData.imei1}
                      onChange={handleMobileChange("imei1")}
                      placeholder="Enter IMEI 1"
                      required
                      className="tracking-widest text-lg"
                    />
                    <InputField
                      label="IMEI 2"
                      icon={Hash}
                      value={mobileData.imei2}
                      onChange={handleMobileChange("imei2")}
                      placeholder="Enter IMEI 2 (Optional)"
                      className="tracking-widest text-lg"
                    />
                  </div>
                </div>

                {/* Mobile Info */}
                <div>
                  <h3 className="flex items-center gap-2 text-green-700 font-bold text-lg mb-5 pb-2 border-b border-green-100">
                    <Smartphone size={20} className="text-green-500" />
                    Device Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {Object.entries(mobileFieldConfig).map(([field, config]) => (
                      <InputField
                        key={field}
                        label={config.label}
                        icon={config.icon}
                        type={config.type}
                        value={mobileData[field]}
                        onChange={handleMobileChange(field)}
                        placeholder={config.label}
                        list={field === "supplier" ? "supplier-list" : undefined}
                      />
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Barcode Section */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6">
                  <label className="flex items-center gap-2 text-green-700 font-bold text-lg mb-4">
                    <ScanBarcode size={22} className="text-green-500" />
                    Barcode
                  </label>

                  <div className="flex gap-3">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={buyData.barcode}
                        onChange={handleBuyChange("barcode")}
                        placeholder="Scan or enter barcode"
                        className="w-full px-4 py-3 rounded-xl border border-green-300 focus:ring-2 focus:ring-green-300 focus:border-green-400 outline-none text-lg tracking-widest bg-white transition-all duration-200 hover:border-green-400"
                        autoFocus
                      />
                    </div>

                  </div>
                </div>

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
                    Purchase Details
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("sale")}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all duration-200 ${activeTab === "sale"
                      ? "bg-green-600 text-white shadow-md"
                      : "bg-transparent text-green-700 hover:bg-green-100"
                      }`}
                  >
                    <DollarSign size={16} />
                    Sales Details
                  </button>
                </div>

                {/* Purchase Fields */}
                {activeTab === "buy" && (
                  <div>
                    <h3 className="flex items-center gap-2 text-green-700 font-bold text-lg mb-5 pb-2 border-b border-green-100">
                      <ShoppingCart size={20} className="text-green-500" />
                      Purchase Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {Object.keys(buyData).map((field) => {
                        if (field === "barcode") return null;
                        const config = buyFieldConfig[field];
                        if (!config) return null; // Skip calculated fields not in config

                        const listId = field === "category" ? "category-list" : field === "productType" ? "product-name-list" : field === "supplier" ? "supplier-list" : undefined;

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
                          />
                        );
                      })}
                      {/* Additional calculated fields for clarity */}
                      <InputField
                        label="GST Amount (₹)"
                        icon={DollarSign}
                        value={buyData.purchaseGstAmount}
                        readOnly
                        className="font-bold text-green-600"
                      />
                      <InputField
                        label="Grand Total (₹)"
                        icon={DollarSign}
                        value={buyData.purchaseTotalAmount}
                        readOnly
                        className="font-bold text-green-700"
                      />
                        <InputField
                        label="Total Items"
                        icon={Layers}
                        value={((parseFloat(buyData.quantity) || 0) * (parseFloat(buyData.unit) || 0)) || 0}
                        readOnly
                        className="font-bold text-blue-600"
                      />
                    </div>

                    <datalist id="category-list">
                      {Object.keys(groceryData).sort().map(cat => <option key={cat} value={cat} />)}
                    </datalist>
                    <datalist id="product-name-list">
                      {(groceryData[buyData.category] || []).slice().sort().map(prod => <option key={prod} value={prod} />)}
                    </datalist>

                  </div>
                )}

                {/* Sales Fields */}
                {activeTab === "sale" && (
                  <div>
                    <h3 className="flex items-center gap-2 text-green-700 font-bold text-lg mb-5 pb-2 border-b border-green-100">
                      <DollarSign size={20} className="text-green-500" />
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
                          />
                        );
                      })}
                      <InputField
                        label="GST Amount (₹)"
                        icon={DollarSign}
                        value={saleData.salesGstAmount}
                        readOnly
                        className="font-bold text-green-600"
                      />
                      <InputField
                        label="Grand Total (₹)"
                        icon={DollarSign}
                        value={saleData.salesTotalAmount}
                        readOnly
                        className="font-bold text-green-700"
                      />
                    
                    </div>
                  </div>
                )}
              </>
            )}

            <datalist id="supplier-list">
              {suppliers.map((s) => (
                <option key={s.id} value={s.name} />
              ))}
            </datalist>

            {/* Divider */}
            <div className="border-t border-green-100"></div>

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
                className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-200 font-medium shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {!isMobileIndustry && activeTab === "buy" ? (
                  <ArrowRight size={16} />
                ) : (
                  <Save size={16} />
                )}
                {isSubmitting
                  ? "Saving..."
                  : !isMobileIndustry && activeTab === "buy"
                  ? "Next: Sales Details"
                  : editingProductId
                  ? "Update Product"
                  : "Save Product"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </BillingLayout>
  );
};

export default AddProduct;