import React from "react";

// 80 mm / 58 mm roll receipt shared by every billing screen. The printable
// width and the paper size come from .receipt-thermal-80/58 and
// utils/printReceipt.js.
//
// Totals always add up on paper:
//  - exclusive prices: Subtotal (excl. GST) + GST − discounts = Grand total
//  - inclusive prices: Items total (the line totals) − discounts = Grand total,
//    with the GST inside it shown as "Includes GST".

const money = (n) => (Number(n) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const rupees = (n) => `₹${money(n)}`;

const Row = ({ label, value, className = "" }) => (
  <div className={`flex justify-between gap-2 ${className}`}>
    <span>{label}</span>
    <span className="text-right">{value}</span>
  </div>
);

const ThermalReceipt = ({
  width = "80",
  title,
  business,
  customer,
  customerLabel = "Customer",
  items,
  receiptNo,
  receiptDate,
  inclusive = false,
  subtotal,
  totalGst,
  discount = 0,
  loyaltyDiscount = 0,
  grandTotal,
  paymentMethod,
  cash,
  change,
  isDue = false,
  footer = "Thank you for your purchase!",
}) => {
  const address = [business.street, business.city, business.state, business.pincode].filter(Boolean).join(", ");
  const itemsTotal = subtotal + totalGst;
  // Less cash than the total is a part-paid bill, never "negative change".
  const balanceDue = Math.max(Math.round((grandTotal - (Number(cash) || 0)) * 100) / 100, 0);
  const showDue = isDue || balanceDue > 0;

  return (
    <div className={`${width === "58" ? "receipt-thermal-58" : "receipt-thermal-80"} text-black bg-white leading-snug`}>
      <div className="text-center mb-[1em]">
        <h2 className="text-[1.3em] font-bold">{business.name}</h2>
        {address && <p className="text-[0.85em]">{address}</p>}
        {business.phone && <p className="text-[0.85em]">Phone: {business.phone}</p>}
        {business.gstin && <p className="text-[0.85em]">GSTIN: {business.gstin}</p>}
        {title && <p className="mt-[0.4em] font-bold tracking-wide">{title}</p>}
      </div>

      <div className="text-[0.85em] mb-[0.5em]">
        <Row label={`No: ${receiptNo || ""}`} value={receiptDate} />
      </div>

      {(customer.name || customer.phone || customer.location || customer.gstin) && (
        <div className="text-[0.85em] mb-[0.5em]">
          {customer.name && <p>{customerLabel}: {customer.name}</p>}
          {customer.phone && <p>Phone: {customer.phone}</p>}
          {customer.location && <p>{customer.location}</p>}
          {customer.gstin && <p>GSTIN: {customer.gstin}</p>}
        </div>
      )}

      <table className="w-full text-[0.85em] mb-[0.8em] border-collapse">
        <thead>
          <tr className="border-y border-dashed border-black">
            <th className="text-left py-[0.3em] font-semibold">Item</th>
            <th className="text-center py-[0.3em] font-semibold">Qty</th>
            <th className="text-right py-[0.3em] font-semibold">Price</th>
            <th className="text-right py-[0.3em] font-semibold">Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i} className="border-b border-dashed border-gray-400 align-top">
              <td className="py-[0.3em] pr-[0.3em]">{item.name}</td>
              <td className="py-[0.3em] text-center">{item.qty}</td>
              <td className="py-[0.3em] text-right">{money(item.price)}</td>
              <td className="py-[0.3em] text-right">{money(item.qty * item.price)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="text-[0.85em] space-y-[0.15em]">
        {inclusive ? (
          <>
            <Row label="Items total:" value={rupees(itemsTotal)} />
            {totalGst > 0 && <Row label="Includes GST:" value={rupees(totalGst)} className="text-gray-700" />}
          </>
        ) : (
          <>
            <Row label="Subtotal (excl. GST):" value={rupees(subtotal)} />
            <Row label="GST:" value={rupees(totalGst)} />
          </>
        )}
        {discount > 0 && <Row label="Discount:" value={`−${rupees(discount)}`} />}
        {loyaltyDiscount > 0 && <Row label="Loyalty points:" value={`−${rupees(loyaltyDiscount)}`} />}
        <Row label="Grand total:" value={rupees(grandTotal)} className="text-[1.15em] font-bold border-t border-black pt-[0.3em] mt-[0.3em]" />
      </div>

      <div className="text-[0.85em] mt-[0.8em] space-y-[0.15em]">
        {paymentMethod && <Row label="Payment:" value={<span className="capitalize">{paymentMethod}</span>} />}
        {paymentMethod === "cash" && (
          <>
            <Row label="Cash received:" value={rupees(cash)} />
            {showDue
              ? <Row label="Balance due:" value={rupees(balanceDue)} className="font-semibold" />
              : <Row label="Change:" value={rupees(Math.max(Number(change) || 0, 0))} />}
          </>
        )}
      </div>

      {footer && <p className="text-center mt-[1.2em] text-[0.85em]">{footer}</p>}
    </div>
  );
};

export default ThermalReceipt;
