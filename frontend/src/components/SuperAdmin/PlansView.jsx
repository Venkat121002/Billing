import { useEffect, useState } from "react";
import { Circle, Crown, Info, Save, Shield, Zap } from "lucide-react";
import toast from "react-hot-toast";
import { CAPABILITIES, capabilitiesToMap } from "../../config/planCapabilities";
import { Card, ErrorBox, PageHeader, Spinner, buttonClass, inputClass, saRequest } from "./shared";

const STYLE_BY_KEY = {
  trial: { icon: Zap, accent: "bg-sky-50 sa-dark:bg-sky-500/15 text-sky-700 sa-dark:text-sky-300" },
  standard: { icon: Shield, accent: "bg-emerald-50 sa-dark:bg-emerald-500/15 text-emerald-700 sa-dark:text-emerald-300" },
  premium: { icon: Crown, accent: "bg-amber-50 sa-dark:bg-amber-500/15 text-amber-700 sa-dark:text-amber-300" },
};

// One row per catalog capability (see config/planCapabilities.js): toggles use
// a select, numeric limits a number input with an "Unlimited" checkbox.
const CapabilityRow = ({ def, value, onChange }) => {
  const unlimited = def.type === "limit" && (value?.limit === null || value?.limit === undefined);

  return (
    <div className="flex items-start justify-between gap-3 py-2 min-w-0">
      <div className="min-w-0">
        <p className="text-sm text-gray-800 sa-dark:text-slate-200">{def.label}</p>
        <p className="text-[11px] text-gray-500 sa-dark:text-slate-500 mt-0.5">{def.help}</p>
      </div>
      {def.type === "toggle" ? (
        <select
          value={value?.enabled ? "enabled" : "disabled"}
          onChange={(e) => onChange({ key: def.key, enabled: e.target.value === "enabled" })}
          className={`${inputClass} shrink-0 py-1.5`}
        >
          <option value="enabled">Enabled</option>
          <option value="disabled">Disabled</option>
        </select>
      ) : (
        <div className="shrink-0 flex items-center gap-2">
          <input
            type="number"
            min="0"
            disabled={unlimited}
            value={unlimited ? "" : value?.limit ?? ""}
            onChange={(e) => onChange({ key: def.key, limit: e.target.value === "" ? null : Number(e.target.value) })}
            placeholder="0"
            className={`${inputClass} w-20 py-1.5`}
          />
          <label className="flex items-center gap-1.5 text-xs text-gray-500 sa-dark:text-slate-400 whitespace-nowrap">
            <input type="checkbox" checked={unlimited} onChange={(e) => onChange({ key: def.key, limit: e.target.checked ? null : 0 })} className="h-3.5 w-3.5 accent-emerald-600" />
            Unlimited
          </label>
        </div>
      )}
    </div>
  );
};

