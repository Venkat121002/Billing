import React, { useEffect, useState } from "react";
import { Building2, Users, CreditCard, IndianRupee } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import { superAdminApi } from "../../contexts/SuperAdminAuthContext";

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

const StatCard = ({ icon: Icon, label, value, accent }) => (
  <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center gap-4">
    <div className={`h-11 w-11 rounded-lg flex items-center justify-center ${accent}`}>
      <Icon size={20} />
    </div>
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-xl font-semibold text-white">{value}</p>
    </div>
  </div>
);

const SuperAdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await superAdminApi.get("stats");
        setStats(res.data);
      } catch (err) {
        toast.error(err.response?.data?.msg || "Failed to load stats");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <div className="text-gray-500 text-sm">Loading…</div>;
  }

  if (!stats) {
    return <div className="text-gray-500 text-sm">No data available.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-white">Platform Overview</h1>
        <p className="text-sm text-gray-500">Live snapshot across every tenant</p>
      </div>

      {stats.pendingSupportRequests > 0 && (
        <Link
          to="/superadmin/support"
          className="flex items-center justify-between bg-amber-600/10 border border-amber-600/30 rounded-xl px-5 py-3 text-sm text-amber-300 hover:bg-amber-600/15 transition"
        >
          <span>
            {stats.pendingSupportRequests} pending support {stats.pendingSupportRequests === 1 ? "request" : "requests"} waiting for review
          </span>
          <span className="text-xs font-medium">Review →</span>
        </Link>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Building2} label="Total Tenants" value={stats.totalTenants} accent="bg-emerald-600/15 text-emerald-400" />
        <StatCard icon={Users} label="Total Sub-Users" value={stats.totalSubUsers} accent="bg-blue-600/15 text-blue-400" />
        <StatCard icon={CreditCard} label="Active Subscriptions" value={stats.activeSubscriptions} accent="bg-amber-600/15 text-amber-400" />
        <StatCard icon={IndianRupee} label="Total Subscription Revenue" value={`₹${Number(stats.totalRevenue).toLocaleString("en-IN")}`} accent="bg-purple-600/15 text-purple-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-medium text-gray-300 mb-4">Plan Breakdown</h2>
          {stats.planBreakdown.length === 0 ? (
            <p className="text-sm text-gray-500">No tenants yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={stats.planBreakdown} dataKey="count" nameKey="plan" innerRadius={50} outerRadius={80} paddingAngle={2}>
                  {stats.planBreakdown.map((entry, i) => (
                    <Cell key={entry.plan} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 8, color: "#fff" }} />
                <Legend wrapperStyle={{ fontSize: 12, color: "#9ca3af" }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-gray-300">Recently Signed Up</h2>
            <Link to="/superadmin/tenants" className="text-xs text-emerald-500 hover:underline">View all</Link>
          </div>
          <div className="space-y-3">
            {stats.recentTenants.length === 0 && <p className="text-sm text-gray-500">No tenants yet.</p>}
            {stats.recentTenants.map((t) => (
              <div key={t.userId} className="flex items-center justify-between text-sm">
                <div>
                  <p className="text-gray-200">{t.companyDetails?.name || t.email}</p>
                  <p className="text-xs text-gray-500">{t.email}</p>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-gray-800 text-gray-300">
                  {t.subscription?.plan || "Free"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
