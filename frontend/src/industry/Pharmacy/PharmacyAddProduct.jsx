
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
    Building2,
    Clock,
    Calculator,
    StickyNote,
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

const pharmacyData = {
    "Tablets": ["Painkiller", "Antibiotic", "Antacid", "Vitamin", "Anti-allergic", "Fever Reducer"],
    "Syrups": ["Cough Syrup", "Antacid Syrup", "Multivitamin Syrup", "Fever Syrup"],
    "Capsules": ["Antibiotic Capsule", "Vitamin Capsule", "Probiotic Capsule"],
    "Injections": ["Pain Relief Injection", "Antibiotic Injection", "Vaccine"],
    "Topical": ["Ointment", "Cream", "Gel", "Lotion", "Antiseptic Liquid"],
    "Vitamins & Supplements": ["Multivitamin", "Calcium", "Iron", "Protein Powder", "Omega-3"],
    "Pain Relief": ["Analgesic", "Anti-inflammatory", "Muscle Relaxant"],
    "Antibiotics": ["Broad-spectrum", "Narrow-spectrum", "Antifungal"],
    "Antacids": ["Liquid Antacid", "Tablet Antacid", "Gas Relief"],
    "Cough & Cold": ["Decongestant", "Expectorant", "Antihistamine", "Nasal Spray"],
    "First Aid": ["Bandage", "Antiseptic", "Cotton", "Gauze", "Adhesive Tape"],
    "Medical Devices": ["Thermometer", "BP Monitor", "Glucometer", "Nebulizer"],
    "Baby Care": ["Diapers", "Wipes", "Baby Lotion", "Baby Oil"],
    "Personal Hygiene": ["Sanitizer", "Soap", "Shampoo", "Toothpaste"],
    "Ayurvedic & Herbal": ["Chyawanprash", "Herbal Supplements", "Essential Oils"]
};

// ✅ Field configs also moved outside - they never change
const saleFieldConfig = {
    salesPrice: { label: "Sales Price (₹)", icon: DollarSign, type: "number" },
    salesGst: { label: "Sales GST (%)", icon: FileText, type: "number" },
    salesDate: { label: "Sales Date", icon: Calendar, type: "date" },
};