const PlanCard = ({ plan, onSaved }) => {
  const [form, setForm] = useState(plan);
  const [saving, setSaving] = useState(false);
  const isFree = plan.key === "trial";
  const style = STYLE_BY_KEY[plan.key] || STYLE_BY_KEY.standard;
  const Icon = style.icon;
  const dirty = JSON.stringify(form) !== JSON.stringify(plan);
  const capMap = capabilitiesToMap(form.capabilities);

  useEffect(() => setForm(plan), [plan]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const setCapability = (row) =>
    setForm((f) => ({ ...f, capabilities: [...(f.capabilities || []).filter((c) => c.key !== row.key), row] }));

  const save = async () => {
    setSaving(true);
    try {
      const payload = { name: form.name, tagline: form.tagline, badge: form.badge, capabilities: form.capabilities };
      if (!isFree) {
        payload.monthly = Number(form.monthly) || 0;
        payload.yearly = Number(form.yearly) || 0;
      }
      const data = await saRequest(`plans/${plan.key}`, { method: "put", body: payload });
      onSaved(data);
      toast.success(`${data.name} plan saved`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const label = "text-xs text-gray-500 sa-dark:text-slate-400";

  return (
    <Card className="p-5 space-y-5 min-w-0">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`h-7 w-7 shrink-0 rounded-md flex items-center justify-center ${style.accent}`}>
            <Icon size={14} />
          </div>
          <span className="text-[10px] uppercase tracking-wide font-semibold text-gray-500 sa-dark:text-slate-400 bg-gray-100 sa-dark:bg-slate-800 px-2 py-0.5 rounded shrink-0">
            {plan.key}
          </span>
          {dirty && (
            <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 sa-dark:text-amber-400 shrink-0" title="Unsaved changes">
              <Circle size={6} className="fill-current" /> Unsaved
            </span>
          )}
        </div>
        <button onClick={save} disabled={saving} className={buttonClass.primary}>
          <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save"}
        </button>
      </div>

      <div className="min-w-0 space-y-2">
        <input
          type="text"
          value={form.name}
          onChange={(e) => set({ name: e.target.value })}
          aria-label="Plan name"
          className="w-full min-w-0 bg-transparent text-lg font-semibold text-gray-900 sa-dark:text-white border-b border-gray-200 sa-dark:border-slate-800 pb-1.5 focus:border-emerald-500 outline-none"
        />
        <input type="text" value={form.tagline} onChange={(e) => set({ tagline: e.target.value })} placeholder="Tagline shown under the plan name" className={`${inputClass} w-full`} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label>
          <span className={label}>Monthly price (₹)</span>
          <input type="number" min="0" disabled={isFree} value={isFree ? 0 : form.monthly} onChange={(e) => set({ monthly: e.target.value })} className={`${inputClass} mt-1 w-full`} />
        </label>
        <label>
          <span className={label}>Yearly price (₹)</span>
          <input type="number" min="0" disabled={isFree} value={isFree ? 0 : form.yearly} onChange={(e) => set({ yearly: e.target.value })} className={`${inputClass} mt-1 w-full`} />
        </label>
      </div>
      {isFree && <p className="-mt-3 text-[11px] text-gray-500 sa-dark:text-slate-500">The Free plan is always ₹0. It can't be priced.</p>}

      <label className="block">
        <span className={label}>Badge (blank = none, e.g. "Best Value")</span>
        <input type="text" value={form.badge} onChange={(e) => set({ badge: e.target.value })} className={`${inputClass} mt-1 w-full`} />
      </label>

      <div className="border-t border-gray-200 sa-dark:border-slate-800 pt-3 divide-y divide-gray-100 sa-dark:divide-slate-800/70">
        {CAPABILITIES.map((def) => (
          <CapabilityRow key={def.key} def={def} value={capMap[def.key]} onChange={setCapability} />
        ))}
      </div>
    </Card>
  );
};

export default function PlansView() {
  const [plans, setPlans] = useState(null);
  const [error, setError] = useState("");

  const load = () => {
    setError("");
    saRequest("plans")
      .then((data) => setPlans([...data].sort((a, b) => a.order - b.order)))
      .catch((err) => setError(err.message));
  };

  useEffect(load, []);

  const replacePlan = (updated) => setPlans((prev) => prev.map((p) => (p.key === updated.key ? updated : p)));

  return (
    <div className="space-y-5">
      <PageHeader title="Subscription plans" subtitle="Free, Standard and Premium: prices and the capabilities each plan includes." />

      <p className="text-xs text-gray-600 sa-dark:text-slate-400 bg-white sa-dark:bg-slate-900/70 border border-gray-200 sa-dark:border-slate-800 rounded-xl px-4 py-3 flex items-start gap-2">
        <Info size={14} className="shrink-0 mt-0.5" />
        <span>
          Price changes apply to new purchases only. Customers already subscribed keep what they paid for until they renew.
          The Free plan has no price and starts automatically at signup. Every row below is a capability the app checks, so
          changing it changes what that plan's stores can actually do.
        </span>
      </p>

      {error ? (
        <ErrorBox message={error} onRetry={load} />
      ) : !plans ? (
        <Spinner />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
          {plans.map((plan) => (
            <PlanCard key={plan.key} plan={plan} onSaved={replacePlan} />
          ))}
        </div>
      )}
    </div>
  );
}
