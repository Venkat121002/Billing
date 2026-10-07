import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import API_URL from '../../config/api';
import BillingLayout from '../../Layout/BillingLayout/AdminLayout';
import {
    Sparkles,
    Grid,
    RotateCcw,
    AlertTriangle,
    BarChart3,
    Plus,
    Printer,
    Send,
    Tag,
    Shirt,
    Layers,
    DollarSign,
    IndianRupee,
    Check,
    X,
    Calendar,
    Search,
    RefreshCw,
    Percent,
    ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import Barcode from 'react-barcode';
import { useReactToPrint } from 'react-to-print';

const POPULAR_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '28', '30', '32', '34', '36', '38', '40'];
const POPULAR_COLORS = ['Black', 'White', 'Navy Blue', 'Royal Blue', 'Olive Green', 'Grey', 'Maroon', 'Red', 'Beige', 'Pink', 'Sky Blue'];

const getAuthHeaders = () => {
    const token = sessionStorage.getItem("token") || localStorage.getItem("token");
    return {
        "x-auth-token": token || "",
        Authorization: token ? `Bearer ${token}` : ""
    };
};

const ClothingHub = () => {
    const [activeTab, setActiveTab] = useState('matrix'); // 'matrix' | 'exchange' | 'aging' | 'eod'
    const [loading, setLoading] = useState(false);


    // -------------------------------------------------------------
    // Pillar 1: Matrix Variant Generator State
    // -------------------------------------------------------------
    const [matrixBase, setMatrixBase] = useState({
        articleName: '',
        brand: '',
        category: 'Men',
        subCategory: 'Shirts',
        gender: 'Men',
        purchasePrice: '',
        price: '',
        hsn: '6109',
        gst: 5,
        defaultQty: 5,
        discount: 0
    });

    const [selectedSizes, setSelectedSizes] = useState(['M', 'L', 'XL']);
    const [selectedColors, setSelectedColors] = useState(['Black', 'Navy Blue', 'White']);
    const [customSizeInput, setCustomSizeInput] = useState('');
    const [customColorInput, setCustomColorInput] = useState('');
    const [generatedVariants, setGeneratedVariants] = useState([]);
    const [createdBatchProducts, setCreatedBatchProducts] = useState([]);
    const [isHangtagModalOpen, setIsHangtagModalOpen] = useState(false);

    const hangtagPrintRef = useRef();
    const handlePrintHangtags = useReactToPrint({
        contentRef: hangtagPrintRef,
        documentTitle: `Hangtags_${matrixBase.articleName || 'Garments'}`
    });

    // Recompute generated variants whenever sizes, colors, or base changes
    useEffect(() => {
        if (!matrixBase.articleName || selectedSizes.length === 0 || selectedColors.length === 0) {
            setGeneratedVariants([]);
            return;
        }

        const rows = [];
        const baseTime = Date.now().toString().slice(-5);
        let counter = 1;

        selectedSizes.forEach(size => {
            selectedColors.forEach(color => {
                const autoBarcode = `CLO${baseTime}${String(counter).padStart(2, '0')}`;
                rows.push({
                    size,
                    color,
                    quantity: Number(matrixBase.defaultQty) || 1,
                    price: Number(matrixBase.price) || 0,
                    purchasePrice: Number(matrixBase.purchasePrice) || 0,
                    barcode: autoBarcode
                });
                counter++;
            });
        });

        setGeneratedVariants(rows);
    }, [matrixBase.articleName, matrixBase.price, matrixBase.purchasePrice, matrixBase.defaultQty, selectedSizes, selectedColors]);

    const handleCreateMatrixProducts = async () => {
        if (!matrixBase.articleName) {
            toast.error('Please enter the Article Name');
            return;
        }
        if (generatedVariants.length === 0) {
            toast.error('Please select at least one Size and Color');
            return;
        }

        try {
            setLoading(true);
            const payload = {
                ...matrixBase,
                variants: generatedVariants
            };

            const res = await axios.post(`${API_URL}/clothing/matrix-products`, payload, {
                headers: getAuthHeaders()
            });

            toast.success(res.data.msg || `Created ${generatedVariants.length} variants!`);
            setCreatedBatchProducts(res.data.products || []);
            setIsHangtagModalOpen(true);
        } catch (err) {
            console.error('Matrix creation error:', err);
            toast.error(err.response?.data?.msg || 'Failed to create matrix variants');
        } finally {
            setLoading(false);
        }
    };

    // -------------------------------------------------------------
    // Pillar 4: Size Exchange State
    // -------------------------------------------------------------
    const [exchangeForm, setExchangeForm] = useState({
        originalBillNumber: '',
        customerName: '',
        customerPhone: '',
        returnedItem: { name: '', size: 'M', color: 'Black', price: '', qty: 1, productId: '' },
        replacementItem: { name: '', size: 'L', color: 'Black', price: '', qty: 1, productId: '' }
    });
    const [exchangeResult, setExchangeResult] = useState(null);
    const [storeCredits, setStoreCredits] = useState([]);

    const fetchStoreCredits = async () => {
        try {
            const res = await axios.get(`${API_URL}/clothing/store-credits`, {
                headers: getAuthHeaders()
            });
            setStoreCredits(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.warn('Could not fetch store credits:', err);
        }
    };

    useEffect(() => {
        if (activeTab === 'exchange') {
            fetchStoreCredits();
        }
    }, [activeTab]);

    const handleProcessExchange = async (e) => {
        e.preventDefault();
        if (!exchangeForm.returnedItem.name || !exchangeForm.replacementItem.name) {
            toast.error('Please fill in both returned item and replacement item details');
            return;
        }

        try {
            setLoading(true);
            const res = await axios.post(`${API_URL}/clothing/size-exchange`, exchangeForm, {
                headers: getAuthHeaders()
            });

            toast.success('Size exchange completed! Inventory updated.');
            if (exchangeForm.customerPhone) {
                toast.success('Exchange receipt sent on WhatsApp! 📲');
            }
            setExchangeResult(res.data);
            fetchStoreCredits();
        } catch (err) {
            console.error('Exchange error:', err);
            toast.error(err.response?.data?.msg || 'Failed to process exchange');
        } finally {
            setLoading(false);
        }
    };

    // -------------------------------------------------------------
    // Pillar 5: Dead Stock / Aging State
    // -------------------------------------------------------------
    const [agingThreshold, setAgingThreshold] = useState(60);
    const [agingData, setAgingData] = useState({ items: [], slowMoversCount: 0, totalHoldingValue: 0 });

    const fetchAgingStock = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${API_URL}/clothing/aging-stock?thresholdDays=${agingThreshold}`, {
                headers: getAuthHeaders()
            });
            setAgingData(res.data);
        } catch (err) {
            console.error('Aging stock error:', err);
            toast.error('Failed to analyze aging stock');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'aging') {
            fetchAgingStock();
        }
    }, [activeTab, agingThreshold]);

    // -------------------------------------------------------------
    // Pillar 5: End-of-Day (EOD) Closing State
    // -------------------------------------------------------------
    const [eodDate, setEodDate] = useState(new Date().toISOString().split('T')[0]);
    const [eodData, setEodData] = useState(null);
    const [isSendingEodWa, setIsSendingEodWa] = useState(false);

    const fetchEodClosing = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${API_URL}/clothing/eod-closing?date=${eodDate}`, {
                headers: getAuthHeaders()
            });
            setEodData(res.data);
        } catch (err) {
            console.error('EOD closing error:', err);
            toast.error('Failed to load EOD closing summary');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'eod') {
            fetchEodClosing();
        }
    }, [activeTab, eodDate]);

    const handleSendEodWhatsApp = async () => {
        if (!eodData) return;
        try {
            setIsSendingEodWa(true);
            await axios.post(`${API_URL}/clothing/send-eod-whatsapp`, {
                totalRevenue: eodData.totalRevenue,
                totalBills: eodData.totalBills,
                totalItemsSold: eodData.totalItemsSold,
                paymentBreakdown: eodData.paymentBreakdown,
                topStaff: eodData.staffLeaderboard?.[0]?.name || 'Staff'
            }, {
                headers: getAuthHeaders()
            });

            toast.success('Daily closing summary sent to owner on WhatsApp! 📲');
        } catch (err) {
            console.error('Send EOD WhatsApp error:', err);
            toast.error(err.response?.data?.msg || 'Failed to dispatch WhatsApp closing summary');
        } finally {
            setIsSendingEodWa(false);
        }
    };


    return (
        <BillingLayout>
            <div className="p-6 max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-pink-100 text-pink-600 rounded-xl">
                            <Shirt size={28} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Clothing Shop Automation Hub</h1>
                            <p className="text-sm text-gray-500">
                                Variant Matrix Builder, 1-Click Size Exchanges, Dead Stock Clearance, and Nightly EOD Reconciliations.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 bg-white rounded-t-2xl px-6 pt-3 gap-2">
                    {[
                        { id: 'matrix', label: '1. Variant Matrix & Hangtags', icon: Grid },
                        { id: 'exchange', label: '2. 1-Click Size Exchange', icon: RotateCcw },
                        { id: 'aging', label: '3. Dead Stock & Clearance', icon: AlertTriangle },
                        { id: 'eod', label: '4. Nightly EOD Closing', icon: BarChart3 }
                    ].map(tab => {
                        const Icon = tab.icon;
                        const active = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
                                    active
                                        ? 'border-pink-600 text-pink-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-900'
                                }`}
                            >
                                <Icon size={18} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* TAB 1: VARIANT MATRIX GENERATOR */}
                {activeTab === 'matrix' && (
                    <div className="bg-white p-6 rounded-b-2xl border border-gray-100 shadow-sm space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Base Article Name *</label>
                                <input
                                    type="text"
                                    value={matrixBase.articleName}
                                    onChange={(e) => setMatrixBase({ ...matrixBase, articleName: e.target.value })}
                                    placeholder="e.g. Slim Fit Linen Shirt / Cotton Chino Pant"
                                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Brand</label>
                                <input
                                    type="text"
                                    value={matrixBase.brand}
                                    onChange={(e) => setMatrixBase({ ...matrixBase, brand: e.target.value })}
                                    placeholder="e.g. Zara / Levi's / Raymond"
                                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Gender / Category</label>
                                <select
                                    value={matrixBase.gender}
                                    onChange={(e) => setMatrixBase({ ...matrixBase, gender: e.target.value, category: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
                                >
                                    <option value="Men">Men</option>
                                    <option value="Women">Women</option>
                                    <option value="Kids">Kids</option>
                                    <option value="Unisex">Unisex</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Cost Price (₹)</label>
                                <input
                                    type="number"
                                    value={matrixBase.purchasePrice}
                                    onChange={(e) => setMatrixBase({ ...matrixBase, purchasePrice: e.target.value })}
                                    placeholder="e.g. 450"
                                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Selling Price / MRP (₹) *</label>
                                <input
                                    type="number"
                                    value={matrixBase.price}
                                    onChange={(e) => setMatrixBase({ ...matrixBase, price: e.target.value })}
                                    placeholder="e.g. 1199"
                                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-bold text-gray-900"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Default Qty per Variant</label>
                                <input
                                    type="number"
                                    value={matrixBase.defaultQty}
                                    onChange={(e) => setMatrixBase({ ...matrixBase, defaultQty: e.target.value })}
                                    placeholder="5"
                                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">HSN Code</label>
                                <input
                                    type="text"
                                    value={matrixBase.hsn}
                                    onChange={(e) => setMatrixBase({ ...matrixBase, hsn: e.target.value })}
                                    placeholder="6109"
                                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
                                />
                            </div>
                        </div>

                        {/* Size Picker */}
                        <div className="p-4 bg-gray-50/75 rounded-2xl border border-gray-100 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Select Sizes</span>
                                <span className="text-xs text-gray-400">{selectedSizes.length} sizes selected</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {POPULAR_SIZES.map(s => {
                                    const isSel = selectedSizes.includes(s);
                                    return (
                                        <button
                                            type="button"
                                            key={s}
                                            onClick={() => {
                                                setSelectedSizes(prev => isSel ? prev.filter(x => x !== s) : [...prev, s]);
                                            }}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                                                isSel ? 'bg-pink-600 text-white border-pink-600 shadow-sm' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                                            }`}
                                        >
                                            {s}
                                        </button>
                                    );
                                })}
                            </div>
                            <div className="flex items-center gap-2 pt-2">
                                <input
                                    type="text"
                                    value={customSizeInput}
                                    onChange={(e) => setCustomSizeInput(e.target.value)}
                                    placeholder="Add custom size (e.g. 42 or Free Size)"
                                    className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg"
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (customSizeInput.trim() && !selectedSizes.includes(customSizeInput.trim())) {
                                            setSelectedSizes([...selectedSizes, customSizeInput.trim()]);
                                            setCustomSizeInput('');
                                        }
                                    }}
                                    className="px-3 py-1.5 text-xs bg-gray-800 text-white rounded-lg hover:bg-black font-medium"
                                >
                                    + Add Size
                                </button>
                            </div>
                        </div>

                        {/* Color Picker */}
                        <div className="p-4 bg-gray-50/75 rounded-2xl border border-gray-100 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Select Colors</span>
                                <span className="text-xs text-gray-400">{selectedColors.length} colors selected</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {POPULAR_COLORS.map(c => {
                                    const isSel = selectedColors.includes(c);
                                    return (
                                        <button
                                            type="button"
                                            key={c}
                                            onClick={() => {
                                                setSelectedColors(prev => isSel ? prev.filter(x => x !== c) : [...prev, c]);
                                            }}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                                                isSel ? 'bg-pink-600 text-white border-pink-600 shadow-sm' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                                            }`}
                                        >
                                            {c}
                                        </button>
                                    );
                                })}
                            </div>
                            <div className="flex items-center gap-2 pt-2">
                                <input
                                    type="text"
                                    value={customColorInput}
                                    onChange={(e) => setCustomColorInput(e.target.value)}
                                    placeholder="Add custom color (e.g. Charcoal or Peach)"
                                    className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg"
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (customColorInput.trim() && !selectedColors.includes(customColorInput.trim())) {
                                            setSelectedColors([...selectedColors, customColorInput.trim()]);
                                            setCustomColorInput('');
                                        }
                                    }}
                                    className="px-3 py-1.5 text-xs bg-gray-800 text-white rounded-lg hover:bg-black font-medium"
                                >
                                    + Add Color
                                </button>
                            </div>
                        </div>

                        {/* Variant Preview Table */}
                        <div className="border border-gray-100 rounded-2xl overflow-hidden">
                            <div className="p-4 bg-gray-50/75 flex items-center justify-between border-b border-gray-100">
                                <div>
                                    <span className="font-bold text-gray-900 text-sm">Matrix Output Preview</span>
                                    <span className="ml-2 text-xs text-gray-500">
                                        ({selectedSizes.length} sizes × {selectedColors.length} colors = {generatedVariants.length} total SKUs)
                                    </span>
                                </div>
                                <button
                                    onClick={handleCreateMatrixProducts}
                                    disabled={loading || generatedVariants.length === 0}
                                    className="flex items-center gap-2 px-5 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all disabled:opacity-50"
                                >
                                    <Sparkles size={16} />
                                    {loading ? 'Generating...' : `Create All ${generatedVariants.length} Variants`}
                                </button>
                            </div>

                            {generatedVariants.length === 0 ? (
                                <div className="py-12 text-center text-gray-400 text-xs">
                                    Fill in the Article Name, pick sizes and colors above to generate the variant matrix.
                                </div>
                            ) : (
                                <div className="max-h-72 overflow-y-auto">
                                    <table className="w-full text-left text-xs text-gray-600">
                                        <thead className="bg-gray-50 text-gray-500 uppercase sticky top-0">
                                            <tr>
                                                <th className="py-2.5 px-4">Size</th>
                                                <th className="py-2.5 px-4">Color</th>
                                                <th className="py-2.5 px-4">Auto Barcode</th>
                                                <th className="py-2.5 px-4">Qty</th>
                                                <th className="py-2.5 px-4">Price (MRP)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {generatedVariants.map((v, idx) => (
                                                <tr key={idx} className="hover:bg-gray-50/50">
                                                    <td className="py-2 px-4 font-bold text-gray-900">{v.size}</td>
                                                    <td className="py-2 px-4">{v.color}</td>
                                                    <td className="py-2 px-4 font-mono font-bold text-pink-600">{v.barcode}</td>
                                                    <td className="py-2 px-4">{v.quantity} pcs</td>
                                                    <td className="py-2 px-4 font-semibold text-gray-900">₹{v.price}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* TAB 2: 1-CLICK SIZE EXCHANGE */}
                {activeTab === 'exchange' && (
                    <div className="bg-white p-6 rounded-b-2xl border border-gray-100 shadow-sm space-y-6">
                        <div className="max-w-3xl mx-auto space-y-6">
                            <div className="p-4 bg-pink-50/50 border border-pink-100 rounded-xl text-xs text-pink-900 flex items-center gap-2">
                                <RotateCcw size={18} className="text-pink-600 shrink-0" />
                                <span>
                                    <strong>How it works:</strong> The returned garment is instantly restocked (+1) and the replacement garment is deducted (-1). If the new garment costs less, an active <strong>Store Credit Voucher</strong> is automatically generated and texted to the customer.
                                </span>
                            </div>

                            <form onSubmit={handleProcessExchange} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">Original Invoice #</label>
                                        <input
                                            type="text"
                                            value={exchangeForm.originalBillNumber}
                                            onChange={(e) => setExchangeForm({ ...exchangeForm, originalBillNumber: e.target.value })}
                                            placeholder="e.g. INV-1049"
                                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">Customer Name</label>
                                        <input
                                            type="text"
                                            value={exchangeForm.customerName}
                                            onChange={(e) => setExchangeForm({ ...exchangeForm, customerName: e.target.value })}
                                            placeholder="Customer name"
                                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">Customer Mobile (WhatsApp)</label>
                                        <input
                                            type="tel"
                                            value={exchangeForm.customerPhone}
                                            onChange={(e) => setExchangeForm({ ...exchangeForm, customerPhone: e.target.value })}
                                            placeholder="10-digit mobile"
                                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                                    {/* Returned Item */}
                                    <div className="p-4 rounded-xl border border-red-100 bg-red-50/20 space-y-3">
                                        <div className="flex items-center gap-2 font-bold text-red-700 text-xs uppercase tracking-wider">
                                            <RotateCcw size={14} /> Item Being Returned (+1 Restock)
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-600 mb-1">Garment Description *</label>
                                            <input
                                                type="text"
                                                required
                                                value={exchangeForm.returnedItem.name}
                                                onChange={(e) => setExchangeForm({
                                                    ...exchangeForm,
                                                    returnedItem: { ...exchangeForm.returnedItem, name: e.target.value }
                                                })}
                                                placeholder="e.g. Linen Shirt (Size M)"
                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="block text-xs text-gray-600 mb-1">Returned Size</label>
                                                <input
                                                    type="text"
                                                    value={exchangeForm.returnedItem.size}
                                                    onChange={(e) => setExchangeForm({
                                                        ...exchangeForm,
                                                        returnedItem: { ...exchangeForm.returnedItem, size: e.target.value }
                                                    })}
                                                    placeholder="e.g. M"
                                                    className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-gray-600 mb-1">Price Paid (₹) *</label>
                                                <input
                                                    type="number"
                                                    required
                                                    value={exchangeForm.returnedItem.price}
                                                    onChange={(e) => setExchangeForm({
                                                        ...exchangeForm,
                                                        returnedItem: { ...exchangeForm.returnedItem, price: e.target.value }
                                                    })}
                                                    placeholder="1200"
                                                    className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-bold"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Replacement Item */}
                                    <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/20 space-y-3">
                                        <div className="flex items-center gap-2 font-bold text-emerald-700 text-xs uppercase tracking-wider">
                                            <Check size={14} /> Replacement Item (-1 Deduct)
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-600 mb-1">Garment Description *</label>
                                            <input
                                                type="text"
                                                required
                                                value={exchangeForm.replacementItem.name}
                                                onChange={(e) => setExchangeForm({
                                                    ...exchangeForm,
                                                    replacementItem: { ...exchangeForm.replacementItem, name: e.target.value }
                                                })}
                                                placeholder="e.g. Linen Shirt (Size L)"
                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="block text-xs text-gray-600 mb-1">New Size</label>
                                                <input
                                                    type="text"
                                                    value={exchangeForm.replacementItem.size}
                                                    onChange={(e) => setExchangeForm({
                                                        ...exchangeForm,
                                                        replacementItem: { ...exchangeForm.replacementItem, size: e.target.value }
                                                    })}
                                                    placeholder="e.g. L"
                                                    className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-gray-600 mb-1">New Price (₹) *</label>
                                                <input
                                                    type="number"
                                                    required
                                                    value={exchangeForm.replacementItem.price}
                                                    onChange={(e) => setExchangeForm({
                                                        ...exchangeForm,
                                                        replacementItem: { ...exchangeForm.replacementItem, price: e.target.value }
                                                    })}
                                                    placeholder="1200"
                                                    className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-bold"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Price Delta Summary */}
                                {exchangeForm.returnedItem.price && exchangeForm.replacementItem.price && (
                                    <div className="p-4 bg-gray-50 rounded-xl flex items-center justify-between text-xs">
                                        <div>
                                            <span className="font-semibold text-gray-600">Calculated Difference: </span>
                                            {Number(exchangeForm.replacementItem.price) === Number(exchangeForm.returnedItem.price) ? (
                                                <span className="font-bold text-emerald-600">Even Exchange (₹0 Delta)</span>
                                            ) : Number(exchangeForm.replacementItem.price) > Number(exchangeForm.returnedItem.price) ? (
                                                <span className="font-bold text-blue-600">
                                                    Customer pays balance: ₹{Number(exchangeForm.replacementItem.price) - Number(exchangeForm.returnedItem.price)}
                                                </span>
                                            ) : (
                                                <span className="font-bold text-purple-600">
                                                    Store Credit Issued: ₹{Number(exchangeForm.returnedItem.price) - Number(exchangeForm.replacementItem.price)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div className="text-right">
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="px-6 py-2.5 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
                                    >
                                        {loading ? 'Processing...' : 'Complete 1-Click Size Exchange'}
                                    </button>
                                </div>
                            </form>

                            {/* Active Store Credits List */}
                            <div className="border-t pt-6 space-y-3">
                                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Active Store Credit Vouchers</h3>
                                {storeCredits.length === 0 ? (
                                    <div className="text-xs text-gray-400 py-3">No active credit notes found.</div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {storeCredits.map(sc => (
                                            <div key={sc.id || sc._id} className="p-3 bg-purple-50/40 border border-purple-100 rounded-xl text-xs flex justify-between items-center">
                                                <div>
                                                    <div className="font-mono font-bold text-purple-700">{sc.code}</div>
                                                    <div className="text-gray-600 font-medium">{sc.customerName} ({sc.customerPhone})</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-bold text-gray-900">₹{sc.remainingAmount}</div>
                                                    <div className="text-[10px] text-gray-500">Exp: {sc.expiryDate || '90 days'}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 3: DEAD STOCK & CLEARANCE */}
                {activeTab === 'aging' && (
                    <div className="bg-white p-6 rounded-b-2xl border border-gray-100 shadow-sm space-y-6">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                            <div>
                                <h2 className="text-base font-bold text-gray-900">Slow Moving Garments & Markdown Clearance</h2>
                                <p className="text-xs text-gray-500">Flag garments that haven't sold to clear space before new season arrivals.</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500 font-medium">Unsold for:</span>
                                {[60, 90, 120].map(days => (
                                    <button
                                        key={days}
                                        onClick={() => setAgingThreshold(days)}
                                        className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                                            agingThreshold === days
                                                ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                                                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                        }`}
                                    >
                                        &gt; {days} Days
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Summary Metrics */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-xl">
                                <div className="text-xs font-semibold text-amber-700 uppercase">Slow Movers Flagged</div>
                                <div className="text-2xl font-bold text-gray-900 mt-1">{agingData.slowMoversCount || 0} items</div>
                            </div>
                            <div className="p-4 bg-rose-50/50 border border-rose-100 rounded-xl">
                                <div className="text-xs font-semibold text-rose-700 uppercase">Capital Locked in Dead Stock</div>
                                <div className="text-2xl font-bold text-gray-900 mt-1">₹{Number(agingData.totalHoldingValue || 0).toFixed(2)}</div>
                            </div>
                            <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
                                <div className="text-xs font-semibold text-blue-700 uppercase">Recommended Action</div>
                                <div className="text-sm font-bold text-gray-900 mt-2">
                                    {agingThreshold >= 90 ? 'Flash Clearance (35–50% Off)' : 'Seasonal Markdown (20% Off)'}
                                </div>
                            </div>
                        </div>

                        {/* Aging Table */}
                        <div className="border border-gray-100 rounded-xl overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs text-gray-600">
                                    <thead className="bg-gray-50 text-gray-500 uppercase">
                                        <tr>
                                            <th className="py-3 px-4">Garment</th>
                                            <th className="py-3 px-4">Size & Color</th>
                                            <th className="py-3 px-4">Current Stock</th>
                                            <th className="py-3 px-4">MRP (₹)</th>
                                            <th className="py-3 px-4">Days in Stock</th>
                                            <th className="py-3 px-4">Suggested Clearance Discount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {(agingData.items || []).length === 0 ? (
                                            <tr>
                                                <td colSpan="6" className="py-12 text-center text-gray-400">
                                                    No dead stock found exceeding {agingThreshold} days. Inventory turnover is healthy! ✨
                                                </td>
                                            </tr>
                                        ) : (
                                            (agingData.items || []).map(it => (
                                                <tr key={it.id} className="hover:bg-gray-50/50">
                                                    <td className="py-3 px-4 font-bold text-gray-900">{it.name}</td>
                                                    <td className="py-3 px-4">{it.size} / {it.color}</td>
                                                    <td className="py-3 px-4 font-semibold text-amber-700">{it.quantity} pcs</td>
                                                    <td className="py-3 px-4">₹{it.price}</td>
                                                    <td className="py-3 px-4 font-mono font-bold text-rose-600">{it.daysInStock} days</td>
                                                    <td className="py-3 px-4">
                                                        <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded font-bold">
                                                            {it.suggestedDiscount}% Off Tag
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 4: NIGHTLY EOD CLOSING */}
                {activeTab === 'eod' && (
                    <div className="bg-white p-6 rounded-b-2xl border border-gray-100 shadow-sm space-y-6">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                            <div>
                                <h2 className="text-base font-bold text-gray-900">End-of-Day (EOD) Counter Closing</h2>
                                <p className="text-xs text-gray-500">Reconcile cash drawer, payment modes, and send nightly closing WhatsApp summary.</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <input
                                    type="date"
                                    value={eodDate}
                                    onChange={(e) => setEodDate(e.target.value)}
                                    className="px-3 py-1.5 border border-gray-200 rounded-xl text-xs"
                                />
                                <button
                                    onClick={handleSendEodWhatsApp}
                                    disabled={isSendingEodWa || !eodData}
                                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all disabled:opacity-50"
                                >
                                    <Send size={15} />
                                    {isSendingEodWa ? 'Sending...' : 'Send Nightly WhatsApp to Owner'}
                                </button>
                            </div>
                        </div>

                        {eodData && (
                            <div className="space-y-6">
                                {/* Top Metrics */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl">
                                        <div className="text-xs font-semibold text-emerald-700 uppercase">Total Revenue</div>
                                        <div className="text-2xl font-bold text-gray-900 mt-1">₹{Number(eodData.totalRevenue || 0).toFixed(2)}</div>
                                    </div>
                                    <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
                                        <div className="text-xs font-semibold text-blue-700 uppercase">Total Invoices</div>
                                        <div className="text-2xl font-bold text-gray-900 mt-1">{eodData.totalBills} bills</div>
                                    </div>
                                    <div className="p-4 bg-pink-50/50 border border-pink-100 rounded-xl">
                                        <div className="text-xs font-semibold text-pink-700 uppercase">Garments Sold</div>
                                        <div className="text-2xl font-bold text-gray-900 mt-1">{eodData.totalItemsSold} pcs</div>
                                    </div>
                                    <div className="p-4 bg-purple-50/50 border border-purple-100 rounded-xl">
                                        <div className="text-xs font-semibold text-purple-700 uppercase">Cash in Drawer</div>
                                        <div className="text-2xl font-bold text-gray-900 mt-1">₹{Number(eodData.paymentBreakdown?.cash || 0).toFixed(2)}</div>
                                    </div>
                                </div>

                                {/* Payment Breakdown */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="p-4 rounded-xl border border-gray-100 space-y-3">
                                        <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Payment Mode Reconciliation</h3>
                                        <div className="space-y-2 text-xs">
                                            <div className="flex justify-between py-1.5 border-b border-gray-50">
                                                <span className="text-gray-600">💵 Cash in Drawer:</span>
                                                <span className="font-bold text-gray-900">₹{Number(eodData.paymentBreakdown?.cash || 0).toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between py-1.5 border-b border-gray-50">
                                                <span className="text-gray-600">📱 UPI / QR Code:</span>
                                                <span className="font-bold text-gray-900">₹{Number(eodData.paymentBreakdown?.upi || 0).toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between py-1.5 border-b border-gray-50">
                                                <span className="text-gray-600">💳 Card POS Terminal:</span>
                                                <span className="font-bold text-gray-900">₹{Number(eodData.paymentBreakdown?.card || 0).toFixed(2)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Staff Leaderboard */}
                                    <div className="p-4 rounded-xl border border-gray-100 space-y-3">
                                        <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Sales Staff Performance</h3>
                                        {(eodData.staffLeaderboard || []).length === 0 ? (
                                            <div className="text-xs text-gray-400 py-4">No staff sales tagged today.</div>
                                        ) : (
                                            <div className="space-y-2 text-xs">
                                                {(eodData.staffLeaderboard || []).map((st, i) => (
                                                    <div key={i} className="flex justify-between items-center py-1.5 border-b border-gray-50">
                                                        <span className="font-semibold text-gray-800">{st.name} ({st.count} sales)</span>
                                                        <span className="font-bold text-pink-600">₹{Number(st.revenue || 0).toFixed(2)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Hangtag Batch Print Modal */}
            {isHangtagModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <div className="flex items-center gap-2">
                                <Tag size={20} className="text-pink-600" />
                                <h3 className="font-bold text-gray-900 text-base">Print Apparel Price Hangtags</h3>
                            </div>
                            <button onClick={() => setIsHangtagModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1 space-y-4">
                            <p className="text-xs text-gray-500">
                                These price stickers can be batch printed onto thermal hangtag paper or sticker rolls for tagging garments.
                            </p>

                            {/* Hangtag Sheet Container */}
                            <div ref={hangtagPrintRef} className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-xl">
                                {createdBatchProducts.map((p, i) => (
                                    <div key={i} className="bg-white border-2 border-dashed border-gray-300 p-3 rounded-lg text-center flex flex-col items-center justify-between h-[55mm] w-[75mm] mx-auto text-black font-sans">
                                        <div className="text-xs font-extrabold uppercase tracking-wider">{p.brand || 'PREMIUM WEAR'}</div>
                                        <div className="text-[11px] font-semibold text-gray-800">{p.baseArticle || p.name}</div>
                                        <div className="flex items-center gap-2 text-xs font-bold my-1">
                                            <span className="bg-black text-white px-2 py-0.5 rounded">SIZE: {p.size}</span>
                                            <span>COLOR: {p.color}</span>
                                        </div>

                                        <div className="my-1 scale-90">
                                            <Barcode value={p.barcode || 'CLO1000'} width={1.2} height={28} fontSize={9} />
                                        </div>

                                        <div className="text-sm font-black text-gray-900 border-t w-full pt-1">
                                            MRP: ₹{p.price} <span className="text-[9px] font-normal text-gray-500">(Incl. all taxes)</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-4 border-t flex justify-end gap-3 bg-gray-50/50">
                            <button
                                onClick={() => setIsHangtagModalOpen(false)}
                                className="px-4 py-2 border rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100"
                            >
                                Done
                            </button>
                            <button
                                onClick={() => handlePrintHangtags()}
                                className="flex items-center gap-2 px-6 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-bold shadow-sm"
                            >
                                <Printer size={16} />
                                Print Hangtags Now
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </BillingLayout>
    );
};

export default ClothingHub;
