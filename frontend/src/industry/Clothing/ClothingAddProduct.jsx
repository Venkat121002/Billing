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
    <label className="flex items-center gap-2 text-sm font-semibold text-[#f74faf]">
      {Icon && <Icon size={15} className="text-[#f74faf]" />}
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
      className={`px-4 py-3 rounded-xl border border-[#f74faf]/20 bg-white text-gray-700 placeholder-gray-300 
        focus:outline-none focus:ring-2 focus:ring-[#f74faf]/40 focus:border-[#f74faf] 
        transition-all duration-200 hover:border-[#f74faf]/40 ${className}`}
    />
  </div>
);

const groceryData = {
   "Men": ["Shirts", "T-Shirts", "Jeans", "Trousers ", "Shorts", "Jackets","Blazers","Innerwear","Ethnic Wear (Kurta, Sherwani)"],
  "Women": ["Sarees", "Kurtis / Kurtas", "Salwar Suits", "Tops", "Dresses","Jeans & Leggings","Skirts","Nightwear","Ethnic Wear (Lehenga, Gown)"],
  "Kids": ["Boys Wear", "Girls Wear", "Baby Wear (0–3 yrs)", "School Uniforms"],
  "Winter Wear": ["Sweaters", "Hoodies", "Jackets", "Shawls"],
  "Sports Wear": ["Track Pants", "Gym Wear", "Active T-Shirts","Shorts"],
  "Accessories ": ["Belts", "Caps", "Socks", "Handkerchiefs","Scarves / Dupattas"],
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
  description: { label: "Size", icon: FileText, type: "text" },
  unit: { label: "Unit", icon: Layers, type: "text" },
  reorderLevel: { label: "Reorder Level", icon: AlertTriangle, type: "number" },
};

const saleFieldConfig = {
  salesPrice: { label: "Sales Price (₹)", icon: DollarSign, type: "number" },
  salesGst: { label: "Sales GST (%)", icon: FileText, type: "number" },
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

const ClothingAddProduct = () => {
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
    const totalItems = (parseFloat(buyData.quantity) || 0) * (parseFloat(buyData.unit) || 0);
    // Auto-calculate if it's a new product or if the reorder level is currently empty/zero
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

        productData = {
          ...buyData,
          ...saleData,
          purchasePrice: Number(buyData.purchasePrice ),
          salePrice: Number(saleData.salesPrice ),
          purchaseGst: Number(buyData.purchaseGst ),
          salesGst: Number(saleData.salesGst ),
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
      <div className="min-h-screen bg-gradient-to-br from-[#f74faf]/10 via-white to-[#f74faf]/5">
        {/* HEADER */}
        <div className="bg-[#f74faf] px-8 py-8 shadow-lg">
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
              <p className="text-white/80 text-sm mt-1 ml-10">
                {isMobileIndustry
                  ? "Manage mobile device stock & pricing"
                  : "Design your collection and set price points"}
              </p>
            </div>

            <button
              onClick={() => navigate("/inventory")}
              className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-5 py-2.5 rounded-xl text-white border border-white/20 font-medium hover:bg-white/20 transition-all duration-300"
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
            className="bg-white p-10 rounded-[2.5rem] shadow-2xl shadow-[#f74faf]/10 border border-[#f74faf]/10 space-y-10"
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
                <div className="bg-gradient-to-r from-[#f74faf]/10 to-[#f74faf]/5 border border-[#f74faf]/20 rounded-3xl p-8">
                  <label className="flex items-center gap-2 text-[#f74faf] font-bold text-lg mb-4 uppercase tracking-widest">
                    <ScanBarcode size={22} className="text-[#f74faf]" />
                    Barcode
                  </label>

                  <div className="flex gap-3">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={buyData.barcode}
                        onChange={handleBuyChange("barcode")}
                        placeholder="Scan or enter barcode"
                        className="w-full px-6 py-4 rounded-2xl border border-[#f74faf]/20 focus:ring-4 focus:ring-[#f74faf]/10 focus:border-[#f74faf] outline-none text-xl tracking-widest bg-white transition-all duration-300 shadow-sm"
                        autoFocus
                      />
                    </div>

                  </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-3 bg-[#f74faf]/5 p-2 rounded-2xl w-fit mx-auto">
                  <button
                    type="button"
                    onClick={() => setActiveTab("buy")}
                    className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold transition-all duration-300 ${activeTab === "buy"
                      ? "bg-[#f74faf] text-white shadow-lg"
                      : "bg-transparent text-[#f74faf]/60 hover:bg-[#f74faf]/10"
                      }`}
                  >
                    <ShoppingCart size={16} />
                    Purchase Details
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("sale")}
                    className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold transition-all duration-300 ${activeTab === "sale"
                      ? "bg-[#f74faf] text-white shadow-lg"
                      : "bg-transparent text-[#f74faf]/60 hover:bg-[#f74faf]/10"
                      }`}
                  >
                    <DollarSign size={16} />
                    Sales Details
                  </button>
                </div>

                {/* Purchase Fields */}
                {activeTab === "buy" && (
                  <div>
                    <h3 className="flex items-center gap-2 text-[#f74faf] font-bold text-lg mb-6 pb-2 border-b border-[#f74faf]/10">
                      <ShoppingCart size={20} className="text-[#f74faf]" />
                      Production & Sourcing
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {Object.keys(buyData).map((field) => {
                        if (field === "barcode") return null;
                        const config = buyFieldConfig[field];
                        if (!config) return null; // Skip calculated fields not in config

                        const listId = field === "category" ? "category-list" : field === "productType" ? "product-name-list" : field === "supplier" ? "supplier-list" : field === "description" ? "size-list" : undefined;

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
                        className="font-bold text-[#f74faf] bg-[#f74faf]/5"
                      />
                      <InputField
                        label="Grand Total (₹)"
                        icon={DollarSign}
                        value={buyData.purchaseTotalAmount}
                        readOnly
                        className="font-extrabold text-[#f74faf] bg-[#f74faf]/5"
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
                    <datalist id="size-list">
                      {["XS (Extra Small)", "S (Small)", "M (Medium)", "L (Large)", "XL (Extra Large)", "XXL (Double XL)", "XXXL (Triple XL)"].map(size => (
                        <option key={size} value={size} />
                      ))}
                    </datalist>

                  </div>
                )}

                {/* Sales Fields */}
                {activeTab === "sale" && (
                  <div>
                    <h3 className="flex items-center gap-2 text-[#f74faf] font-bold text-lg mb-6 pb-2 border-b border-[#f74faf]/10">
                      <DollarSign size={20} className="text-[#f74faf]" />
                      Retail & Pricing
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
                        className="font-bold text-[#f74faf] bg-[#f74faf]/5"
                      />
                      <InputField
                        label="Grand Total (₹)"
                        icon={DollarSign}
                        value={saleData.salesTotalAmount}
                        readOnly
                        className="font-extrabold text-[#f74faf] bg-[#f74faf]/5"
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
            <div className="border-t border-[#f74faf]/10"></div>

            {/* Buttons */}
            <div className="flex justify-end gap-4 pt-2">
              <button
                type="button"
                onClick={() => navigate("/inventory")}
                className="flex items-center gap-2 px-8 py-3.5 bg-gray-50 text-gray-500 rounded-2xl hover:bg-gray-100 transition-all duration-300 font-bold text-sm"
              >
                <X size={16} />
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-10 py-3.5 bg-[#f74faf] text-white rounded-2xl hover:scale-[1.02] active:scale-95 transition-all duration-300 font-bold shadow-xl shadow-[#f74faf]/20 disabled:opacity-60"
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

export default ClothingAddProduct;