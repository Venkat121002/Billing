import { useEffect, useState } from "react";
import { Info, Save } from "lucide-react";
import toast from "react-hot-toast";
import { Card, ErrorBox, PageHeader, Spinner, buttonClass, saRequest } from "./shared";

export const BILL_DELIVERY_OPTIONS = [
  { value: "pdf", label: "PDF", help: "Receipt PDF attached to the WhatsApp message (invoice_created template)." },
  { value: "text", label: "Text message", help: "Store, bill number, items and total written in the message, no attachment (bill_summary template)." },
];

// Shown wherever "text" can be picked while the server still falls back to PDF.
export const TextNotEnabledNote = () => (
  <p className="text-xs text-amber-800 sa-dark:text-amber-300 bg-amber-50 sa-dark:bg-amber-500/10 border border-amber-200 sa-dark:border-amber-500/20 rounded-lg px-3 py-2 flex items-start gap-2">
    <Info size={14} className="shrink-0 mt-0.5" />
    <span>
      Text bills need the <b>bill_summary</b> WhatsApp template approved in Meta Business Manager and
      WHATSAPP_BILL_TEXT_ENABLED=true on the server. Until then, stores set to Text still get the PDF.
    </span>
  </p>
);

export default function SettingsView() {
  const [settings, setSettings] = useState(null);
  const [mode, setMode] = useState("pdf");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    setError("");
    saRequest("settings")
      .then((data) => {
        setSettings(data);
        setMode(data.billDeliveryMode);
      })
      .catch((err) => setError(err.message));
  };

  useEffect(load, []);

  const save = async () => {
    setSaving(true);
    try {
      const data = await saRequest("settings", { method: "put", body: { billDeliveryMode: mode } });
      setSettings(data);
      toast.success("Settings saved");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <PageHeader title="Platform settings" subtitle="Defaults that apply to every store." />

      {error ? (
        <ErrorBox message={error} onRetry={load} />
      ) : !settings ? (
        <Spinner />
      ) : (
        <Card className="p-5 space-y-4">
          <div>
            <h2 className="text-sm font-medium text-gray-800 sa-dark:text-slate-200">WhatsApp bill delivery</h2>
            <p className="text-xs text-gray-500 sa-dark:text-slate-500 mt-0.5">
              How POS bills are sent to customers. You can override this for a single store on its store page.
            </p>
          </div>

          <div className="space-y-2">
            {BILL_DELIVERY_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition ${
                  mode === opt.value
                    ? "border-emerald-500 bg-emerald-50 sa-dark:bg-emerald-500/10"
                    : "border-gray-200 sa-dark:border-slate-800 hover:border-gray-300 sa-dark:hover:border-slate-700"
                }`}
              >
                <input type="radio" name="billDeliveryMode" value={opt.value} checked={mode === opt.value} onChange={() => setMode(opt.value)} className="mt-1 accent-emerald-600" />
                <span>
                  <span className="block text-sm text-gray-900 sa-dark:text-slate-100">{opt.label}</span>
                  <span className="block text-xs text-gray-500 sa-dark:text-slate-500">{opt.help}</span>
                </span>
              </label>
            ))}
          </div>

          {mode === "text" && !settings.billTextEnabled && <TextNotEnabledNote />}

          <button onClick={save} disabled={saving || mode === settings.billDeliveryMode} className={buttonClass.primary}>
            <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save"}
          </button>
        </Card>
      )}
    </div>
  );
}
