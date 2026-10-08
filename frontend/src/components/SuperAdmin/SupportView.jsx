import { useCallback, useEffect, useState } from "react";
import { ArrowRight, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { getSelectableProfiles } from "../../config/industryProfiles";
import { Card, ErrorBox, PageHeader, Spinner, StatusBadge, buttonClass, fmtDateTime, inputClass, saRequest } from "./shared";

const FILTERS = ["Pending", "Resolved", "Dismissed", "All"];

const industryOptions = getSelectableProfiles();
const industryLabel = (key) => industryOptions.find((p) => p.key === key)?.label || key || "Not set";

// Messages and industry-change requests from stores. In store mode
// (storeId set) only that store's requests are shown.
export default function SupportView({ storeId, onOpenStore, onChanged }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("Pending");
  const [chosen, setChosen] = useState({});
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    saRequest("support-requests", { params: filter === "All" ? {} : { status: filter } })
      .then((data) => setRequests(storeId ? data.filter((r) => r.ownerId === storeId) : data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [filter, storeId]);

  useEffect(load, [load]);

  const afterAction = (msg) => {
    toast.success(msg);
    load();
    onChanged?.();
  };

  const switchIndustry = async (r) => {
    const industry = chosen[r._id] || r.requestedIndustry;
    if (!industry) return;
    if (!window.confirm(`Switch ${r.businessName || r.requesterEmail} from ${industryLabel(r.currentIndustry)} to ${industryLabel(industry)}?\n\nTheir sidebar and screens change on their next sign-in. Existing records are kept.`)) return;
    setBusyId(r._id);
    try {
      await saRequest(`support-requests/${r._id}/switch-industry`, { method: "post", body: { industry } });
      afterAction("Industry switched");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const closeRequest = async (r, status) => {
    if (status === "Dismissed" && !window.confirm("Dismiss this request without making any change?")) return;
    setBusyId(r._id);
    try {
      await saRequest(`support-requests/${r._id}/status`, { method: "patch", body: { status } });
      afterAction(`Request ${status.toLowerCase()}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Support requests" subtitle="Messages and industry-change requests from stores">
        <div className="flex rounded-lg border border-gray-300 sa-dark:border-slate-700 p-0.5">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs rounded-md transition ${
                filter === f ? "bg-emerald-50 sa-dark:bg-emerald-500/15 text-emerald-700 sa-dark:text-emerald-300" : "text-gray-500 sa-dark:text-slate-400 hover:text-gray-900 sa-dark:hover:text-slate-100"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <button onClick={load} className={buttonClass.ghost} title="Refresh" aria-label="Refresh">
          <RefreshCw className="w-4 h-4" />
        </button>
      </PageHeader>

      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorBox message={error} onRetry={load} />
      ) : requests.length === 0 ? (
        <Card className="p-10 text-center text-sm text-gray-500 sa-dark:text-slate-400">No {filter === "All" ? "" : `${filter.toLowerCase()} `}requests.</Card>
      ) : (
        <div className="space-y-4">
          {requests.map((r) => {
            const isPending = r.status === "Pending";
            const isIndustryChange = r.type === "industry_change";
            const busy = busyId === r._id;
            return (
              <Card key={r._id} className="p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button onClick={() => onOpenStore(r.ownerId)} className="text-sm font-medium text-gray-900 sa-dark:text-white hover:text-emerald-700 sa-dark:hover:text-emerald-300 transition">
                        {r.businessName || r.requesterEmail || "Unknown store"}
                      </button>
                      <StatusBadge value={isIndustryChange ? "Industry change" : "General"} />
                      <StatusBadge value={r.status} />
                    </div>
                    <p className="text-xs text-gray-500 sa-dark:text-slate-500 mt-1">
                      {r.requesterName || "-"} · {r.requesterEmail || "no email"}
                      {r.requesterRole === "subuser" ? " · staff" : ""} · {fmtDateTime(r.createdAt)}
                    </p>
                  </div>
                  {isIndustryChange && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="px-2 py-1 rounded-md bg-gray-100 sa-dark:bg-slate-800 text-gray-700 sa-dark:text-slate-300">{industryLabel(r.currentIndustry)}</span>
                      <ArrowRight size={14} className="text-gray-400 sa-dark:text-slate-600" />
                      <span className="px-2 py-1 rounded-md bg-emerald-50 sa-dark:bg-emerald-500/15 text-emerald-700 sa-dark:text-emerald-300">{industryLabel(r.requestedIndustry)}</span>
                    </div>
                  )}
                </div>

                <p className="mt-4 text-sm text-gray-700 sa-dark:text-slate-300 whitespace-pre-wrap break-words">{r.message}</p>

                {isPending ? (
                  <div className="mt-4 pt-4 border-t border-gray-200 sa-dark:border-slate-800 flex items-center justify-end gap-2 flex-wrap">
                    {isIndustryChange ? (
                      <>
                        <select value={chosen[r._id] || r.requestedIndustry} onChange={(e) => setChosen((c) => ({ ...c, [r._id]: e.target.value }))} className={inputClass}>
                          {industryOptions.map((p) => (
                            <option key={p.key} value={p.key}>{p.label}</option>
                          ))}
                        </select>
                        <button onClick={() => switchIndustry(r)} disabled={busy} className={buttonClass.primary}>
                          {busy ? "Working..." : "Switch industry"}
                        </button>
                      </>
                    ) : (
                      <button onClick={() => closeRequest(r, "Resolved")} disabled={busy} className={buttonClass.primary}>
                        Mark resolved
                      </button>
                    )}
                    <button onClick={() => closeRequest(r, "Dismissed")} disabled={busy} className={buttonClass.ghost}>
                      Dismiss
                    </button>
                  </div>
                ) : (
                  <div className="mt-4 pt-4 border-t border-gray-200 sa-dark:border-slate-800 text-xs text-gray-500 sa-dark:text-slate-500">
                    {[r.resolution, r.resolvedBy && `by ${r.resolvedBy}`, r.resolvedAt && `on ${fmtDateTime(r.resolvedAt)}`].filter(Boolean).join(" · ")}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
