import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Eye, Ban, PlayCircle, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { superAdminApi } from "../../contexts/SuperAdminAuthContext";

const SuperAdminTenants = () => {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await superAdminApi.get("tenants");
      setTenants(res.data);
    } catch (err) {
      toast.error(err.response?.data?.msg || "Failed to load tenants");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tenants;
    return tenants.filter((t) =>
      [t.companyDetails?.name, t.email, t.mobile].filter(Boolean).some((v) => v.toLowerCase().includes(q))
    );
  }, [tenants, query]);

  const toggleStatus = async (tenant) => {
    const nextStatus = tenant.subscription?.status === "Active" ? "Suspended" : "Active";
    try {
      await superAdminApi.patch(`tenants/${tenant.userId}/status`, { status: nextStatus });
      toast.success(`Tenant ${nextStatus.toLowerCase()}`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.msg || "Failed to update status");
    }
  };

  const remove = async (tenant) => {
    if (!window.confirm(`Delete ${tenant.companyDetails?.name || tenant.email}? This removes their account and sub-users, but keeps existing bills/records. This cannot be undone.`)) {
      return;
    }
    try {
      await superAdminApi.delete(`tenants/${tenant.userId}`);
      toast.success("Tenant deleted");
      load();
    } catch (err) {
      toast.error(err.response?.data?.msg || "Failed to delete tenant");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-white">Tenants</h1>
          <p className="text-sm text-gray-500">{tenants.length} registered {tenants.length === 1 ? "company" : "companies"}</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, email, mobile"
            className="h-9 pl-9 pr-3 w-72 rounded-lg bg-gray-900 border border-gray-800 text-sm text-gray-200 focus:ring-2 focus:ring-emerald-600 outline-none"
          />
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 border-b border-gray-800">
              <th className="px-4 py-3 font-medium">Business</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Sub-Users</th>
              <th className="px-4 py-3 font-medium">Joined</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-500">Loading…</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-500">No tenants found.</td></tr>
            )}
            {filtered.map((t) => (
              <tr key={t.userId} className="border-b border-gray-800/60 last:border-0 hover:bg-gray-800/30">
                <td className="px-4 py-3 text-gray-200">{t.companyDetails?.name || "—"}</td>
                <td className="px-4 py-3 text-gray-400">{t.email}</td>
                <td className="px-4 py-3">
                  <span className="text-xs px-2 py-1 rounded-full bg-gray-800 text-gray-300">
                    {t.subscription?.plan || "Free"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${t.subscription?.status === "Active" ? "bg-emerald-600/15 text-emerald-400" : "bg-red-600/15 text-red-400"}`}>
                    {t.subscription?.status || "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400">{t.subUserCount}</td>
                <td className="px-4 py-3 text-gray-500">{t.createdAt ? new Date(t.createdAt).toLocaleDateString() : "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1.5">
                    <Link
                      to={`/superadmin/tenants/${t.userId}`}
                      className="p-1.5 rounded-md text-gray-400 hover:text-emerald-400 hover:bg-gray-800"
                      title="View details"
                    >
                      <Eye size={15} />
                    </Link>
                    <button
                      onClick={() => toggleStatus(t)}
                      className="p-1.5 rounded-md text-gray-400 hover:text-amber-400 hover:bg-gray-800"
                      title={t.subscription?.status === "Active" ? "Suspend" : "Activate"}
                    >
                      {t.subscription?.status === "Active" ? <Ban size={15} /> : <PlayCircle size={15} />}
                    </button>
                    <button
                      onClick={() => remove(t)}
                      className="p-1.5 rounded-md text-gray-400 hover:text-red-400 hover:bg-gray-800"
                      title="Delete tenant"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SuperAdminTenants;
