import { useEffect, useState, useMemo } from "react";
import {
  Mail,
  Play,
  Square,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  Send,
  RefreshCw,
  AlertCircle
} from "lucide-react";
import toast from "react-hot-toast";
import {
  Card,
  ErrorBox,
  PageHeader,
  Spinner,
  buttonClass,
  saRequest,
  fmtDate,
  fmtDateTime
} from "./shared";

export default function EmailManagementView() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all"); // 'all' | 'subscribed' | 'unsubscribed'
  const [updatingUser, setUpdatingUser] = useState(null);
  const [error, setError] = useState("");

  const loadData = () => {
    setError("");
    setLoading(true);
    saRequest("email-management")
      .then((res) => {
        setData(res);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const isEnabled = data?.stats?.dailyEmailsEnabled;

  const handleToggle = async (enableState) => {
    const actionLabel = enableState ? "Start" : "Stop";
    if (
      !window.confirm(
        enableState
          ? "Are you sure you want to START daily automated emails? Emails will be sent automatically every day at 9:00 PM IST."
          : "Are you sure you want to STOP daily automated emails? No automated emails will be sent until you resume."
      )
    ) {
      return;
    }

    setToggling(true);
    try {
      const res = await saRequest("email-management/toggle", {
        method: "patch",
        body: { enabled: enableState }
      });
      toast.success(res.msg || `Daily automated emails ${enableState ? "started" : "stopped"}`);
      loadData();
    } catch (err) {
      toast.error(err.message || "Failed to update automation status");
    } finally {
      setToggling(false);
    }
  };

  const handleTriggerNow = async () => {
    if (
      !window.confirm(
        "Send daily summary emails to all subscribed users right now? (This will immediately dispatch emails)."
      )
    ) {
      return;
    }

    setTriggering(true);
    try {
      const res = await saRequest("email-management/trigger-now", {
        method: "post"
      });
      toast.success(
        `Dispatched successfully! Processed: ${res.result?.processed || 0}, Sent: ${res.result?.emailsSent || 0}, Skipped Unsubscribed: ${res.result?.skippedUnsubscribed || 0}`
      );
      loadData();
    } catch (err) {
      toast.error(err.message || "Failed to trigger email run");
    } finally {
      setTriggering(false);
    }
  };

  const handleToggleUserSubscription = async (subscriber) => {
    const willSubscribe = !subscriber.dailyEmailSubscribed;
    const confirmMsg = willSubscribe
      ? `Re-subscribe "${subscriber.email}" to daily automated emails?`
      : `Unsubscribe "${subscriber.email}" from daily automated emails?`;

    if (!window.confirm(confirmMsg)) return;

    setUpdatingUser(subscriber.id);
    try {
      await saRequest(`email-management/subscribers/${subscriber.id}/subscription`, {
        method: "patch",
        body: { subscribed: willSubscribe }
      });
      toast.success(
        `Updated ${subscriber.email} to ${willSubscribe ? "Subscribed" : "Unsubscribed"}`
      );
      loadData();
    } catch (err) {
      toast.error(err.message || "Failed to update subscriber status");
    } finally {
      setUpdatingUser(null);
    }
  };

  // Filter subscribers based on search query & status filter
  const filteredSubscribers = useMemo(() => {
    if (!data?.subscribers) return [];
    let list = data.subscribers;

    if (filterStatus === "subscribed") {
      list = list.filter((s) => s.dailyEmailSubscribed);
    } else if (filterStatus === "unsubscribed") {
      list = list.filter((s) => !s.dailyEmailSubscribed);
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(
        (s) =>
          (s.name && s.name.toLowerCase().includes(q)) ||
          (s.email && s.email.toLowerCase().includes(q)) ||
          (s.company && s.company.toLowerCase().includes(q))
      );
    }

    return list;
  }, [data?.subscribers, search, filterStatus]);

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Email Management"
          subtitle="Configure daily 9:00 PM automated reports, subscriber lists, and manual controls."
        />
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 text-gray-500 hover:text-gray-700 sa-dark:text-slate-400 sa-dark:hover:text-slate-200 rounded-lg border border-gray-200 sa-dark:border-slate-800 hover:bg-gray-50 sa-dark:hover:bg-slate-800 transition"
            title="Refresh data"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={handleTriggerNow}
            disabled={triggering || loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition disabled:opacity-50"
          >
            <Send size={14} className={triggering ? "animate-pulse" : ""} />
            {triggering ? "Dispatching..." : "Send Daily Batch Now"}
          </button>
        </div>
      </div>

      {error ? (
        <ErrorBox message={error} onRetry={loadData} />
      ) : loading && !data ? (
        <Spinner />
      ) : (
        <>
          {/* Main Automation Status Banner */}
          <div
            className={`p-5 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all shadow-sm ${
              isEnabled
                ? "bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-500/30"
                : "bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-amber-500/30"
            }`}
          >
            <div className="flex items-start gap-3.5">
              <div
                className={`p-2.5 rounded-lg shrink-0 ${
                  isEnabled
                    ? "bg-emerald-600 text-white shadow-emerald-500/20"
                    : "bg-amber-600 text-white shadow-amber-500/20"
                }`}
              >
                <Mail size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold text-gray-900 sa-dark:text-slate-100">
                    Daily Automated Emails (9:00 PM IST)
                  </h2>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                      isEnabled
                        ? "bg-emerald-100 text-emerald-800 sa-dark:bg-emerald-500/20 sa-dark:text-emerald-300"
                        : "bg-amber-100 text-amber-800 sa-dark:bg-amber-500/20 sa-dark:text-amber-300"
                    }`}
                  >
                    {isEnabled ? (
                      <>
                        <CheckCircle2 size={12} /> Active
                      </>
                    ) : (
                      <>
                        <AlertCircle size={12} /> Paused
                      </>
                    )}
                  </span>
                </div>
                <p className="text-xs text-gray-600 sa-dark:text-slate-400 mt-1 max-w-2xl">
                  {isEnabled
                    ? "Automated reports are scheduled to run every day at 9:00 PM IST. Emails will only be dispatched to active subscribers."
                    : "Automated daily emails are currently stopped by the administrator. No emails will be sent at 9:00 PM until resumed."}
                </p>
                {data?.stats?.lastRunAt && (
                  <p className="text-[11px] text-gray-500 sa-dark:text-slate-500 mt-1.5 flex items-center gap-1.5">
                    <Clock size={12} /> Last run: {fmtDateTime(data.stats.lastRunAt)}
                  </p>
                )}
              </div>
            </div>

            {/* Admin Action Buttons */}
            <div className="flex items-center gap-2.5 shrink-0 self-start md:self-center">
              {isEnabled ? (
                <button
                  onClick={() => handleToggle(false)}
                  disabled={toggling}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm transition disabled:opacity-50"
                >
                  <Square size={13} className="fill-current" />
                  {toggling ? "Stopping..." : "Stop Sending Emails"}
                </button>
              ) : (
                <button
                  onClick={() => handleToggle(true)}
                  disabled={toggling}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition disabled:opacity-50"
                >
                  <Play size={13} className="fill-current" />
                  {toggling ? "Starting..." : "Start Sending Emails"}
                </button>
              )}
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 flex items-center gap-3.5">
              <div className="p-2.5 rounded-lg bg-blue-50 sa-dark:bg-blue-500/10 text-blue-600 sa-dark:text-blue-400">
                <Users size={20} />
              </div>
              <div>
                <p className="text-xs text-gray-500 sa-dark:text-slate-400 font-medium">Total Registered Users</p>
                <p className="text-xl font-bold text-gray-900 sa-dark:text-slate-100">
                  {data?.stats?.totalUsers || 0}
                </p>
              </div>
            </Card>

            <Card className="p-4 flex items-center gap-3.5">
              <div className="p-2.5 rounded-lg bg-emerald-50 sa-dark:bg-emerald-500/10 text-emerald-600 sa-dark:text-emerald-400">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <p className="text-xs text-gray-500 sa-dark:text-slate-400 font-medium">Active Subscribers</p>
                <p className="text-xl font-bold text-emerald-600 sa-dark:text-emerald-400">
                  {data?.stats?.activeSubscribers || 0}
                </p>
              </div>
            </Card>

            <Card className="p-4 flex items-center gap-3.5">
              <div className="p-2.5 rounded-lg bg-rose-50 sa-dark:bg-rose-500/10 text-rose-600 sa-dark:text-rose-400">
                <XCircle size={20} />
              </div>
              <div>
                <p className="text-xs text-gray-500 sa-dark:text-slate-400 font-medium">Unsubscribed Users</p>
                <p className="text-xl font-bold text-rose-600 sa-dark:text-rose-400">
                  {data?.stats?.unsubscribedCount || 0}
                </p>
              </div>
            </Card>

            <Card className="p-4 flex items-center gap-3.5">
              <div className="p-2.5 rounded-lg bg-amber-50 sa-dark:bg-amber-500/10 text-amber-600 sa-dark:text-amber-400">
                <Clock size={20} />
              </div>
              <div>
                <p className="text-xs text-gray-500 sa-dark:text-slate-400 font-medium">Schedule</p>
                <p className="text-sm font-semibold text-gray-900 sa-dark:text-slate-100">
                  Daily @ 9:00 PM IST
                </p>
              </div>
            </Card>
          </div>

          {/* User Subscriber List & Search Controls */}
          <Card className="p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 sa-dark:text-slate-100">
                  Registered Users & Subscribers
                </h3>
                <p className="text-xs text-gray-500 sa-dark:text-slate-400 mt-0.5">
                  Users receiving daily closing and performance summary emails.
                </p>
              </div>

              {/* Status Filter Pill Tabs */}
              <div className="flex items-center gap-1 bg-gray-100 sa-dark:bg-slate-800 p-1 rounded-lg self-start sm:self-auto text-xs font-medium">
                <button
                  onClick={() => setFilterStatus("all")}
                  className={`px-3 py-1 rounded-md transition ${
                    filterStatus === "all"
                      ? "bg-white sa-dark:bg-slate-700 text-gray-900 sa-dark:text-slate-100 shadow-sm"
                      : "text-gray-600 sa-dark:text-slate-400 hover:text-gray-900"
                  }`}
                >
                  All ({data?.stats?.totalUsers || 0})
                </button>
                <button
                  onClick={() => setFilterStatus("subscribed")}
                  className={`px-3 py-1 rounded-md transition ${
                    filterStatus === "subscribed"
                      ? "bg-white sa-dark:bg-slate-700 text-emerald-600 sa-dark:text-emerald-400 shadow-sm"
                      : "text-gray-600 sa-dark:text-slate-400 hover:text-gray-900"
                  }`}
                >
                  Subscribed ({data?.stats?.activeSubscribers || 0})
                </button>
                <button
                  onClick={() => setFilterStatus("unsubscribed")}
                  className={`px-3 py-1 rounded-md transition ${
                    filterStatus === "unsubscribed"
                      ? "bg-white sa-dark:bg-slate-700 text-rose-600 sa-dark:text-rose-400 shadow-sm"
                      : "text-gray-600 sa-dark:text-slate-400 hover:text-gray-900"
                  }`}
                >
                  Unsubscribed ({data?.stats?.unsubscribedCount || 0})
                </button>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 sa-dark:text-slate-500 pointer-events-none"
              />
              <input
                type="text"
                placeholder="Search user by name, store name, or registered email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 sa-dark:border-slate-800 bg-white sa-dark:bg-slate-900 text-sm text-gray-900 sa-dark:text-slate-100 placeholder-gray-400 sa-dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600 sa-dark:hover:text-slate-300"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Subscribers Table */}
            <div className="overflow-x-auto border border-gray-200 sa-dark:border-slate-800 rounded-lg">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50/75 sa-dark:bg-slate-800/50 border-b border-gray-200 sa-dark:border-slate-800 text-xs font-semibold text-gray-600 sa-dark:text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">User / Store Name</th>
                    <th className="py-3 px-4">Registered Email</th>
                    <th className="py-3 px-4">Daily Email Status</th>
                    <th className="py-3 px-4">Unsubscribed On</th>
                    <th className="py-3 px-4 text-right">Admin Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 sa-dark:divide-slate-800/60">
                  {filteredSubscribers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-gray-500 sa-dark:text-slate-400">
                        {search ? (
                          <>No users found matching &ldquo;<b>{search}</b>&rdquo;</>
                        ) : (
                          "No users in this category."
                        )}
                      </td>
                    </tr>
                  ) : (
                    filteredSubscribers.map((user) => (
                      <tr
                        key={user.id}
                        className="hover:bg-gray-50/60 sa-dark:hover:bg-slate-800/30 transition"
                      >
                        <td className="py-3.5 px-4">
                          <p className="font-medium text-gray-900 sa-dark:text-slate-100">{user.name}</p>
                          {user.company && user.company !== user.name && (
                            <p className="text-xs text-gray-500 sa-dark:text-slate-400">{user.company}</p>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-mono text-xs text-gray-800 sa-dark:text-slate-200">
                            {user.email}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          {user.dailyEmailSubscribed ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 sa-dark:bg-emerald-500/10 sa-dark:text-emerald-300 ring-1 ring-emerald-200 sa-dark:ring-emerald-500/30">
                              <CheckCircle2 size={12} /> Subscribed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 sa-dark:bg-rose-500/10 sa-dark:text-rose-300 ring-1 ring-rose-200 sa-dark:ring-rose-500/30">
                              <XCircle size={12} /> Unsubscribed
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-xs text-gray-500 sa-dark:text-slate-400">
                          {user.unsubscribedAt ? fmtDate(user.unsubscribedAt) : "-"}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleToggleUserSubscription(user)}
                            disabled={updatingUser === user.id}
                            className={`px-3 py-1 rounded text-xs font-medium transition ${
                              user.dailyEmailSubscribed
                                ? "border border-rose-200 sa-dark:border-rose-900 text-rose-600 hover:bg-rose-50 sa-dark:hover:bg-rose-950/40"
                                : "border border-emerald-200 sa-dark:border-emerald-900 text-emerald-600 hover:bg-emerald-50 sa-dark:hover:bg-emerald-950/40"
                            }`}
                          >
                            {updatingUser === user.id
                              ? "Updating..."
                              : user.dailyEmailSubscribed
                              ? "Unsubscribe User"
                              : "Re-subscribe User"}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between text-xs text-gray-500 sa-dark:text-slate-400 pt-1">
              <span>
                Showing <b>{filteredSubscribers.length}</b> of <b>{data?.subscribers?.length || 0}</b> total registered users
              </span>
              <span>
                *Unsubscribed users remain fully registered with uninterrupted access to their store and billing.
              </span>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

