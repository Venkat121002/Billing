// Invoice numbers are assigned by the server when a bill is saved
// (POST /billing/bills → platformStore.takeNextInvoiceNumber). Before that,
// the receipt preview shows the number the bill will most likely get.

// Same rule as the backend: "INV-" + 7 → "INV-7", "INV" + 7 → "INV-7".
export const formatInvoiceNumber = (prefix, number) => {
  const p = String(prefix ?? "INV-").trim();
  if (!p) return String(number);
  return /[-/_]$/.test(p) ? `${p}${number}` : `${p}-${number}`;
};

export const previewInvoiceNumber = (user) =>
  formatInvoiceNumber(
    user?.Tenant?.invoice_prefix ?? user?.invoiceSettings?.prefix,
    user?.Tenant?.next_invoice_number ?? user?.invoiceSettings?.sequence ?? 1
  );
