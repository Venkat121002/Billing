import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Download, RefreshCw, Search, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Card, ErrorBox, PageHeader, Spinner, StatusBadge, buttonClass, downloadExcel, fmtDate, fmtDateTime, fmtNumber, inputClass, saRequest } from "./shared";

const PAGE_SIZE = 25;

export default function Stores({ stores, loading, error, onReload, onOpenStore }) {
  const [search, setSearch] = useState("");
  const [plan, setPlan] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState([]);
  const [deleting, setDeleting] = useState(false);

  const plans = useMemo(() => [...new Set(stores.map((s) => s.plan).filter(Boolean))].sort(), [stores]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return stores.filter(
      (s) => (!plan || s.plan === plan) && (!q || [s.name, s.email, s.mobile, s.industry].some((v) => String(v || "").toLowerCase().includes(q)))
    );
  }, [stores, search, plan]);

  useEffect(() => setPage(1), [search, plan]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggle = (id) => setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const allOnPage = pageRows.length > 0 && pageRows.every((s) => selected.includes(s.id));

  const handleExport = () => {
    if (filtered.length === 0) return toast.error("Nothing to export.");
    downloadExcel(
      filtered.map((s, i) => ({
        "S.No": i + 1,
        Store: s.name,
        Email: s.email,
        Mobile: s.mobile || "-",
        Industry: s.industry || "-",
        Plan: s.plan,
        Status: s.status,
        "Plan ends": fmtDate(s.endDate),
        "Staff logins": s.staff,
        Bills: s.bills,
        Products: s.products,
        "Last login": fmtDateTime(s.lastLogin),
        Registered: fmtDateTime(s.createdAt),
      })),
      "Stores",
      "Stores"
    );
  };

  const handleDelete = async () => {
    const targets = stores.filter((s) => selected.includes(s.id));
    const ok = window.confirm(
      `Permanently delete ${targets.length} store account${targets.length > 1 ? "s" : ""} (${targets.map((t) => t.name).join(", ")})?\n\nThe owner and staff logins are removed and can no longer sign in. This cannot be undone.`
    );
    if (!ok) return;
    setDeleting(true);
    let failed = 0;
    for (const s of targets) {
      try {
        await saRequest(`tenants/${s.id}`, { method: "delete" });
      } catch {
        failed++;
      }
    }
    setDeleting(false);
    setSelected([]);
    onReload();
    if (failed) toast.error(`${failed} store${failed > 1 ? "s" : ""} could not be deleted.`);
    else toast.success(`Deleted ${targets.length} store${targets.length > 1 ? "s" : ""}.`);
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Stores" subtitle={`${stores.length} registered · select a store to see all of its data`}>
        <button onClick={onReload} className={buttonClass.ghost} title="Refresh" aria-label="Refresh">
          <RefreshCw className="w-4 h-4" />
        </button>
        <button onClick={handleExport} className={buttonClass.primary}>
          <Download className="w-4 h-4" /> Export Excel
        </button>
      </PageHeader>

      <Card className="p-3 flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-gray-500 sa-dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email, phone, industry..." className={`${inputClass} w-full pl-9`} />
        </div>
        <select value={plan} onChange={(e) => setPlan(e.target.value)} className={inputClass} aria-label="Plan">
          <option value="">All plans</option>
          {plans.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </Card>

      {selected.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 sa-dark:border-rose-500/30 bg-rose-50 sa-dark:bg-rose-500/10 px-4 py-2.5">
          <span className="text-sm text-rose-700 sa-dark:text-rose-200">{selected.length} selected</span>
          <div className="flex gap-2">
            <button onClick={() => setSelected([])} className={buttonClass.ghost}>Clear</button>
            <button onClick={handleDelete} disabled={deleting} className={buttonClass.danger}>
              <Trash2 className="w-4 h-4" /> {deleting ? "Deleting..." : "Delete accounts"}
            </button>
          </div>
        </div>
      )}

      <Card className="overflow-hidden">
        {loading ? (
          <Spinner />
        ) : error ? (
          <ErrorBox message={error} onRetry={onReload} />
        ) : filtered.length === 0 ? (
          <p className="py-16 text-center text-sm text-gray-500 sa-dark:text-slate-400">No stores found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 sa-dark:bg-slate-900 text-gray-500 sa-dark:text-slate-400 text-xs uppercase tracking-wide">
                <tr>
                  <th className="w-10 px-3 py-3">
                    <input
                      type="checkbox"
                      checked={allOnPage}
                      onChange={() => {
                        const ids = pageRows.map((s) => s.id);
                        setSelected((prev) => (allOnPage ? prev.filter((id) => !ids.includes(id)) : [...new Set([...prev, ...ids])]));
                      }}
                      aria-label="Select all on this page"
                      className="accent-emerald-600"
                    />
                  </th>
                  {["Store", "Plan", "Plan ends", "Staff", "Bills", "Products", "Last login", "Registered"].map((h) => (
                    <th key={h} className="px-3 py-3 text-left font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 sa-dark:divide-slate-800/80 text-gray-800 sa-dark:text-slate-200">
                {pageRows.map((s) => (
                  <tr key={s.id} onClick={() => onOpenStore(s.id)} className="hover:bg-gray-50 sa-dark:hover:bg-slate-800/40 cursor-pointer">
                    <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.includes(s.id)} onChange={() => toggle(s.id)} aria-label={`Select ${s.name}`} className="accent-emerald-600" />
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="font-medium text-gray-900 sa-dark:text-slate-100">{s.name}</div>
                      <div className="text-xs text-gray-500 sa-dark:text-slate-500">{s.email}</div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <StatusBadge value={s.plan} />
                        {s.status !== "Active" && <StatusBadge value={s.status} />}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{fmtDate(s.endDate)}</td>
                    <td className="px-3 py-2.5 tabular-nums">{fmtNumber(s.staff)}</td>
                    <td className="px-3 py-2.5 tabular-nums">{fmtNumber(s.bills)}</td>
                    <td className="px-3 py-2.5 tabular-nums">{fmtNumber(s.products)}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{fmtDateTime(s.lastLogin)}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{fmtDate(s.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-end gap-2 text-sm text-gray-500 sa-dark:text-slate-400">
          <span>
            {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, filtered.length)} of {fmtNumber(filtered.length)}
          </span>
          <button onClick={() => setPage((p) => p - 1)} disabled={page <= 1} className={`${buttonClass.ghost} px-2`} aria-label="Previous page">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => setPage((p) => p + 1)} disabled={page >= pages} className={`${buttonClass.ghost} px-2`} aria-label="Next page">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