const PharmacyAddProduct = () => {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

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
        supplier: "",
        pharmaCompany: "",
        drugLicenseNumber: "",
        supplierGst: "",
        category: "",
        name: "",
        brandName: "",
        sku: "",
        hsnSac: "",
        batchNumber: "",
        mfgDate: "",
        expiryDate: "",
        unit: "",
        purchasePrice: "",
        purchaseGst: "",
        quantity: "",
        reorderLevel: "",
        purchaseDate: "",
        description: "",
        barcode: "",
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
        const pQty = parseFloat(buyData.quantity) || 0; // Number of units purchased (packs/strips)

        const isPInclusive = tenant?.purchase_tax_type === "inclusive";

        let pGstAmt = 0;
        let pTotal = 0;

        // Subtotal = Purchase Price * Units Purchased
        if (isPInclusive) {
            pTotal = pPrice * pQty;
            pGstAmt = pTotal - (pTotal / (1 + pGstLimit / 100));
        } else {
            const subtotal = pPrice * pQty;
            pGstAmt = (subtotal * pGstLimit) / 100;
            pTotal = subtotal + pGstAmt;
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
    }, [buyData.purchasePrice, buyData.purchaseGst, buyData.quantity, buyData.unit, currentUser]);

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
                supplier: editingProduct.supplier || "",
                pharmaCompany: editingProduct.pharmaCompany || "",
                drugLicenseNumber: editingProduct.drugLicenseNumber || "",
                supplierGst: editingProduct.supplierGst || "",
                category: editingProduct.category || "",
                name: editingProduct.name || "",
                brandName: editingProduct.brandName || "",
                sku: editingProduct.sku || "",
                hsnSac: editingProduct.hsnSac || "",
                batchNumber: editingProduct.batchNumber || "",
                mfgDate: editingProduct.mfgDate || "",
                expiryDate: editingProduct.expiryDate || "",
                unit: editingProduct.unit || "",
                purchasePrice: editingProduct.purchasePrice?.toString() || "",
                purchaseGst: editingProduct.purchaseGst?.toString() || "",
                quantity: editingProduct.quantity?.toString() || "",
                reorderLevel: editingProduct.reorderLevel?.toString() || "",
                purchaseDate: editingProduct.purchaseDate || "",
                description: editingProduct.description || "",
                barcode: editingProduct.barcode || "",
            });

            setSaleData({
                salesPrice: editingProduct.salePrice?.toString() || "",
                salesGst: editingProduct.salesGst?.toString() || "",
                salesDate: editingProduct.salesDate || "",
            });
        }
    }, [editingProduct, editingProductId]);

    // ✅ Stable handler functions using callback pattern
    const handleMobileChange = (field) => (e) => {
        const val = e.target.value;
    };

    const handleBuyChange = (field) => (e) => {
        const val = e.target.value;
        setBuyData((prev) => {
            const updated = { ...prev, [field]: val };
            if (field === "supplier") {
                const matchedSupplier = suppliers.find((s) => s.name === val);
                if (matchedSupplier) {
                    updated.pharmaCompany = matchedSupplier.company || "";
                    updated.drugLicenseNumber = matchedSupplier.pan || "";
                    updated.supplierGst = matchedSupplier.gst || "";
                }
            }
            return updated;
        });
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

        if (activeTab === "buy") { // Always go to sales details for pharmacy
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
                                <Package size={26} className="text-green-100" />
                                {editingProductId ? "Edit Medicine Entry" : "Medicine Purchase Entry"}
                            </h1>
                            <p className="text-green-100 text-sm mt-1 ml-10">
                                Add new medicine stock from supplier
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
                                <div className="space-y-8">
                                    {/* Supplier Details */}
                                    <section>
                                        <h3 className="flex items-center gap-2 text-green-700 font-bold text-lg mb-5 pb-2 border-b border-green-100">
                                            <User size={20} className="text-green-500" />
                                            Supplier Details
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            <InputField label="Supplier" icon={User} value={buyData.supplier} onChange={handleBuyChange("supplier")} placeholder="Select Medicine Supplier" list="supplier-list" />
                                            <InputField label="Pharma Company" icon={Building2} value={buyData.pharmaCompany} onChange={handleBuyChange("pharmaCompany")} placeholder="Pharmaceutical Company Name" list="pharma-company-list" />
                                            <InputField label="Drug License Number" icon={FileText} value={buyData.drugLicenseNumber} onChange={handleBuyChange("drugLicenseNumber")} placeholder="Supplier Drug License Number" />
                                            <InputField label="GST Number" icon={Hash} value={buyData.supplierGst} onChange={handleBuyChange("supplierGst")} placeholder="Supplier GST Number" />
                                        </div>
                                    </section>

                                    {/* Medicine Details */}
                                    <section>
                                        <h3 className="flex items-center gap-2 text-green-700 font-bold text-lg mb-5 pb-2 border-b border-green-100">
                                            <Package size={20} className="text-green-500" />
                                            Medicine Details
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            <InputField label="Medicine Category" icon={Tag} value={buyData.category} onChange={handleBuyChange("category")} placeholder="Select Category" list="category-list" />
                                            <InputField label="Medicine Name" icon={Package} value={buyData.name} onChange={handleBuyChange("name")} placeholder="Enter Medicine Name" list="product-name-list" />
                                            <InputField label="Brand Name" icon={Tag} value={buyData.brandName} onChange={handleBuyChange("brandName")} placeholder="Enter Brand Name" />
                                            <InputField label="Medicine Code / SKU" icon={Hash} value={buyData.sku} onChange={handleBuyChange("sku")} placeholder="Auto or Enter SKU" />
                                            <InputField label="HSN Code" icon={FileText} value={buyData.hsnSac} onChange={handleBuyChange("hsnSac")} placeholder="Enter HSN Code" />
                                        </div>
                                    </section>

                                    {/* Batch & Expiry Details */}
                                    <section>
                                        <h3 className="flex items-center gap-2 text-green-700 font-bold text-lg mb-5 pb-2 border-b border-green-100">
                                            <Clock size={20} className="text-green-500" />
                                            Batch & Expiry Details
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            <InputField label="Batch Number" icon={Hash} value={buyData.batchNumber} onChange={handleBuyChange("batchNumber")} placeholder="Enter Batch Number" />
                                            <InputField label="Manufacturing Date" icon={Calendar} type="date" value={buyData.mfgDate} onChange={handleBuyChange("mfgDate")} />
                                            <InputField label="Expiry Date" icon={Calendar} type="date" value={buyData.expiryDate} onChange={handleBuyChange("expiryDate")} />
                                        </div>
                                    </section>

                                    {/* Purchase Details */}
                                    <section>
                                        <h3 className="flex items-center gap-2 text-green-700 font-bold text-lg mb-5 pb-2 border-b border-green-100">
                                            <ShoppingCart size={20} className="text-green-500" />
                                            Purchase Details
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            <InputField label="Purchase Price (₹)" icon={DollarSign} type="number" value={buyData.purchasePrice} onChange={handleBuyChange("purchasePrice")} placeholder="Enter Purchase Price" />
                                            <InputField label="GST Rate (%)" icon={FileText} type="number" value={buyData.purchaseGst} onChange={handleBuyChange("purchaseGst")} placeholder="Enter GST %" />
                                            <InputField label="Unit" icon={Box} type="number" value={buyData.quantity} onChange={handleBuyChange("quantity")} placeholder="Number of units purchased" />
                                            <InputField label="Quantity per Unit" icon={Layers} value={buyData.unit} onChange={handleBuyChange("unit")} placeholder="Items inside one unit (e.g. 10)" />
                                            <InputField label="Reorder Level" icon={AlertTriangle} type="number" value={buyData.reorderLevel} onChange={handleBuyChange("reorderLevel")} placeholder="Low Stock Alert Level" />
                                            <InputField label="Purchase Date" icon={Calendar} type="date" value={buyData.purchaseDate} onChange={handleBuyChange("purchaseDate")} />
                                        </div>
                                    </section>

                                    {/* Calculation Summary */}
                                    <section>
                                        <h3 className="flex items-center gap-2 text-green-700 font-bold text-lg mb-5 pb-2 border-b border-green-100">
                                            <Calculator size={20} className="text-green-500" />
                                            Calculation Summary
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                            <InputField
                                                label="GST Amount (₹)"
                                                icon={DollarSign}
                                                value={buyData.purchaseGstAmount}
                                                readOnly
                                                className="font-bold text-green-600 bg-gray-50"
                                            />
                                            <InputField
                                                label="Grand Total (₹)"
                                                icon={DollarSign}
                                                value={buyData.purchaseTotalAmount}
                                                readOnly
                                                className="font-bold text-green-700 bg-gray-50"
                                            />
                                            <InputField
                                                label="Total Items"
                                                icon={Layers}
                                                value={(buyData.quantity || 0) * (buyData.unit || 1)}
                                                readOnly
                                                className="font-bold text-blue-600 bg-gray-50"
                                            />
                                        </div>
                                    </section>

                                    {/* Additional Details */}
                                    <section>
                                        <h3 className="flex items-center gap-2 text-green-700 font-bold text-lg mb-5 pb-2 border-b border-green-100">
                                            <StickyNote size={20} className="text-green-500" />
                                            Additional Details
                                        </h3>
                                        <div className="flex flex-col gap-1.5">
                                            <label className="flex items-center gap-2 text-sm font-semibold text-green-800">
                                                <FileText size={15} className="text-green-500" />
                                                Description / Notes
                                            </label>
                                            <textarea
                                                value={buyData.description}
                                                onChange={handleBuyChange("description")}
                                                placeholder="Enter Medicine Notes"
                                                className="px-4 py-3 rounded-xl border border-green-200 bg-white text-gray-700 placeholder-gray-400 
                                                focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-green-400 
                                                transition-all duration-200 hover:border-green-300 h-24"
                                            ></textarea>
                                        </div>
                                    </section>
                                </div>
                                <datalist id="category-list">
                                    {Object.keys(pharmacyData).sort().map(cat => <option key={cat} value={cat} />)}
                                </datalist>
                                <datalist id="product-name-list">
                                    {(pharmacyData[buyData.category] || []).sort().map(prod => <option key={prod} value={prod} />)}
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

                        <datalist id="supplier-list">
                            {suppliers.map((s) => (
                                <option key={s.id} value={s.name} />
                            ))}
                        </datalist>
                        <datalist id="pharma-company-list">
                            {[...new Set(suppliers.map((s) => s.company).filter(Boolean))].sort().map((company, idx) => (
                                <option key={idx} value={company} />
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

export default PharmacyAddProduct;