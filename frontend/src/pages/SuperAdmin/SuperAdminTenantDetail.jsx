import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import toast from "react-hot-toast";
import { superAdminApi } from "../../contexts/SuperAdminAuthContext";

const DATA_LABELS = {
  bills: "Bills",
  products: "Products",
  customers: "Customers",
  clients: "Clients",
  gstBills: "GST Bills",
  credits: "Credit Entries",
  suppliers: "Suppliers",
  trainers: "Trainers",
  repairTickets: "Repair Tickets",
  pets: "Pets",
  milestones: "Milestones",
  salesmen: "Salesmen",
  inventoryReturns: "Inventory Returns",
  transactions: "Transactions",
};

const SuperAdminTenantDetail = () => {
  const { id } = useParams();
  const [owner, setOwner] = useState(null);
  const [subUsers, setSubUsers] = useState([]);
  const [tenantData, setTenantData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ plan: "", amount: "", endDate: "", billingCycle: "" });

  const load = async () => {
    setLoading(true);
    try {
      const [detailRes, dataRes] = await Promise.all([
        superAdminApi.get(`tenants/${id}`),
        superAdminApi.get(`tenants/${id}/data`),
      ]);
      setOwner(detailRes.data.owner);
      setSubUsers(detailRes.data.subUsers);
      setTenantData(dataRes.data);
      setForm({
        plan: detailRes.data.owner.subscription?.plan || "",
        amount: detailRes.data.owner.subscription?.amount ?? "",
        endDate: detailRes.data.owner.subscription?.endDate || "",
        billingCycle: detailRes.data.owner.subscription?.billingCycle || "",
      });
    } catch (err) {
      toast.error(err.response?.data?.msg || "Failed to load tenant");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleSaveSubscription = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await superAdminApi.patch(`tenants/${id}/subscription`, {
        plan: form.plan,
        amount: form.amount === "" ? undefined : Number(form.amount),
        endDate: form.endDate,
        billingCycle: form.billingCycle,
      });
      toast.success("Subscription updated");
      load();
    } catch (err) {
      toast.error(err.response?.data?.msg || "Failed to update subscription");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-gray-500 text-sm">Loading…</div>;
  }

  if (!owner) {
    return <div className="text-gray-500 text-sm">Tenant not found.</div>;
  }

  return (
    <div className="space-y-6">
      <Link to="/superadmin/tenants" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white">
        <ArrowLeft size={14} /> Back to tenants
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold text-white">{owner.companyDetails?.name || owner.email}</h1>
          <p className="text-sm text-gray-500">{owner.email} · {owner.mobile || "no mobile"}</p>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full ${owner.subscription?.status === "Active" ? "bg-emerald-600/15 text-emerald-400" : "bg-red-600/15 text-red-400"}`}>
          {owner.subscription?.status || "Inactive"}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 className="text-sm font-medium text-gray-300 mb-4">Business Data</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Object.entries(DATA_LABELS).map(([key, label]) => (
                <div key={key} className="bg-gray-800/60 rounded-lg px-3 py-2.5">
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="text-lg font-semibold text-white">{tenantData?.[key]?.count ?? 0}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 className="text-sm font-medium text-gray-300 mb-4">Sub-Users ({subUsers.length})</h2>
            {subUsers.length === 0 ? (
              <p className="text-sm text-gray-500">No sub-users under this tenant.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b border-gray-800">
                    <th className="py-2 font-medium">Name</th>
                    <th className="py-2 font-medium">Email</th>
                    <th className="py-2 font-medium">Branch</th>
                    <th className="py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {subUsers.map((s) => (
                    <tr key={s.userId} className="border-b border-gray-800/60 last:border-0">
                      <td className="py-2 text-gray-200">{s.firstName} {s.lastName}</td>
                      <td className="py-2 text-gray-400">{s.email}</td>
                      <td className="py-2 text-gray-400">{s.branch || "—"}</td>
                      <td className="py-2 text-gray-400">{s.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 h-fit">
          <h2 className="text-sm font-medium text-gray-300 mb-4">Edit Subscription</h2>
          <form onSubmit={handleSaveSubscription} className="space-y-3">
            <div>
              <label className="block text-xs mb-1 text-gray-500">Plan</label>
              <input
                value={form.plan}
                onChange={(e) => setForm((p) => ({ ...p, plan: e.target.value }))}
                className="w-full h-9 px-3 rounded-lg bg-gray-800 border border-gray-700 text-sm text-gray-200 focus:ring-2 focus:ring-emerald-600 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-500">Amount (₹)</label>
              <input
                type="number"
                value={form.amount}
                onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                className="w-full h-9 px-3 rounded-lg bg-gray-800 border border-gray-700 text-sm text-gray-200 focus:ring-2 focus:ring-emerald-600 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-500">Billing Cycle</label>
              <input
                value={form.billingCycle}
                onChange={(e) => setForm((p) => ({ ...p, billingCycle: e.target.value }))}
                className="w-full h-9 px-3 rounded-lg bg-gray-800 border border-gray-700 text-sm text-gray-200 focus:ring-2 focus:ring-emerald-600 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-500">End Date</label>
              <input
                type="date"
                value={form.endDate ? form.endDate.slice(0, 10) : ""}
                onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
                className="w-full h-9 px-3 rounded-lg bg-gray-800 border border-gray-700 text-sm text-gray-200 focus:ring-2 focus:ring-emerald-600 outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full h-9 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition disabled:opacity-60"
            >
              <Save size={14} /> {saving ? "Saving…" : "Save Changes"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminTenantDetail;
