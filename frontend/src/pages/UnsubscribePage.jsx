import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import axios from "axios";
import { CheckCircle2, XCircle, AlertTriangle, ArrowRight, RefreshCw, Mail } from "lucide-react";
import API_URL from "../config/api";

export default function UnsubscribePage() {
  const [params] = useSearchParams();
  const email = params.get("email") || "";
  const token = params.get("token") || "";

  const [loading, setLoading] = useState(true);
  const [unsubscribed, setUnsubscribed] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [resubscribing, setResubscribing] = useState(false);

  // Normalize API endpoint base
  const apiBase = API_URL.endsWith("/") ? API_URL.slice(0, -1) : API_URL;

  useEffect(() => {
    if (!email || !token) {
      setError("Missing email address or security token in the link.");
      setLoading(false);
      return;
    }

    // Automatically execute unsubscribe upon following the verified email link
    const doUnsubscribe = async () => {
      try {
        const res = await axios.post(`${apiBase}/email/unsubscribe`, { email, token });
        setUnsubscribed(true);
        setMessage(res.data?.message || "You have been successfully unsubscribed from daily emails.");
      } catch (err) {
        setError(
          err.response?.data?.error ||
          err.response?.data?.msg ||
          "Unable to process unsubscribe request. The link may have expired or is invalid."
        );
      } finally {
        setLoading(false);
      }
    };

    doUnsubscribe();
  }, [email, token, apiBase]);

  const handleResubscribe = async () => {
    setResubscribing(true);
    setError("");
    try {
      const res = await axios.post(`${apiBase}/email/resubscribe`, { email, token });
      setUnsubscribed(false);
      setMessage(res.data?.message || "You have been resubscribed to daily automated emails.");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to resubscribe. Please contact support.");
    } finally {
      setResubscribing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-100 to-slate-200 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        {/* Brand Header */}
        <div className="bg-emerald-600 px-6 py-6 text-center text-white">
          <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-2.5 backdrop-blur-sm">
            <Mail className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">SwordNex Billing</h1>
          <p className="text-xs text-emerald-100 mt-1">Automated Email Preferences</p>
        </div>

        {/* Content Card */}
        <div className="p-6 text-center space-y-4">
          {loading ? (
            <div className="py-8 space-y-3">
              <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
              <p className="text-sm text-gray-600">Processing your unsubscribe request...</p>
            </div>
          ) : error ? (
            <div className="py-4 space-y-3">
              <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Request Error</h2>
              <p className="text-xs text-rose-600 bg-rose-50 p-3 rounded-lg border border-rose-200 text-left">
                {error}
              </p>
              <div className="pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                >
                  Go to Store Login <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          ) : unsubscribed ? (
            <div className="py-2 space-y-4">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Successfully Unsubscribed</h2>
                <p className="text-xs text-gray-500 mt-1">
                  <b>{email}</b> has been removed from daily automated summary emails.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-left text-xs text-gray-600 space-y-1.5">
                <p className="font-semibold text-gray-800">What this means:</p>
                <ul className="list-disc list-inside space-y-1 text-gray-500">
                  <li>You will not receive daily 9:00 PM closing reports.</li>
                  <li>Your billing application account remains 100% active.</li>
                  <li>Your store products, invoices, and sales data are unaffected.</li>
                </ul>
              </div>

              <div className="pt-2 flex flex-col gap-2.5">
                <button
                  onClick={handleResubscribe}
                  disabled={resubscribing}
                  className="w-full py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition disabled:opacity-50"
                >
                  {resubscribing ? "Re-subscribing..." : "Unsubscribed by mistake? Click to Re-subscribe"}
                </button>
                <Link
                  to="/login"
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition"
                >
                  Return to Dashboard / Login
                </Link>
              </div>
            </div>
          ) : (
            <div className="py-4 space-y-4">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">You Are Subscribed</h2>
                <p className="text-xs text-gray-500 mt-1">
                  <b>{email}</b> is currently receiving daily automated performance reports.
                </p>
              </div>
              <div className="pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition"
                >
                  Go to Store Login <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-3 border-t border-gray-100 text-center text-[11px] text-gray-400">
          &copy; {new Date().getFullYear()} SwordNex Technologies Pvt. Ltd.
        </div>
      </div>
    </div>
  );
}

