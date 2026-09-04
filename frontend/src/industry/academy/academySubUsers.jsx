import React, { useState, useEffect } from "react";
import axios from "axios";
import { format } from "date-fns";
import {
    Users,
    Search,
    Filter,
    Calendar,
    Download,
    ArrowRight,
    UserCheck,
    Briefcase,
    BookOpen,
    Mail,
    Phone,
    MapPin,
    AlertCircle,
    LayoutDashboard,
    Package,
    ShoppingCart,
    CreditCard,
    DollarSign,
    Receipt,
    Activity,
    Wallet,
    X
} from "lucide-react";
import * as XLSX from "xlsx";
import toast from "react-hot-toast";
import BillingLayout from "../../Layout/BillingLayout/AdminLayout";
import API_URL from "../../config/api";
import { useAuth } from "../../contexts/AuthContext";

const AcademySubUsers = () => {
    const { currentUser } = useAuth();
    const [records, setRecords] = useState([]);
    const [subusers, setSubusers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedUser, setSelectedUser] = useState("all");
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = sessionStorage.getItem("token");
                const config = { headers: { "x-auth-token": token } };

                // 1. Fetch all sub-users to populate filter
                const usersRes = await axios.get(`${API_URL}/users`, config);
                setSubusers(usersRes.data);

                // 2. Fetch all customers for name lookup
                const customersRes = await axios.get(`${API_URL}/customers`, config);
                const customersMap = {};
                customersRes.data.forEach(c => {
                    customersMap[c.id] = c;
                });

                // 3. Fetch unified records from all modules
                const [productsRes, billsRes, creditRes, cashRes] = await Promise.all([
                    axios.get(`${API_URL}/products?includeSubusers=true`, config),
                    axios.get(`${API_URL}/billing/bills`, config),
                    axios.get(`${API_URL}/credit`, config),
                    axios.get(`${API_URL}/cashbook`, config)
                ]);

                // Flatten and tag records
                const allRecords = [
                    ...productsRes.data.map(r => ({
                        ...r,
                        type: "Inventory",
                        label: r.name || r.brand,
                        amount: r.salePrice || r.sellingPrice || 0
                    })),
                    ...billsRes.data.map(r => {
                        const customer = customersMap[r.customerId] || {};
                        return {
                            ...r,
                            type: "Bill",
                            label: `Inv #${r.receiptNo || r.id}`,
                            customerName: customer.name || r.customerName || "Walk-in",
                            customerPhone: customer.phone || customer.mobile || "-",
                            subtotal: r.totals?.subtotal || 0,
                            totalAmount: r.totals?.grandTotal || 0,
                            discount: r.totals?.discount || 0,
                            paymentMode: r.paymentMethod || "-",
                            amount: r.totals?.grandTotal || 0
                        };
                    }),
                    ...creditRes.data.map(r => ({
                        ...r,
                        type: "Credit",
                        label: r.name || "N/A",
                        amount: r.total || r.amount || 0
                    })),
                    ...cashRes.data.map(r => ({
                        ...r,
                        type: "Cashbook",
                        label: r.description,
                        amount: r.amount || 0
                    }))
                ];

                // Sort by date (desc)
                allRecords.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

                setRecords(allRecords);
            } catch (err) {
                console.error("Error fetching unified records:", err);
                toast.error("Failed to load staff records");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const filteredRecords = records.filter(record => {
        // Filter out owner records - only show those created by subusers
        const isSubuserRecord = record.createdBy !== currentUser?.uid && record.createdBy !== currentUser?.userId;
        if (!isSubuserRecord) return false;

        const matchesTab = activeTab === "all" || record.type === activeTab;
        const matchesSearch = record.label?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            record.source?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (record.customerName || "").toLowerCase().includes(searchTerm.toLowerCase());
        const matchesUser = selectedUser === "all" || record.createdBy === selectedUser;

        return matchesTab && matchesSearch && matchesUser;
    });

    const handleExport = () => {
        const data = filteredRecords.map((r, i) => ({
            "S.No": i + 1,
            "Type": r.type,
            "Description": r.label,
            "Staff Name": r.source || "Owner",
            "Customer": r.customerName || "-",
            "Date": format(new Date(r.createdAt), "dd MMM yyyy HH:mm"),
            "Amount": r.amount || "-",
            "Payment Mode": r.paymentMode || "-"
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "StaffRecords");
        XLSX.writeFile(wb, `Staff_Activity_Report_${format(new Date(), "yyyyMMdd")}.xlsx`);
    };

    if (loading) {
        return (
            <BillingLayout>
                <div className="flex items-center justify-center min-h-screen">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
                </div>
            </BillingLayout>
        );
    }

    return (
        <BillingLayout>
            <div className="min-h-screen bg-slate-50 p-6">
                <div className="max-w-7xl mx-auto space-y-6">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                                <Users className="text-purple-600" />
                                Staff Records & Activity
                            </h1>
                            <p className="text-slate-500 text-sm">Monitor all activities across your academy branches</p>
                        </div>
                        <button
                            onClick={handleExport}
                            className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-xl text-slate-700 font-semibold hover:bg-slate-50 transition-all shadow-sm"
                        >
                            <Download size={18} />
                            Export Data
                        </button>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {[
                            { label: "Total Activities", value: filteredRecords.length, icon: Activity, color: "blue" },
                            { label: "Staff Members", value: subusers.length, icon: UserCheck, color: "purple" },
                            { label: "Current Session", value: "Active", icon: Briefcase, color: "emerald" },
                            { label: "Sync Status", value: "Live", icon: LayoutDashboard, color: "indigo" }
                        ].map((stat, i) => (
                            <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-xl bg-${stat.color}-50 flex items-center justify-center`}>
                                    <stat.icon className={`text-${stat.color}-600`} size={24} />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
                                    <p className="text-lg font-bold text-slate-800">{stat.value}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Filters & Content */}
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row gap-4 justify-between">
                            <div className="flex flex-wrap items-center gap-2">
                                {[
                                    { id: "all", label: "All History" },
                                    { id: "Inventory", label: "Courses" },
                                    { id: "Bill", label: "Billing" },
                                    { id: "Credit", label: "Fee Dues" },
                                    { id: "Cashbook", label: "Cashbook" }
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === tab.id
                                            ? "bg-purple-600 text-white shadow-md shadow-purple-200"
                                            : "text-slate-500 hover:bg-slate-50"
                                            }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Search records..."
                                        className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 w-full md:w-64"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <select
                                    className="bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500/20"
                                    value={selectedUser}
                                    onChange={(e) => setSelectedUser(e.target.value)}
                                >
                                    <option value="all">All Staff</option>
                                    {subusers.map(u => (
                                        <option key={u.id || u.firebaseUid} value={u.id || u.firebaseUid}>{u.firstName} {u.lastName}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50/50 text-slate-500 text-xs font-bold uppercase tracking-widest">
                                    <tr>
                                        <th className="px-6 py-4">S.No</th>
                                        <th className="px-6 py-4">Activity</th>
                                        <th className="px-6 py-4">Details</th>
                                        <th className="px-6 py-4">Staff Name</th>
                                        <th className="px-6 py-4">Timestamp</th>
                                        <th className="px-6 py-4">Amount</th>
                                        <th className="px-6 py-4 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredRecords.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="px-6 py-12 text-center">
                                                <div className="flex flex-col items-center gap-2">
                                                    <AlertCircle className="text-slate-300" size={40} />
                                                    <p className="text-slate-500 font-medium">No records found matching your filters</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredRecords.map((record, i) => (
                                            <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-6 py-4 text-sm font-semibold text-slate-400">
                                                    {i + 1}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-2 rounded-lg ${record.type === 'Inventory' ? 'bg-blue-50 text-blue-600' :
                                                            record.type === 'Bill' ? 'bg-purple-50 text-purple-600' :
                                                                record.type === 'Credit' ? 'bg-indigo-50 text-indigo-600' :
                                                                    'bg-blue-50 text-blue-600'
                                                            }`}>
                                                            {record.type === 'Inventory' && <BookOpen size={16} />}
                                                            {record.type === 'Bill' && <ShoppingCart size={16} />}
                                                            {record.type === 'Credit' && <FileText size={16} />}
                                                            {record.type === 'Cashbook' && <Wallet size={16} />}
                                                        </div>
                                                        <span className="text-sm font-bold text-slate-700">{record.type}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-sm font-medium text-slate-600">{record.label}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-slate-800">{record.source || "Owner"}</span>
                                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Branch ID: {record.branch || "Head"}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-slate-500">
                                                    {format(new Date(record.createdAt), "dd MMM yyyy, HH:mm")}
                                                </td>
                                                <td className="px-6 py-4 font-bold text-slate-800">
                                                    {record.type === "Inventory" ? (
                                                        <span className="text-blue-600">₹{Number(record.salePrice || record.sellingPrice || 0).toLocaleString()}</span>
                                                    ) : record.type === "Bill" ? (
                                                        <span className="text-purple-600">₹{Number(record.totalAmount || 0).toLocaleString()}</span>
                                                    ) : record.type === "Credit" ? (
                                                        <span className="text-indigo-600">₹{Number(record.total || record.amount || 0).toLocaleString()}</span>
                                                    ) : (
                                                        <span className="text-blue-600">₹{Number(record.amount || 0).toLocaleString()}</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedRecord(record);
                                                            setIsModalOpen(true);
                                                        }}
                                                        className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all active:scale-90"
                                                    >
                                                        <ArrowRight size={18} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {isModalOpen && (
                    <RecordDetailModal
                        record={selectedRecord}
                        currentUser={currentUser}
                        onClose={() => {
                            setIsModalOpen(false);
                            setSelectedRecord(null);
                        }}
                    />
                )}
            </div>
        </BillingLayout>
    );
};

const RecordDetailModal = ({ record, currentUser, onClose }) => {
    if (!record) return null;

    const businessName = currentUser?.companyDetails?.name || currentUser?.Tenant?.name || "Academy Name";
    const businessAddress = {
        street: currentUser?.companyDetails?.street || currentUser?.address?.street || "",
        city: currentUser?.companyDetails?.city || currentUser?.address?.city || "",
        state: currentUser?.companyDetails?.state || currentUser?.address?.state || "",
        pincode: currentUser?.companyDetails?.pincode || currentUser?.address?.pincode || ""
    };

    if (record.type === 'Bill') {
        const items = record.items || [];
        const receiptDate = record.receiptDate || record.createdAt;
        const discount = record.discount || 0;
        const totalAmount = record.totalAmount || 0;
        const paidAmount = totalAmount - (record.dueAmount || 0);

        return (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
                <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 my-8">
                    <div className="bg-white w-full p-8">
                        {/* Header */}
                        <div className="flex justify-between items-center">
                            <div>
                                <h1 className="text-xl font-bold text-blue-600">
                                    {businessName}
                                </h1>
                            </div>

                            <div className="bg-blue-600 text-white px-6 py-3 font-bold text-lg">
                                RECEIPT
                                <p className="text-xs font-normal">FOR COURSE FEE</p>
                            </div>
                        </div>

                        {/* Date + Receipt No */}
                        <div className="flex justify-between mt-6 text-sm">
                            <p><span className="font-semibold">Date:</span> {new Date(receiptDate).toLocaleDateString()}</p>
                            <p><span className="font-semibold">Receipt No:</span>{record.receiptNo || record.id}</p>
                        </div>

                        {/* Info Box */}
                        <div className="bg-blue-100 p-4 mt-4 grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="font-semibold">Student Name:</p>
                                <p>{record.customerName}</p>

                                <p className="mt-3 font-semibold">Received From:</p>
                                <p>{record.customerName}</p>

                                <p className="mt-3">
                                    <span className="font-semibold">Issue date:</span>{new Date(receiptDate).toLocaleDateString()}
                                </p>
                            </div>

                            {items.map((item, i) => (
                                <div key={i} className="text-right">
                                    <p>
                                        <span className="font-semibold">Amount:</span>{item.price}
                                    </p>
                                    <p className="mt-3">
                                        <span className="font-semibold">Due date:</span> {new Date(receiptDate).toLocaleDateString()}
                                    </p>
                                </div>
                            ))}
                        </div>

                        {/* Course + Duration */}
                        {items.map((item, i) => (
                            <div className="flex justify-between mt-5 text-sm bg-blue-100 p-2 mt-3" key={i}>
                                <p>
                                    <span className="font-semibold ">Course</span> {item.name}
                                </p>
                                <p>
                                    <span className="font-semibold">Duration:</span> {new Date(receiptDate).toLocaleDateString()}
                                </p>
                            </div>
                        ))}

                        {/* Bottom Section */}
                        <div className="flex justify-between mt-6">
                            {/* Left */}
                            <div className="text-sm">
                                <p className="font-semibold">Received By:</p>
                                <p> {businessName}</p>
                                <p className="mt-3 text-gray-600 text-xs leading-5">
                                    {businessAddress.street}<br />
                                    {businessAddress.city} <br />
                                    {businessAddress.state}
                                </p>
                                <p className="mt-6 italic">Signature</p>
                            </div>

                            {/* Right Amount Summary */}
                            {items.map((item, i) => (
                                <div className="text-sm text-right space-y-1" key={i}>
                                    <p>Tuition Fee: {Math.ceil(item.price)}</p>
                                    <p>GST Fee: Rs. {Math.ceil(item.price * (item.gstRate || 0) / 100)}</p>
                                    <p>Referral Discount: Rs. {discount}</p>
                                    <p>Other: Rs. 0</p>
                                    <p>Total Fee: Rs. {Math.ceil((item.price * (item.gstRate || 0) / 100) + item.price - discount)}</p>
                                    <p>Paid: Rs. {Math.ceil(paidAmount)}</p>
                                    <p className="font-bold">Balance Due: Rs. {Math.max(0, Math.floor(((item.price * (item.gstRate || 0) / 100) + item.price - discount) - paidAmount))}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                        <button
                            onClick={onClose}
                            className="px-6 py-2 bg-slate-800 text-white rounded-xl text-sm font-bold hover:bg-slate-700 transition-all active:scale-95 shadow-lg shadow-slate-200"
                        >
                            Close Details
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const details = {
        Inventory: [
            { label: "Product Name", value: record.name },
            { label: "Brand", value: record.brand },
            { label: "Category", value: record.category },
            { label: "SKU", value: record.sku },
            { label: "Sales Price", value: `₹${record.salePrice || 0}` },
            { label: "Purchase Price", value: `₹${record.purchasePrice || 0}` },
            { label: "Stock Quantity", value: record.quantity },
            { label: "IMEI 1", value: record.imei1 || "-" },
            { label: "IMEI 2", value: record.imei2 || "-" },
        ],
        Credit: [
            { label: "Customer Name", value: record.name || "N/A" },
            { label: "Phone", value: record.phone || "-" },
            { label: "Items", value: record.items || "-" },
            { label: "Amount Given", value: `₹${record.amount || 0}` },
            { label: "Total Credit", value: `₹${record.total || 0}` },
            { label: "Status", value: record.status || "Pending" },
            { label: "Due Date", value: record.dueDate ? format(new Date(record.dueDate), "dd MMM yyyy") : "-" },
        ],
        Cashbook: [
            { label: "Description", value: record.description },
            { label: "Amount", value: `₹${record.amount || 0}` },
            { label: "Type", value: record.type === "cash_in" ? "Cash In" : "Cash Out" },
            { label: "Payment Mode", value: record.paymentMode || "-" },
            { label: "Source", value: record.source || "Manual" },
        ]
    };

    const currentDetails = details[record.type] || [];

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${record.type === 'Inventory' ? 'bg-blue-100 text-blue-600' :
                            record.type === 'Bill' ? 'bg-green-100 text-green-600' :
                                record.type === 'Credit' ? 'bg-orange-100 text-orange-600' :
                                    'bg-emerald-100 text-emerald-600'
                            }`}>
                            {record.type === 'Inventory' && <Package size={20} />}
                            {record.type === 'Bill' && <ShoppingCart size={20} />}
                            {record.type === 'Credit' && <CreditCard size={20} />}
                            {record.type === 'Cashbook' && <Receipt size={20} />}
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">{record.type} Details</h3>
                            <p className="text-xs text-slate-500">{format(new Date(record.createdAt), "dd MMM yyyy, HH:mm")}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6">
                    <div className="grid grid-cols-2 gap-4">
                        {currentDetails.map((detail, i) => (
                            <div key={i} className="space-y-1">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{detail.label}</p>
                                <p className="text-sm font-semibold text-slate-700">{detail.value}</p>
                            </div>
                        ))}
                    </div>

                    <div className="mt-8 pt-6 border-t border-slate-100 space-y-3">
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-400 font-medium">Activity by:</span>
                            <span className="text-slate-800 font-bold">{record.source || "Owner"}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-400 font-medium">Branch ID:</span>
                            <span className="text-slate-500 font-semibold">{record.branch || "Head Office"}</span>
                        </div>
                    </div>
                </div>
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-slate-800 text-white rounded-xl text-sm font-bold hover:bg-slate-700 transition-all active:scale-95 shadow-lg shadow-slate-200"
                    >
                        Close Details
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AcademySubUsers;
