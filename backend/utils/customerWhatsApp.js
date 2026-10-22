/**
 * Customer WhatsApp messages (ticket updates, reminders, bills).
 *
 * Free-form text sent through the platform's Meta API is only delivered if the
 * customer messaged that number in the last 24 hours; otherwise Meta silently
 * drops it while the API still says "sent". Business-initiated messages need
 * an approved template. So customer messages that have no approved template
 * are NOT sent by the server: we return a wa.me click-to-chat link and the
 * store sends it from its own WhatsApp. That also means the platform number
 * can never be used to message arbitrary people.
 */
const { normalizePhone } = require('./whatsappService');
const platformStore = require('./platformStore');

/** The store's own name for customer messages (the login token carries no business name). */
async function storeNameFor(req) {
    const ownerId = req.user.role === 'owner' ? req.user.userId : req.user.ownerId;
    const owner = await platformStore.getOwner(ownerId).catch(() => null);
    return owner?.companyDetails?.name || owner?.businessName || 'our store';
}

/** wa.me link with the message prefilled, or null when the number is invalid. */
function whatsappLink(phone, text) {
    const to = normalizePhone(phone);
    if (!to) return null;
    return `https://wa.me/${to}?text=${encodeURIComponent(String(text || ''))}`;
}

/**
 * Standard response body for an explicit "send on WhatsApp" action.
 * `whatsappLink` is null when the customer has no valid number.
 */
function manualMessage(phone, text) {
    const link = whatsappLink(phone, text);
    return {
        success: !!link,
        mode: 'whatsapp_link',
        whatsappLink: link,
        message: text,
        msg: link
            ? 'Opening WhatsApp: send the prefilled message from your store\'s WhatsApp.'
            : 'This customer has no valid WhatsApp number.'
    };
}

module.exports = { whatsappLink, manualMessage, storeNameFor };
