import { useCallback, useEffect, useState } from "react";
import { Building2, ChevronRight, FileJson, Pause, Pencil, Play, Save, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import RecordDrawer from "./RecordDrawer";
import { BILL_DELIVERY_OPTIONS, TextNotEnabledNote } from "./SettingsView";
import { GROUP_ICONS, GROUP_ORDER } from "./datasetGroups";
import { Card, ErrorBox, Spinner, StatusBadge, buttonClass, fmtDate, fmtDateTime, fmtMoney, fmtNumber, inputClass, saRequest } from "./shared";
import { getSelectableProfiles } from "../../config/industryProfiles";

const industryLabel = (key) => getSelectableProfiles().find((p) => p.key === key)?.label || key || "Not set";

const dateInput = (v) => {
  if (!v) return "";
  const d = new Date(v);
  return isNaN(d) ? "" : d.toISOString().slice(0, 10);
};

function Info({ label, value }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-gray-500 sa-dark:text-slate-500">{label}</dt>
      <dd className="text-sm text-gray-900 sa-dark:text-slate-100 break-words">{value || "-"}</dd>
    </div>
  );
}

const Field = ({ label, children }) => (
  <label className="block">
    <span className="block text-xs text-gray-500 sa-dark:text-slate-400 mb-1">{label}</span>
    {children}
  </label>
);

// PATCH /superadmin/tenants/:id/subscription (plan, cycle, amount, end date).
function SubscriptionEditor({ store, onSaved, onCancel }) {
  const sub = store.owner.subscription || {};
  const [form, setForm] = useState({
    plan: String(sub.plan || "trial").toLowerCase(),
    billingCycle: sub.billingCycle || "monthly",
    amount: sub.amount ?? 0,
    endDate: dateInput(sub.endDate),
  });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saRequest(`tenants/${store.id}/subscription`, {
        method: "patch",
        body: {
          plan: form.plan,
          billingCycle: form.billingCycle,
          amount: Number(form.amount) || 0,
          endDate: form.endDate ? new Date(`${form.endDate}T23:59:59`).toISOString() : null,
        },
      });
      toast.success("Subscription updated");
      onSaved();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Plan">
          <select value={form.plan} onChange={set("plan")} className={`${inputClass} w-full`}>
            <option value="trial">Free trial</option>
            <option value="standard">Standard</option>
            <option value="premium">Premium</option>
          </select>
        </Field>
        <Field label="Billing cycle">
          <select value={form.billingCycle} onChange={set("billingCycle")} className={`${inputClass} w-full`}>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </Field>
        <Field label="Amount paid (₹)">
          <input type="number" min="0" value={form.amount} onChange={set("amount")} className={`${inputClass} w-full`} />
        </Field>
        <Field label="Plan ends on">
          <input type="date" value={form.endDate} onChange={set("endDate")} className={`${inputClass} w-full`} />
        </Field>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className={buttonClass.ghost}>Cancel</button>
        <button type="submit" disabled={saving} className={buttonClass.primary}>{saving ? "Saving..." : "Save subscription"}</button>
      </div>
    </form>
  );
}

