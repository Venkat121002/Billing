import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import API_URL from "../../config/api";
import { useAuth } from "../../contexts/AuthContext";
import BillingLayout from "../../Layout/BillingLayout/AdminLayout";
import toast from "react-hot-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Search,
  AlertTriangle,
  Calendar,
  Package,
  Camera,
  Download,
  FileSpreadsheet,
  RefreshCw,
  FileText,
  Send,
  MessageCircle,
  Clock,
  ArrowUpRight,
  Moon,
  Pill,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Users
} from "lucide-react";
import ReceiptScannerModal from "../../components/AI/ReceiptScannerModal";

const EXPIRING_SOON_DAYS = 30;

const getDaysLeft = (expiryDate) => {
  const expiry = new Date(expiryDate);
  if (Number.isNaN(expiry.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);
  return Math.round((expiry - today) / (1000 * 60 * 60 * 24));
};

const getStatus = (daysLeft) => {
  if (daysLeft === null) return { label: "Unknown", style: "bg-gray-100 text-gray-500" };
  if (daysLeft < 0) return { label: "Expired", style: "bg-red-100 text-red-700" };
  if (daysLeft <= EXPIRING_SOON_DAYS) return { label: "Expiring Soon", style: "bg-amber-100 text-amber-700" };
  return { label: "OK", style: "bg-green-100 text-green-700" };
};

const ExpiryAlerts = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Active top-level tab
  const [activeTab, setActiveTab] = useState("batches"); // 'batches' | 'refills' | 'closing'

  // Batch Shield state
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showScannerModal, setShowScannerModal] = useState(false);

  // Chronic Refills state
  const [refillsData, setRefillsData] = useState({ refills: [], dueSoonCount: 0, overdueCount: 0, totalPatients: 0 });
  const [refillsLoading, setRefillsLoading] = useState(false);
  const [refillSearch, setRefillSearch] = useState("");
  const [sendingRefillId, setSendingRefillId] = useState(null);

  // Nightly Closing state
  const [closingDate, setClosingDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [downloadingClosingPdf, setDownloadingClosingPdf] = useState(false);

  // Fetch products for Batch Tracking
  const fetchProducts = useCallback(async () => {
    const token = sessionStorage.getItem("token");
    if (!token || !currentUser) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/products`, {
        headers: { "x-auth-token": token },
      });
      setProducts(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to fetch products:", err);
      toast.error("Could not fetch product records.");
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  // Fetch chronic refills
  const fetchRefills = useCallback(async () => {
    const token = sessionStorage.getItem("token");
    if (!token || !currentUser) return;
    setRefillsLoading(true);
    try {
      const res = await axios.get(`${API_URL}/automation/pharmacy/refills`, {
        headers: { "x-auth-token": token },
      });
      if (res.data?.success) {
        setRefillsData(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch refills:", err);
    } finally {
      setRefillsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    if (activeTab === "refills") {
      fetchRefills();
    }
  }, [activeTab, fetchRefills]);

  // Only batch/expiry-tracked items are relevant here
  const trackedItems = useMemo(
    () =>
      products
        .filter((p) => p.expiryDate)
        .map((p) => ({ ...p, daysLeft: getDaysLeft(p.expiryDate) }))
        .sort((a, b) => (a.daysLeft ?? Infinity) - (b.daysLeft ?? Infinity)),
    [products]
  );

  const filteredItems = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return trackedItems;
    return trackedItems.filter(
      (p) =>
        (p.name || "").toLowerCase().includes(term) ||
        (p.batchNumber || p.batchNo || "").toLowerCase().includes(term) ||
        (p.pharmaCompany || "").toLowerCase().includes(term)
    );
  }, [trackedItems, searchTerm]);

  const summary = useMemo(() => {
    const expired = trackedItems.filter((p) => p.daysLeft !== null && p.daysLeft < 0).length;
    const soon = trackedItems.filter((p) => p.daysLeft !== null && p.daysLeft >= 0 && p.daysLeft <= EXPIRING_SOON_DAYS).length;
    return { expired, soon, total: trackedItems.length };
  }, [trackedItems]);

  // Filtered refills list
  const filteredRefills = useMemo(() => {
    const term = refillSearch.trim().toLowerCase();
    if (!term) return refillsData.refills;
    return (refillsData.refills || []).filter(
      (r) =>
        (r.patientName || "").toLowerCase().includes(term) ||
        (r.patientPhone || "").toLowerCase().includes(term) ||
        (r.medicineName || "").toLowerCase().includes(term) ||
        (r.salt || "").toLowerCase().includes(term)
    );
  }, [refillsData.refills, refillSearch]);

  // Export CSV
  const handleExportReturnSheetCsv = () => {
    const returnItems = trackedItems.filter(
      (p) => p.daysLeft !== null && p.daysLeft <= 45
    );

    if (returnItems.length === 0) {
      toast.success("No expired or near-expiry medicines to return right now!");
      return;
    }

    const headers = [
      "Medicine Name",
      "Batch Number",
      "Manufacturer",
      "Expiry Date",
      "Quantity",
      "MRP (Rs)",
      "Days Left / Status",
      "Return Reason",
    ];

    const rows = returnItems.map((p) => {
      const statusText =
        p.daysLeft < 0
          ? `Expired (${Math.abs(p.daysLeft)} days ago)`
          : `Expiring in ${p.daysLeft} days`;
      const reason = p.daysLeft < 0 ? "Expired Stock Return" : "Near Expiry Distributor Return";
      return [
        `"${(p.name || "").replace(/"/g, '""')}"`,
        `"${(p.batchNumber || p.batchNo || "").replace(/"/g, '""')}"`,
        `"${(p.pharmaCompany || p.brand || "").replace(/"/g, '""')}"`,
        `"${p.expiryDate || ""}"`,
        p.quantity || 0,
        p.price || p.mrp || 0,
        `"${statusText}"`,
        `"${reason}"`,
      ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Pharmacy_Distributor_Return_Sheet_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`Exported ${returnItems.length} return items to CSV sheet!`);
  };

  // Export Official PDF Distributor Return Sheet & Credit Claim Note
  const handleExportReturnSheetPdf = () => {
    const returnItems = trackedItems.filter(
      (p) => p.daysLeft !== null && p.daysLeft <= 45
    );

    if (returnItems.length === 0) {
      toast.success("No expired or near-expiry medicines to return right now!");
      return;
    }

    try {
      const doc = new jsPDF("p", "mm", "a4");
      const pharmacyName =
        currentUser?.companyDetails?.name ||
        currentUser?.businessName ||
        currentUser?.displayName ||
        "Pharmacy & Medical Store";
      const pharmacyAddress = [
        currentUser?.companyDetails?.street || currentUser?.address?.street,
        currentUser?.companyDetails?.city || currentUser?.address?.city,
        currentUser?.companyDetails?.state || currentUser?.address?.state,
        currentUser?.companyDetails?.pincode || currentUser?.address?.pincode,
      ]
        .filter(Boolean)
        .join(", ");
      const pharmacyPhone = currentUser?.companyDetails?.phone || currentUser?.phone || currentUser?.mobile || "";
      const pharmacyGstin = currentUser?.companyDetails?.gstin || currentUser?.gstin || "";
      const todayStr = new Date().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });

      // Header Banner
      doc.setFillColor(15, 23, 42); // Slate 900
      doc.rect(14, 14, 182, 28, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text(pharmacyName.toUpperCase(), 18, 24);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(203, 213, 225);
      const subHeader = [
        pharmacyAddress,
        pharmacyPhone ? `Phone: ${pharmacyPhone}` : null,
        pharmacyGstin ? `GSTIN: ${pharmacyGstin}` : null,
      ]
        .filter(Boolean)
        .join(" | ");
      doc.text(subHeader || "Licensed Retail Pharmacy & Medical Store", 18, 30, { maxWidth: 174 });

      // Title & Reference
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("DISTRIBUTOR EXPIRY RETURN SHEET & CREDIT CLAIM NOTE", 14, 50);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(`Claim Date: ${todayStr}`, 14, 56);
      doc.text(`Ref: RTN-${Date.now().toString().slice(-6)}`, 140, 56);

      // Summary Card
      const totalUnits = returnItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
      const totalClaimValue = returnItems.reduce((sum, item) => {
        const rate = Number(item.costPrice || item.purchasePrice || item.price || item.mrp || 0);
        const qty = Number(item.quantity) || 0;
        return sum + rate * qty;
      }, 0);

      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, 60, 182, 16, 2, 2, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      doc.text(`Total SKU Lines: ${returnItems.length}`, 18, 70);
      doc.text(`Total Return Units: ${totalUnits}`, 80, 70);
      doc.text(`Estimated Claim Value: Rs. ${totalClaimValue.toFixed(2)}`, 135, 70);

      // Table
      const headers = [
        ["#", "Medicine / Salt", "Batch No", "Exp Date", "Manufacturer", "Qty", "Rate (Rs)", "Total (Rs)", "Reason"],
      ];

      const rows = returnItems.map((item, idx) => {
        const qty = Number(item.quantity) || 0;
        const rate = Number(item.costPrice || item.purchasePrice || item.price || item.mrp || 0);
        const total = (qty * rate).toFixed(2);
        const reason =
          item.daysLeft < 0 ? `Expired (${Math.abs(item.daysLeft)}d ago)` : `Exp in ${item.daysLeft}d`;
        return [
          idx + 1,
          item.name || "Unknown",
          item.batchNumber || item.batchNo || "-",
          item.expiryDate || "-",
          item.pharmaCompany || item.brand || "-",
          qty,
          rate.toFixed(2),
          total,
          reason,
        ];
      });

      autoTable(doc, {
        startY: 80,
        head: headers,
        body: rows,
        theme: "grid",
        styles: {
          fontSize: 8,
          cellPadding: 2,
          valign: "middle",
        },
        headStyles: {
          fillColor: [16, 185, 129], // Emerald 500
          textColor: 255,
          fontStyle: "bold",
        },
        alternateRowStyles: {
          fillColor: [240, 253, 244],
        },
        columnStyles: {
          0: { cellWidth: 8, halign: "center" },
          1: { cellWidth: 42 },
          2: { cellWidth: 22, halign: "center" },
          3: { cellWidth: 20, halign: "center" },
          4: { cellWidth: 26 },
          5: { cellWidth: 12, halign: "center" },
          6: { cellWidth: 18, halign: "right" },
          7: { cellWidth: 18, halign: "right" },
          8: { cellWidth: 16, halign: "center" },
        },
      });

      const finalY = doc.lastAutoTable.finalY || 200;

      // Signatures
      if (finalY < 240) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);

        doc.text("Pharmacist Signature & Stamp", 20, finalY + 25);
        doc.line(20, finalY + 22, 70, finalY + 22);

        doc.text("Distributor Representative Signature", 125, finalY + 25);
        doc.line(125, finalY + 22, 185, finalY + 22);

        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text(
          "Generated by SwordNex AI Pharmacy System - Valid for distributor credit adjustment",
          14,
          finalY + 36
        );
      }

      doc.save(`Pharmacy_Distributor_Return_Claim_${new Date().toISOString().split("T")[0]}.pdf`);
      toast.success(`Distributor Return PDF generated for ${returnItems.length} items!`);
    } catch (err) {
      console.error("Return sheet PDF error:", err);
      toast.error("Failed to generate PDF. You can still export CSV.");
    }
  };

  // Dispatch WhatsApp refill reminder
  const handleSendWhatsAppReminder = async (refill) => {
    const token = sessionStorage.getItem("token");
    if (!token) return;
    setSendingRefillId(refill.id);
    try {
      const res = await axios.post(
        `${API_URL}/automation/pharmacy/send-refill`,
        {
          patientName: refill.patientName,
          patientPhone: refill.patientPhone,
          medicineName: refill.medicineName,
          daysRemaining: refill.daysRemaining,
        },
        {
          headers: { "x-auth-token": token },
        }
      );
      if (res.data?.success) {
        toast.success(`Refill reminder dispatched to ${refill.patientName} on WhatsApp!`);
      }
    } catch (err) {
      console.error("Refill send error:", err);
      toast.error(err.response?.data?.msg || "Could not dispatch WhatsApp reminder.");
    } finally {
      setSendingRefillId(null);
    }
  };

  // 1-Click repeat bill: prefill into POS billing
  const handleRepeatBill = (refill) => {
    navigate("/billing", {
      state: {
        pharmacyRefill: {
          patientName: refill.patientName,
          patientPhone: refill.patientPhone,
          medicineName: refill.medicineName,
        },
      },
    });
  };

  // Download 1-Page closing PDF
  const handleDownloadClosingPdf = async () => {
    const token = sessionStorage.getItem("token");
    if (!token) return;
    setDownloadingClosingPdf(true);
    try {
      const res = await axios.get(`${API_URL}/automation/daily-sales-summary/download-pdf`, {
        headers: { "x-auth-token": token },
        responseType: "blob",
        params: { date: closingDate },
      });
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Pharmacy_Daily_Closing_${closingDate}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("1-Page Nightly Closing PDF downloaded!");
    } catch (err) {
      console.error("Closing PDF download error:", err);
      toast.error("Failed to download daily closing report.");
    } finally {
      setDownloadingClosingPdf(false);
    }
  };

  const tdClass = "px-5 py-4 text-sm text-gray-700 whitespace-nowrap";

  return (
    <BillingLayout>
      <div className="min-h-screen bg-gradient-to-br from-green-50/30 via-white to-emerald-50/20 -m-4 p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
              <span>Pharmacy AI Command Center</span>
              <span className="text-xs font-bold px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200 flex items-center gap-1">
                <Sparkles size={12} className="text-emerald-600" />
                Active Automation
              </span>
            </h1>
            <p className="mt-1 text-gray-500 font-medium text-sm">
              Batch OCR restock, FEFO expiration shield, chronic patient refills & 1-page daily closing.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (activeTab === "batches") fetchProducts();
                else if (activeTab === "refills") fetchRefills();
              }}
              disabled={loading || refillsLoading}
              className="p-3 bg-white border border-gray-200 text-gray-600 hover:text-gray-900 rounded-xl hover:bg-gray-50 transition-all shadow-sm"
              title="Refresh Records"
            >
              <RefreshCw size={18} className={loading || refillsLoading ? "animate-spin" : ""} />
            </button>

            <button
              type="button"
              onClick={() => setShowScannerModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl shadow-md shadow-emerald-500/20 transition-all text-xs font-bold active:scale-[0.98]"
            >
              <Camera size={16} />
              <span>Scan Inward Bill (OCR)</span>
            </button>
          </div>
        </div>

        {/* Top Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-gray-200 mb-6 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab("batches")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
              activeTab === "batches"
                ? "bg-emerald-600 text-white shadow-sm shadow-emerald-500/30"
                : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
            }`}
          >
            <ShieldCheck size={16} />
            <span>Batch Shield & Expiry</span>
            {summary.expired + summary.soon > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === "batches" ? "bg-white text-emerald-700" : "bg-red-500 text-white"}`}>
                {summary.expired + summary.soon}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("refills")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
              activeTab === "refills"
                ? "bg-emerald-600 text-white shadow-sm shadow-emerald-500/30"
                : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
            }`}
          >
            <Users size={16} />
            <span>Chronic Patient Refills</span>
            {refillsData.dueSoonCount > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === "refills" ? "bg-white text-emerald-700" : "bg-amber-500 text-white"}`}>
                {refillsData.dueSoonCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("closing")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
              activeTab === "closing"
                ? "bg-emerald-600 text-white shadow-sm shadow-emerald-500/30"
                : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
            }`}
          >
            <Moon size={16} />
            <span>Nightly Closing (1-Page PDF)</span>
          </button>
        </div>

        {/* ════════════════════ TAB 1: BATCH EXPIRY & SHIELD ════════════════════ */}
        {activeTab === "batches" && (
          <div>
            {/* Summary tiles */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-5">
                <p className="text-xs font-bold text-red-500 uppercase tracking-wider">Expired Batches</p>
                <p className="text-2xl font-extrabold text-red-700 mt-1">{summary.expired}</p>
                <p className="text-xs text-red-400 mt-1">Blocked automatically from POS billing</p>
              </div>
              <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-5">
                <p className="text-xs font-bold text-amber-500 uppercase tracking-wider">
                  Expiring in &le; {EXPIRING_SOON_DAYS} Days
                </p>
                <p className="text-2xl font-extrabold text-amber-700 mt-1">{summary.soon}</p>
                <p className="text-xs text-amber-500 mt-1">Priority FEFO dispatch & return eligible</p>
              </div>
              <div className="bg-white rounded-2xl border border-green-100 shadow-sm p-5">
                <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Total Batches Tracked</p>
                <p className="text-2xl font-extrabold text-emerald-700 mt-1">{summary.total}</p>
                <p className="text-xs text-emerald-500 mt-1">Active live inventory lots</p>
              </div>
            </div>

            {/* Action Bar & Search */}
            <div className="bg-white rounded-2xl border border-green-100 shadow-sm p-4 mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by medicine, salt, batch number or manufacturer..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-2.5 bg-gray-50 border border-green-200 rounded-xl focus:ring-2 focus:ring-green-400 focus:border-green-400 focus:outline-none text-sm font-medium text-gray-900 placeholder:text-gray-400 transition-all"
                />
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                <button
                  type="button"
                  onClick={handleExportReturnSheetCsv}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl shadow-sm text-xs font-bold"
                  title="Download CSV Table"
                >
                  <FileSpreadsheet size={15} className="text-emerald-600" />
                  <span>CSV</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportReturnSheetPdf}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl shadow-md shadow-amber-500/20 text-xs font-bold"
                  title="Generate Official Distributor Credit Claim Note"
                >
                  <FileText size={15} />
                  <span>Export Return Sheet (PDF)</span>
                  {summary.expired + summary.soon > 0 && (
                    <span className="px-1.5 py-0.5 bg-white/20 rounded-full text-[10px]">
                      {summary.expired + summary.soon}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-green-100 shadow-sm overflow-hidden">
              {loading ? (
                <div className="text-center py-20 text-gray-500">Loading batches...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100">
                      <tr>
                        <th className="py-4 px-5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Product / Salt</th>
                        <th className="py-4 px-5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Batch No</th>
                        <th className="py-4 px-5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Manufacturer</th>
                        <th className="py-4 px-5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Expiry Date</th>
                        <th className="py-4 px-5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Days Left</th>
                        <th className="py-4 px-5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Qty</th>
                        <th className="py-4 px-5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredItems.length > 0 ? (
                        filteredItems.map((p) => {
                          const status = getStatus(p.daysLeft);
                          return (
                            <tr key={p.id || p._id} className="hover:bg-green-50/50 transition-colors border-b border-gray-50">
                              <td className={`${tdClass} font-semibold text-gray-900`}>
                                <div className="flex items-center gap-2">
                                  <Pill size={16} className="text-emerald-500 flex-shrink-0" />
                                  <div>
                                    <div className="font-semibold text-gray-900">{p.name || "Unnamed item"}</div>
                                    {p.salt && <div className="text-[11px] text-gray-400 font-normal">{p.salt}</div>}
                                  </div>
                                </div>
                              </td>
                              <td className={`${tdClass} font-mono text-xs text-gray-600`}>
                                <span className="bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                                  {p.batchNumber || p.batchNo || "—"}
                                </span>
                              </td>
                              <td className={tdClass}>{p.pharmaCompany || p.brand || "—"}</td>
                              <td className={tdClass}>
                                <span className="inline-flex items-center gap-1 font-mono text-xs">
                                  <Calendar size={12} className="text-gray-400" />
                                  {p.expiryDate}
                                </span>
                              </td>
                              <td
                                className={`${tdClass} font-semibold ${
                                  p.daysLeft !== null && p.daysLeft < 0
                                    ? "text-red-600 font-bold"
                                    : p.daysLeft !== null && p.daysLeft <= EXPIRING_SOON_DAYS
                                    ? "text-amber-600 font-bold"
                                    : "text-gray-700"
                                }`}
                              >
                                {p.daysLeft === null
                                  ? "—"
                                  : p.daysLeft < 0
                                  ? `${Math.abs(p.daysLeft)}d ago`
                                  : `${p.daysLeft}d`}
                              </td>
                              <td className={`${tdClass} font-bold text-gray-800`}>{p.quantity ?? "—"}</td>
                              <td className={tdClass}>
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${status.style}`}>
                                  {status.label === "Expired" && <AlertTriangle size={12} />}
                                  {status.label}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="7" className="text-center py-16 text-gray-400">
                            No batch-tracked items with an expiry date found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════════════════════ TAB 2: CHRONIC PATIENT REFILLS ════════════════════ */}
        {activeTab === "refills" && (
          <div>
            {/* Refill summary metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-5">
                <p className="text-xs font-bold text-amber-600 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock size={14} /> Refills Due Soon (Day 25-30)
                </p>
                <p className="text-2xl font-extrabold text-amber-700 mt-1">{refillsData.dueSoonCount || 0}</p>
                <p className="text-xs text-amber-500 mt-1">Ready for proactive WhatsApp reminder</p>
              </div>

              <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-5">
                <p className="text-xs font-bold text-red-500 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle size={14} /> Course Overdue (&gt; 30 Days)
                </p>
                <p className="text-2xl font-extrabold text-red-700 mt-1">{refillsData.overdueCount || 0}</p>
                <p className="text-xs text-red-400 mt-1">Patient medication supply likely depleted</p>
              </div>

              <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-5">
                <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1.5">
                  <Users size={14} /> Total Chronic Cycles Tracked
                </p>
                <p className="text-2xl font-extrabold text-emerald-700 mt-1">{refillsData.totalPatients || 0}</p>
                <p className="text-xs text-emerald-500 mt-1">Derived automatically from bill history</p>
              </div>
            </div>

            {/* Search */}
            <div className="bg-white rounded-2xl border border-green-100 shadow-sm p-4 mb-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search chronic patient by name, mobile, medicine or salt..."
                  value={refillSearch}
                  onChange={(e) => setRefillSearch(e.target.value)}
                  className="w-full pl-12 pr-4 py-2.5 bg-gray-50 border border-green-200 rounded-xl focus:ring-2 focus:ring-green-400 focus:border-green-400 focus:outline-none text-sm font-medium text-gray-900 placeholder:text-gray-400 transition-all"
                />
              </div>
            </div>

            {/* Refills Table */}
            <div className="bg-white rounded-2xl border border-green-100 shadow-sm overflow-hidden">
              {refillsLoading ? (
                <div className="text-center py-20 text-gray-500">Analyzing dosage schedules...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100">
                      <tr>
                        <th className="py-4 px-5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Patient</th>
                        <th className="py-4 px-5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Prescribed Medicine</th>
                        <th className="py-4 px-5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Last Purchase</th>
                        <th className="py-4 px-5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Course Progress</th>
                        <th className="py-4 px-5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                        <th className="py-4 px-5 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Quick Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRefills && filteredRefills.length > 0 ? (
                        filteredRefills.map((refill) => {
                          const percent = Math.min(100, Math.max(0, Math.round((refill.daysElapsed / refill.courseDays) * 100)));
                          const isOverdue = refill.status === "overdue";
                          const isDueSoon = refill.status === "due_soon";

                          return (
                            <tr key={refill.id} className="hover:bg-green-50/40 transition-colors border-b border-gray-50">
                              <td className={tdClass}>
                                <div className="font-bold text-gray-900">{refill.patientName}</div>
                                <div className="text-xs text-gray-500 font-mono mt-0.5">{refill.patientPhone}</div>
                              </td>

                              <td className={tdClass}>
                                <div className="font-semibold text-gray-900 flex items-center gap-1.5">
                                  <Pill size={14} className="text-emerald-600" />
                                  {refill.medicineName}
                                </div>
                                {refill.salt && <div className="text-[11px] text-gray-400">{refill.salt}</div>}
                              </td>

                              <td className={tdClass}>
                                <div className="text-xs text-gray-700 font-medium">{refill.purchasedDate}</div>
                                <div className="text-[11px] text-gray-400">Qty: {refill.qtyPurchased} ({refill.courseDays}d course)</div>
                              </td>

                              <td className={tdClass}>
                                <div className="w-36">
                                  <div className="flex justify-between text-[11px] mb-1">
                                    <span className="font-medium text-gray-600">Day {refill.daysElapsed}/{refill.courseDays}</span>
                                    <span className={`font-bold ${isOverdue ? "text-red-600" : isDueSoon ? "text-amber-600" : "text-emerald-600"}`}>
                                      {refill.daysRemaining <= 0 ? "Depleted" : `${refill.daysRemaining}d left`}
                                    </span>
                                  </div>
                                  <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${
                                        isOverdue ? "bg-red-500" : isDueSoon ? "bg-amber-500 animate-pulse" : "bg-emerald-500"
                                      }`}
                                      style={{ width: `${percent}%` }}
                                    />
                                  </div>
                                </div>
                              </td>

                              <td className={tdClass}>
                                {isOverdue && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
                                    <AlertTriangle size={12} /> Overdue
                                  </span>
                                )}
                                {isDueSoon && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 animate-pulse">
                                    <Clock size={12} /> Due Soon
                                  </span>
                                )}
                                {!isOverdue && !isDueSoon && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                    <CheckCircle2 size={12} /> In Progress
                                  </span>
                                )}
                              </td>

                              <td className={`${tdClass} text-right`}>
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => handleSendWhatsAppReminder(refill)}
                                    disabled={sendingRefillId === refill.id}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-bold shadow-sm transition-all disabled:opacity-50"
                                    title="Send Personalized WhatsApp Refill Message"
                                  >
                                    <MessageCircle size={13} />
                                    <span>{sendingRefillId === refill.id ? "Sending..." : "WhatsApp"}</span>
                                  </button>

                                  <button
                                    onClick={() => handleRepeatBill(refill)}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold transition-all"
                                    title="Open POS with pre-selected customer & medicine"
                                  >
                                    <span>Repeat Bill</span>
                                    <ArrowUpRight size={13} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="6" className="text-center py-16 text-gray-400">
                            No chronic refills due in this cycle. New prescriptions will automatically register here.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════════════════════ TAB 3: NIGHTLY CLOSING REPORT ════════════════════ */}
        {activeTab === "closing" && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white flex items-center justify-center shadow-lg">
                  <Moon size={22} className="text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-gray-900">Pharmacy Daily Closing & Store Summary</h2>
                  <p className="text-xs text-gray-500">
                    Audit cash in drawer, digital payments, credit udhar incurred, and distributor reorder lines.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    Select Closing Date
                  </label>
                  <input
                    type="date"
                    value={closingDate}
                    onChange={(e) => setClosingDate(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <p className="text-[11px] text-gray-400 mt-1.5">
                    Generate closing for today or audit previous days.
                  </p>
                </div>

                <div className="flex flex-col justify-center space-y-2">
                  <div className="flex items-center gap-2 text-xs text-slate-700">
                    <CheckCircle2 size={15} className="text-emerald-500 flex-shrink-0" />
                    <span>Exact End-of-Day Drawer Cash vs UPI vs Card breakdown</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-700">
                    <CheckCircle2 size={15} className="text-emerald-500 flex-shrink-0" />
                    <span>Top dispensed therapeutic medicines & volume</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-700">
                    <CheckCircle2 size={15} className="text-emerald-500 flex-shrink-0" />
                    <span>Daily credit dues incurred & outstanding accounts</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-100">
                <div className="text-xs text-gray-500">
                  Automated nightly closing summary is also dispatched to store owner WhatsApp every night at 9:00 PM IST.
                </div>

                <button
                  type="button"
                  onClick={handleDownloadClosingPdf}
                  disabled={downloadingClosingPdf}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-slate-900 to-slate-800 hover:from-black hover:to-slate-900 text-white rounded-xl shadow-lg shadow-slate-900/20 text-xs font-bold transition-all disabled:opacity-60 active:scale-[0.98]"
                >
                  <Download size={16} className="text-emerald-400" />
                  <span>{downloadingClosingPdf ? "Generating PDF..." : "Download 1-Page Closing PDF"}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Pharmacy Inward Invoice Scanner Modal */}
        <ReceiptScannerModal
          isOpen={showScannerModal}
          onClose={() => setShowScannerModal(false)}
          businessType="Pharmacy"
          onInventorySaved={() => {
            fetchProducts();
            setShowScannerModal(false);
          }}
        />
      </div>
    </BillingLayout>
  );
};

export default ExpiryAlerts;
