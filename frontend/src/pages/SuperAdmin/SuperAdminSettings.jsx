import React, { useEffect, useState } from "react";
import { Settings, Save, Loader2, Info } from "lucide-react";
import toast from "react-hot-toast";
import { superAdminApi } from "../../contexts/SuperAdminAuthContext";

export const BILL_DELIVERY_OPTIONS = [
  { value: "pdf", label: "PDF", help: "Receipt PDF attached to the WhatsApp message (invoice_created template)." },
  { value: "text", label: "Text message", help: "Store, bill number, items and total written in the message, no attachment (bill_summary template)." },
];

// Shown wherever "text" can be picked while the server still falls back to PDF.
export const TextNotEnabledNote = () => (
  <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 flex items-start gap-2">
    <Info size={14} className="shrink-0 mt-0.5" />
    <span>
      Text bills need the <b>bill_summary</b> WhatsApp template approved in Meta Business Manager and
      WHATSAPP_BILL_TEXT_ENABLED=true on the server. Until then, stores set to Text still get the PDF.
    </span>
  </p>
);

const SuperAdminSettings = () => {
  const [settings, setSettings] = useState(null);
  const [mode, setMode] = useState("pdf");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    superAdminApi
      .get("settings")
      .then(({ data }) => {
        setSettings(data);
        setMode(data.billDeliveryMode);
      })
      .catch((err) => toast.error(err.response?.data?.msg || "Failed to load settings"));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await superAdminApi.put("settings", { billDeliveryMode: mode });
      setSettings(data);
      toast.success("Settings saved");
    } catch (err) {
      toast.error(err.response?.data?.msg || "Could not save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-emerald-600/15 text-emerald-400 flex items-center justify-center shrink-0">
          <Settings size={18} />
        </div>
        <div className="min-w-0">
          <h1 className="text-lg font-semibold text-white">Platform Settings</h1>
          <p className="text-sm text-gray-500">Defaults that apply to every store.</p>
        </div>
      </div>

      {!settings ? (
        <div className="text-gray-500 text-sm">Loading…</div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <div>
            <h2 className="text-sm font-medium text-gray-200">WhatsApp bill delivery</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              How POS bills are sent to customers. You can override this for a single store on its tenant page.
            </p>
          </div>

          <div className="space-y-2">
            {BILL_DELIVERY_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 cursor-pointer ${
                  mode === opt.value ? "border-emerald-600 bg-emerald-600/10" : "border-gray-800 hover:border-gray-700"
                }`}
              >
                <input
                  type="radio"
                  name="billDeliveryMode"
                  value={opt.value}
                  checked={mode === opt.value}
                  onChange={() => setMode(opt.value)}
                  className="mt-1 accent-emerald-500"
                />
                <span>
                  <span className="block text-sm text-gray-200">{opt.label}</span>
                  <span className="block text-xs text-gray-500">{opt.help}</span>
                </span>
              </label>
            ))}
          </div>

          {mode === "text" && !settings.billTextEnabled && <TextNotEnabledNote />}

          <button
            onClick={save}
            disabled={saving || mode === settings.billDeliveryMode}
            className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-sm font-medium px-3.5 py-2 rounded-lg"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            Save
          </button>
        </div>
      )}
    </div>
  );
};

export default SuperAdminSettings;