function BillDeliveryCard({ store, onSaved }) {
  const [mode, setMode] = useState(store.billDeliveryMode);
  const [saving, setSaving] = useState(false);
  const labelFor = (m) => BILL_DELIVERY_OPTIONS.find((o) => o.value === m)?.label || m;
  const resolved = mode === "default" ? store.platformBillDeliveryMode : mode;

  const save = async () => {
    setSaving(true);
    try {
      await saRequest(`tenants/${store.id}/bill-delivery`, { method: "patch", body: { mode } });
      toast.success("Bill delivery updated");
      onSaved();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-4 space-y-3">
      <div>
        <h2 className="text-sm font-medium text-gray-800 sa-dark:text-slate-200">WhatsApp bills</h2>
        <p className="text-xs text-gray-500 sa-dark:text-slate-500 mt-0.5">How this store's POS bills are sent to customers.</p>
      </div>
      <select value={mode} onChange={(e) => setMode(e.target.value)} className={`${inputClass} w-full`}>
        <option value="default">Platform default ({labelFor(store.platformBillDeliveryMode)})</option>
        {BILL_DELIVERY_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {resolved === "text" && !store.billTextEnabled && <TextNotEnabledNote />}
      <button onClick={save} disabled={saving || mode === store.billDeliveryMode} className={`${buttonClass.primary} w-full`}>
        <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save"}
      </button>
    </Card>
  );
}

export default function StoreDetail({ storeId, datasets, onOpenDataset, onDeleted, onChanged }) {
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingSub, setEditingSub] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    saRequest(`stores/${storeId}`)
      .then(setStore)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [storeId]);

  useEffect(load, [load]);

  const reload = () => {
    load();
    onChanged?.();
  };

  const toggleSuspend = async () => {
    const next = store.status === "Suspended" ? "Active" : "Suspended";
    if (next === "Suspended" && !window.confirm(`Suspend ${store.name}? The owner and staff lose access until you reactivate the store.`)) return;
    setBusy(true);
    try {
      await saRequest(`tenants/${store.id}/status`, { method: "patch", body: { status: next } });
      toast.success(next === "Active" ? "Store reactivated" : "Store suspended");
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    const typed = window.prompt(
      `This permanently deletes the "${store.name}" account: the owner and every staff login can no longer sign in.\n\nType the store's email (${store.email}) to confirm:`
    );
    if (typed === null) return;
    if (typed.trim().toLowerCase() !== String(store.email).toLowerCase()) return toast.error("Email didn't match. Nothing was deleted.");
    setBusy(true);
    try {
      await saRequest(`tenants/${store.id}`, { method: "delete" });
      toast.success(`${store.name} deleted`);
      onDeleted();
    } catch (err) {
      toast.error(err.message);
      setBusy(false);
    }
  };

  if (loading && !store) return <Spinner label="Loading store..." />;
  if (error) return <ErrorBox message={error} onRetry={load} />;
  if (!store) return null;

  const owner = store.owner;
  const company = owner.companyDetails || {};
  const address = [owner.address?.street, owner.address?.city, owner.address?.state, owner.address?.pincode].filter(Boolean).join(", ");
  const sub = owner.subscription || {};
  const suspended = store.status === "Suspended";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-12 h-12 rounded-xl bg-emerald-50 sa-dark:bg-emerald-500/15 text-emerald-700 sa-dark:text-emerald-300 flex items-center justify-center shrink-0">
            <Building2 className="w-6 h-6" />
          </span>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-gray-900 sa-dark:text-white truncate">{store.name}</h1>
            <p className="text-sm text-gray-500 sa-dark:text-slate-400 truncate">{store.email} · {store.mobile || "no mobile"}</p>
          </div>
          <StatusBadge value={store.status} />
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setShowRaw(true)} className={buttonClass.ghost}>
            <FileJson className="w-4 h-4" /> Full record
          </button>
          <button onClick={toggleSuspend} disabled={busy} className={buttonClass.ghost}>
            {suspended ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />} {suspended ? "Reactivate" : "Suspend"}
          </button>
          <button onClick={handleDelete} disabled={busy} className={buttonClass.danger}>
            <Trash2 className="w-4 h-4" /> Delete store
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          ["Plan", sub.plan || "-", `${sub.billingCycle || "-"} · ends ${fmtDate(sub.endDate)}`],
          ["Staff logins", fmtNumber(store.staff), "team members", "staff"],
          ["Bills & invoices", fmtNumber(store.bills), `${fmtMoney(store.stats.sales)} billed in total`, "bills"],
          ["Products", fmtNumber(store.products), "in inventory", "products"],
        ].map(([label, value, sub2, ds]) => {
          const body = (
            <>
              <p className="text-xs text-gray-500 sa-dark:text-slate-400">{label}</p>
              <p className={`mt-1 text-lg font-semibold text-gray-900 sa-dark:text-white truncate ${label === "Plan" ? "capitalize" : "tabular-nums"}`}>{value}</p>
              <p className="text-xs text-gray-500 sa-dark:text-slate-500 truncate">{sub2}</p>
            </>
          );
          return ds ? (
            <button key={label} onClick={() => onOpenDataset(ds)} className="text-left rounded-2xl border border-gray-200 sa-dark:border-slate-800 bg-white sa-dark:bg-slate-900/70 p-4 hover:border-emerald-300 sa-dark:hover:border-emerald-500/50 transition">
              {body}
            </button>
          ) : (
            <Card key={label} className="p-4">{body}</Card>
          );
        })}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          ["Bills today", fmtNumber(store.stats.billsToday), "bills"],
          ["Customers", fmtNumber(store.stats.customers), "customers"],
          ["Open dues", `${fmtNumber(store.stats.openDues)} · ${fmtMoney(store.stats.dues)}`, "credit"],
          ["Last bill", fmtDateTime(store.stats.lastBillAt), "bills"],
        ].map(([label, value, ds]) => (
          <button
            key={label}
            onClick={() => onOpenDataset(ds)}
            className="text-left rounded-2xl border border-gray-200 sa-dark:border-slate-800 bg-white sa-dark:bg-slate-900/70 p-4 hover:border-emerald-300 sa-dark:hover:border-emerald-500/50 transition"
          >
            <p className="text-xs text-gray-500 sa-dark:text-slate-400">{label}</p>
            <p className="mt-1 text-lg font-semibold text-gray-900 sa-dark:text-white tabular-nums truncate">{value}</p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="p-4">
          <h2 className="text-sm font-medium text-gray-800 sa-dark:text-slate-200 mb-3">Store profile</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-3">
            <Info label="Owner" value={`${owner.firstName || ""} ${owner.lastName || ""}`.trim()} />
            <Info label="Industry" value={industryLabel(company.industry)} />
            <Info label="Business type" value={company.type} />
            <Info label="GSTIN" value={company.gstin || owner.gstin} />
            <Info label="PAN" value={company.pan} />
            <Info label="Address" value={address} />
            <Info label="Invoice prefix" value={owner.invoice_prefix || owner.invoiceSettings?.prefix} />
            <Info label="Last owner login" value={fmtDateTime(store.lastLogin)} />
            <Info label="Registered" value={fmtDateTime(store.createdAt)} />
          </dl>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-gray-800 sa-dark:text-slate-200">Subscription</h2>
            {!editingSub && (
              <button onClick={() => setEditingSub(true)} className={`${buttonClass.ghost} py-1.5`}>
                <Pencil className="w-3.5 h-3.5" /> Edit
              </button>
            )}
          </div>
          {editingSub ? (
            <SubscriptionEditor
              store={store}
              onCancel={() => setEditingSub(false)}
              onSaved={() => {
                setEditingSub(false);
                reload();
              }}
            />
          ) : (
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Info label="Plan" value={<StatusBadge value={sub.plan} />} />
              <Info label="Status" value={<StatusBadge value={sub.status} />} />
              <Info label="Billing cycle" value={sub.billingCycle} />
              <Info label="Amount paid" value={sub.amount ? fmtMoney(sub.amount) : "-"} />
              <Info label="Started" value={fmtDate(sub.startDate)} />
              <Info label="Ends" value={fmtDate(sub.endDate)} />
              <Info label="Extra staff logins" value={owner.additionalSubUsers ? String(owner.additionalSubUsers) : "-"} />
              <Info label="Last payment ID" value={sub.paymentId} />
            </dl>
          )}
        </Card>

        <BillDeliveryCard key={store.billDeliveryMode} store={store} onSaved={reload} />
      </div>

      <div>
        <h2 className="text-sm font-medium text-gray-800 sa-dark:text-slate-200 mb-3">All data for this store</h2>
        <div className="space-y-4">
          {GROUP_ORDER.map((group) => {
            const items = datasets.filter((d) => d.group === group);
            if (items.length === 0) return null;
            const Icon = GROUP_ICONS[group];
            return (
              <div key={group}>
                <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-gray-500 sa-dark:text-slate-500 mb-2">
                  <Icon className="w-3.5 h-3.5" /> {group}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-2">
                  {items.map((d) => (
                    <button
                      key={d.key}
                      onClick={() => onOpenDataset(d.key)}
                      className="flex items-center justify-between gap-2 rounded-xl border border-gray-200 sa-dark:border-slate-800 bg-white sa-dark:bg-slate-900/70 px-3.5 py-2.5 text-left hover:border-emerald-300 sa-dark:hover:border-emerald-500/50 hover:bg-gray-50 sa-dark:hover:bg-slate-800/50 transition"
                    >
                      <span className="text-sm text-gray-800 sa-dark:text-slate-200 truncate">{d.label}</span>
                      <span className="flex items-center gap-1 text-sm tabular-nums text-gray-500 sa-dark:text-slate-400">
                        {fmtNumber(d.count)}
                        <ChevronRight className="w-4 h-4" />
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showRaw && <RecordDrawer record={owner} title="Store account record" onClose={() => setShowRaw(false)} />}
    </div>
  );
}
