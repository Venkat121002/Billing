import React, { useEffect, useState } from "react";
import { Save, Loader2, Tag, Zap, Shield, Crown, Circle, Info } from "lucide-react";
import toast from "react-hot-toast";
import { superAdminApi } from "../../contexts/SuperAdminAuthContext";
import { CAPABILITIES, capabilitiesToMap } from "../../config/planCapabilities";

const STYLE_BY_KEY = {
  trial: { icon: Zap, accent: "bg-blue-500/15 text-blue-400" },
  standard: { icon: Shield, accent: "bg-emerald-500/15 text-emerald-400" },
  premium: { icon: Crown, accent: "bg-amber-500/15 text-amber-400" },
};

// One row per catalog capability — a fixed, known list (see planCapabilities.js),
// not free text, so "add a feature" can never produce something the app
// doesn't actually know how to enforce or display. Toggle capabilities use an
// actual <select> ("dropdown fields"); numeric limits use a number input with
// an "Unlimited" checkbox, since a dropdown doesn't suit an arbitrary number.
const CapabilityRow = ({ def, value, onChange }) => {
  const unlimited = def.type === "limit" && (value?.limit === null || value?.limit === undefined);

  return (
    <div className="flex items-start justify-between gap-3 py-2 min-w-0">
      <div className="min-w-0">
        <p className="text-sm text-gray-200">{def.label}</p>
        <p className="text-[11px] text-gray-600 mt-0.5">{def.help}</p>
      </div>

      {def.type === "toggle" ? (
        <select
          value={value?.enabled ? "enabled" : "disabled"}
          onChange={(e) => onChange({ key: def.key, enabled: e.target.value === "enabled" })}
          className="shrink-0 bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-emerald-500"
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
            value={unlimited ? "" : (value?.limit ?? "")}
            onChange={(e) => onChange({ key: def.key, limit: e.target.value === "" ? null : Number(e.target.value) })}
            placeholder="0"
            className="w-20 bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 text-sm text-gray-100 disabled:opacity-40 focus:outline-none focus:border-emerald-500"
          />
          <label className="flex items-center gap-1.5 text-xs text-gray-400 whitespace-nowrap">
            <input
              type="checkbox"
              checked={unlimited}
              onChange={(e) => onChange({ key: def.key, limit: e.target.checked ? null : 0 })}
              className="h-3.5 w-3.5 rounded border-gray-600 bg-gray-800 accent-emerald-500"
            />
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

  const setCapability = (row) => {
    setForm((f) => {
      const next = (f.capabilities || []).filter((c) => c.key !== row.key);
      next.push(row);
      return { ...f, capabilities: next };
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        tagline: form.tagline,
        badge: form.badge,
        capabilities: form.capabilities,
      };
      if (!isFree) {
        payload.monthly = Number(form.monthly) || 0;
        payload.yearly = Number(form.yearly) || 0;
      }
      const { data } = await superAdminApi.put(`plans/${plan.key}`, payload);
      onSaved(data);
      toast.success(`${data.name} plan saved`);
    } catch (err) {
      toast.error(err.response?.data?.msg || "Could not save plan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-5 min-w-0">
      {/* Badge + Save on their own row so a long name/tagline can never
          squeeze Save off the edge of the card. */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`h-7 w-7 shrink-0 rounded-md flex items-center justify-center ${style.accent}`}>
            <Icon size={14} />
          </div>
          <span className="text-[10px] uppercase tracking-wide font-semibold text-gray-500 bg-gray-800 px-2 py-0.5 rounded shrink-0">
            {plan.key}
          </span>
          {dirty && (
            <span className="inline-flex items-center gap-1 text-[11px] text-amber-400 shrink-0" title="Unsaved changes">
              <Circle size={6} className="fill-amber-400" /> Unsaved
            </span>
          )}
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="shrink-0 inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-sm font-medium px-3.5 py-2 rounded-lg"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          Save
        </button>
      </div>

      <div className="min-w-0">
        <input
          type="text"
          value={form.name}
          onChange={(e) => set({ name: e.target.value })}
          className="w-full min-w-0 bg-transparent text-lg font-semibold text-white border-b border-gray-800 pb-1.5 focus:border-emerald-500 focus:outline-none"
        />
        <input
          type="text"
          value={form.tagline}
          onChange={(e) => set({ tagline: e.target.value })}
          placeholder="Tagline shown under the plan name"
          className="mt-2 w-full min-w-0 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-emerald-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500">Monthly price (₹)</label>
          <input
            type="number"
            min="0"
            disabled={isFree}
            value={isFree ? 0 : form.monthly}
            onChange={(e) => set({ monthly: e.target.value })}
            className="mt-1 w-full min-w-0 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-100 disabled:opacity-50 focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">Yearly price (₹)</label>
          <input
            type="number"
            min="0"
            disabled={isFree}
            value={isFree ? 0 : form.yearly}
            onChange={(e) => set({ yearly: e.target.value })}
            className="mt-1 w-full min-w-0 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-100 disabled:opacity-50 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>
      {isFree && <p className="-mt-3 text-[11px] text-gray-600">The Free plan is always ₹0 — it can't be priced.</p>}

      <div>
        <label className="text-xs text-gray-500">Badge (blank = none, e.g. "Best Value")</label>
        <input
          type="text"
          value={form.badge}
          onChange={(e) => set({ badge: e.target.value })}
          className="mt-1 w-full min-w-0 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-emerald-500"
        />
      </div>

      <div className="border-t border-gray-800 pt-3 divide-y divide-gray-800/70">
        {CAPABILITIES.map((def) => (
          <CapabilityRow key={def.key} def={def} value={capMap[def.key]} onChange={setCapability} />
        ))}
      </div>
    </div>
  );
};

const SuperAdminPlans = () => {
  const [plans, setPlans] = useState(null);

  const load = async () => {
    try {
      const { data } = await superAdminApi.get("plans");
      setPlans(data.sort((a, b) => a.order - b.order));
    } catch (err) {
      toast.error(err.response?.data?.msg || "Failed to load plans");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const replacePlan = (updated) => {
    setPlans((prev) => prev.map((p) => (p.key === updated.key ? updated : p)));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-emerald-600/15 text-emerald-400 flex items-center justify-center shrink-0">
          <Tag size={18} />
        </div>
        <div className="min-w-0">
          <h1 className="text-lg font-semibold text-white">Subscription Plans</h1>
          <p className="text-sm text-gray-500">
            Free, Standard and Premium — prices and the capabilities every plan is built from.
          </p>
        </div>
      </div>

      <p className="text-xs text-gray-500 bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 flex items-start gap-2">
        <Info size={14} className="shrink-0 mt-0.5" />
        <span>
          Price changes apply to new purchases only — customers already subscribed keep the price and terms they paid
          for until they renew. The Free plan has no price and always starts automatically at signup. Every row below
          is a real capability the app checks — enabling/disabling one, or changing a limit, changes what that plan's
          users can actually do, not just what the pricing page says.
        </span>
      </p>

      {!plans ? (
        <div className="text-gray-500 text-sm">Loading…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
          {plans.map((plan) => (
            <PlanCard key={plan.key} plan={plan} onSaved={replacePlan} />
          ))}
        </div>
      )}
    </div>
  );
};

export default SuperAdminPlans;
