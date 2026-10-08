import React from "react";
import {
  Receipt,
  Boxes,
  MessageCircle,
  BarChart3,
  CheckCircle2,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import logo from "../../assets/images/BILLING LOGO .png";

// Shared two-column layout for the owner (/login) and team (/team-login)
// sign-in pages: form on the left, green brand panel on the right (lg+).

const FEATURES = [
  { icon: Receipt, title: "GST invoices in seconds", text: "Thermal, A4 and PDF bills with automatic tax totals." },
  { icon: Boxes, title: "Live inventory", text: "Stock updates on every sale, with low-stock alerts." },
  { icon: MessageCircle, title: "Bills on WhatsApp", text: "Send the receipt straight to your customer's phone." },
  { icon: BarChart3, title: "Reports & dues", text: "Sales, GST and credit reports in one place." },
];

const INVOICE_ITEMS = [
  { name: "Basmati Rice 5kg", qty: 1, amount: "625.00" },
  { name: "Toor Dal 1kg", qty: 2, amount: "350.00" },
  { name: "Tata Tea Gold 500g", qty: 1, amount: "290.00" },
];

function InvoicePreview() {
  return (
    <div className="relative mx-auto w-full max-w-sm">
      {/* Invoice card */}
      <div className="rounded-2xl bg-white p-5 text-gray-800 shadow-2xl shadow-black/20">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Invoice</p>
            <p className="text-sm font-bold text-gray-900">INV-0042</p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-semibold text-green-700">
            <CheckCircle2 size={12} /> Paid
          </span>
        </div>

        <div className="mt-4 space-y-2 border-y border-dashed border-gray-200 py-3">
          {INVOICE_ITEMS.map((item) => (
            <div key={item.name} className="flex items-center justify-between text-xs">
              <span className="text-gray-600">
                {item.name} <span className="text-gray-400">× {item.qty}</span>
              </span>
              <span className="font-medium tabular-nums">₹{item.amount}</span>
            </div>
          ))}
        </div>

        <div className="mt-3 space-y-1 text-xs">
          <div className="flex justify-between text-gray-500">
            <span>GST (5%)</span>
            <span className="tabular-nums">₹63.25</span>
          </div>
          <div className="flex justify-between text-sm font-bold text-gray-900">
            <span>Grand Total</span>
            <span className="tabular-nums">₹1,328.25</span>
          </div>
        </div>
      </div>

      {/* Floating sales chip */}
      <div className="absolute -bottom-14 -right-8 flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-xl shadow-black/20">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-100 text-green-700">
          <TrendingUp size={18} />
        </div>
        <div>
          <p className="text-[11px] text-gray-500">Today's sales</p>
          <p className="text-sm font-bold text-gray-900 tabular-nums">₹24,580</p>
        </div>
      </div>
    </div>
  );
}

function BrandPanel() {
  return (
    <div className="relative hidden w-1/2 overflow-hidden lg:sticky lg:top-0 lg:h-screen bg-gradient-to-br from-green-600 via-green-700 to-emerald-900 lg:flex">
      {/* Subtle grid + glow */}
      <div
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-green-400/30 blur-3xl" />
      <div className="absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-emerald-300/20 blur-3xl" />

      {/* Shorter laptop screens (768/800px tall) get tighter spacing so the
          feature list still fits instead of being hidden. */}
      <div className="relative z-10 mx-auto flex w-full max-w-xl flex-col justify-center px-12 py-12 xl:px-16 [@media(max-height:820px)]:py-8">
        <h2 className="text-3xl font-bold leading-tight text-white xl:text-4xl [@media(max-height:820px)]:text-[28px]">
          Smart billing for
          <br />
          growing businesses.
        </h2>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-green-50/90 [@media(max-height:820px)]:mt-2">
          Bill faster, keep stock in check and get paid on time, all from one dashboard.
        </p>

        <div className="mt-10 mb-16 [@media(max-height:820px)]:mb-14 [@media(max-height:820px)]:mt-6">
          <InvoicePreview />
        </div>

        <ul className="grid grid-cols-2 gap-x-6 gap-y-5 [@media(max-height:820px)]:gap-y-3">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15 text-white ring-1 ring-white/20">
                <Icon size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-green-50/80">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function AuthShell({ title, subtitle, children, footer, wide = false }) {
  return (
    <div className="flex min-h-screen bg-white">
      {/* ================= FORM SIDE ================= */}
      <div className="flex w-full flex-col px-6 py-8 sm:px-12 lg:w-1/2 lg:px-16 xl:px-24">
        <div>
          <img src={logo} alt="SwordNex Billing" className="h-10" />
        </div>

        <div className="flex flex-1 items-center py-10">
          <div className={`mx-auto w-full ${wide ? "max-w-xl" : "max-w-sm"}`}>
            <h1 className="text-[28px] font-bold tracking-tight text-gray-900">{title}</h1>
            <p className="mt-1.5 text-sm text-gray-500">{subtitle}</p>

            <div className="mt-8">{children}</div>

            {footer && <div className="mt-8 space-y-2 text-center text-sm text-gray-500">{footer}</div>}

            {/* Phones/tablets don't get the green panel, so show its feature list here. */}
            <ul className="mt-10 grid grid-cols-1 gap-3 border-t border-gray-100 pt-8 sm:grid-cols-2 lg:hidden">
              {FEATURES.map(({ icon: Icon, title, text }) => (
                <li key={title} className="flex gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-50 text-green-700">
                    <Icon size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-gray-500">{text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="text-xs text-gray-400">© {new Date().getFullYear()} SwordNex. All rights reserved.</p>
      </div>

      {/* ================= BRAND SIDE ================= */}
      <BrandPanel />
    </div>
  );
}

// Shared form pieces so both login pages look identical.
export function AuthField({ label, icon: Icon, right, error, children }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        {right}
      </div>
      <div className="relative">
        {Icon && (
          <Icon size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        )}
        {children}
      </div>
      {error && (
        <p role="alert" className="mt-1.5 flex items-start gap-1 text-xs text-red-600">
          <AlertCircle size={14} className="mt-px shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

const authInputBase =
  "w-full h-12 pr-4 rounded-xl border border-gray-300 bg-white text-sm text-gray-900 placeholder:text-gray-400 " +
  "outline-none transition focus:border-green-600 focus:ring-4 focus:ring-green-600/15";

export const authInputClass = `${authInputBase} pl-11`;
export const authPlainInputClass = `${authInputBase} pl-4`;
// Appended to an input that has a validation error.
export const authInputErrorClass = "!border-red-400 focus:!border-red-500 focus:!ring-red-500/15";

export const authButtonClass =
  "w-full h-12 rounded-xl bg-green-600 text-sm font-semibold text-white shadow-sm shadow-green-600/30 transition " +
  "hover:bg-green-700 active:bg-green-800 disabled:cursor-not-allowed disabled:opacity-70 flex items-center justify-center";
