import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import API_URL from "../../config/api";
import { loadScript } from "./loadScript";

const inr = (n) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Public page a customer opens from a pay link. The token in the URL is the only credential.
const PayPage = () => {
  const { token } = useParams();
  const [info, setInfo] = useState(null);
  const [error, setError] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null); // { paymentId, amount, balance }

  const load = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/pay/${token}`);
      setInfo(data);
      setAmount(String(data.balance));
    } catch (err) {
      setError(err.response?.data?.msg || "This payment link is invalid or unavailable.");
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const pay = async () => {
    setError("");
    const value = Number(amount);
    if (!Number.isFinite(value) || value < 1 || value > info.balance) {
      setError(`Enter an amount between ₹1 and ${inr(info.balance)}.`);
      return;
    }
    setBusy(true);
    try {
      const loaded = await loadScript("https://checkout.razorpay.com/v1/checkout.js");
      if (!loaded) throw new Error("Could not load the payment window. Check your internet connection.");

      const { data: order } = await axios.post(`${API_URL}/pay/${token}/order`, { amount: value });

      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        order_id: order.orderId,
        name: info.business,
        description: `Payment for dues${info.description ? ` - ${info.description}` : ""}`,
        prefill: order.prefill,
        theme: { color: "#059669" },
        modal: { ondismiss: () => setBusy(false) },
        handler: async (response) => {
          try {
            const { data } = await axios.post(`${API_URL}/pay/${token}/verify`, response);
            setResult(data);
          } catch (err) {
            // Money may have moved; the webhook reconciles it even if this call failed.
            setError(
              (err.response?.data?.msg || "We could not confirm the payment yet.") +
                ` Payment ID: ${response.razorpay_payment_id}`
            );
            load();
          } finally {
            setBusy(false);
          }
        },
      });
      rzp.on("payment.failed", (r) => {
        setError(r.error?.description || "Payment failed. Please try again.");
        setBusy(false);
      });
      rzp.open();
    } catch (err) {
      setError(err.response?.data?.msg || err.message || "Could not start the payment.");
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="bg-emerald-600 text-white p-6 text-center">
          <h1 className="text-xl font-bold">{info?.business || "Secure Payment"}</h1>
          <p className="text-emerald-100 text-sm mt-1">Pay your outstanding balance online</p>
        </div>

        <div className="p-6">
          {!info && !error && <p className="text-center text-gray-500">Loading…</p>}

          {!info && error && <p className="text-center text-red-600">{error}</p>}

          {info && result && (
            <div className="text-center">
              <div className="mx-auto mb-3 h-14 w-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-3xl">✓</div>
              <h2 className="text-lg font-bold text-gray-900">Payment successful</h2>
              <p className="text-gray-600 mt-1">{inr(result.amount)} received. Thank you!</p>
              <p className="text-xs text-gray-400 mt-3">Payment ID: {result.paymentId}</p>
              <p className="text-sm text-gray-600 mt-3">
                Remaining balance: <b>{inr(result.balance)}</b>
              </p>
              <p className="text-xs text-gray-400 mt-2">A receipt will be emailed if an email address was provided.</p>
            </div>
          )}

          {info && !result && info.balance <= 0 && (
            <div className="text-center">
              <div className="mx-auto mb-3 h-14 w-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-3xl">✓</div>
              <h2 className="text-lg font-bold text-gray-900">All settled</h2>
              <p className="text-gray-600 mt-1">Nothing is due on this account.</p>
            </div>
          )}

          {info && !result && info.balance > 0 && (
            <>
              <dl className="text-sm space-y-2 mb-5">
                {info.customerName && (
                  <div className="flex justify-between"><dt className="text-gray-500">Customer</dt><dd className="font-medium">{info.customerName}</dd></div>
                )}
                <div className="flex justify-between"><dt className="text-gray-500">Total</dt><dd>{inr(info.total)}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">Paid so far</dt><dd>{inr(info.paid)}</dd></div>
                <div className="flex justify-between text-base"><dt className="font-semibold">Balance due</dt><dd className="font-bold text-red-600">{inr(info.balance)}</dd></div>
              </dl>

              <label className="block text-sm font-medium text-gray-600 mb-1">Amount to pay (₹)</label>
              <input
                type="number"
                min="1"
                max={info.balance}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3 text-right font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-xs text-gray-400 mt-1">You can pay the full balance or part of it.</p>

              {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

              <button
                onClick={pay}
                disabled={busy}
                className="mt-5 w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold py-3 rounded-lg"
              >
                {busy ? "Processing…" : `Pay ${inr(amount)}`}
              </button>
              <p className="text-center text-xs text-gray-400 mt-3">Secured by Razorpay · UPI, cards, netbanking, wallets</p>
            </>
          )}

          {info && result && error && <p className="text-sm text-red-600 mt-3">{error}</p>}
        </div>
      </div>
    </div>
  );
};

export default PayPage;
