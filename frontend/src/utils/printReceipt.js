// Prints the rendered receipt through the page's #print-area, telling the
// browser the real paper size for the chosen format.
//
// Thermal printers can't print to the edge of the roll: an 80 mm roll has
// about 72 mm of printable width, a 58 mm roll about 48 mm. The receipt
// content is that wide (see .receipt-thermal-80/58) and centred on the roll.

const MM_PER_PX = 25.4 / 96;

// The @page size for a format. Thermal rolls have no fixed length, so the
// page is made exactly as tall as the receipt (otherwise the browser cuts it
// into A4-length pages or leaves a long blank tail).
export const pageSizeFor = (format, contentEl) => {
  const f = String(format || "A4").toLowerCase();
  if (f.includes("thermal") || f.includes("80mm") || f.includes("58mm")) {
    const width = f.includes("58mm") ? 58 : 80;
    // Measure the receipt itself: its preview box stretches to fill the popup.
    const receiptEl = contentEl?.firstElementChild || contentEl;
    const heightMm = Math.ceil((receiptEl?.scrollHeight || 0) * MM_PER_PX) + 8;
    return `${width}mm ${Math.max(heightMm, 50)}mm`;
  }
  if (f.includes("a5")) return "A5";
  return "A4";
};

export const printReceipt = ({ format, contentEl, printAreaEl, title }) => {
  if (!contentEl || !printAreaEl) return;

  printAreaEl.innerHTML = contentEl.innerHTML;
  const pageStyle = document.createElement("style");
  pageStyle.textContent = `@media print { @page { size: ${pageSizeFor(format, contentEl)}; margin: 0; } }`;
  document.head.appendChild(pageStyle);
  const titleBefore = document.title;
  if (title) document.title = title;

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    printAreaEl.innerHTML = "";
    pageStyle.remove();
    document.title = titleBefore;
  };
  // Chrome blocks in window.print() until the dialog closes; other browsers
  // return straight away and fire afterprint later.
  window.addEventListener("afterprint", cleanup, { once: true });
  window.print();
  setTimeout(cleanup, 1000);
};
