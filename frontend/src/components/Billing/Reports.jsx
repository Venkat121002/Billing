import React, { useEffect, useState } from "react";
import BillingLayout from "../../Layout/BillingLayout/AdminLayout";
import {
    BarChart3,
    TrendingUp,
    FileText,
    IndianRupee,
    Loader2,
    Users,
    Trophy,
    ArrowUpRight,
    ArrowDownRight,
    Calendar,
    MapPin,
    Phone,
    Wallet,
    Star,
    Receipt,
    ChevronRight,
    Clock,
    CircleDollarSign,
    ShieldCheck,
    FileSpreadsheet,
    Sparkles,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import axios from "axios";
import API_URL from "../../config/api";
import DemandForecastModal from "../AI/DemandForecastModal";
import CustomerSegmentationModal from "../AI/CustomerSegmentationModal";
import GstReturnModal from "../AI/GstReturnModal";

const Reports = () => {
    const { currentUser } = useAuth();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalRevenue: 0,
        totalInvoices: 0,
        gstCollected: 0,
        averageOrderValue: 0,
    });
    const [recentInvoices, setRecentInvoices] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [activeTab, setActiveTab] = useState("invoices");

    const [showDemandModal, setShowDemandModal] = useState(false);
    const [showCustomerModal, setShowCustomerModal] = useState(false);
    const [showGstModal, setShowGstModal] = useState(false);

    useEffect(() => {
        const fetchReportData = async () => {
            // Check for either uid (Firebase) or userId (Backend)
            const userId = currentUser?.uid || currentUser?.userId;

            if (!userId) {
                setLoading(false);
                return;
            }

            const token = sessionStorage.getItem("token");
            const config = {
                headers: {
                    "x-auth-token": token,
                },
            };

            try {
                // Fetch GST Bills and Customers in parallel
                const [gstBillsRes, customersRes] = await Promise.all([
                    axios.get(`${API_URL}/billing/gst-bills`, config),
                    axios.get(`${API_URL}/customers`, config)
                ]);

                const userId = currentUser?.uid || currentUser?.userId;
                const role = currentUser?.role;

                const gstBills = gstBillsRes.data.filter((item) => {
                    if (role === "owner" || role === "TenantAdmin") {
                        return item.source === "Owner" || item.createdBy === userId;
                    }
                    return item.createdBy === userId;
                });

                const customerList = customersRes.data.filter((item) => {
                    if (role === "owner" || role === "TenantAdmin") {
                        return item.source === "Owner" || item.createdBy === userId;
                    }
                    return item.createdBy === userId;
                });

                // Process GST Bills (Invoices)
                let revenue = 0;
                let gst = 0;
                let count = 0;

                // Map API data to component structure
                const invoices = gstBills.map(bill => {
                    const grandTotal = bill.calculations?.grandTotal || 0;
                    const totalTax =
                        (bill.calculations?.totalCGST || 0) +
                        (bill.calculations?.totalSGST || 0) +
                        (bill.calculations?.totalIGST || 0);

                    revenue += grandTotal;
                    gst += totalTax;
                    count++;

                    return {
                        id: bill.id,
                        number: bill.invoiceDetails?.invoiceNumber || "N/A",
                        date: bill.invoiceDetails?.invoiceDate || bill.createdAt || "N/A",
                        customer: bill.buyerDetails?.name || "N/A",
                        amount: grandTotal,
                        status: bill.status || "Generated",
                    };
                });

                // Sort by date descending
                invoices.sort((a, b) => new Date(b.date) - new Date(a.date));

                setStats({
                    totalRevenue: revenue,
                    totalInvoices: count,
                    gstCollected: gst,
                    averageOrderValue: count > 0 ? revenue / count : 0,
                });
                setRecentInvoices(invoices.slice(0, 5));

                // Process Customers
                customerList.sort(
                    (a, b) => (b.loyaltyPoints || 0) - (a.loyaltyPoints || 0)
                );
                setCustomers(customerList);

            } catch (error) {
                console.error("Error fetching report data:", error);
                // Handle 404s or empty states gracefully
                if (error.response && error.response.status === 404) {
                    setStats({
                        totalRevenue: 0,
                        totalInvoices: 0,
                        gstCollected: 0,
                        averageOrderValue: 0,
                    });
                    setRecentInvoices([]);
                    setCustomers([]);
                }
            } finally {
                setLoading(false);
            }
        };

        fetchReportData();
    }, [currentUser]);

    if (loading) {
        return (
            <BillingLayout>
                <div className="flex flex-col justify-center items-center h-screen bg-white">
                    <div className="flex flex-col items-center gap-4">
                        <div className="p-4 bg-green-50 rounded-xl">
                            <Loader2 className="animate-spin w-8 h-8 text-green-600" />
                        </div>
                        <div className="text-center">
                            <p className="text-base font-semibold text-gray-800">
                                Loading Reports
                            </p>
                            <p className="text-sm text-gray-400 mt-1">
                                Please wait a moment...
                            </p>
                        </div>
                    </div>
                </div>
            </BillingLayout>
        );
    }

    const statCards = [
        {
            title: "Total Revenue",
            value: `₹${stats.totalRevenue.toLocaleString("en-IN")}`,
            icon: IndianRupee,
            trend: "+12.5%",
            trendUp: true,
            lightBg: "bg-red-50",
            iconColor: "text-red-600",
        },
        {
            title: "Total Invoices",
            value: stats.totalInvoices,
            icon: FileText,
            trend: "+8.3%",
            trendUp: true,
            lightBg: "bg-blue-50",
            iconColor: "text-blue-600",
        },
        {
            title: "GST Collected",
            value: `₹${stats.gstCollected.toLocaleString("en-IN")}`,
            icon: ShieldCheck,
            trend: "+5.2%",
            trendUp: true,
            lightBg: "bg-teal-50",
            iconColor: "text-teal-600",
        },
        {
            title: "Avg. Order Value",
            value: `₹${stats.averageOrderValue.toLocaleString("en-IN", {
                maximumFractionDigits: 0,
            })}`,
            icon: TrendingUp,
            trend: "-2.1%",
            trendUp: false,
            lightBg: "bg-green-50",
            iconColor: "text-green-600",
        },
    ];

    return (
        <BillingLayout>
            <div className="min-h-screen bg-white">
                {/* Clean Header */}
                <div className="bg-white border-b border-gray-100">
                    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-green-50 rounded-xl">
                                    <BarChart3 size={22} className="text-green-600" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-gray-900">
                                        Reports & Analytics
                                    </h1>
                                    <p className="text-sm text-gray-400 mt-0.5">
                                        Overview of your business performance
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                                <button
                                    type="button"
                                    onClick={() => setShowDemandModal(true)}
                                    className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg text-xs font-bold transition-all shadow-sm"
                                >
                                    <TrendingUp size={14} className="text-blue-600" />
                                    <span>Restock Forecast</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowCustomerModal(true)}
                                    className="flex items-center gap-1.5 px-3 py-2 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 rounded-lg text-xs font-bold transition-all shadow-sm"
                                >
                                    <Users size={14} className="text-purple-600" />
                                    <span>Customer Insights</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowGstModal(true)}
                                    className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-bold transition-all shadow-sm"
                                >
                                    <FileSpreadsheet size={14} className="text-emerald-600" />
                                    <span>GST Returns</span>
                                </button>
                                <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
                                    <Calendar size={14} className="text-green-500" />
                                    {new Date().toLocaleDateString("en-IN", {
                                        month: "long",
                                        year: "numeric",
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">
                    {/* Stat Cards - Minimal Style */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {statCards.map((card, index) => (
                            <div
                                key={index}
                                className="bg-white p-5 rounded-xl border border-gray-100 hover:border-green-200 transition-colors"
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div className={`p-2.5 rounded-lg ${card.lightBg}`}>
                                        <card.icon size={18} className={card.iconColor} />
                                    </div>
                                    <span
                                        className={`flex items-center gap-0.5 text-xs font-medium ${card.trendUp ? "text-green-600" : "text-red-500"
                                            }`}
                                    >
                                        {card.trendUp ? (
                                            <ArrowUpRight size={14} />
                                        ) : (
                                            <ArrowDownRight size={14} />
                                        )}
                                        {card.trend}
                                    </span>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                                        {card.title}
                                    </p>
                                    <h3 className="text-xl font-bold text-gray-900">
                                        {card.value}
                                    </h3>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Quick Summary Bar */}
                    <div className="bg-white rounded-xl border border-gray-100 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                <CircleDollarSign size={16} className="text-green-500" />
                                Business Health
                            </div>
                            <div className="flex flex-wrap items-center gap-6 text-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-green-400" />
                                    <span className="text-gray-500">Revenue:</span>
                                    <span className="font-semibold text-gray-800">
                                        ₹{stats.totalRevenue.toLocaleString("en-IN")}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-400" />
                                    <span className="text-gray-500">GST:</span>
                                    <span className="font-semibold text-gray-800">
                                        ₹{stats.gstCollected.toLocaleString("en-IN")}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-teal-400" />
                                    <span className="text-gray-500">Customers:</span>
                                    <span className="font-semibold text-gray-800">
                                        {customers.length}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="bg-white rounded-xl border border-gray-100 p-1.5 w-fit inline-flex gap-1">
                        <button
                            onClick={() => setActiveTab("invoices")}
                            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === "invoices"
                                ? "bg-green-600 text-white shadow-sm"
                                : "text-gray-500 hover:bg-gray-50"
                                }`}
                        >
                            <Receipt size={16} />
                            Invoices
                        </button>
                        <button
                            onClick={() => setActiveTab("customers")}
                            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === "customers"
                                ? "bg-green-600 text-white shadow-sm"
                                : "text-gray-500 hover:bg-gray-50"
                                }`}
                        >
                            <Users size={16} />
                            Customers
                        </button>
                    </div>

                    {/* Content Area */}
                    {activeTab === "invoices" && (
                        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                            {/* Table Header */}
                            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                                <div>
                                    <h3 className="text-base font-bold text-gray-800">
                                        Recent Invoices
                                    </h3>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        Last {recentInvoices.length} transactions
                                    </p>
                                </div>
                                <button className="flex items-center gap-1 text-xs font-semibold text-green-600 hover:text-green-700">
                                    View All <ChevronRight size={14} />
                                </button>
                            </div>

                            {/* Table */}
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-gray-50/50">
                                            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                Invoice #
                                            </th>
                                            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                Customer
                                            </th>
                                            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                Date
                                            </th>
                                            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                Status
                                            </th>
                                            <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                Amount
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {recentInvoices.length > 0 ? (
                                            recentInvoices.map((invoice) => (
                                                <tr
                                                    key={invoice.id}
                                                    className="hover:bg-gray-50/50 transition-colors"
                                                >
                                                    <td className="px-5 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-2 bg-green-50 rounded-lg">
                                                                <FileText size={14} className="text-green-600" />
                                                            </div>
                                                            <span className="text-sm font-medium text-gray-800">
                                                                {invoice.number}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                                                                {invoice.customer?.charAt(0)?.toUpperCase() ||
                                                                    "?"}
                                                            </div>
                                                            <span className="text-sm text-gray-600">
                                                                {invoice.customer}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        <div className="flex items-center gap-1.5 text-sm text-gray-500">
                                                            <Clock size={12} className="text-gray-300" />
                                                            {new Date(invoice.date).toLocaleDateString(
                                                                "en-IN",
                                                                { day: "2-digit", month: "short" }
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded bg-green-50 text-green-700">
                                                            <span className="w-1 h-1 rounded-full bg-green-500" />
                                                            {invoice.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-4 text-right">
                                                        <span className="text-sm font-bold text-gray-900">
                                                            ₹{invoice.amount.toLocaleString("en-IN")}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="5" className="px-5 py-12 text-center">
                                                    <div className="flex flex-col items-center">
                                                        <div className="p-3 bg-gray-50 rounded-xl mb-3">
                                                            <Receipt size={24} className="text-gray-300" />
                                                        </div>
                                                        <p className="text-sm font-medium text-gray-500">
                                                            No invoices found
                                                        </p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === "customers" && (
                        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                            {/* Table Header */}
                            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                                <div>
                                    <h3 className="text-base font-bold text-gray-800">
                                        Customer Loyalty
                                    </h3>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        Ranked by points
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 text-xs font-medium text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg">
                                    <Users size={14} className="text-green-500" />
                                    {customers.length} Total
                                </div>
                            </div>

                            {/* Table */}
                            <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
                                <table className="w-full">
                                    <thead className="sticky top-0 bg-white z-10">
                                        <tr className="border-b border-gray-100">
                                            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                #
                                            </th>
                                            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                Customer
                                            </th>
                                            <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                Points
                                            </th>
                                            <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                Wallet
                                            </th>
                                            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                Location
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {customers.length > 0 ? (
                                            customers.map((customer, idx) => (
                                                <tr
                                                    key={customer.id}
                                                    className="hover:bg-gray-50/50 transition-colors"
                                                >
                                                    <td className="px-5 py-4">
                                                        <div className="flex items-center justify-center">
                                                            {idx < 3 ? (
                                                                <div
                                                                    className={`w-7 h-7 rounded-lg flex items-center justify-center ${idx === 0
                                                                        ? "bg-amber-50 text-amber-600"
                                                                        : idx === 1
                                                                            ? "bg-gray-100 text-gray-600"
                                                                            : "bg-orange-50 text-orange-600"
                                                                        }`}
                                                                >
                                                                    <Trophy size={14} />
                                                                </div>
                                                            ) : (
                                                                <span className="text-xs font-medium text-gray-400">
                                                                    {idx + 1}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 rounded-full bg-green-50 flex items-center justify-center text-sm font-bold text-green-700">
                                                                {customer.name?.charAt(0)?.toUpperCase() || "?"}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-medium text-gray-800">
                                                                    {customer.name}
                                                                </p>
                                                                <p className="text-xs text-gray-400 flex items-center gap-1">
                                                                    <Phone size={10} />
                                                                    {customer.phone || "N/A"}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-4 text-center">
                                                        <div className="inline-flex items-center gap-1 text-xs font-bold text-green-700 bg-green-50 px-2 py-1 rounded">
                                                            <Star size={12} className="fill-green-500 text-green-500" />
                                                            {customer.loyaltyPoints || 0}
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-1 text-sm font-bold text-gray-800">
                                                            <Wallet size={14} className="text-green-500" />
                                                            ₹{customer.walletBalance || 0}
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        <div className="flex items-center gap-1 text-sm text-gray-500">
                                                            <MapPin size={12} className="text-gray-300" />
                                                            {customer.location || "—"}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="5" className="px-5 py-12 text-center">
                                                    <div className="flex flex-col items-center">
                                                        <div className="p-3 bg-gray-50 rounded-xl mb-3">
                                                            <Users size={24} className="text-gray-300" />
                                                        </div>
                                                        <p className="text-sm font-medium text-gray-500">
                                                            No customers found
                                                        </p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Phase 2 AI Modals */}
            <DemandForecastModal
                isOpen={showDemandModal}
                onClose={() => setShowDemandModal(false)}
            />
            <CustomerSegmentationModal
                isOpen={showCustomerModal}
                onClose={() => setShowCustomerModal(false)}
            />
            <GstReturnModal
                isOpen={showGstModal}
                onClose={() => setShowGstModal(false)}
            />
        </BillingLayout>
    );
};

export default Reports;
