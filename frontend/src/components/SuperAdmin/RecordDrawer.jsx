import { useEffect } from "react";
import { X } from "lucide-react";
import { humanize } from "./shared";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

function Value({ value, depth }) {
  if (value === null || value === undefined || value === "") return <span className="text-gray-500 sa-dark:text-slate-500">-</span>;
  if (typeof value === "boolean") return <span className={value ? "text-emerald-700 sa-dark:text-emerald-300" : "text-gray-500 sa-dark:text-slate-400"}>{value ? "Yes" : "No"}</span>;
  if (typeof value === "string" && ISO_DATE.test(value)) {
    const d = new Date(value);
    if (!isNaN(d)) return <span>{d.toLocaleString("en-IN")}</span>;
  }
  if (typeof value === "string" && /^https?:\/\//.test(value)) {
    return (
      <a href={value} target="_blank" rel="noreferrer" className="text-emerald-700 sa-dark:text-emerald-300 hover:underline break-all">
        {value}
      </a>
    );
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-gray-500 sa-dark:text-slate-500">Empty list</span>;
    if (value.every((v) => v === null || typeof v !== "object")) return <span className="break-words">{value.join(", ")}</span>;
    return (
      <div className="space-y-2">
        {value.map((v, i) => (
          <div key={i} className="border border-gray-200 sa-dark:border-slate-800 rounded-lg p-2">
            <div className="text-[10px] uppercase tracking-wide text-gray-500 sa-dark:text-slate-500 mb-1">#{i + 1}</div>
            <Value value={v} depth={depth + 1} />
          </div>
        ))}
      </div>
    );
  }
  if (typeof value === "object") {
    const entries = Object.entries(value);
    if (entries.length === 0) return <span className="text-gray-500 sa-dark:text-slate-500">Empty</span>;
    return <Fields entries={entries} depth={depth + 1} />;
  }
  return <span className="break-words whitespace-pre-wrap">{String(value)}</span>;
}

function Fields({ entries, depth = 0 }) {
  return (
    <dl className={depth === 0 ? "divide-y divide-gray-200 sa-dark:divide-slate-800" : "space-y-1.5"}>
      {entries.map(([k, v]) => (
        <div key={k} className={depth === 0 ? "py-2.5 grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-3" : "grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-2"}>
          <dt className="text-xs text-gray-500 sa-dark:text-slate-400 break-words">{humanize(k)}</dt>
          <dd className="text-sm text-gray-900 sa-dark:text-slate-100 min-w-0">
            <Value value={v} depth={depth} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

// Side panel showing every field of one record (including the ones the
// table columns leave out). Read-only.
export default function RecordDrawer({ record, title, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!record) return null;
  const entries = Object.entries(record).filter(([k]) => k !== "__v");
  // Fields the console adds (store name, computed totals) go in a summary box on top.
  const summary = entries.filter(([k]) => k.startsWith("_") && k !== "_id" && k !== "_path" && k !== "_storeId");
  const rest = entries.filter(([k]) => !k.startsWith("_") || k === "_id");

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 sa-dark:bg-black/60" onClick={onClose} />
      <aside className="relative w-full max-w-xl h-full bg-gray-50 sa-dark:bg-slate-950 border-l border-gray-200 sa-dark:border-slate-800 flex flex-col shadow-2xl">
        <header className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-200 sa-dark:border-slate-800">
          <div className="min-w-0">
            <p className="text-xs text-gray-500 sa-dark:text-slate-500">{title}</p>
            <h3 className="text-base font-semibold text-gray-900 sa-dark:text-white truncate">
              {record._number || record._customer || record._name || record.name || record.customerName || record.petName || record.title || record.companyDetails?.name || record.email || record._id}
            </h3>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-2 rounded-lg text-gray-500 sa-dark:text-slate-400 hover:text-gray-900 sa-dark:hover:text-white hover:bg-gray-100 sa-dark:hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {summary.length > 0 && (
            <div className="mb-3 rounded-xl bg-white sa-dark:bg-slate-900 border border-gray-200 sa-dark:border-slate-800 px-4 py-1">
              <Fields entries={summary} />
            </div>
          )}
          <Fields entries={rest} />
        </div>
        <footer className="px-5 py-3 border-t border-gray-200 sa-dark:border-slate-800 text-xs text-gray-500 sa-dark:text-slate-500">
          Read-only view. Changes are made from the store's own dashboard.
        </footer>
      </aside>
    </div>
  );
}
