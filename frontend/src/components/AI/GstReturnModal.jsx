import React, { useState, useEffect } from "react";
import axios from "axios";
import API_URL from "../../config/api";
import toast from "react-hot-toast";
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Loader2,
  RefreshCw,
  Building2,
  ShieldCheck,
  CheckCircle2,
  FileText,
  Table,
  IndianRupee,
  X
} from "lucide-react";

const GstReturnModal = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [data, setData] = useState(null);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [activeTab, setActiveTab] = useState("summary"); // 'summary', 'b2b', 'b2c', 'hsn', 'gstr3b'

  const fetchGstReturns = async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem("token");
      const res = await axios.get(
        `${API_URL}/automation/gst-returns/summary?month=${month}&year=${year}`,
        { headers: { "x-auth-token": token } }
      );
      setData(res.data);
    } catch (err) {
      console.error("GST return summary error:", err);
      toast.error(err.response?.data?.msg || "Failed to load GST return summary.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchGstReturns();
    }
  }, [isOpen, month, year]);

  const handleDownloadExcel = async () => {
    setExporting(true);
    try {
      const token = sessionStorage.getItem("token");
      const response = await axios.get(
        `${API_URL}/automation/gst-returns/export?month=${month}&year=${year}`,
        {
          headers: { "x-auth-token": token },
          responseType: "blob"
        }
      );

      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `GST_Return_${month}_${year}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success("GST Return Excel downloaded successfully!");
    } catch (err) {
      console.error("Export Excel error:", err);
      toast.error("Failed to download GST return Excel workbook.");
    } finally {
      setExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-green-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center shadow-inner">
              <FileSpreadsheet className="w-5 h-5 text-emerald-100" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                GST Return Preparation (GSTR-1 & 3B)
              </h2>
              <p className="text-xs text-white/80">
                Automatically compiles your sales into B2B, B2C, and HSN tables, and exports an Excel workbook ready for your CA or tax portal.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchGstReturns}
              disabled={loading}
              className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              title="Refresh Return"
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

        {/* Period selection */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-600 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> Return Period:
            </span>
            <select
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value))}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-slate-700 outline-none"
            >
              {[
                { val: 1, name: "January" }, { val: 2, name: "February" }, { val: 3, name: "March" },
                { val: 4, name: "April" }, { val: 5, name: "May" }, { val: 6, name: "June" },
                { val: 7, name: "July" }, { val: 8, name: "August" }, { val: 9, name: "September" },
                { val: 10, name: "October" }, { val: 11, name: "November" }, { val: 12, name: "December" }
              ].map((m) => (
                <option key={m.val} value={m.val}>{m.name}</option>
              ))}
            </select>
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-slate-700 outline-none"
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">GSTIN:</span>
            <span className="font-mono font-bold text-slate-800 bg-white px-2.5 py-1 rounded border border-slate-200">
              {data?.storeGstin || "Unregistered"}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {loading && !data ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-2" />
              <p className="text-sm font-medium">Aggregating GST invoices, computing HSN and tax splits...</p>
            </div>
          ) : (
            <>
              {/* Summary KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Total Invoices</span>
                  <h3 className="text-2xl font-black text-emerald-800 mt-2">{data?.summary?.totalBills || 0}</h3>
                  <p className="text-[11px] text-emerald-600 mt-0.5">
                    B2B: {data?.summary?.b2bCount || 0} • B2C: {data?.summary?.b2cCount || 0}
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Taxable Value</span>
                  <h3 className="text-2xl font-black text-blue-800 mt-2">
                    ₹{(data?.summary?.totalTaxableValue || 0).toLocaleString("en-IN")}
                  </h3>
                  <p className="text-[11px] text-blue-600 mt-0.5">Net outward supplies</p>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-600">Total Invoice Value</span>
                  <h3 className="text-2xl font-black text-purple-800 mt-2">
                    ₹{(data?.summary?.totalInvoiceValue || 0).toLocaleString("en-IN")}
                  </h3>
                  <p className="text-[11px] text-purple-600 mt-0.5">Gross billed amount</p>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-600">Total Tax Liability</span>
                  <h3 className="text-2xl font-black text-amber-800 mt-2">
                    ₹{(data?.summary?.totalTax || 0).toLocaleString("en-IN")}
                  </h3>
                  <p className="text-[11px] text-amber-600 mt-0.5">
                    CGST: ₹{data?.summary?.totalCgst} • SGST: ₹{data?.summary?.totalSgst}
                  </p>
                </div>
              </div>

              {/* Sub-Tabs */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-bold w-fit">
                {[
                  { key: "summary", label: "Liability Overview" },
                  { key: "b2b", label: `GSTR-1 B2B (${data?.gstr1?.b2b?.length || 0})` },
                  { key: "b2c", label: `GSTR-1 B2C Small (${data?.gstr1?.b2cSmall?.length || 0})` },
                  { key: "hsn", label: `HSN Summary (${data?.gstr1?.hsn?.length || 0})` },
                  { key: "gstr3b", label: "GSTR-3B Table 3.1" }
                ].map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setActiveTab(t.key)}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      activeTab === t.key
                        ? "bg-white text-emerald-700 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Tab 1: Liability Overview */}
              {activeTab === "summary" && (
                <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Tax Liability Computation for {data?.period}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="text-xs text-slate-500 font-semibold">Central GST (CGST)</span>
                      <p className="text-xl font-black text-slate-800 mt-1">₹{(data?.summary?.totalCgst || 0).toLocaleString("en-IN")}</p>
                    </div>
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="text-xs text-slate-500 font-semibold">State GST (SGST)</span>
                      <p className="text-xl font-black text-slate-800 mt-1">₹{(data?.summary?.totalSgst || 0).toLocaleString("en-IN")}</p>
                    </div>
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="text-xs text-slate-500 font-semibold">Integrated GST (IGST)</span>
                      <p className="text-xl font-black text-slate-800 mt-1">₹{(data?.summary?.totalIgst || 0).toLocaleString("en-IN")}</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 italic">
                    All numbers are compiled in strict compliance with GST rules and formatted for direct submission or handover to your Chartered Accountant.
                  </p>
                </div>
              )}

              {/* Tab 2: GSTR-1 B2B */}
              {activeTab === "b2b" && (
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3">GSTIN</th>
                        <th className="px-4 py-3">Buyer Name</th>
                        <th className="px-4 py-3">Invoice No</th>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3 text-right">Taxable Value</th>
                        <th className="px-4 py-3 text-right">Tax (C+S/I)</th>
                        <th className="px-4 py-3 text-right">Total Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(data?.gstr1?.b2b || []).length > 0 ? (
                        data.gstr1.b2b.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/60">
                            <td className="px-4 py-3 font-mono font-bold text-slate-700">{row.gstin}</td>
                            <td className="px-4 py-3 font-semibold text-slate-800">{row.customerName}</td>
                            <td className="px-4 py-3 font-mono text-slate-600">{row.invoiceNo}</td>
                            <td className="px-4 py-3 text-slate-600">{row.invoiceDate}</td>
                            <td className="px-4 py-3 text-right font-semibold text-slate-800">₹{row.taxableValue}</td>
                            <td className="px-4 py-3 text-right text-slate-600">₹{(row.cgst + row.sgst + row.igst).toFixed(2)}</td>
                            <td className="px-4 py-3 text-right font-black text-emerald-700">₹{row.invoiceValue}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="7" className="text-center py-10 text-slate-400">
                            No B2B invoices recorded in this period.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Tab 3: GSTR-1 B2C Small */}
              {activeTab === "b2c" && (
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Place of Supply</th>
                        <th className="px-4 py-3 text-center">Applicable Rate</th>
                        <th className="px-4 py-3 text-right">Taxable Value</th>
                        <th className="px-4 py-3 text-right">Central Tax</th>
                        <th className="px-4 py-3 text-right">State/UT Tax</th>
                        <th className="px-4 py-3 text-right">Integrated Tax</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(data?.gstr1?.b2cSmall || []).length > 0 ? (
                        data.gstr1.b2cSmall.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/60">
                            <td className="px-4 py-3 font-semibold text-slate-800">{row.placeOfSupply}</td>
                            <td className="px-4 py-3 text-center font-bold text-slate-700">{row.rate}%</td>
                            <td className="px-4 py-3 text-right font-semibold text-slate-800">₹{row.taxableValue}</td>
                            <td className="px-4 py-3 text-right text-slate-600">₹{row.cgst}</td>
                            <td className="px-4 py-3 text-right text-slate-600">₹{row.sgst}</td>
                            <td className="px-4 py-3 text-right text-slate-600">₹{row.igst}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="6" className="text-center py-10 text-slate-400">
                            No B2C small supplies recorded in this period.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Tab 4: HSN Summary */}
              {activeTab === "hsn" && (
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3">HSN Code</th>
                        <th className="px-4 py-3">Description</th>
                        <th className="px-4 py-3">UQC</th>
                        <th className="px-4 py-3 text-right">Total Qty</th>
                        <th className="px-4 py-3 text-right">Taxable Value</th>
                        <th className="px-4 py-3 text-right">Central Tax</th>
                        <th className="px-4 py-3 text-right">State Tax</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(data?.gstr1?.hsn || []).length > 0 ? (
                        data.gstr1.hsn.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/60">
                            <td className="px-4 py-3 font-mono font-bold text-slate-800">{row.hsnCode}</td>
                            <td className="px-4 py-3 font-semibold text-slate-700">{row.description}</td>
                            <td className="px-4 py-3 text-slate-600">{row.uqc}</td>
                            <td className="px-4 py-3 text-right font-semibold text-slate-800">{row.totalQuantity}</td>
                            <td className="px-4 py-3 text-right font-bold text-slate-800">₹{row.taxableValue}</td>
                            <td className="px-4 py-3 text-right text-slate-600">₹{row.cgst}</td>
                            <td className="px-4 py-3 text-right text-slate-600">₹{row.sgst}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="7" className="text-center py-10 text-slate-400">
                            No HSN items recorded in this period.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Tab 5: GSTR-3B Table 3.1 */}
              {activeTab === "gstr3b" && (
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Nature of Supplies (Table 3.1)</th>
                        <th className="px-4 py-3 text-right">Total Taxable Value</th>
                        <th className="px-4 py-3 text-right">Integrated Tax</th>
                        <th className="px-4 py-3 text-right">Central Tax</th>
                        <th className="px-4 py-3 text-right">State/UT Tax</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr className="hover:bg-slate-50/60">
                        <td className="px-4 py-3 font-semibold text-slate-800">
                          (a) Outward taxable supplies (other than zero rated, nil rated, exempted)
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900">
                          ₹{data?.gstr3b?.outwardTaxableSupplies?.taxableValue}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-700">₹{data?.gstr3b?.outwardTaxableSupplies?.igst}</td>
                        <td className="px-4 py-3 text-right text-slate-700">₹{data?.gstr3b?.outwardTaxableSupplies?.cgst}</td>
                        <td className="px-4 py-3 text-right text-slate-700">₹{data?.gstr3b?.outwardTaxableSupplies?.sgst}</td>
                      </tr>
                      <tr className="hover:bg-slate-50/60 text-slate-500">
                        <td className="px-4 py-3">(b) Outward taxable supplies (zero rated)</td>
                        <td className="px-4 py-3 text-right">₹0.00</td>
                        <td className="px-4 py-3 text-right">₹0.00</td>
                        <td className="px-4 py-3 text-right">—</td>
                        <td className="px-4 py-3 text-right">—</td>
                      </tr>
                      <tr className="hover:bg-slate-50/60 text-slate-500">
                        <td className="px-4 py-3">(c) Other outward supplies (Nil rated, exempted)</td>
                        <td className="px-4 py-3 text-right">₹0.00</td>
                        <td className="px-4 py-3 text-right">—</td>
                        <td className="px-4 py-3 text-right">—</td>
                        <td className="px-4 py-3 text-right">—</td>
                      </tr>
                      <tr className="bg-emerald-50/60 font-black">
                        <td className="px-4 py-3 text-emerald-900">Total Tax Payable (GSTR-3B)</td>
                        <td className="px-4 py-3 text-right text-emerald-900">—</td>
                        <td className="px-4 py-3 text-right text-emerald-900">₹{data?.gstr3b?.outwardTaxableSupplies?.igst}</td>
                        <td className="px-4 py-3 text-right text-emerald-900">₹{data?.gstr3b?.outwardTaxableSupplies?.cgst}</td>
                        <td className="px-4 py-3 text-right text-emerald-900">₹{data?.gstr3b?.outwardTaxableSupplies?.sgst}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Official GSTR workbook includes Summary, B2B, B2C Small, HSN & GSTR-3B sheets.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadExcel}
              disabled={exporting || loading}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-emerald-200 transition-all"
            >
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span>Download CA Excel (.xlsx)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GstReturnModal;
