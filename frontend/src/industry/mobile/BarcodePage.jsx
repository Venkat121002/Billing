import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import Barcode from "react-barcode";
import { useReactToPrint } from "react-to-print";
import API_URL from "../../config/api";
import BillingLayout from "../../Layout/BillingLayout/AdminLayout";
import {
    Printer,
    ArrowLeft,
    Smartphone,
    Hash,
    Tag,
    Palette,
    CheckCircle2,
    AlertCircle
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../../contexts/AuthContext";

const BarcodePage = () => {
    const { productId } = useParams();
    const navigate = useNavigate();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const printRef = useRef();
     const { currentUser } = useAuth();

    const isClothing = currentUser?.companyDetails?.industry?.toLowerCase() === "clothing";

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const token = sessionStorage.getItem("token");
                const res = await axios.get(`${API_URL}/products/${productId}`, {
                    headers: { "x-auth-token": token },
                });

                setProduct(res.data);
            } catch (err) {
                console.error("Error fetching product:", err);
                toast.error("Failed to load product details");
            } finally {
                setLoading(false);
            }
        };


        if (productId) {
            fetchProduct();
        }
    }, [productId]);

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `Barcode_${product?.imei1 || "Product"}`,
    });

    if (loading) {
        return (
            <BillingLayout>
                <div className="flex items-center justify-center min-h-screen">
                    {/* <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${isClothing ? 'border-[#FA7FC5]' : 'border-green-500'}`}></div> */}
                    <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${isClothing ? 'border-[#f74faf]' : 'border-green-500'}`}></div>
                </div>
            </BillingLayout>
        );
    }

    if (!product) {
        return (
            <BillingLayout>
                <div className="flex flex-col items-center justify-center min-h-screen gap-4">
                    <AlertCircle size={48} className="text-red-500" />
                    <h2 className="text-2xl font-bold text-gray-800">Product Not Found</h2>
                    <button
                        onClick={() => navigate("/inventory")}
                        // className={`flex items-center gap-2 px-6 py-2 ${isClothing ? 'bg-[#FA7FC5] hover:opacity-90' : 'bg-green-600 hover:bg-green-700'} text-white rounded-xl transition-all`}
                        className={`flex items-center gap-2 px-6 py-2 ${isClothing ? 'bg-[#f74faf] hover:opacity-90' : 'bg-green-600 hover:bg-green-700'} text-white rounded-xl transition-all`}
                    >
                        <ArrowLeft size={18} />
                        Back to Inventory
                    </button>
                </div>
            </BillingLayout>
        );
    }

    return (
        <BillingLayout>
            <div className={`min-h-screen bg-gradient-to-br ${isClothing ? 'from-[#f74faf]/10 via-white to-[#f74faf]/10' : 'from-green-50 via-white to-green-50'} px-8 py-10`}>
                <div className="max-w-2xl mx-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <button
                            onClick={() => navigate(-1)}
                            className={`flex items-center gap-2 ${isClothing ? 'text-[#f74faf] hover:opacity-80' : 'text-green-700 hover:text-green-800'} font-medium transition-all`}
                        >
                            <ArrowLeft size={20} />
                            Back
                        </button>
                        <h1 className="text-2xl font-bold text-gray-800">{currentUser.companyDetails.industry =="mobile_shop" ? (
                                "Device Barcode"
                            ):(
                                "Product Barcode"
                            )}</h1>
                        <button
                            onClick={() => handlePrint()}
                            // className={`flex items-center gap-2 ${isClothing ? 'bg-[#FA7FC5] hover:opacity-90' : 'bg-green-600 hover:bg-green-700'} text-white px-6 py-2.5 rounded-xl font-medium shadow-md hover:shadow-lg transition-all`}
                            className={`flex items-center gap-2 ${isClothing ? 'bg-[#f74faf] hover:opacity-90' : 'bg-green-600 hover:bg-green-700'} text-white px-6 py-2.5 rounded-xl font-medium shadow-md hover:shadow-lg transition-all`}
                        >
                            <Printer size={18} />
                            Print Barcode
                        </button>
                    </div>

                    {/* Preview Card */}
                    <div className={`bg-white rounded-3xl shadow-xl border ${isClothing ? 'border-[#f74faf]/20' : 'border-green-100'} overflow-hidden`}>
                        <div className={`${isClothing ? 'bg-[#f74faf]' : 'bg-green-600'} px-8 py-6 text-white`}>
                            <div className="flex items-center gap-3 mb-2">
                                <CheckCircle2 size={24} className={isClothing ? "text-white/80" : "text-green-200"} />
                                <span className="text-sm font-medium uppercase tracking-wider opacity-90">Product Saved Successfully</span>
                            </div>
                            <h2 className="text-2xl font-bold">{currentUser.companyDetails.industry =="mobile_shop" ? (
                                `${product.brand} ${product.model}`
                            ):(
                                `${product.name.charAt(0).toUpperCase() + product.name.slice(1)}`
                            )}</h2>
                        </div>

                        <div className="p-8 space-y-8">
                            {/* Product Info Grid */}
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{currentUser.companyDetails.industry =="mobile_shop" ? (
                                "Color"
                            ):(
                                "SKU"
                            )}</p>
                                    <div className="flex items-center gap-2 text-gray-700">
                                        {/* <Palette size={16} className={isClothing ? "text-[#FA7FC5]" : "text-green-500"} /> */}
                                        <Palette size={16} className={isClothing ? "text-[#f74faf]" : "text-green-500"} />
                                        <span className="font-semibold">{currentUser.companyDetails.industry =="mobile_shop" ? (
                                `${product.color || "N/A"}`
                            ):(
                                `${product.sku}`
                            )}</span>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{currentUser.companyDetails.industry =="mobile_shop" ?(
                                "IMEI 1"
                            ):(
                               "Category"
                            )}</p>
                                    <div className="flex items-center gap-2 text-gray-700">
                                        {/* <Hash size={16} className={isClothing ? "text-[#FA7FC5]" : "text-green-500"} /> */}
                                        <Hash size={16} className={isClothing ? "text-[#f74faf]" : "text-green-500"} />
                                        <span className="font-semibold">{currentUser.companyDetails.industry =="mobile_shop" ?(
                                `${product.imei1}`
                            ):(
                                `${product.category}`
                            )}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Barcode Display Area */}
                            <div className="flex flex-col items-center justify-center p-10 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                                <div ref={printRef} className="bg-white p-6 rounded-lg text-center">
                                    {/* This inner div is what gets printed */}
                                    <style type="text/css" media="print">
                                        {"@page { size: auto; margin: 5mm; }"}
                                    </style>
                                    <div className="mb-2 text-xs font-bold uppercase tracking-widest text-gray-800">
                                       {currentUser.companyDetails.industry =="mobile_shop" ?(
                                `${product.brand} ${product.model}`
                            ):(
                                `${product.name}`
                            )} 
                                    </div>
                                    <Barcode
                                        value={currentUser.companyDetails.industry =="mobile_shop" ?(
                                `${product.imei1}`
                            ):(
                                `${product.barcode}`
                            )}
                                        width={1.5}
                                        height={50}
                                        fontSize={12}
                                        margin={0}
                                    />
                                    <div className="mt-1 text-[10px] font-medium text-gray-600">
                                       {currentUser.companyDetails.industry =="mobile_shop" ? (
                                 `IMEI: ${product.imei1}`
                            ):(
                                `Price: ${product.salesPrice}`
                               
                            )}
                                    </div>
                                </div>
                                <p className="mt-4 text-sm text-gray-500 italic">Barcode Preview</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </BillingLayout>
    );
};

export default BarcodePage;
