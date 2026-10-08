import { useCallback, useEffect, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, Building2, IndianRupee, LifeBuoy, Receipt, RefreshCw, Users } from "lucide-react";
import { useSuperAdminTheme } from "./theme";
import { Card, ErrorBox, PageHeader, Spinner, StatusBadge, buttonClass, fmtDate, fmtMoney, fmtNumber, saRequest } from "./shared";

const monthLabel = (key) => {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: "short" });
};

function Kpi({ icon: Icon, label, value, sub, tone = "emerald" }) {
  const toneCls = {
    emerald: "bg-emerald-50 sa-dark:bg-emerald-500/15 text-emerald-700 sa-dark:text-emerald-300",
    teal: "bg-teal-50 sa-dark:bg-teal-500/15 text-teal-700 sa-dark:text-teal-300",
    amber: "bg-amber-50 sa-dark:bg-amber-500/15 text-amber-700 sa-dark:text-amber-300",
    sky: "bg-sky-50 sa-dark:bg-sky-500/15 text-sky-700 sa-dark:text-sky-300",
  }[tone];
  return (
    <Card className="p-4 h-full">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 sa-dark:text-slate-400">{label}</p>
        <span className={`p-2 rounded-lg ${toneCls}`}>
          <Icon className="w-4 h-4" />
        </span>
      </div>
      <p className="mt-2 text-2xl font-semibold text-gray-900 sa-dark:text-white tabular-nums">{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-500 sa-dark:text-slate-500">{sub}</p>}
    </Card>
  );
}

// Chart colours per theme (recharts takes raw colours, not Tailwind classes).
const CHART = {
  dark: { grid: "#1e293b", tick: "#94a3b8", line: "#34d399", bar: "#38bdf8", tooltip: { background: "#0f172a", border: "1px solid #334155", color: "#e2e8f0" } },
  light: { grid: "#e5e7eb", tick: "#6b7280", line: "#059669", bar: "#0ea5e9", tooltip: { background: "#ffffff", border: "1px solid #e5e7eb", color: "#1f2937" } },
};

const ListRow = ({ onClick, title, sub, right }) => (
  <li>
    <button onClick={onClick} className="w-full flex items-center justify-between gap-3 py-2 text-left hover:bg-gray-50 sa-dark:hover:bg-slate-800/40 rounded px-1">
      <span className="min-w-0">
        <span className="block text-sm text-gray-900 sa-dark:text-slate-100 truncate">{title}</span>
        <span className="block text-xs text-gray-500 sa-dark:text-slate-500 truncate">{sub}</span>
      </span>
      <span className="flex items-center gap-2 shrink-0">{right}</span>
    </button>
  </li>
);

export default function Overview({ onOpenStore, onOpenDataset, onOpenSupport }) {
  const { theme } = useSuperAdminTheme();
  const chart = CHART[theme];
  const tooltipStyle = { ...chart.tooltip, borderRadius: 8, fontSize: 12 };
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    saRequest("overview")
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  if (loading && !data) return <Spinner label="Loading overview..." />;
  if (error) return <ErrorBox message={error} onRetry={load} />;
  if (!data) return null;

  const trend = data.trend.map((t) => ({ ...t, label: monthLabel(t.month) }));
  const plans = Object.entries(data.stores.byPlan).sort((a, b) => b[1] - a[1]);
  const empty = (text) => <p className="text-sm text-gray-500 sa-dark:text-slate-500">{text}</p>;

  return (
    <div className="space-y-6">
      <PageHeader title="Platform overview" subtitle="Everything happening across SwordNex Billing">
        <button onClick={load} className={buttonClass.ghost} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Kpi icon={Building2} label="Stores" value={fmtNumber(data.stores.total)} sub={`${data.stores.active} active · ${data.stores.newThisMonth} new this month`} />
        <Kpi icon={Users} label="Staff logins" value={fmtNumber(data.staff)} sub="Team members across all stores" tone="sky" />
        <Kpi icon={IndianRupee} label="Subscription revenue" value={fmtMoney(data.revenue.total)} sub={`${fmtMoney(data.revenue.thisMonth)} this month · ${data.revenue.payments} payments`} tone="teal" />
        <button onClick={() => onOpenDataset("bills")} className="text-left">
          <Kpi icon={Receipt} label="Bills today" value={fmtNumber(data.today.bills)} sub={`${fmtMoney(data.today.sales)} billed across all stores`} tone="amber" />
        </button>
      </div>

      {data.pendingSupport > 0 && (
        <button
          onClick={onOpenSupport}
          className="w-full flex items-center gap-3 rounded-2xl border border-amber-200 sa-dark:border-amber-500/30 bg-amber-50 sa-dark:bg-amber-500/10 px-4 py-3 text-left hover:bg-amber-100 sa-dark:hover:bg-amber-500/15 transition"
        >
          <LifeBuoy className="w-5 h-5 text-amber-600 sa-dark:text-amber-300 shrink-0" />
          <span className="text-sm text-amber-800 sa-dark:text-amber-200">
            {data.pendingSupport} pending support request{data.pendingSupport === 1 ? "" : "s"} waiting for a reply
          </span>
        </button>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="p-4 xl:col-span-2">
          <h2 className="text-sm font-medium text-gray-800 sa-dark:text-slate-200 mb-3">Subscription revenue - last 12 months</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="saRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chart.line} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={chart.line} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={chart.grid} vertical={false} />
                <XAxis dataKey="label" tick={{ fill: chart.tick, fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: chart.tick, fontSize: 12 }} axisLine={false} tickLine={false} width={60} tickFormatter={(v) => `₹${fmtNumber(v)}`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => [fmtMoney(v), "Revenue"]} />
                <Area type="monotone" dataKey="revenue" stroke={chart.line} strokeWidth={2} fill="url(#saRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-4">
          <h2 className="text-sm font-medium text-gray-800 sa-dark:text-slate-200 mb-3">New stores per month</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend} margin={{ top: 5, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid stroke={chart.grid} vertical={false} />
                <XAxis dataKey="label" tick={{ fill: chart.tick, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: chart.tick, fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: chart.grid }} formatter={(v) => [v, "Sign-ups"]} />
                <Bar dataKey="signups" fill={chart.bar} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="p-4">
          <h2 className="text-sm font-medium text-gray-800 sa-dark:text-slate-200 mb-3">Stores by plan</h2>
          {plans.length === 0 ? empty("No stores yet.") : (
            <ul className="space-y-3">
              {plans.map(([plan, count]) => (
                <li key={plan}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="capitalize text-gray-700 sa-dark:text-slate-300">{plan}</span>
                    <span className="text-gray-500 sa-dark:text-slate-400 tabular-nums">{count}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-100 sa-dark:bg-slate-800">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(count / data.stores.total) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-4 xl:col-span-2">
          <h2 className="text-sm font-medium text-gray-800 sa-dark:text-slate-200 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 sa-dark:text-amber-400" /> Plans expired or expiring in 14 days
          </h2>
          {data.expiringSoon.length === 0 ? empty("No plans expiring soon.") : (
            <ul className="divide-y divide-gray-200 sa-dark:divide-slate-800">
              {data.expiringSoon.map((s) => (
                <ListRow
                  key={s.id}
                  onClick={() => onOpenStore(s.id)}
                  title={s.name}
                  sub={s.email}
                  right={
                    <>
                      <StatusBadge value={s.plan} />
                      <span className={`text-xs ${s.expired ? "text-rose-700 sa-dark:text-rose-300" : "text-amber-700 sa-dark:text-amber-300"}`}>
                        {s.expired ? "Expired" : "Expires"} {fmtDate(s.expiresAt)}
                      </span>
                    </>
                  }
                />
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card className="p-4">
          <h2 className="text-sm font-medium text-gray-800 sa-dark:text-slate-200 mb-3">Latest sign-ups</h2>
          {data.recentStores.length === 0 ? empty("No stores yet.") : (
            <ul className="divide-y divide-gray-200 sa-dark:divide-slate-800">
              {data.recentStores.map((s) => (
                <ListRow
                  key={s.id}
                  onClick={() => onOpenStore(s.id)}
                  title={s.name}
                  sub={`${s.industry ? `${s.industry.replace(/_/g, " ")} · ` : ""}joined ${fmtDate(s.createdAt)}`}
                  right={<StatusBadge value={s.plan} />}
                />
              ))}
            </ul>
          )}
        </Card>
        <Card className="p-4">
          <h2 className="text-sm font-medium text-gray-800 sa-dark:text-slate-200 mb-3">Latest subscription payments</h2>
          {data.recentPayments.length === 0 ? empty("No payments received yet.") : (
            <ul className="divide-y divide-gray-200 sa-dark:divide-slate-800">
              {data.recentPayments.map((p) => (
                <ListRow
                  key={p.id}
                  onClick={() => onOpenStore(p.storeId)}
                  title={p.storeName}
                  sub={`${p.plan === "additional_users" ? "Extra staff logins" : `${p.plan || "-"} · ${p.billingCycle || "-"}`} · ${fmtDate(p.paidAt)}`}
                  right={<span className="text-sm text-emerald-700 sa-dark:text-emerald-300 tabular-nums">{fmtMoney(p.amount)}</span>}
                />
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
