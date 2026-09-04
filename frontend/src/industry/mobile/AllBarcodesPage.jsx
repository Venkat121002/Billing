// import React, { useState, useEffect, useRef } from "react";
// import axios from "axios";
// import Barcode from "react-barcode";
// import { useReactToPrint } from "react-to-print";
// import API_URL from "../../config/api";
// import BillingLayout from "../../Layout/BillingLayout/AdminLayout";
// import {
//     Printer,
//     Search,
//     Smartphone,
//     Hash,
//     Tag,
//     Filter,
//     Package,
//     ArrowRight
// } from "lucide-react";
// import toast from "react-hot-toast";
// import { useNavigate } from "react-router-dom";
// import { useAuth } from "../../contexts/AuthContext";

// const AllBarcodesPage = () => {
//     const [products, setProducts] = useState([]);
//     const [filteredProducts, setFilteredProducts] = useState([]);
//     const [loading, setLoading] = useState(true);
//     const [searchTerm, setSearchTerm] = useState("");
//     const navigate = useNavigate();
//     const printAllRef = useRef();
//      const { currentUser } = useAuth();
//      
    
    

//     const handlePrintAll = useReactToPrint({
//         contentRef: printAllRef,
//         documentTitle: `All_Barcodes_${new Date().toLocaleDateString()}`,
//     });

//     useEffect(() => {
//         fetchProducts();
//     }, []);

//     const fetchProducts = async () => {
//         try {
//             const token = sessionStorage.getItem("token");
//             const res = await axios.get(`${API_URL}/products`, {
//                 headers: { "x-auth-token": token },
//             });
//             console.log("ennapa",res)
//             // Filter only products that have IMEI/Barcode
//             const barcodeProducts = res.data.filter(p => p.imei1 || p.barcode);
//             setProducts(barcodeProducts);
//             setFilteredProducts(barcodeProducts);
//         } catch (err) {
//             console.error("Error fetching products:", err);
//             toast.error("Failed to load products");
//         } finally {
//             setLoading(false);
//         }
//     };

//     useEffect(() => {
//         if(currentUser.companyDetails.industry !=="grocery_store"){
//              const results = products.filter(product =>
//             product.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
//             product.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
//             product.imei1?.toLowerCase().includes(searchTerm.toLowerCase())
//         );
//         setFilteredProducts(results);
//         }
//        else{
//          const results = products.filter(product =>
//             product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
//             product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) 
//         );
//         setFilteredProducts(results);
//        }
        
//     }, [searchTerm, products]);

//     const BarcodeItem = ({ product }) => {
//         const componentRef = useRef();
//         const handlePrint = useReactToPrint({
//             contentRef: componentRef,
//             documentTitle: `Barcode_${product.imei1}`,
//         });

//         return (
//             <div className="bg-white p-6 rounded-2xl border border-green-100 shadow-sm hover:shadow-md transition-all flex flex-col gap-4">
//                 <div className="flex justify-between items-start">
//                     <div className="flex items-center gap-3">
//                         <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-600">
//                             <Smartphone size={20} />
//                         </div>
//                         <div>
//                             <h3 className="font-bold text-gray-800">{currentUser.companyDetails.industry !=="grocery_store" ? (
//                                 `${product.brand} ${product.model}`
//                             ):(
//                                 `${product.name.charAt(0).toUpperCase() + product.name.slice(1)}`
//                             )}</h3>
//                             <p className="text-xs text-gray-500 flex items-center gap-1">
//                                 <Tag size={12} /> {currentUser.companyDetails.industry !=="grocery_store" ? (
//                                 `${product.color || "No Color"}`
//                             ):(
//                                 `${product.sku}`
//                             )}
//                             </p>
//                         </div>
//                     </div>
//                     <button
//                         onClick={() => handlePrint()}
//                         className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
//                         title="Print Barcode"
//                     >
//                         <Printer size={18} />
//                     </button>
//                 </div>

//                 <div className="bg-gray-50 p-4 rounded-xl flex flex-col items-center justify-center overflow-hidden border border-gray-100">
//                     <div ref={componentRef} className="bg-white p-2 rounded text-center">
//                         <style type="text/css" media="print">
//                             {"@page { size: auto; margin: 5mm; }"}
//                         </style>
//                         <div className="mb-1 text-[10px] font-bold uppercase tracking-tighter text-gray-800">
//                             {product.brand} {product.model}
//                         </div>
//                         <Barcode
//                             value={product.imei1 || product.barcode || "N/A"}
//                             width={1.2}
//                             height={40}
//                             fontSize={10}
//                             margin={0}
//                         />
//                         <div className="mt-1 text-[8px] font-medium text-gray-600">
                            
