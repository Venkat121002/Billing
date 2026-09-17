import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import API_URL from "../../config/api";
import { useAuth } from "../../contexts/AuthContext";
import BillingLayout from "../../Layout/BillingLayout/AdminLayout";
import toast from "react-hot-toast";
import { Search, AlertTriangle, Calendar, Package } from "lucide-react";

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

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

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

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

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

  const tdClass = "px-5 py-4 text-sm text-gray-700 whitespace-nowrap";

  return (
    <BillingLayout>
      <div className="min-h-screen bg-gradient-to-br from-green-50/30 via-white to-emerald-50/20 -m-4 p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Expiry Alerts
          </h1>
          <p className="mt-1 text-gray-500 font-medium">
            Track batch expiry dates across your inventory.
          </p>
        </div>

        {/* Summary tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-5">
            <p className="text-xs font-bold text-red-500 uppercase tracking-wider">Expired</p>
            <p className="text-2xl font-extrabold text-red-700 mt-1">{summary.expired}</p>
          </div>
          <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-5">
            <p className="text-xs font-bold text-amber-500 uppercase tracking-wider">Expiring within {EXPIRING_SOON_DAYS} days</p>
            <p className="text-2xl font-extrabold text-amber-700 mt-1">{summary.soon}</p>
          </div>
          <div className="bg-white rounded-2xl border border-green-100 shadow-sm p-5">
            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Total Batches Tracked</p>
            <p className="text-2xl font-extrabold text-emerald-700 mt-1">{summary.total}</p>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-2xl border border-green-100 shadow-sm p-5 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by product, batch number or manufacturer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-green-200 rounded-xl focus:ring-2 focus:ring-green-400 focus:border-green-400 focus:outline-none text-sm font-medium text-gray-900 placeholder:text-gray-400 transition-all"
            />
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
                    <th className="py-4 px-5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Product</th>
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
                        <tr key={p.id} className="hover:bg-green-50/50 transition-colors border-b border-gray-50">
                          <td className={`${tdClass} font-semibold text-gray-900`}>
                            <div className="flex items-center gap-2">
                              <Package size={16} className="text-emerald-500" />
                              {p.name || "Unnamed item"}
                            </div>
                          </td>
                          <td className={`${tdClass} font-mono text-xs text-gray-500`}>{p.batchNumber || p.batchNo || "—"}</td>
                          <td className={tdClass}>{p.pharmaCompany || "—"}</td>
                          <td className={tdClass}>
                            <span className="inline-flex items-center gap-1">
                              <Calendar size={12} className="text-gray-400" />
                              {p.expiryDate}
                            </span>
                          </td>
                          <td className={`${tdClass} font-semibold ${p.daysLeft !== null && p.daysLeft < 0 ? "text-red-600" : p.daysLeft !== null && p.daysLeft <= EXPIRING_SOON_DAYS ? "text-amber-600" : "text-gray-700"}`}>
                            {p.daysLeft === null ? "—" : p.daysLeft < 0 ? `${Math.abs(p.daysLeft)}d ago` : `${p.daysLeft}d`}
                          </td>
                          <td className={tdClass}>{p.quantity ?? "—"}</td>
                          <td className={tdClass}>
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${status.style}`}>
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
    </BillingLayout>
  );
};

export default ExpiryAlerts;
