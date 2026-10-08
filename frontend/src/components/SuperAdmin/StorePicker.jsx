import { useEffect, useMemo, useRef, useState } from "react";
import { Building2, Check, ChevronDown, Globe, LogOut, Search } from "lucide-react";
import { BrandMark, ErrorBox, Spinner, StatusBadge, fmtNumber, inputClass } from "./shared";
import { ThemeToggle } from "./theme";

export const ALL_STORES = "all";

const matches = (s, q) => !q || [s.name, s.email, s.mobile, s.industry].some((v) => String(v || "").toLowerCase().includes(q));

export const Initial = ({ name, className = "" }) => (
  <span className={`shrink-0 rounded-lg bg-emerald-50 sa-dark:bg-emerald-500/15 text-emerald-700 sa-dark:text-emerald-300 flex items-center justify-center font-semibold ${className}`}>
    {String(name || "?").trim().charAt(0).toUpperCase()}
  </span>
);

// Full-screen "choose a workspace" step shown right after super admin login.
export default function StorePicker({ stores, loading, error, onRetry, onSelect, onLogout }) {
  const [search, setSearch] = useState("");
  const q = search.trim().toLowerCase();
  const list = useMemo(() => stores.filter((s) => matches(s, q)), [stores, q]);

  return (
    <div className="min-h-screen bg-gray-50 sa-dark:bg-slate-950 text-gray-800 sa-dark:text-slate-200 relative overflow-hidden">
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[640px] h-[640px] rounded-full bg-emerald-300/30 sa-dark:bg-emerald-600/20 blur-3xl" />
      <div className="relative max-w-3xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between gap-3 mb-8">
          <div className="flex items-center gap-3 min-w-0">
            <BrandMark className="w-10 h-10 rounded-xl" />
            <div className="min-w-0">
              <h1 className="text-xl font-semibold text-gray-900 sa-dark:text-white">Choose a store</h1>
              <p className="text-sm text-gray-500 sa-dark:text-slate-400">Everything you see next will be scoped to it. You can switch at any time.</p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <ThemeToggle />
            <button onClick={onLogout} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-500 sa-dark:text-slate-400 hover:text-gray-900 sa-dark:hover:text-white hover:bg-gray-100 sa-dark:hover:bg-slate-800">
              <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>

        <button
          onClick={() => onSelect(ALL_STORES)}
          className="w-full flex items-center gap-3 p-4 mb-4 rounded-2xl border border-emerald-200 sa-dark:border-emerald-500/40 bg-emerald-50 sa-dark:bg-emerald-500/10 hover:bg-emerald-100 sa-dark:hover:bg-emerald-500/20 text-left transition"
        >
          <span className="w-11 h-11 rounded-lg bg-emerald-100 sa-dark:bg-emerald-500/20 text-emerald-700 sa-dark:text-emerald-200 flex items-center justify-center shrink-0">
            <Globe className="w-5 h-5" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block font-medium text-gray-900 sa-dark:text-white">All stores</span>
            <span className="block text-sm text-gray-500 sa-dark:text-slate-400">Platform overview, stores, plans, support, settings and data across every store</span>
          </span>
        </button>

        <div className="relative mb-3">
          <Search className="w-4 h-4 text-gray-500 sa-dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search stores by name, email, phone or industry..."
            className={`${inputClass} w-full pl-9 py-2.5`}
          />
        </div>

        {loading ? (
          <Spinner label="Loading stores..." />
        ) : error ? (
          <ErrorBox message={error} onRetry={onRetry} />
        ) : list.length === 0 ? (
          <p className="py-12 text-center text-sm text-gray-500 sa-dark:text-slate-400">{stores.length ? "No stores match your search." : "No stores registered yet."}</p>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {list.map((s) => (
              <li key={s.id}>
                <button
                  onClick={() => onSelect(s.id)}
                  className="w-full h-full flex items-start gap-3 p-4 rounded-2xl border border-gray-200 sa-dark:border-slate-800 bg-white sa-dark:bg-slate-900/70 hover:border-emerald-300 sa-dark:hover:border-emerald-500/50 hover:bg-gray-50 sa-dark:hover:bg-slate-800/50 text-left transition"
                >
                  <Initial name={s.name} className="w-11 h-11 text-lg" />
                  <span className="flex-1 min-w-0">
                    <span className="block font-medium text-gray-900 sa-dark:text-white truncate">{s.name}</span>
                    <span className="block text-xs text-gray-500 sa-dark:text-slate-500 truncate">{s.email}</span>
                    <span className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500 sa-dark:text-slate-400">
                      <StatusBadge value={s.plan} />
                      {s.status !== "Active" && <StatusBadge value={s.status} />}
                      {fmtNumber(s.bills)} bills
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// Header dropdown for switching the active store without leaving the console.
export function StoreSwitcher({ stores, tenant, onSelect }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);
  const current = stores.find((s) => s.id === tenant);
  const q = search.trim().toLowerCase();
  const list = stores.filter((s) => matches(s, q));

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const choose = (id) => {
    setOpen(false);
    setSearch("");
    if (id !== tenant) onSelect(id);
  };

  const row = (id, label, sub, icon) => (
    <button
      key={id}
      onClick={() => choose(id)}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left hover:bg-gray-100 sa-dark:hover:bg-slate-800 ${id === tenant ? "bg-gray-100 sa-dark:bg-slate-800/60" : ""}`}
    >
      {icon}
      <span className="flex-1 min-w-0">
        <span className="block text-sm text-gray-900 sa-dark:text-slate-100 truncate">{label}</span>
        {sub && <span className="block text-xs text-gray-500 sa-dark:text-slate-500 truncate">{sub}</span>}
      </span>
      {id === tenant && <Check className="w-4 h-4 text-emerald-600 sa-dark:text-emerald-300 shrink-0" />}
    </button>
  );

  return (
    <div ref={ref} className="relative min-w-0">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-2 max-w-[220px] sm:max-w-[320px] px-3 py-1.5 rounded-lg border border-gray-300 sa-dark:border-slate-700 hover:bg-gray-100 sa-dark:hover:bg-slate-800 text-sm"
      >
        {tenant === ALL_STORES ? <Globe className="w-4 h-4 text-emerald-600 sa-dark:text-emerald-300 shrink-0" /> : <Initial name={current?.name} className="w-6 h-6 text-xs" />}
        <span className="truncate text-gray-900 sa-dark:text-slate-100">{tenant === ALL_STORES ? "All stores" : current?.name || "Store"}</span>
        <ChevronDown className="w-4 h-4 text-gray-500 sa-dark:text-slate-400 shrink-0" />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-2 w-[min(320px,calc(100vw-2rem))] rounded-xl border border-gray-300 sa-dark:border-slate-700 bg-white sa-dark:bg-slate-900 shadow-2xl z-50 p-2">
          <div className="relative mb-2">
            <Search className="w-4 h-4 text-gray-500 sa-dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search stores..." className={`${inputClass} w-full pl-9`} />
          </div>
          <div className="max-h-80 overflow-y-auto space-y-0.5">
            {!q && row(ALL_STORES, "All stores", "Platform-wide view", <Globe className="w-4 h-4 text-emerald-600 sa-dark:text-emerald-300 shrink-0 mx-1" />)}
            {list.map((s) => row(s.id, s.name, s.email, <Initial name={s.name} className="w-6 h-6 text-xs" />))}
            {list.length === 0 && <p className="px-3 py-4 text-sm text-gray-500 sa-dark:text-slate-500 text-center">No match</p>}
          </div>
          <p className="flex items-center gap-1.5 px-3 pt-2 mt-1 border-t border-gray-200 sa-dark:border-slate-800 text-xs text-gray-500 sa-dark:text-slate-500">
            <Building2 className="w-3.5 h-3.5" /> {stores.length} stores
          </p>
        </div>
      )}
    </div>
  );
}
