import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import API_URL from "../../config/api";
import { useAuth } from "../../contexts/AuthContext";
import BillingLayout from "../../Layout/BillingLayout/AdminLayout";
import toast from "react-hot-toast";
import { Search, Smartphone, Hash } from "lucide-react";

const ImeiLookup = () => {
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

  // Only devices with an IMEI on record are relevant to a lookup
  const imeiDevices = useMemo(
    () => products.filter((p) => p.imei1 || p.imei2),
    [products]
  );

  const filteredDevices = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return imeiDevices;
    return imeiDevices.filter(
      (p) =>
        (p.imei1 || "").toLowerCase().includes(term) ||
        (p.imei2 || "").toLowerCase().includes(term) ||
        (p.name || "").toLowerCase().includes(term) ||
        (p.brand || "").toLowerCase().includes(term) ||
        (p.model || "").toLowerCase().includes(term)
    );
  }, [imeiDevices, searchTerm]);

  const tdClass = "px-5 py-4 text-sm text-gray-700 whitespace-nowrap";

  return (
    <BillingLayout>
      <div className="min-h-screen bg-gradient-to-br from-green-50/30 via-white to-emerald-50/20 -m-4 p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            IMEI Lookup
          </h1>
          <p className="mt-1 text-gray-500 font-medium">
            Search your device inventory by IMEI, brand, or model.
          </p>
        </div>

        {/* Search */}
        <div className="bg-white rounded-2xl border border-green-100 shadow-sm p-5 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by IMEI, brand or model..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-green-200 rounded-xl focus:ring-2 focus:ring-green-400 focus:border-green-400 focus:outline-none text-sm font-medium text-gray-900 placeholder:text-gray-400 transition-all"
              autoFocus
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-green-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="text-center py-20 text-gray-500">Loading devices...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100">
                  <tr>
                    <th className="py-4 px-5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Device</th>
                    <th className="py-4 px-5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">IMEI 1</th>
                    <th className="py-4 px-5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">IMEI 2</th>
                    <th className="py-4 px-5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Storage / Color</th>
                    <th className="py-4 px-5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Price (₹)</th>
                    <th className="py-4 px-5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Warranty</th>
                    <th className="py-4 px-5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDevices.length > 0 ? (
                    filteredDevices.map((p) => (
                      <tr key={p.id} className="hover:bg-green-50/50 transition-colors border-b border-gray-50">
                        <td className={`${tdClass} font-semibold text-gray-900`}>
                          <div className="flex items-center gap-2">
                            <Smartphone size={16} className="text-emerald-500" />
                            {p.name || [p.brand, p.model].filter(Boolean).join(" ") || "Unnamed device"}
                          </div>
                        </td>
                        <td className={`${tdClass} font-mono text-xs`}>
                          <span className="inline-flex items-center gap-1">
                            <Hash size={12} className="text-gray-400" />
                            {p.imei1 || "—"}
                          </span>
                        </td>
                        <td className={`${tdClass} font-mono text-xs text-gray-500`}>{p.imei2 || "—"}</td>
                        <td className={tdClass}>{[p.storage, p.color].filter(Boolean).join(" / ") || "—"}</td>
                        <td className={`${tdClass} font-semibold text-emerald-700`}>
                          ₹{Number(p.salePrice || p.salesPrice || 0).toLocaleString("en-IN")}
                        </td>
                        <td className={tdClass}>{p.warranty || "—"}</td>
                        <td className={tdClass}>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${Number(p.quantity) > 0 ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                            {Number(p.quantity) > 0 ? "In Stock" : "Sold"}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="text-center py-16 text-gray-400">
                        No devices with an IMEI on record found.
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

export default ImeiLookup;
