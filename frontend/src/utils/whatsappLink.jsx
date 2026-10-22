import toast from "react-hot-toast";

// Customer WhatsApp messages are sent from the store's own WhatsApp: the API
// returns a wa.me link with the message prefilled (backend utils/customerWhatsApp.js).

// A toast with a button that opens the prepared message. Used for automatic
// messages (new ticket, status change) and as the fallback when a browser
// blocks the window opened after a network request.
export function offerWhatsApp(link, label = "Send update on WhatsApp") {
  if (!link) return;
  toast(
    (t) => (
      <span className="flex items-center gap-3">
        <span className="text-sm">Message ready for the customer.</span>
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => toast.dismiss(t.id)}
          className="shrink-0 rounded-md bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700"
        >
          {label}
        </a>
      </span>
    ),
    { duration: 12000 }
  );
}

// For an explicit "Send on WhatsApp" click: open the message right away.
export function openWhatsApp(link) {
  if (!link) {
    toast.error("This customer has no valid WhatsApp number.");
    return;
  }
  const win = window.open(link, "_blank", "noopener,noreferrer");
  if (!win) offerWhatsApp(link, "Open WhatsApp");
}
