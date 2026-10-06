import React from "react";

// A4 / A5 GST invoice used by every billing screen ("A4 GST Invoice" and
// "A5 GST Invoice" formats). Works out each line's taxable value and tax the
// same way the billing screens' getTotals() does, so the invoice always adds
// up to the amount actually charged.
//
//  - Business with a GSTIN  → "Tax Invoice" with HSN, CGST + SGST, or IGST
//    when the customer's GSTIN is from another state.
//  - Business without one   → "Bill of Supply" (no tax columns).
//  - variant="receipt" (plain "A4" / "A5" formats) → a simple full-page
//    receipt: tax-inclusive amounts and an "Includes GST" line, no tax columns.

export const DEFAULT_INVOICE_TERMS = "Goods once sold will not be taken back.\nSubject to local jurisdiction.";

const GST_STATES = {
  "01": "Jammu and Kashmir", "02": "Himachal Pradesh", "03": "Punjab", "04": "Chandigarh",
  "05": "Uttarakhand", "06": "Haryana", "07": "Delhi", "08": "Rajasthan", "09": "Uttar Pradesh",
  "10": "Bihar", "11": "Sikkim", "12": "Arunachal Pradesh", "13": "Nagaland", "14": "Manipur",
  "15": "Mizoram", "16": "Tripura", "17": "Meghalaya", "18": "Assam", "19": "West Bengal",
  "20": "Jharkhand", "21": "Odisha", "22": "Chhattisgarh", "23": "Madhya Pradesh", "24": "Gujarat",
  "26": "Dadra and Nagar Haveli and Daman and Diu", "27": "Maharashtra", "29": "Karnataka",
  "30": "Goa", "31": "Lakshadweep", "32": "Kerala", "33": "Tamil Nadu", "34": "Puducherry",
  "35": "Andaman and Nicobar Islands", "36": "Telangana", "37": "Andhra Pradesh", "38": "Ladakh",
  "97": "Other Territory",
};

// First two digits of a valid-looking GSTIN, else null.
const stateCodeOf = (gstin) => {
  const g = String(gstin || "").trim().toUpperCase();
  return /^\d{2}[A-Z0-9]{13}$/.test(g) ? g.slice(0, 2) : null;
};

