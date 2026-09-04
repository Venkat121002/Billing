


import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import Barcode from "react-barcode";
import { useReactToPrint } from "react-to-print";
import API_URL from "../../config/api";
import BillingLayout from "../../Layout/BillingLayout/AdminLayout";
import ClothingBarcodePage from "./ClothingBarcode";
import {
    Printer,
    Search,
    Smartphone,
    Hash,
    Tag,
    Filter,
    Package,
    ArrowRight
} from "lucide-react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";


const ClothingAllBarcodesPage = () => {
    const [products, setProducts] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const navigate = useNavigate();
    const printAllRef = useRef();
     const { currentUser } = useAuth();
    
    
    

    const handlePrintAll = useReactToPrint({
        contentRef: printAllRef,
        documentTitle: `All_Barcodes_${new Date().toLocaleDateString()}`,
    });

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const token = sessionStorage.getItem("token");
            const res = await axios.get(`${API_URL}/products`, {
                headers: { "x-auth-token": token },
            });
           
            // Filter only products that have IMEI/Barcode
            const barcodeProducts = res.data.filter(p => p.imei1 || p.barcode);
            setProducts(barcodeProducts);
            setFilteredProducts(barcodeProducts);
        } catch (err) {
            console.error("Error fetching products:", err);
            toast.error("Failed to load products");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
       
        const results = products.filter(product =>
            (product.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (product.sku || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (product.category || '').toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredProducts(results);
        
    }, [searchTerm, products]);

    const BarcodeItem = ({ product }) => {
        const componentRef = useRef();
        const handlePrint = useReactToPrint({
            contentRef: componentRef,
            documentTitle: `Barcode_${product.imei1}`,
        });

        return (
            <div className="bg-white p-6 rounded-[2rem] border border-[#f74faf]/10 shadow-sm hover:shadow-2xl hover:shadow-[#f74faf]/10 transition-all duration-500 flex flex-col gap-5 group">
                <div className="flex justify-between items-start"> {/* Changed border-violet-50 to border-[#f74faf]/10 */}
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-[#f74faf]/10 flex items-center justify-center text-[#f74faf] group-hover:bg-[#f74faf] group-hover:text-white transition-all duration-500">
                            <Package size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-800">{`${product.name.charAt(0).toUpperCase() + product.name.slice(1)}`}</h3>
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                                <Tag size={12} /> {
                                `${product.sku}`}
                            
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => handlePrint()}
                        className="p-2.5 text-[#f74faf] hover:bg-[#f74faf]/10 rounded-xl transition-all"
                        title="Print Barcode"
                    >
                        <Printer size={18} />
                    </button>
                </div>

                <div className="bg-[#f74faf]/10 p-6 rounded-3xl flex flex-col items-center justify-center overflow-hidden border border-[#f74faf]/20"> {/* Changed bg-violet-50/30 and border-violet-50/50 */}
                    <div ref={componentRef} className="bg-white p-2 rounded text-center">
                        <style type="text/css" media="print">
                            {"@page { size: auto; margin: 5mm; }"}
                        </style>
                        <div className="mb-1 text-[10px] font-bold uppercase tracking-tighter text-gray-800">
                            {product.name}
                        </div>
                        <Barcode
                            value={product.imei1 || product.barcode || "N/A"}
                            width={1.2}
                            height={40}
                            fontSize={10}
                            margin={0}
                        />
                        <div className="mt-1 text-[8px] font-medium text-gray-600">
                            {product.barcode || product.sku}
                        </div>
                    </div>
                </div>

                <button
                    onClick={() => navigate(`/barcode/${product.id}`)}
                    className="w-full flex items-center justify-center gap-2 py-3 text-xs font-black uppercase tracking-widest text-[#f74faf] bg-[#f74faf]/10 rounded-2xl hover:bg-[#f74faf] hover:text-white transition-all duration-300 shadow-sm"
                >
                    View Details <ArrowRight size={14} />
                </button>
            </div>
        );
    };
    return (
        <BillingLayout>
            <div className="min-h-screen bg-gradient-to-br from-[#f74faf]/10 via-white to-[#f74faf]/10 px-8 py-10"> {/* Changed from-violet-50/50 via-white to-purple-50/30 */}
                <div className="max-w-7xl mx-auto">
                    {/* Header Section */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3"> {/* Changed text-violet-600 */}
                                <Package size={28} className="text-[#f74faf]" />
                                Product Barcodes
                            </h1>
                            <p className="text-gray-500 mt-1">{
                                "Generate and print barcodes for all products"
                            }</p>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#f74faf]/60" size={18} />
                                <input
                                    type="text"
                                    placeholder={
                                "Search Product, Category, Sku..."
                            }
                                    className="pl-10 pr-4 py-3 w-64 md:w-80 rounded-2xl border border-[#f74faf]/20 bg-white focus:ring-4 focus:ring-[#f74faf]/10 outline-none shadow-sm transition-all"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <button
                                onClick={() => handlePrintAll()}
                                className="flex items-center gap-2 px-8 py-3 bg-[#f74faf] text-white rounded-2xl hover:opacity-90 transition-all shadow-lg shadow-[#f74faf]/20 font-bold"
                            >
                                <Printer size={18} />
                                Print All
                            </button>
                            <button className="p-3 bg-white border border-[#f74faf]/20 text-[#f74faf] rounded-2xl hover:bg-[#f74faf]/10 transition-all shadow-sm">
                                <Filter size={20} className="text-[#f74faf]" /> {/* Changed text-violet-600 */}
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f74faf]"></div>
                        </div>
                    ) : filteredProducts.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filteredProducts.map(product => (
                                <BarcodeItem key={product.id} product={product} />
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white rounded-3xl p-20 flex flex-col items-center justify-center border border-dashed border-gray-200">
                            <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 mb-4">
                                <Package size={32} />
                            </div>
                            <p className="text-gray-500 font-medium text-center max-w-xs">
                                {searchTerm
                                    ? "No products match your search criteria."
                                    : "No products with barcodes found in your inventory."}
                            </p>
                        </div>
                    )}
                </div>

                {/* Hidden Printable Section for All Barcodes */}
                <div className="hidden">
                    <div ref={printAllRef} className="p-8">
                        <style type="text/css" media="print">
                            {`
                                @page { size: auto; margin: 10mm; }
                                .print-grid { 
                                    display: grid; 
                                    grid-template-columns: repeat(3, 1fr); 
                                    gap: 20px; 
                                }
                                .print-item {
                                    border: 1px solid #eee;
                                    padding: 10px;
                                    text-align: center;
                                    page-break-inside: avoid;
                                }
                            `}
                        </style>
                        <h1 className="text-xl font-bold mb-6 text-center border-b pb-4">Product Barcodes Inventory</h1>
                        <div className="print-grid">
                            {filteredProducts.map((product) => (
                                <div key={product.id} className="print-item">
                                    <div className="text-[10px] font-bold uppercase mb-1">{product.name}</div>
                                    <div className="flex justify-center">
                                        <Barcode
                                            value={product.imei1 || product.barcode || "N/A"}
                                            width={1}
                                            height={35}
                                            fontSize={8}
                                            margin={0}
                                        />
                                    </div>
                                    <div className="text-[8px] mt-1 text-gray-600">{product.barcode || product.sku}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </BillingLayout>
    );
};

export default ClothingAllBarcodesPage;
