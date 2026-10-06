import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Download, RefreshCw, Search, X } from "lucide-react";
import toast from "react-hot-toast";
import RecordDrawer from "./RecordDrawer";
import { Card, Cell, ErrorBox, PageHeader, Spinner, buttonClass, columnText, downloadExcel, fmtNumber, inputClass, saRequest } from "./shared";

const PAGE_SIZES = [25, 50, 100];

// Read-only table over one /superadmin/data/:dataset, optionally scoped to a
// single store. Without onStoreChange the store scope is fixed (store mode).
export default function DataExplorer({ dataset, storeId, stores, onStoreChange }) {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [openRecord, setOpenRecord] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  // The store column is noise when looking at a single store.
  const columns = useMemo(() => (storeId ? dataset.columns.filter((c) => c.type !== "store") : dataset.columns), [dataset, storeId]);

  // Reset paging/filters whenever the dataset or store scope changes.
  useEffect(() => {
    setPage(1);
    setSearchInput("");
    setSearch("");
    setFrom("");
    setTo("");
  }, [dataset.key, storeId]);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const badRange = from && to && from > to;
  const filters = useMemo(() => ({ storeId: storeId || undefined, search: search || undefined, from: from || undefined, to: to || undefined }), [storeId, search, from, to]);

  useEffect(() => {
    if (badRange) return undefined;
    let cancelled = false;
    setLoading(true);
    setError("");
    saRequest(`data/${dataset.key}`, { params: { ...filters, page, limit } })
      .then((data) => {
        if (cancelled) return;
        setRows(data.rows || []);
        setTotal(data.total || 0);
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [dataset.key, filters, page, limit, reloadKey, badRange]);

  const pages = Math.max(1, Math.ceil(total / limit));
  const storeName = stores.find((s) => s.id === storeId)?.name;

  const handleExport = async () => {
    setExporting(true);
    try {
      const data = await saRequest(`data/${dataset.key}`, { params: { ...filters, page: 1, limit: 5000, export: 1 } });
      const list = data.rows || [];
      if (list.length === 0) {
        toast.error("Nothing to export for these filters.");
        return;
      }
      const sheet = list.map((row, i) => {
        const out = { "S.No": i + 1 };
        columns.forEach((col) => {
          out[col.label] = columnText(row, col);
        });
        return out;
      });
      const name = [dataset.label, storeName, from && to ? `${from}_to_${to}` : ""].filter(Boolean).join("_").replace(/[^\w-]+/g, "_");
      downloadExcel(sheet, dataset.label, name);
      if (data.total > list.length) toast(`Exported the latest ${list.length} of ${data.total} rows. Narrow the filters for the rest.`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader title={dataset.label} subtitle={`${fmtNumber(total)} record${total === 1 ? "" : "s"}${storeName ? ` in ${storeName}` : " across all stores"}`}>
        <button onClick={() => setReloadKey((k) => k + 1)} className={buttonClass.ghost} title="Refresh" aria-label="Refresh">
          <RefreshCw className="w-4 h-4" />
        </button>
        <button onClick={handleExport} disabled={exporting || total === 0} className={buttonClass.primary}>
          <Download className="w-4 h-4" /> {exporting ? "Exporting..." : "Export Excel"}
        </button>
      </PageHeader>

      <Card className="p-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-gray-500 sa-dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search..." className={`${inputClass} w-full pl-9`} />
        </div>
        {onStoreChange && (
          <select value={storeId || ""} onChange={(e) => onStoreChange(e.target.value || null)} className={`${inputClass} max-w-[220px]`} aria-label="Store">
            <option value="">All stores</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        )}
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} className={`${inputClass} flex-1 min-w-0 sm:flex-none`} aria-label="From date" />
          <span className="text-gray-500 sa-dark:text-slate-500 text-sm">to</span>
          <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} className={`${inputClass} flex-1 min-w-0 sm:flex-none`} aria-label="To date" />
          {(from || to) && (
            <button onClick={() => { setFrom(""); setTo(""); }} className="p-2 text-gray-500 sa-dark:text-slate-400 hover:text-gray-900 sa-dark:hover:text-white" aria-label="Clear dates">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </Card>
      {badRange && <p className="text-sm text-amber-700 sa-dark:text-amber-300">The "from" date is after the "to" date.</p>}

      <Card className="overflow-hidden">
        {loading ? (
          <Spinner />
        ) : error ? (
          <ErrorBox message={error} onRetry={() => setReloadKey((k) => k + 1)} />
        ) : rows.length === 0 ? (
          <p className="py-16 text-center text-sm text-gray-500 sa-dark:text-slate-400">No records found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 sa-dark:bg-slate-900 text-gray-500 sa-dark:text-slate-400 text-xs uppercase tracking-wide">
                <tr>
                  {columns.map((col) => (
                    <th key={col.field + col.label} className="px-3 py-3 text-left font-medium whitespace-nowrap">{col.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 sa-dark:divide-slate-800/80 text-gray-800 sa-dark:text-slate-200">
                {rows.map((row) => (
                  <tr key={`${row._storeId}-${row._id}`} onClick={() => setOpenRecord(row)} className="hover:bg-gray-50 sa-dark:hover:bg-slate-800/40 cursor-pointer">
                    {columns.map((col) => (
                      <td key={col.field + col.label} className="px-3 py-2.5 align-middle">
                        <Cell row={row} col={col} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {!loading && !error && total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-500 sa-dark:text-slate-400">
          <div className="flex items-center gap-2">
            Rows per page
            <select value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }} className={`${inputClass} py-1`}>
              {PAGE_SIZES.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span>
              {(page - 1) * limit + 1}-{Math.min(page * limit, total)} of {fmtNumber(total)}
            </span>
            <button onClick={() => setPage((p) => p - 1)} disabled={page <= 1} className={`${buttonClass.ghost} px-2`} aria-label="Previous page">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setPage((p) => p + 1)} disabled={page >= pages} className={`${buttonClass.ghost} px-2`} aria-label="Next page">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {openRecord && <RecordDrawer record={openRecord} title={dataset.label} onClose={() => setOpenRecord(null)} />}
    </div>
  );
}
