/**
 * How a POS bill goes to the customer on WhatsApp: 'pdf' (invoice_created with
 * the receipt attached) or 'text' (bill_summary, details in the message body).
 *
 * The super admin sets a platform-wide default and can override it per store
 * (owner.billDeliveryMode). Text needs the "bill_summary" template approved on
 * the Meta account; until WHATSAPP_BILL_TEXT_ENABLED=true, 'text' falls back to
 * 'pdf' so bills keep going out.
 */
const store = require('./platformStore');

const MODES = ['pdf', 'text'];

const isTextEnabled = () => process.env.WHATSAPP_BILL_TEXT_ENABLED === 'true';

/** The mode the super admin chose for this owner (override, else global). */
const configuredMode = async (owner) => {
    if (MODES.includes(owner?.billDeliveryMode)) return owner.billDeliveryMode;
    return (await store.getPlatformSettings()).billDeliveryMode;
};

/** The mode that will actually be used when sending. */
const effectiveMode = async (owner) => {
    const mode = await configuredMode(owner);
    return mode === 'text' && !isTextEnabled() ? 'pdf' : mode;
};

module.exports = { MODES, isTextEnabled, configuredMode, effectiveMode };