const money = (n) => (Number(n) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (d) => {
  if (!d) return "";
  const date = new Date(d);
  return isNaN(date) ? String(d) : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const cell = "border border-black px-[0.4em] py-[0.3em]";

const GstInvoice = ({
  variant = "gst",
  title,
  customerLabel = "Bill to",
  paid,
  isDue = false,
  size = "a4",
  business,
  customer,
  items,
  invoiceNo,
  invoiceDate,
  inclusive = false,
  discount = 0,
  grandTotal,
  paymentLabel,
  terms,
  showBatch = false,
  amountInWords,
}) => {
  const businessGstin = String(business.gstin || "").trim().toUpperCase();
  const isReceipt = variant === "receipt";
  const isTaxInvoice = !isReceipt && Boolean(stateCodeOf(businessGstin));
  const heading = title || (isReceipt ? "RECEIPT" : isTaxInvoice ? "TAX INVOICE" : "BILL OF SUPPLY");
  const docLabel = isReceipt ? "Receipt" : "Invoice";
  const sellerCode = stateCodeOf(businessGstin);
  const buyerCode = stateCodeOf(customer.gstin);
  const interState = Boolean(sellerCode && buyerCode && sellerCode !== buyerCode);
  const placeCode = buyerCode || sellerCode;
  const placeOfSupply = placeCode ? `${GST_STATES[placeCode] || "State"} (${placeCode})` : business.state || "";

  const lines = items.map((item) => {
    const qty = Number(item.qty) || 0;
    const price = Number(item.price) || 0;
    const rate = Number(item.gstRate) || 0;
    const lineTotal = price * qty;
    const taxable = inclusive ? lineTotal / (1 + rate / 100) : lineTotal;
    const tax = inclusive ? lineTotal - taxable : (lineTotal * rate) / 100;
    return { ...item, qty, rate, unitRate: qty ? taxable / qty : 0, taxable, tax, amount: taxable + tax };
  });

  const totalQty = lines.reduce((s, l) => s + l.qty, 0);
  const taxableTotal = lines.reduce((s, l) => s + l.taxable, 0);
  const taxTotal = lines.reduce((s, l) => s + l.tax, 0);
  const finalTotal = grandTotal ?? taxableTotal + taxTotal - discount;

  const byRate = Object.values(
    lines.reduce((acc, l) => {
      const key = String(l.rate);
      acc[key] = acc[key] || { rate: l.rate, taxable: 0, tax: 0 };
      acc[key].taxable += l.taxable;
      acc[key].tax += l.tax;
      return acc;
    }, {})
  ).sort((a, b) => a.rate - b.rate);

  const termLines = String(terms ?? DEFAULT_INVOICE_TERMS).split("\n").map((t) => t.trim()).filter(Boolean);
  const address = [business.street, business.city, business.state, business.pincode].filter(Boolean).join(", ");
  // CGST/SGST halves that always add back up to the (paise-rounded) tax:
  // 8.25 → 4.13 + 4.12, not 4.13 + 4.13.
  const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
  const cgstOf = (tax) => round2(round2(tax) / 2);
  const sgstOf = (tax) => round2(round2(tax) - cgstOf(tax));

  return (
    <div className={`${size === "a5" ? "receipt-a5" : "receipt-a4"} gst-invoice bg-white text-black font-arial leading-snug`}>
      {/* Header */}
      <div className="flex justify-between gap-4 border-b-2 border-black pb-[0.8em]">
        <div className="min-w-0">
          <h1 className="text-[1.5em] font-bold leading-tight">{business.name}</h1>
          {address && <p>{address}</p>}
          <p>{[business.phone && `Phone ${business.phone}`, business.email].filter(Boolean).join(" · ")}</p>
          {(isTaxInvoice || (isReceipt && businessGstin)) && (
            <p className="mt-[0.3em]">
              <span className="font-semibold">GSTIN</span> {businessGstin}
              {sellerCode && <> · <span className="font-semibold">State</span> {GST_STATES[sellerCode] || ""} ({sellerCode})</>}
            </p>
          )}
        </div>
        <div className="text-right shrink-0">
          <h2 className="text-[1.35em] font-bold tracking-wide">{heading}</h2>
          {!isReceipt && <p className="text-[0.8em] text-gray-600 mb-[0.4em]">Original for recipient</p>}
          <table className="ml-auto">
            <tbody>
              <tr><td className="pr-[0.6em] text-gray-600">{docLabel} no.</td><td className="text-right font-semibold">{invoiceNo}</td></tr>
              <tr><td className="pr-[0.6em] text-gray-600">Date</td><td className="text-right">{fmtDate(invoiceDate)}</td></tr>
              {isTaxInvoice && placeOfSupply && (
                <tr><td className="pr-[0.6em] text-gray-600">Place of supply</td><td className="text-right">{placeOfSupply}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Parties */}
      <div className="grid grid-cols-2 border border-black my-[0.8em]">
        <div className="p-[0.5em] border-r border-black">
          <p className="text-[0.8em] font-bold text-gray-600">{customerLabel.toUpperCase()}</p>
          <p className="font-semibold">{customer.name || "Cash sale"}</p>
          {customer.location && <p>{customer.location}</p>}
          {customer.gstin && <p>GSTIN {String(customer.gstin).toUpperCase()}</p>}
        </div>
        <div className="p-[0.5em]">
          <p className="text-[0.8em] font-bold text-gray-600">CONTACT</p>
          {customer.phone ? <p>Mobile {customer.phone}</p> : <p className="text-gray-500">—</p>}
          {paymentLabel && <p className="text-gray-700">Payment: {paymentLabel}</p>}
        </div>
      </div>

      {/* Items */}
      <table className="w-full border-collapse text-[0.88em]">
        <thead className="bg-gray-100">
          <tr>
            <th className={`${cell} text-center w-[4%]`}>#</th>
            <th className={`${cell} text-left`}>Item</th>
            {isTaxInvoice && <th className={`${cell} text-center w-[9%]`}>HSN/SAC</th>}
            {showBatch && <th className={`${cell} text-center w-[9%]`}>Batch</th>}
            {showBatch && <th className={`${cell} text-center w-[9%]`}>Expiry</th>}
            <th className={`${cell} text-center w-[6%]`}>Qty</th>
            <th className={`${cell} text-right w-[10%]`}>Rate</th>
            {isTaxInvoice && <th className={`${cell} text-right w-[11%]`}>Taxable</th>}
            {isTaxInvoice && <th className={`${cell} text-center w-[6%]`}>GST</th>}
            {isTaxInvoice && (interState
              ? <th className={`${cell} text-right w-[10%]`}>IGST</th>
              : <>
                <th className={`${cell} text-right w-[9%]`}>CGST</th>
                <th className={`${cell} text-right w-[9%]`}>SGST</th>
              </>)}
            <th className={`${cell} text-right w-[12%]`}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l, i) => (
            <tr key={i} className="break-inside-avoid">
              <td className={`${cell} text-center`}>{i + 1}</td>
              <td className={cell}>{l.name}</td>
              {isTaxInvoice && <td className={`${cell} text-center`}>{l.hsn || "—"}</td>}
              {showBatch && <td className={`${cell} text-center`}>{l.batch || "—"}</td>}
              {showBatch && <td className={`${cell} text-center`}>{l.expiryDate ? fmtDate(l.expiryDate) : "—"}</td>}
              <td className={`${cell} text-center`}>{l.qty}</td>
              <td className={`${cell} text-right`}>{money(isTaxInvoice ? l.unitRate : l.amount / (l.qty || 1))}</td>
              {isTaxInvoice && <td className={`${cell} text-right`}>{money(l.taxable)}</td>}
              {isTaxInvoice && <td className={`${cell} text-center`}>{l.rate}%</td>}
              {isTaxInvoice && (interState
                ? <td className={`${cell} text-right`}>{money(l.tax)}</td>
                : <>
                  <td className={`${cell} text-right`}>{money(cgstOf(l.tax))}</td>
                  <td className={`${cell} text-right`}>{money(sgstOf(l.tax))}</td>
                </>)}
              <td className={`${cell} text-right`}>{money(l.amount)}</td>
            </tr>
          ))}
          <tr className="font-semibold break-inside-avoid">
            <td className={cell}></td>
            <td className={cell}>Total</td>
            {isTaxInvoice && <td className={cell}></td>}
            {showBatch && <td className={cell}></td>}
            {showBatch && <td className={cell}></td>}
            <td className={`${cell} text-center`}>{totalQty}</td>
            <td className={cell}></td>
            {isTaxInvoice && <td className={`${cell} text-right`}>{money(taxableTotal)}</td>}
            {isTaxInvoice && <td className={cell}></td>}
            {isTaxInvoice && (interState
              ? <td className={`${cell} text-right`}>{money(taxTotal)}</td>
              : <>
                <td className={`${cell} text-right`}>{money(cgstOf(taxTotal))}</td>
                <td className={`${cell} text-right`}>{money(sgstOf(taxTotal))}</td>
              </>)}
            <td className={`${cell} text-right`}>{money(taxableTotal + taxTotal)}</td>
          </tr>
        </tbody>
      </table>

      {/* Tax summary + totals */}
      <div className="grid grid-cols-[1.4fr_1fr] gap-[1em] mt-[0.8em] break-inside-avoid">
        <div>
          {isTaxInvoice && taxTotal > 0 && (
            <>
              <p className="text-[0.8em] font-bold text-gray-600 mb-[0.3em]">TAX SUMMARY BY RATE</p>
              <table className="w-full border-collapse text-[0.85em]">
                <thead className="bg-gray-100">
                  <tr>
                    <th className={`${cell} text-center`}>GST rate</th>
                    <th className={`${cell} text-right`}>Taxable</th>
                    {interState
                      ? <th className={`${cell} text-right`}>IGST</th>
                      : <><th className={`${cell} text-right`}>CGST</th><th className={`${cell} text-right`}>SGST</th></>}
                    <th className={`${cell} text-right`}>Total tax</th>
                  </tr>
                </thead>
                <tbody>
                  {byRate.map((r) => (
                    <tr key={r.rate}>
                      <td className={`${cell} text-center`}>{r.rate}%</td>
                      <td className={`${cell} text-right`}>{money(r.taxable)}</td>
                      {interState
                        ? <td className={`${cell} text-right`}>{money(r.tax)}</td>
                        : <><td className={`${cell} text-right`}>{money(cgstOf(r.tax))}</td><td className={`${cell} text-right`}>{money(sgstOf(r.tax))}</td></>}
                      <td className={`${cell} text-right`}>{money(r.tax)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
          {amountInWords && (
            <p className="mt-[0.6em]"><span className="text-gray-600">Amount in words:</span> {amountInWords(finalTotal)}</p>
          )}
        </div>
        <table className="w-full self-start">
          <tbody>
            {isTaxInvoice && (
              <>
                <tr><td className="py-[0.15em] text-gray-600">Taxable value</td><td className="text-right">{money(taxableTotal)}</td></tr>
                {interState
                  ? <tr><td className="py-[0.15em] text-gray-600">IGST</td><td className="text-right">{money(taxTotal)}</td></tr>
                  : <>
                    <tr><td className="py-[0.15em] text-gray-600">CGST</td><td className="text-right">{money(cgstOf(taxTotal))}</td></tr>
                    <tr><td className="py-[0.15em] text-gray-600">SGST</td><td className="text-right">{money(sgstOf(taxTotal))}</td></tr>
                  </>}
              </>
            )}
            {!isTaxInvoice && (
              <tr><td className="py-[0.15em] text-gray-600">Sub total</td><td className="text-right">{money(taxableTotal + taxTotal)}</td></tr>
            )}
            {isReceipt && taxTotal > 0 && (
              <tr><td className="py-[0.15em] text-gray-600">Includes GST</td><td className="text-right">{money(taxTotal)}</td></tr>
            )}
            {discount > 0 && (
              <tr><td className="py-[0.15em] text-gray-600">Less: discount</td><td className="text-right">−{money(discount)}</td></tr>
            )}
            <tr className="text-[1.25em] font-bold">
              <td className="border-t-2 border-black pt-[0.3em]">Grand total</td>
              <td className="border-t-2 border-black pt-[0.3em] text-right">₹{money(finalTotal)}</td>
            </tr>
            {isDue && paid !== undefined && (
              <>
                <tr><td className="pt-[0.4em] text-gray-600">Paid</td><td className="pt-[0.4em] text-right">{money(paid)}</td></tr>
                <tr className="font-bold"><td className="py-[0.15em]">Balance due</td><td className="text-right">₹{money(Math.max(finalTotal - paid, 0))}</td></tr>
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="flex justify-between items-end gap-4 mt-[1.2em] pt-[0.6em] border-t border-black break-inside-avoid">
        <div className="text-[0.82em] text-gray-700">
          {termLines.length > 0 && (
            <>
              <p className="font-bold text-black">Terms</p>
              {termLines.map((t, i) => <p key={i}>{t}</p>)}
            </>
          )}
          <p className="mt-[0.4em]">This is a computer-generated {docLabel.toLowerCase()}.</p>
        </div>
        <div className="text-center min-w-[30%] text-[0.82em]">
          <div className="h-[2.5em]" />
          <p className="border-t border-black pt-[0.2em]">For {business.name}<br />Authorised signatory</p>
        </div>
      </div>
    </div>
  );
};

export default GstInvoice;