//                         </div>
//                     </div>
//                 </div>

//                 <button
//                     onClick={() => navigate(`/barcode/${product.id}`)}
//                     className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-green-700 bg-green-50 rounded-xl hover:bg-green-100 transition-colors"
//                 >
//                     View Details <ArrowRight size={14} />
//                 </button>
//             </div>
//         );
//     };

//     return (
//         <BillingLayout>
//             <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 px-8 py-10">
//                 <div className="max-w-7xl mx-auto">
//                     {/* Header Section */}
//                     <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
//                         <div>
//                             <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
//                                 <Package size={28} className="text-green-600" />
//                                 Product Barcodes
//                             </h1>
//                             <p className="text-gray-500 mt-1">{currentUser.companyDetails.industry !=="grocery_store" ? (
//                                 "Generate and print barcodes for all devices"
//                             ):(
//                                 "Generate and print barcodes for all products"
//                             )}</p>
//                         </div>

//                         <div className="flex items-center gap-4">
//                             <div className="relative">
//                                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
//                                 <input
//                                     type="text"
//                                     placeholder={currentUser.companyDetails.industry !=="grocery_store" ? (
//                                 "Search brand, model, imei..."
//                             ):(
//                                 "Search Product, Category, Sku..."
//                             )}
//                                     className="pl-10 pr-4 py-2.5 w-64 md:w-80 rounded-xl border border-green-100 bg-white focus:ring-2 focus:ring-green-500 outline-none shadow-sm transition-all"
//                                     value={searchTerm}
//                                     onChange={(e) => setSearchTerm(e.target.value)}
//                                 />
//                             </div>
//                             <button
//                                 onClick={() => handlePrintAll()}
//                                 className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all shadow-md font-semibold"
//                             >
//                                 <Printer size={18} />
//                                 Print All
//                             </button>
//                             <button className="p-2.5 bg-white border border-green-100 text-gray-600 rounded-xl hover:bg-green-50 transition-all shadow-sm">
//                                 <Filter size={20} />
//                             </button>
//                         </div>
//                     </div>

//                     {loading ? (
//                         <div className="flex items-center justify-center py-20">
//                             <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
//                         </div>
//                     ) : filteredProducts.length > 0 ? (
//                         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
//                             {filteredProducts.map(product => (
//                                 <BarcodeItem key={product.id} product={product} />
//                             ))}
//                         </div>
//                     ) : (
//                         <div className="bg-white rounded-3xl p-20 flex flex-col items-center justify-center border border-dashed border-gray-200">
//                             <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 mb-4">
//                                 <Package size={32} />
//                             </div>
//                             <p className="text-gray-500 font-medium text-center max-w-xs">
//                                 {searchTerm ? "No products match your search criteria" : "No products found with barcodes in your inventory"}
//                             </p>
//                         </div>
//                     )}
//                 </div>

//                 {/* Hidden Printable Section for All Barcodes */}
//                 <div className="hidden">
//                     <div ref={printAllRef} className="p-8">
//                         <style type="text/css" media="print">
//                             {`
//                                 @page { size: auto; margin: 10mm; }
//                                 .print-grid { 
//                                     display: grid; 
//                                     grid-template-columns: repeat(3, 1fr); 
//                                     gap: 20px; 
//                                 }
//                                 .print-item {
//                                     border: 1px solid #eee;
//                                     padding: 10px;
//                                     text-align: center;
//                                     page-break-inside: avoid;
//                                 }
//                             `}
//                         </style>
//                         <h1 className="text-xl font-bold mb-6 text-center border-b pb-4">Product Barcodes Inventory</h1>
//                         <div className="print-grid">
//                             {filteredProducts.map((product) => (
//                                 <div key={product.id} className="print-item">
//                                     <div className="text-[10px] font-bold uppercase mb-1">{product.brand} {product.model}</div>
//                                     <div className="flex justify-center">
//                                         <Barcode
//                                             value={product.imei1 || product.barcode || "N/A"}
//                                             width={1}
//                                             height={35}
//                                             fontSize={8}
//                                             margin={0}
//                                         />
//                                     </div>
//                                     <div className="text-[8px] mt-1 text-gray-600">{product.imei1}</div>
//                                 </div>
//                             ))}
//                         </div>
//                     </div>
//                 </div>
//             </div>
//         </BillingLayout>
//     );
// };

// export default AllBarcodesPage;
