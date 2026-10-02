import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import API_URL from "../../config/api";
import toast from "react-hot-toast";
import {
  Users,
  Award,
  AlertCircle,
  Sparkles,
  Send,
  Loader2,
  RefreshCw,
  Phone,
  Calendar,
  IndianRupee,
  ShoppingBag,
  ExternalLink,
  X,
  MessageCircle,
  CheckCircle2,
  Search,
  Copy,
  Check,
  TrendingUp,
  Clock,
  ArrowUpRight,
  Share2,
  Filter
} from "lucide-react";

const CustomerSegmentationModal = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [activeSegment, setActiveSegment] = useState("vip"); // 'vip', 'regular', 'at_risk', 'new', 'dormant'
  const [sendingTo, setSendingTo] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedTemplate, setCopiedTemplate] = useState(false);
  const [customDiscount, setCustomDiscount] = useState("");

  const fetchSegments = async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem("token");
      const res = await axios.get(`${API_URL}/automation/customer-segments`, {
        headers: { "x-auth-token": token }
      });
      setData(res.data);
    } catch (err) {
      console.error("Customer segmentation error:", err);
      toast.error(err.response?.data?.msg || "Failed to load customer segments.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSegments();
      setSearchQuery("");
      setCustomDiscount("");
    }
  }, [isOpen]);

  const currentSegmentList = useMemo(() => {
    const list = data?.segments?.[activeSegment] || [];
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (c) =>
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.mobile && c.mobile.includes(q)) ||
        (c.topFavoriteItems && c.topFavoriteItems.some((item) => item.toLowerCase().includes(q)))
    );
  }, [data, activeSegment, searchQuery]);

  const currentTemplate = data?.campaignTemplates?.[activeSegment];

  // Dynamically computed message if discount modified
  const activeMessageTemplate = useMemo(() => {
    if (!currentTemplate) return "";
    let msg = currentTemplate.message;
    if (customDiscount) {
      msg = msg.replace(/\d+%\s*OFF/gi, `${customDiscount}% OFF`);
    }
    return msg;
  }, [currentTemplate, customDiscount]);

  const handleCopyTemplate = () => {
    if (!activeMessageTemplate) return;
    navigator.clipboard.writeText(activeMessageTemplate.replace("{customerName}", "Valued Customer"));
    setCopiedTemplate(true);
    toast.success("Campaign message copied to clipboard!");
    setTimeout(() => setCopiedTemplate(false), 2000);
  };

  const handleSendCampaign = async (cust) => {
    if (!cust.mobile) {
      toast.error("Customer has no mobile number registered.");
      return;
    }

    const personalized = activeMessageTemplate.replace("{customerName}", cust.name || "Customer");

    setSendingTo(cust.customerId);
    try {
      const token = sessionStorage.getItem("token");
      await axios.post(
        `${API_URL}/automation/send-segment-campaign`,
        {
          mobile: cust.mobile,
          message: personalized,
          customerName: cust.name
        },
        { headers: { "x-auth-token": token } }
      );
      toast.success(`WhatsApp campaign sent to ${cust.name || cust.mobile}!`);
    } catch (err) {
      console.error("Send campaign error:", err);
      // Fallback: Open WhatsApp Web directly
      const cleanPhone = cust.mobile.replace(/\D/g, "");
      const waUrl = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(personalized)}`;
      window.open(waUrl, "_blank");
      toast("Opened WhatsApp Web with prefilled offer.", { icon: "💬" });
    } finally {
      setSendingTo(null);
    }
  };

  // Compute executive metrics
  const totalCustomers = data?.summary?.totalCustomers || 0;
  const totalRevenue = data?.summary?.totalRevenue || 0;
  const activeCount = (data?.summary?.vipCount || 0) + (data?.summary?.regularCount || 0);
  const activeRate = totalCustomers > 0 ? Math.round((activeCount / totalCustomers) * 100) : 0;
  const atRiskSpend = useMemo(() => {
    const atRisk = data?.segments?.at_risk || [];
    const dormant = data?.segments?.dormant || [];
    return [...atRisk, ...dormant].reduce((sum, c) => sum + (c.totalSpend || 0), 0);
  }, [data]);

  const segmentDefinitions = [
    {
      key: "vip",
      label: "VIP Spenders",
      badge: "Top 15% Spend",
      count: data?.summary?.vipCount || 0,
      icon: Award,
      accentColor: "text-amber-600",
      activeRing: "ring-amber-500 border-amber-300",
      pillBg: "bg-amber-500 text-white",
      bgSelected: "bg-amber-50/60",
      description: "Highest lifetime value & repeat purchases"
    },
    {
      key: "regular",
      label: "Loyal Regulars",
      badge: "Active Shoppers",
      count: data?.summary?.regularCount || 0,
      icon: ShoppingBag,
      accentColor: "text-indigo-600",
      activeRing: "ring-indigo-500 border-indigo-300",
      pillBg: "bg-indigo-600 text-white",
      bgSelected: "bg-indigo-50/60",
      description: "Consistent repeat visits in last 30 days"
    },
    {
      key: "at_risk",
      label: "At Risk (Win-Back)",
      badge: ">30 Days Inactive",
      count: data?.summary?.atRiskCount || 0,
      icon: AlertCircle,
      accentColor: "text-rose-600",
      activeRing: "ring-rose-500 border-rose-300",
      pillBg: "bg-rose-600 text-white",
      bgSelected: "bg-rose-50/60",
      description: "Previously active, no purchases in 30-90 days"
    },
    {
      key: "new",
      label: "New Customers",
      badge: "First 14 Days",
      count: data?.summary?.newCount || 0,
      icon: Sparkles,
      accentColor: "text-emerald-600",
      activeRing: "ring-emerald-500 border-emerald-300",
      pillBg: "bg-emerald-600 text-white",
      bgSelected: "bg-emerald-50/60",
      description: "First purchase recently, prime for 2nd order"
    },
    {
      key: "dormant",
      label: "Dormant",
      badge: ">90 Days Inactive",
      count: data?.summary?.dormantCount || 0,
      icon: Calendar,
      accentColor: "text-slate-600",
      activeRing: "ring-slate-500 border-slate-300",
      pillBg: "bg-slate-700 text-white",
      bgSelected: "bg-slate-100/70",
      description: "Lapsed customers needing reactivation deals"
    }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-6xl bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col max-h-[94vh]">
        
        {/* ═══════════ Sleek Executive Dark Header ═══════════ */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 text-white">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-white">
                  Customer Insights & Retention Hub
                </h2>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Live RFM
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Segment customers by purchase frequency, recency & spend to trigger high-conversion retention offers
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchSegments}
              disabled={loading}
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-all border border-slate-700/60"
              title="Refresh Segments"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-400" : ""}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ═══════════ Body Content ═══════════ */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 bg-slate-50/50">

          {loading && !data ? (
            <div className="py-28 flex flex-col items-center justify-center text-slate-400">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin"></div>
                <Users className="w-5 h-5 text-indigo-600 absolute inset-0 m-auto" />
              </div>
              <p className="text-sm font-semibold text-slate-700 mt-4">Computing RFM Analytics & Cohorts...</p>
              <p className="text-xs text-slate-400 mt-1">Analyzing customer bills, order recency, and purchase frequency</p>
            </div>
          ) : (
            <>
              {/* ── Top Executive KPI Overview Bar ── */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-slate-500 block">Total Customers</span>
                    <span className="text-lg font-bold text-slate-900 tracking-tight">{totalCustomers}</span>
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                    <IndianRupee className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-slate-500 block">Total Customer Revenue</span>
                    <span className="text-lg font-bold text-slate-900 tracking-tight">₹{totalRevenue.toLocaleString("en-IN")}</span>
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-slate-500 block">Active Shopper Rate</span>
                    <span className="text-lg font-bold text-slate-900 tracking-tight">{activeRate}% <span className="text-[11px] font-normal text-slate-400">({activeCount} active)</span></span>
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-slate-500 block">Revenue At Risk</span>
                    <span className="text-lg font-bold text-rose-600 tracking-tight">₹{atRiskSpend.toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </div>

              {/* ── Cohort Bento Cards (Segment Tabs) ── */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Select Customer Segment
                  </span>
                  <span className="text-xs text-slate-400">
                    Click a cohort to view members and dispatch targeted offers
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {segmentDefinitions.map((seg) => {
                    const isSelected = activeSegment === seg.key;
                    const Icon = seg.icon;
                    const percentOfBase = totalCustomers > 0 ? Math.round((seg.count / totalCustomers) * 100) : 0;
                    return (
                      <button
                        key={seg.key}
                        type="button"
                        onClick={() => setActiveSegment(seg.key)}
                        className={`p-3.5 rounded-2xl border text-left transition-all duration-150 relative overflow-hidden flex flex-col justify-between ${
                          isSelected
                            ? `bg-white border-indigo-600 shadow-md ring-2 ring-indigo-500/20 scale-[1.01]`
                            : `bg-white border-slate-200/90 text-slate-700 hover:border-slate-300 hover:shadow-xs`
                        }`}
                      >
                        {/* Top Indicator Line if selected */}
                        {isSelected && (
                          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-600" />
                        )}

                        <div className="flex items-center justify-between gap-1 mb-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isSelected ? seg.pillBg : "bg-slate-100 text-slate-600"
                          }`}>
                            {seg.badge}
                          </span>
                          <Icon className={`w-4 h-4 ${isSelected ? seg.accentColor : "text-slate-400"}`} />
                        </div>

                        <div>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl font-black text-slate-900 tracking-tight">{seg.count}</span>
                            <span className="text-[11px] font-medium text-slate-400">({percentOfBase}%)</span>
                          </div>
                          <p className={`text-xs font-bold truncate mt-0.5 ${isSelected ? "text-slate-900" : "text-slate-700"}`}>
                            {seg.label}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── Targeted WhatsApp Campaign Studio ── */}
              {currentTemplate && (
                <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs">
                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                    {/* Left: Campaign details and controls */}
                    <div className="flex-1 space-y-2.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                          <MessageCircle className="w-4 h-4" />
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                          <span>Targeted Campaign: {currentTemplate.title}</span>
                          <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                            Recommended: {currentTemplate.recommendedDiscount} OFF
                          </span>
                        </h4>
                      </div>

                      <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                        Trigger this personalized WhatsApp promo to re-engage this cohort. Click the WhatsApp button on any customer row below to deliver instantly.
                      </p>

                      {/* Quick Discount Presets */}
                      <div className="flex items-center gap-2 pt-1 flex-wrap">
                        <span className="text-[11px] font-semibold text-slate-500">Offer Presets:</span>
                        {["5", "10", "15", "20"].map((pct) => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => setCustomDiscount(pct)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                              customDiscount === pct
                                ? "bg-slate-900 text-white shadow-xs"
                                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                            }`}
                          >
                            {pct}% OFF
                          </button>
                        ))}
                        {customDiscount && (
                          <button
                            type="button"
                            onClick={() => setCustomDiscount("")}
                            className="text-xs text-rose-500 hover:underline font-medium"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Right: Realistic WhatsApp Bubble Preview */}
                    <div className="w-full lg:w-96 flex-shrink-0 bg-[#e5ddd5]/40 p-3 rounded-xl border border-slate-200">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 mb-1.5 px-1">
                        <span className="flex items-center gap-1 text-emerald-700">
                          <MessageCircle className="w-3.5 h-3.5" /> WhatsApp Preview
                        </span>
                        <button
                          type="button"
                          onClick={handleCopyTemplate}
                          className="flex items-center gap-1 text-slate-600 hover:text-slate-900 transition-colors"
                        >
                          {copiedTemplate ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedTemplate ? "Copied" : "Copy"}</span>
                        </button>
                      </div>
                      
                      <div className="bg-white rounded-xl p-3 shadow-xs border border-slate-100 relative text-xs text-slate-800 leading-snug space-y-1">
                        <p className="italic text-slate-700">
                          "{activeMessageTemplate.replace("{customerName}", "Customer Name")}"
                        </p>
                        <div className="flex justify-end items-center gap-1 text-[10px] text-slate-400 pt-1">
                          <span>Just now</span>
                          <span className="text-sky-500 font-bold">✓✓</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Customer Roster Table & Search ── */}
              <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
                {/* Table Toolbar */}
                <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">
                      Customers in this Segment
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                      {currentSegmentList.length}
                    </span>
                  </div>

                  <div className="relative w-full sm:w-72">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search by name, phone or item..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-800 placeholder-slate-400"
                    />
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/70 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="px-4 py-3">Customer</th>
                        <th className="px-4 py-3">Contact</th>
                        <th className="px-4 py-3 text-right">Lifetime Spend</th>
                        <th className="px-4 py-3 text-center">Visits</th>
                        <th className="px-4 py-3">Last Purchased</th>
                        <th className="px-4 py-3">Top Products</th>
                        <th className="px-4 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {currentSegmentList.length > 0 ? (
                        currentSegmentList.map((cust) => {
                          const initials = (cust.name || "C")
                            .split(" ")
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase();
                          return (
                            <tr key={cust.customerId} className="hover:bg-slate-50/80 transition-colors">
                              {/* Customer Identity */}
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-200 to-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs flex-shrink-0">
                                    {initials}
                                  </div>
                                  <div>
                                    <span className="font-bold text-slate-900 block">{cust.name}</span>
                                    <span className="text-[10px] text-slate-400 font-medium">ID: {cust.customerId.slice(-6)}</span>
                                  </div>
                                </div>
                              </td>

                              {/* Mobile / Contact */}
                              <td className="px-4 py-3">
                                {cust.mobile ? (
                                  <span className="font-mono text-slate-700 font-medium flex items-center gap-1.5">
                                    <Phone className="w-3 h-3 text-slate-400" />
                                    {cust.mobile}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 italic">No mobile</span>
                                )}
                              </td>

                              {/* Lifetime Spend */}
                              <td className="px-4 py-3 text-right">
                                <span className="font-black text-slate-900 block text-xs">
                                  ₹{cust.totalSpend.toLocaleString("en-IN")}
                                </span>
                                {cust.averageOrderValue > 0 && (
                                  <span className="text-[10px] text-slate-400">
                                    AOV ₹{cust.averageOrderValue}
                                  </span>
                                )}
                              </td>

                              {/* Visits */}
                              <td className="px-4 py-3 text-center">
                                <span className="inline-block px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold text-[11px]">
                                  {cust.billCount} {cust.billCount === 1 ? "bill" : "bills"}
                                </span>
                              </td>

                              {/* Last Purchased */}
                              <td className="px-4 py-3 text-slate-600">
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className={`w-2 h-2 rounded-full ${
                                      cust.daysSinceLastPurchase <= 14
                                        ? "bg-emerald-500"
                                        : cust.daysSinceLastPurchase <= 30
                                        ? "bg-amber-500"
                                        : "bg-rose-500"
                                    }`}
                                  />
                                  <span>
                                    {cust.daysSinceLastPurchase === 999
                                      ? "Never"
                                      : cust.daysSinceLastPurchase === 0
                                      ? "Today"
                                      : `${cust.daysSinceLastPurchase}d ago`}
                                  </span>
                                </div>
                              </td>

                              {/* Top Products */}
                              <td className="px-4 py-3 text-slate-500 max-w-xs">
                                {cust.topFavoriteItems && cust.topFavoriteItems.length > 0 ? (
                                  <div className="flex items-center gap-1 flex-wrap">
                                    {cust.topFavoriteItems.map((item, idx) => (
                                      <span
                                        key={idx}
                                        className="px-2 py-0.5 rounded bg-slate-100 text-[10px] font-medium text-slate-700 truncate max-w-[140px]"
                                      >
                                        {item}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                              </td>

                              {/* Send Offer Button */}
                              <td className="px-4 py-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleSendCampaign(cust)}
                                  disabled={sendingTo === cust.customerId || !cust.mobile}
                                  className="px-3 py-1.5 bg-[#25D366] hover:bg-[#20ba59] active:scale-95 disabled:opacity-50 text-white rounded-xl font-bold text-xs inline-flex items-center gap-1.5 transition-all shadow-xs"
                                  title={cust.mobile ? "Deliver offer via WhatsApp" : "No mobile number available"}
                                >
                                  {sendingTo === cust.customerId ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <MessageCircle className="w-3.5 h-3.5 fill-white text-[#25D366]" />
                                  )}
                                  <span>Send Offer</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="7" className="text-center py-16 text-slate-400">
                            <Users className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                            <p className="font-semibold text-slate-700">No customers found in this segment</p>
                            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                              {searchQuery
                                ? `No results matching "${searchQuery}". Try a different keyword.`
                                : "As customer phone numbers are entered during POS or GST billing, they are automatically categorized here."}
                            </p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ═══════════ Sleek Footer ═══════════ */}
        <div className="px-6 py-3.5 bg-white border-t border-slate-200/80 flex items-center justify-between flex-shrink-0">
          <p className="text-xs text-slate-500">
            Total Tracked: <strong className="text-slate-800">{totalCustomers} customers</strong> • Segment Lifetime Spend: <strong className="text-slate-800">₹{totalRevenue.toLocaleString("en-IN")}</strong>
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomerSegmentationModal;
