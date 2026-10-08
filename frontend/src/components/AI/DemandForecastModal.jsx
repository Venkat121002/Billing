import React, { useState, useEffect } from "react";
import axios from "axios";
import API_URL from "../../config/api";
import toast from "react-hot-toast";
import {
  TrendingUp,
  AlertTriangle,
  Package,
  Calendar,
  Sparkles,
  Download,
  Loader2,
  RefreshCw,
  CheckCircle2,
  Search,
  X,
  Boxes,
  IndianRupee,
  Clock,
  PlusCircle,
  Edit3,
  Check
} from "lucide-react";

const DemandForecastModal = ({ isOpen, onClose, onProductUpdated }) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [lookbackDays, setLookbackDays] = useState(30);
  const [forecastDays, setForecastDays] = useState(7);
  const [filterTab, setFilterTab] = useState("critical"); // 'critical', 'all', 'slow', 'healthy'
  const [searchTerm, setSearchTerm] = useState("");

  // Quick Restock / Edit Stock Modal State
  const [restockModalOpen, setRestockModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [addQty, setAddQty] = useState(10);
  const [directQty, setDirectQty] = useState(10);
  const [costPrice, setCostPrice] = useState("");
  const [restockMode, setRestockMode] = useState("add"); // 'add' | 'direct'
  const [savingRestock, setSavingRestock] = useState(false);

  const fetchForecast = async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem("token");
      const res = await axios.get(
        `${API_URL}/automation/demand-forecast?lookbackDays=${lookbackDays}&forecastDays=${forecastDays}`,
        { headers: { "x-auth-token": token } }
      );
      setData(res.data);
    } catch (err) {
      console.error("Demand forecast error:", err);
      toast.error(err.response?.data?.msg || "Failed to load demand forecast.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchForecast();
    }
  }, [isOpen, lookbackDays, forecastDays]);

  const handleExportCSV = () => {
    if (!data || !data.items || data.items.length === 0) {
      toast.error("No items available to export.");
      return;
    }

    const headers = [
      "Product Name",
      "SKU",
      "Current Stock",
      "Daily Velocity",
      "Weekly Run-rate",
      "Days of Stock Left",
      "Suggested Reorder Qty",
      "Cost Price",
      "Estimated Restock Cost",
      "Status"
    ];

    const rows = data.items.map((i) => [
      `"${i.name.replace(/"/g, '""')}"`,
      `"${i.sku}"`,
      i.currentStock,
      i.dailyVelocity,
      i.weeklyVelocity,
      i.daysOfStockLeft === 999 ? "Sufficient" : i.daysOfStockLeft,
      i.suggestedReorder,
      i.costPrice,
      i.estimatedCost,
      i.status
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Restock_Forecast_${lookbackDays}d.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Downloaded restock forecast CSV!");
  };

  const handleOpenRestock = (item) => {
    setSelectedProduct(item);
    const suggested = Number(item.suggestedReorder) > 0 ? Number(item.suggestedReorder) : 10;
    const current = Number(item.currentStock) || 0;
    setAddQty(suggested);
    setDirectQty(current + suggested);
    setCostPrice(item.costPrice !== undefined ? item.costPrice : "");
    setRestockMode("add");
    setRestockModalOpen(true);
  };

  const handleAddQtyChange = (val) => {
    setAddQty(val);
    const num = Number(val) || 0;
    if (selectedProduct) {
      setDirectQty((Number(selectedProduct.currentStock) || 0) + num);
    }
  };

  const handleDirectQtyChange = (val) => {
    setDirectQty(val);
    const num = Number(val) || 0;
    if (selectedProduct) {
      const cur = Number(selectedProduct.currentStock) || 0;
      setAddQty(Math.max(0, num - cur));
    }
  };

  const handleQuickChipAdd = (increment) => {
    handleAddQtyChange(increment);
  };

  const handleSaveRestock = async (e) => {
    if (e) e.preventDefault();
    if (!selectedProduct || savingRestock) return;

    const token = sessionStorage.getItem("token");
    if (!token) {
      toast.error("Authentication required");
      return;
    }

    const finalQuantity = restockMode === "add"
      ? (Number(selectedProduct.currentStock) || 0) + (Number(addQty) || 0)
      : Number(directQty);

    if (isNaN(finalQuantity) || finalQuantity < 0) {
      toast.error("Please enter a valid stock quantity");
      return;
    }

    setSavingRestock(true);
    try {
      const payload = {
        quantity: finalQuantity
      };
      if (costPrice !== "" && !isNaN(costPrice) && Number(costPrice) >= 0) {
        payload.purchasePrice = Number(costPrice);
      }

      await axios.put(
        `${API_URL}/products/${selectedProduct.productId}`,
        payload,
        { headers: { "x-auth-token": token } }
      );

      toast.success(
        `Restocked ${selectedProduct.name}! New stock: ${finalQuantity} units`,
        { icon: "📦" }
      );

      // Close modal
      setRestockModalOpen(false);
      setSelectedProduct(null);

      // Automatically recalculate metrics
      await fetchForecast();

      if (onProductUpdated) {
        onProductUpdated();
      }
    } catch (err) {
      console.error("Restock error:", err);
      toast.error(err.response?.data?.msg || err.response?.data?.error || "Failed to update product stock.");
    } finally {
      setSavingRestock(false);
    }
  };

  if (!isOpen) return null;

  const filteredItems = (data?.items || []).filter((item) => {
    const matchesSearch =
      searchTerm === "" ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (filterTab === "critical") return item.status === "critical" || item.suggestedReorder > 0;
    if (filterTab === "reorder_soon") return item.status === "reorder_soon";
    if (filterTab === "slow") return item.status === "slow_moving";
    if (filterTab === "healthy") return item.status === "healthy";
    return true; // 'all'
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center shadow-inner">
              <TrendingUp className="w-5 h-5 text-cyan-200" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                Demand Forecasting & Smart Restock
              </h2>
              <p className="text-xs text-white/80">
                Calculates daily sales velocity and stock runway to tell you exactly which items to reorder before running out.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchForecast}
              disabled={loading}
              className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              title="Refresh Forecast"
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

        {/* Controls & Period selectors */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-500">Lookback Period:</span>
            {[
              { label: "15 Days", val: 15 },
              { label: "30 Days", val: 30 },
              { label: "60 Days", val: 60 },
              { label: "90 Days", val: 90 }
            ].map((p) => (
              <button
                key={p.val}
                type="button"
                onClick={() => setLookbackDays(p.val)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  lookbackDays === p.val
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-500">Forecast Window:</span>
            {[
              { label: "7 Days", val: 7 },
              { label: "14 Days", val: 14 }
            ].map((f) => (
              <button
                key={f.val}
                type="button"
                onClick={() => setForecastDays(f.val)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  forecastDays === f.val
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {loading && !data ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
              <p className="text-sm font-medium">Analyzing sales trends & computing restock quantities...</p>
            </div>
          ) : (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-rose-600">Urgent Restock</span>
                    <AlertTriangle className="w-4 h-4 text-rose-500" />
                  </div>
                  <h3 className="text-2xl font-black text-rose-700 mt-2">
                    {data?.criticalItemsCount || 0}
                  </h3>
                  <p className="text-[11px] text-rose-600 mt-1">Out of stock or &le; 3 days stock left</p>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-600">Restock Soon</span>
                    <Clock className="w-4 h-4 text-amber-500" />
                  </div>
                  <h3 className="text-2xl font-black text-amber-700 mt-2">
                    {data?.warningItemsCount || 0}
                  </h3>
                  <p className="text-[11px] text-amber-600 mt-1">Stock runs out within 7 days</p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Units To Order</span>
                    <Boxes className="w-4 h-4 text-blue-500" />
                  </div>
                  <h3 className="text-2xl font-black text-blue-700 mt-2">
                    {data?.totalRestockUnits || 0}
                  </h3>
                  <p className="text-[11px] text-blue-600 mt-1">Across all recommended items</p>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Est. Procurement Budget</span>
                    <IndianRupee className="w-4 h-4 text-emerald-500" />
                  </div>
                  <h3 className="text-2xl font-black text-emerald-700 mt-2">
                    ₹{(data?.estimatedRestockCost || 0).toLocaleString("en-IN")}
                  </h3>
                  <p className="text-[11px] text-emerald-600 mt-1">Estimated restock cost</p>
                </div>
              </div>

              {/* AI Strategic Advice Banner (if present) */}
              {data?.aiAdvice && (
                <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl flex items-start gap-3">
                  <div className="p-2 bg-indigo-600 text-white rounded-lg mt-0.5">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider">AI Inventory Recommendations</h4>
                    <p className="text-xs text-indigo-800 mt-1 whitespace-pre-line leading-relaxed">{data.aiAdvice}</p>
                  </div>
                </div>
              )}

              {/* Search & Tabs */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
                  {[
                    { key: "critical", label: "Needs Restock" },
                    { key: "all", label: "All Items" },
                    { key: "reorder_soon", label: "Warning (<7d)" },
                    { key: "slow", label: "Slow Moving" }
                  ].map((t) => (
                    <button
                      key={t.key}
                      onClick={() => setFilterTab(t.key)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                        filterTab === t.key
                          ? "bg-white text-blue-600 shadow-sm"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search product or SKU..."
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Forecast Items Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Product</th>
                      <th className="px-4 py-3">Current Stock</th>
                      <th className="px-4 py-3">Daily Velocity</th>
                      <th className="px-4 py-3">Runway (Days)</th>
                      <th className="px-4 py-3 text-right">Suggested Reorder</th>
                      <th className="px-4 py-3 text-right">Est. Cost</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredItems.length > 0 ? (
                      filteredItems.map((item) => (
                        <tr key={item.productId} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-4 py-3">
                            <p className="font-semibold text-slate-800">{item.name}</p>
                            <span className="text-[10px] text-slate-400 font-mono">{item.sku}</span>
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-700">
                            {item.currentStock}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {item.dailyVelocity} / day
                            <span className="block text-[10px] text-slate-400">({item.weeklyVelocity} / wk)</span>
                          </td>
                          <td className="px-4 py-3">
                            {item.daysOfStockLeft <= 3 ? (
                              <span className="px-2 py-0.5 rounded-full font-bold bg-rose-100 text-rose-700">
                                {item.daysOfStockLeft} days
                              </span>
                            ) : item.daysOfStockLeft <= 7 ? (
                              <span className="px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-700">
                                {item.daysOfStockLeft} days
                              </span>
                            ) : (
                              <span className="text-slate-600">
                                {item.daysOfStockLeft === 999 ? "Ample" : `${item.daysOfStockLeft} days`}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-black text-indigo-600 text-sm">
                            {item.suggestedReorder > 0 ? `+${item.suggestedReorder}` : "—"}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-700">
                            ₹{item.estimatedCost.toLocaleString("en-IN")}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {item.status === "critical" && (
                              <span className="px-2 py-1 bg-rose-100 text-rose-700 rounded-md font-bold text-[10px]">
                                Critical
                              </span>
                            )}
                            {item.status === "reorder_soon" && (
                              <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-md font-bold text-[10px]">
                                Reorder Soon
                              </span>
                            )}
                            {item.status === "healthy" && (
                              <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-md font-bold text-[10px]">
                                Healthy
                              </span>
                            )}
                            {item.status === "slow_moving" && (
                              <span className="px-2 py-1 bg-slate-100 text-slate-500 rounded-md font-bold text-[10px]">
                                Slow Moving
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleOpenRestock(item)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-bold text-xs shadow-sm hover:shadow transition-all"
                              title={`Update stock or restock ${item.name}`}
                            >
                              <PlusCircle className="w-3.5 h-3.5" />
                              <span>Edit / Restock</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="8" className="text-center py-12 text-slate-400">
                          <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
                          No items match the selected filter.
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
            Formula: Predicted Demand ({forecastDays}d) + Safety Buffer - Stock Runway
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
            >
              Done
            </button>
          </div>
        </div>
      </div>

      {/* Edit / Restock Modal Dialog */}
      {restockModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center shadow-inner">
                  <Boxes className="w-5 h-5 text-cyan-200" />
                </div>
                <div>
                  <h3 className="text-base font-bold flex items-center gap-2">
                    Restock & Update Inventory
                  </h3>
                  <p className="text-xs text-white/80">
                    Update inventory directly & recalculate smart forecasts
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRestockModalOpen(false)}
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Product Quick Info Card */}
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 text-sm">
                      {selectedProduct.name}
                    </span>
                    {selectedProduct.sku && (
                      <span className="text-[11px] font-mono px-2 py-0.5 bg-slate-200 text-slate-700 rounded">
                        {selectedProduct.sku}
                      </span>
                    )}
                  </div>
                  {selectedProduct.status === "critical" && (
                    <span className="px-2 py-0.5 bg-rose-100 text-rose-700 rounded-md font-bold text-[10px]">
                      Critical
                    </span>
                  )}
                  {selectedProduct.status === "reorder_soon" && (
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-md font-bold text-[10px]">
                      Reorder Soon
                    </span>
                  )}
                  {selectedProduct.status === "healthy" && (
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-md font-bold text-[10px]">
                      Healthy
                    </span>
                  )}
                  {selectedProduct.status === "slow_moving" && (
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md font-bold text-[10px]">
                      Slow Moving
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-white p-2 rounded-lg border border-slate-200/60">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Current Stock</span>
                    <span className="font-bold text-slate-700 text-sm">{selectedProduct.currentStock} units</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200/60">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Daily Sales</span>
                    <span className="font-bold text-slate-700 text-sm">{selectedProduct.dailyVelocity}/day</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200/60">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">AI Reorder</span>
                    <span className="font-bold text-blue-600 text-sm">
                      {selectedProduct.suggestedReorder > 0 ? `+${selectedProduct.suggestedReorder}` : "None"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Mode Toggle Tabs */}
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setRestockMode("add")}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    restockMode === "add"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Add Units to Stock</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRestockMode("direct")}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    restockMode === "direct"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Set Direct Total</span>
                </button>
              </div>

              {/* Input section */}
              {restockMode === "add" ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Units to Add (+):
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        value={addQty}
                        onChange={(e) => handleAddQtyChange(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-base font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                        placeholder="e.g. 10"
                        autoFocus
                      />
                      <span className="absolute right-3.5 top-3 text-xs font-semibold text-slate-400">
                        units
                      </span>
                    </div>
                  </div>

                  {/* Quick Increment Chips */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[11px] text-slate-500 font-semibold mr-1">Quick Select:</span>
                    {selectedProduct.suggestedReorder > 0 && (
                      <button
                        type="button"
                        onClick={() => handleQuickChipAdd(selectedProduct.suggestedReorder)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
                          Number(addQty) === Number(selectedProduct.suggestedReorder)
                            ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                            : "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                        }`}
                      >
                        AI Reorder (+{selectedProduct.suggestedReorder})
                      </button>
                    )}
                    {[5, 10, 25, 50, 100].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => handleQuickChipAdd(num)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
                          Number(addQty) === num
                            ? "bg-slate-800 text-white border-slate-800 shadow-sm"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        +{num}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      New Total Stock Quantity:
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        value={directQty}
                        onChange={(e) => handleDirectQtyChange(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-base font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                        placeholder="e.g. 50"
                        autoFocus
                      />
                      <span className="absolute right-3.5 top-3 text-xs font-semibold text-slate-400">
                        units total
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Directly updates the inventory count in the system from {selectedProduct.currentStock} to {directQty || 0} units.
                  </p>
                </div>
              )}

              {/* Purchase Cost Price (Optional update) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Unit Cost / Purchase Price (₹):</span>
                  <span className="text-[10px] text-slate-400 font-normal">Optional</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-sm font-semibold text-slate-400">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    className="w-full pl-8 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                    placeholder="Enter purchase cost per unit"
                  />
                </div>
              </div>

              {/* Live Preview Calculation */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-3 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-500 font-semibold block text-[11px]">New Stock Level</span>
                  <span className="font-extrabold text-blue-900 text-sm">
                    {restockMode === "add"
                      ? (Number(selectedProduct.currentStock) || 0) + (Number(addQty) || 0)
                      : Number(directQty) || 0}{" "}
                    units
                  </span>
                  <span className="text-[10px] text-blue-600 block">
                    (Current: {selectedProduct.currentStock} units)
                  </span>
                </div>
                {costPrice !== "" && Number(costPrice) > 0 && (
                  <div className="text-right">
                    <span className="text-slate-500 font-semibold block text-[11px]">
                      {restockMode === "add" ? "Batch Restock Cost" : "Stock Valuation"}
                    </span>
                    <span className="font-extrabold text-indigo-900 text-sm">
                      ₹
                      {(
                        (restockMode === "add"
                          ? Number(addQty) || 0
                          : Number(directQty) || 0) * Number(costPrice)
                      ).toLocaleString("en-IN")}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setRestockModalOpen(false)}
                disabled={savingRestock}
                className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors shadow-sm disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveRestock}
                disabled={savingRestock}
                className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md hover:shadow-lg transition-all disabled:opacity-50"
              >
                {savingRestock ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Updating & Recalculating...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Save & Recalculate</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DemandForecastModal;
