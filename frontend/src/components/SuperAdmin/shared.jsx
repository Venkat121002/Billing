import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { Loader2, Receipt } from "lucide-react";
import { superAdminApi } from "../../contexts/SuperAdminAuthContext";

export const STORE_KEY = "superadmin_store";

// GET/POST/PATCH/PUT/DELETE against /superadmin/*, returning the JSON body.
// An expired token is handled by superAdminApi's interceptor (back to login).
export async function saRequest(path, { method = "get", body, params } = {}) {
  try {
    const res = await superAdminApi.request({ url: path, method, data: body, params });
    return res.data;
  } catch (err) {
    if (!err.response) throw new Error("Can't reach the server. Check that the backend is running.");
    throw new Error(err.response.data?.msg || `Request failed (${err.response.status})`);
  }
}

// ---------------------------------------------------------------- formatting
const toDate = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};

export const fmtDate = (v) => {
  const d = toDate(v);
  return d ? d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-";
};

export const fmtDateTime = (v) => {
  const d = toDate(v);
  return d
    ? d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "-";
};

export const fmtMoney = (v) => {
  const n = Number(v);
  if (v === null || v === undefined || v === "" || isNaN(n)) return "-";
  return n.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });
};

export const fmtNumber = (v) => (v === null || v === undefined ? "-" : Number(v).toLocaleString("en-IN"));

export const getPath = (obj, path) =>
  path.split(".").reduce((acc, key) => (acc === null || acc === undefined ? undefined : acc[key]), obj);

export const humanize = (key) =>
  String(key)
    .replace(/^_+/, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/^./, (c) => c.toUpperCase());

// --------------------------------------------------------------- status pill
const STATUS_TONE = {
  emerald: ["active", "paid", "resolved", "completed", "delivered", "success", "captured", "premium", "cash_in", "income", "sales"],
  amber: ["pending", "created", "in progress", "received", "trial", "partial", "industry_change", "industry change", "not started"],
  rose: ["suspended", "inactive", "failed", "expired", "cancelled", "dismissed", "cash_out", "expense", "purchase", "none"],
  sky: ["standard", "monthly", "yearly", "general", "cash", "card", "upi", "wallet", "online"],
};

