import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { superAdminApi } from "../../contexts/SuperAdminAuthContext";
import { getSelectableProfiles } from "../../config/industryProfiles";

const FILTERS = ["Pending", "Resolved", "Dismissed", "All"];

const STATUS_STYLES = {
  Pending: "bg-amber-600/15 text-amber-400",
  Resolved: "bg-emerald-600/15 text-emerald-400",
  Dismissed: "bg-gray-700/50 text-gray-400",
};

const industryOptions = getSelectableProfiles();
const industryLabel = (key) =>
  industryOptions.find((p) => p.key === key)?.label || key || "Not set";

const SuperAdminSupportRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("Pending");
  const [chosen, setChosen] = useState({});
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await superAdminApi.get("support-requests", {
        params: filter === "All" ? {} : { status: filter },
      });
      setRequests(res.data);
    } catch (err) {
      toast.error(err.response?.data?.msg || "Failed to load support requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const switchIndustry = async (r) => {
    const industry = chosen[r._id] || r.requestedIndustry;
    if (!industry) return;
    if (
      !window.confirm(
        `Switch ${r.businessName || r.requesterEmail} from ${industryLabel(r.currentIndustry)} to ${industryLabel(industry)}?\n\nTheir sidebar and screens change on their next sign-in. Existing records are kept.`
      )
    ) {
      return;
    }
    setBusyId(r._id);
    try {
      await superAdminApi.post(`support-requests/${r._id}/switch-industry`, { industry });
      toast.success("Industry switched");
      load();
    } catch (err) {
      toast.error(err.response?.data?.msg || "Failed to switch industry");
    } finally {
      setBusyId(null);
    }
  };

  const closeRequest = async (r, status) => {
    if (status === "Dismissed" && !window.confirm("Dismiss this request without making any change?")) {
      return;
    }
    setBusyId(r._id);
    try {
      await superAdminApi.patch(`support-requests/${r._id}/status`, { status });
      toast.success(`Request ${status.toLowerCase()}`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.msg || "Failed to update request");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-semibold text-white">Support Requests</h1>
          <p className="text-sm text-gray-500">Messages and industry-change requests from tenants</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-900 border border-gray-800 rounded-lg p-0.5">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs rounded-md transition ${
                  filter === f ? "bg-emerald-600/15 text-emerald-400" : "text-gray-400 hover:text-gray-200"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <button
            onClick={load}
            className="h-8 w-8 flex items-center justify-center rounded-lg bg-gray-900 border border-gray-800 text-gray-400 hover:text-emerald-400 transition"
            title="Refresh"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {loading && <div className="text-gray-500 text-sm">Loading…</div>}

      {!loading && requests.length === 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-10 text-center text-sm text-gray-500">
          No {filter === "All" ? "" : filter.toLowerCase() + " "}requests.
        </div>
      )}

      <div className="space-y-4">
        {requests.map((r) => {
          const isPending = r.status === "Pending";
          const isIndustryChange = r.type === "industry_change";
          const busy = busyId === r._id;

          return (
            <div key={r._id} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      to={`/superadmin/tenants/${r.ownerId}`}
                      className="text-sm font-medium text-white hover:text-emerald-400 transition"
                    >
                      {r.businessName || r.requesterEmail || "Unknown business"}
                    </Link>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        isIndustryChange ? "bg-blue-600/15 text-blue-400" : "bg-gray-800 text-gray-300"
                      }`}
                    >
                      {isIndustryChange ? "Industry change" : "General"}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[r.status] || STATUS_STYLES.Dismissed}`}>
                      {r.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {r.requesterName || "—"} · {r.requesterEmail || "no email"}
                    {r.requesterRole === "subuser" ? " · sub-user" : ""} ·{" "}
                    {r.createdAt ? new Date(r.createdAt).toLocaleString() : ""}
                  </p>
                </div>

                {isIndustryChange && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="px-2 py-1 rounded-md bg-gray-800 text-gray-300">{industryLabel(r.currentIndustry)}</span>
                    <ArrowRight size={14} className="text-gray-600" />
                    <span className="px-2 py-1 rounded-md bg-emerald-600/15 text-emerald-400">
                      {industryLabel(r.requestedIndustry)}
                    </span>
                  </div>
                )}
              </div>

              <p className="mt-4 text-sm text-gray-300 whitespace-pre-wrap break-words">{r.message}</p>

              {isPending ? (
                <div className="mt-4 pt-4 border-t border-gray-800 flex items-center justify-end gap-2 flex-wrap">
                  {isIndustryChange ? (
                    <>
                      <select
                        value={chosen[r._id] || r.requestedIndustry}
                        onChange={(e) => setChosen((c) => ({ ...c, [r._id]: e.target.value }))}
                        className="h-9 px-3 rounded-lg bg-gray-800 border border-gray-700 text-sm text-gray-200 focus:ring-2 focus:ring-emerald-600 outline-none"
                      >
                        {industryOptions.map((p) => (
                          <option key={p.key} value={p.key}>{p.label}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => switchIndustry(r)}
                        disabled={busy}
                        className="h-9 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition disabled:opacity-60"
                      >
                        {busy ? "Working…" : "Switch Industry"}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => closeRequest(r, "Resolved")}
                      disabled={busy}
                      className="h-9 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition disabled:opacity-60"
                    >
                      Mark Resolved
                    </button>
                  )}
                  <button
                    onClick={() => closeRequest(r, "Dismissed")}
                    disabled={busy}
                    className="h-9 px-4 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition disabled:opacity-60"
                  >
                    Dismiss
                  </button>
                </div>
              ) : (
                <div className="mt-4 pt-4 border-t border-gray-800 text-xs text-gray-500">
                  {r.resolution ? `${r.resolution} · ` : ""}
                  {r.resolvedBy ? `by ${r.resolvedBy}` : ""}
                  {r.resolvedAt ? ` on ${new Date(r.resolvedAt).toLocaleString()}` : ""}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SuperAdminSupportRequests;
