import React, { useState, useEffect } from "react";
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
  CheckCircle2
} from "lucide-react";

const CustomerSegmentationModal = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [activeSegment, setActiveSegment] = useState("vip"); // 'vip', 'regular', 'at_risk', 'new', 'dormant'
  const [sendingTo, setSendingTo] = useState(null);

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
    }
  }, [isOpen]);

  const handleSendCampaign = async (cust) => {
    if (!cust.mobile) {
      toast.error("Customer has no mobile number registered.");
      return;
    }

    const template = data?.campaignTemplates?.[activeSegment]?.message || "";
    const personalized = template.replace("{customerName}", cust.name || "Customer");

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
      toast("Opened WhatsApp Web to deliver offer.", { icon: "💬" });
    } finally {
      setSendingTo(null);
    }
  };

  if (!isOpen) return null;

  const currentSegmentList = data?.segments?.[activeSegment] || [];
  const currentTemplate = data?.campaignTemplates?.[activeSegment];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center shadow-inner">
              <Users className="w-5 h-5 text-purple-200" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                Customer Insights & Retention
              </h2>
              <p className="text-xs text-white/80">
                Groups customers into VIP, Regular, and At-Risk segments based on purchase history to send targeted WhatsApp offers.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchSegments}
              disabled={loading}
              className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              title="Refresh Segments"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {loading && !data ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-purple-600 mb-2" />
              <p className="text-sm font-medium">Computing RFM matrices and segmenting customer base...</p>
            </div>
          ) : (
            <>
              {/* Segment Cards / Tabs */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                  {
                    key: "vip",
                    label: "VIP Spenders",
                    badge: "Top 15%",
                    count: data?.summary?.vipCount || 0,
                    icon: Award,
                    color: "amber",
                    border: "border-amber-200",
                    bg: "bg-amber-50",
                    activeBg: "bg-amber-500 text-white"
                  },
                  {
                    key: "regular",
                    label: "Loyal Regulars",
                    badge: "Active",
                    count: data?.summary?.regularCount || 0,
                    icon: ShoppingBag,
                    color: "blue",
                    border: "border-blue-200",
                    bg: "bg-blue-50",
                    activeBg: "bg-blue-600 text-white"
                  },
                  {
                    key: "at_risk",
                    label: "At Risk",
                    badge: ">30d Inactive",
                    count: data?.summary?.atRiskCount || 0,
                    icon: AlertCircle,
                    color: "rose",
                    border: "border-rose-200",
                    bg: "bg-rose-50",
                    activeBg: "bg-rose-600 text-white"
                  },
                  {
                    key: "new",
                    label: "New Customers",
                    badge: "<14d",
                    count: data?.summary?.newCount || 0,
                    icon: Sparkles,
                    color: "emerald",
                    border: "border-emerald-200",
                    bg: "bg-emerald-50",
                    activeBg: "bg-emerald-600 text-white"
                  },
                  {
                    key: "dormant",
                    label: "Dormant",
                    badge: ">90d",
                    count: data?.summary?.dormantCount || 0,
                    icon: Calendar,
                    color: "slate",
                    border: "border-slate-200",
                    bg: "bg-slate-50",
                    activeBg: "bg-slate-600 text-white"
                  }
                ].map((seg) => {
                  const isSelected = activeSegment === seg.key;
                  const Icon = seg.icon;
                  return (
                    <button
                      key={seg.key}
                      onClick={() => setActiveSegment(seg.key)}
                      className={`p-3.5 rounded-xl border text-left transition-all ${
                        isSelected
                          ? `${seg.activeBg} shadow-md scale-102`
                          : `${seg.bg} ${seg.border} text-slate-700 hover:shadow-sm`
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                          isSelected ? "bg-white/20 text-white" : "bg-white text-slate-600"
                        }`}>
                          {seg.badge}
                        </span>
                        <Icon className="w-4 h-4 opacity-80" />
                      </div>
                      <h4 className="text-xl font-black mt-2">{seg.count}</h4>
                      <p className="text-xs font-semibold truncate mt-0.5">{seg.label}</p>
                    </button>
                  );
                })}
              </div>

              {/* Segment Campaign Box */}
              {currentTemplate && (
                <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-purple-600 text-white rounded-xl shadow-sm">
                      <MessageCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-purple-900 flex items-center gap-2">
                        <span>Targeted WhatsApp Offer: {currentTemplate.title}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-200 text-purple-800 font-bold">
                          Promo: {currentTemplate.recommendedDiscount} OFF
                        </span>
                      </h4>
                      <p className="text-xs text-purple-800/90 mt-1 italic">
                        "{currentTemplate.message}"
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Customers in this segment table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3">Mobile</th>
                      <th className="px-4 py-3 text-right">Lifetime Spend</th>
                      <th className="px-4 py-3 text-center">Visits</th>
                      <th className="px-4 py-3">Last Visit</th>
                      <th className="px-4 py-3">Top Purchases</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {currentSegmentList.length > 0 ? (
                      currentSegmentList.map((cust) => (
                        <tr key={cust.customerId} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-4 py-3 font-semibold text-slate-800">
                            {cust.name}
                          </td>
                          <td className="px-4 py-3 text-slate-600 font-mono">
                            {cust.mobile || "—"}
                          </td>
                          <td className="px-4 py-3 text-right font-black text-slate-800">
                            ₹{cust.totalSpend.toLocaleString("en-IN")}
                          </td>
                          <td className="px-4 py-3 text-center font-semibold text-slate-700">
                            {cust.billCount} bills
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {cust.daysSinceLastPurchase === 999
                              ? "Never"
                              : `${cust.daysSinceLastPurchase} days ago`}
                          </td>
                          <td className="px-4 py-3 text-slate-500 max-w-xs truncate">
                            {cust.topFavoriteItems?.join(", ") || "—"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleSendCampaign(cust)}
                              disabled={sendingTo === cust.customerId || !cust.mobile}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 ml-auto transition-colors shadow-sm"
                            >
                              {sendingTo === cust.customerId ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <MessageCircle className="w-3.5 h-3.5" />
                              )}
                              <span>Send Offer</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7" className="text-center py-12 text-slate-400">
                          <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                          No customers found in this segment.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Total Customers Tracked: <strong>{data?.summary?.totalCustomers || 0}</strong> • Total Segment Spend: <strong>₹{(data?.summary?.totalRevenue || 0).toLocaleString("en-IN")}</strong>
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomerSegmentationModal;