export function StatusBadge({ value }) {
  if (value === null || value === undefined || value === "") return <span className="text-gray-500 sa-dark:text-slate-500">-</span>;
  const text = String(value);
  const lower = text.toLowerCase();
  const tone = Object.keys(STATUS_TONE).find((t) => STATUS_TONE[t].includes(lower)) || "slate";
  const cls = {
    emerald: "bg-emerald-50 sa-dark:bg-emerald-500/10 text-emerald-700 sa-dark:text-emerald-300 ring-emerald-200 sa-dark:ring-emerald-500/30",
    amber: "bg-amber-50 sa-dark:bg-amber-500/10 text-amber-700 sa-dark:text-amber-300 ring-amber-200 sa-dark:ring-amber-500/30",
    rose: "bg-rose-50 sa-dark:bg-rose-500/10 text-rose-700 sa-dark:text-rose-300 ring-rose-200 sa-dark:ring-rose-500/30",
    sky: "bg-sky-50 sa-dark:bg-sky-500/10 text-sky-700 sa-dark:text-sky-300 ring-sky-200 sa-dark:ring-sky-500/30",
    slate: "bg-gray-100 sa-dark:bg-slate-500/10 text-gray-700 sa-dark:text-slate-300 ring-gray-200 sa-dark:ring-slate-500/30",
  }[tone];
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ring-1 capitalize whitespace-nowrap ${cls}`}>{text.replace(/_/g, " ")}</span>;
}

// Value for a registry column, as plain text (used for export) ...
export function columnText(row, col) {
  const v = getPath(row, col.field);
  switch (col.type) {
    case "date":
      return fmtDate(v);
    case "datetime":
      return fmtDateTime(v);
    case "bool":
      return v === undefined || v === null ? "-" : v ? "Yes" : "No";
    case "count":
      return Array.isArray(v) ? v.length : v ?? "-";
    case "money":
      return v === undefined || v === null || v === "" ? "-" : Number(v);
    default:
      if (v === undefined || v === null || v === "") return "-";
      return typeof v === "object" ? JSON.stringify(v) : String(v);
  }
}

// ... and as a table cell.
export function Cell({ row, col }) {
  if (col.type === "status") return <StatusBadge value={getPath(row, col.field)} />;
  if (col.type === "money") return <span className="tabular-nums">{fmtMoney(getPath(row, col.field))}</span>;
  if (col.type === "bool") {
    const v = getPath(row, col.field);
    if (v === undefined || v === null) return <span className="text-gray-500 sa-dark:text-slate-500">-</span>;
    return v ? <span className="text-emerald-700 sa-dark:text-emerald-300">Yes</span> : <span className="text-gray-500 sa-dark:text-slate-400">No</span>;
  }
  const text = columnText(row, col);
  return (
    <span
      className={`block max-w-[260px] truncate ${col.type === "store" ? "font-medium text-gray-900 sa-dark:text-slate-100" : ""}`}
      title={typeof text === "string" ? text : undefined}
    >
      {text}
    </span>
  );
}

// ------------------------------------------------------------------- export
export function downloadExcel(rows, sheetName, filename) {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));
  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  saveAs(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `${filename}.xlsx`);
}

// ----------------------------------------------------------------- layout UI
// SwordNex Billing mark (the image logos have dark lettering that disappears on the dark theme).
export const BrandMark = ({ className = "w-8 h-8" }) => (
  <span className={`shrink-0 rounded-lg bg-emerald-600 text-white flex items-center justify-center ${className}`}>
    <Receipt className="w-1/2 h-1/2" />
  </span>
);

export const Card = ({ className = "", children }) => (
  <div className={`bg-white sa-dark:bg-slate-900/70 border border-gray-200 sa-dark:border-slate-800 rounded-2xl ${className}`}>{children}</div>
);

export const Spinner = ({ label = "Loading..." }) => (
  <div className="flex items-center justify-center gap-2 py-16 text-gray-500 sa-dark:text-slate-400 text-sm">
    <Loader2 className="w-4 h-4 animate-spin" /> {label}
  </div>
);

export const ErrorBox = ({ message, onRetry }) => (
  <div className="flex flex-col items-center gap-3 py-12 text-center">
    <p className="text-sm text-rose-700 sa-dark:text-rose-300 bg-rose-50 sa-dark:bg-rose-500/10 border border-rose-200 sa-dark:border-rose-500/30 rounded-lg px-4 py-2">{message}</p>
    {onRetry && (
      <button onClick={onRetry} className="text-sm text-emerald-700 sa-dark:text-emerald-300 hover:text-emerald-800 sa-dark:hover:text-emerald-200">
        Try again
      </button>
    )}
  </div>
);

export const PageHeader = ({ title, subtitle, children }) => (
  <div className="flex flex-wrap items-end justify-between gap-3">
    <div className="min-w-0">
      <h1 className="text-xl font-semibold text-gray-900 sa-dark:text-white">{title}</h1>
      {subtitle && <p className="text-sm text-gray-500 sa-dark:text-slate-400">{subtitle}</p>}
    </div>
    {children && <div className="flex flex-wrap gap-2">{children}</div>}
  </div>
);

export const inputClass =
  "bg-white sa-dark:bg-slate-900 border border-gray-300 sa-dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-gray-900 sa-dark:text-slate-100 placeholder-gray-400 sa-dark:placeholder-slate-500 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 transition disabled:opacity-50 [color-scheme:light] sa-dark:[color-scheme:dark]";

export const buttonClass = {
  primary: "inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed",
  ghost: "inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg border border-gray-300 sa-dark:border-slate-700 hover:bg-gray-100 sa-dark:hover:bg-slate-800 text-gray-800 sa-dark:text-slate-200 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed",
  danger: "inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed",
};
