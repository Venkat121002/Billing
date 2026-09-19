import React, { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import toast from "react-hot-toast";
import { superAdminApi } from "../../contexts/SuperAdminAuthContext";

const SuperAdminSubUsers = () => {
  const [subUsers, setSubUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await superAdminApi.get("subusers");
        setSubUsers(res.data);
      } catch (err) {
        toast.error(err.response?.data?.msg || "Failed to load sub-users");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return subUsers;
    return subUsers.filter((s) =>
      [s.firstName, s.lastName, s.email, s.ownerBusinessName].filter(Boolean).some((v) => v.toLowerCase().includes(q))
    );
  }, [subUsers, query]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-white">Sub-Users</h1>
          <p className="text-sm text-gray-500">{subUsers.length} employees across every tenant</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, email, business"
            className="h-9 pl-9 pr-3 w-72 rounded-lg bg-gray-900 border border-gray-800 text-sm text-gray-200 focus:ring-2 focus:ring-emerald-600 outline-none"
          />
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 border-b border-gray-800">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Tenant</th>
              <th className="px-4 py-3 font-medium">Branch</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-500">Loading…</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-500">No sub-users found.</td></tr>
            )}
            {filtered.map((s) => (
              <tr key={s.userId} className="border-b border-gray-800/60 last:border-0 hover:bg-gray-800/30">
                <td className="px-4 py-3 text-gray-200">{s.firstName} {s.lastName}</td>
                <td className="px-4 py-3 text-gray-400">{s.email}</td>
                <td className="px-4 py-3 text-gray-400">{s.ownerBusinessName || s.ownerEmail || "—"}</td>
                <td className="px-4 py-3 text-gray-400">{s.branch || "—"}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${s.status === "Active" ? "bg-emerald-600/15 text-emerald-400" : "bg-gray-700/40 text-gray-400"}`}>
                    {s.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SuperAdminSubUsers;
