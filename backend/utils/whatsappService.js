/**
 * WhatsApp messaging via the Meta (Facebook) WhatsApp Cloud API.
 * Same account and credentials as SwordNex JobSheet.
 *
 *   WHATSAPP_META_PHONE_NUMBER_ID / WHATSAPP_META_ACCESS_TOKEN  -> required to send
 *   WHATSAPP_DUES_ENABLED=true      -> allow sending DUES_PAY_LINK from the dues page
 *
 * Without credentials, messages are logged to the console instead (local dev),
 * mirroring emailService.
 *
 * Outside the 24h customer-service window Meta only delivers templates, so every
 * business event here uses sendTemplate(). Callers should treat failures as
 * non-fatal: a missing WhatsApp message must never break a bill or signup.
 */
const { compileTemplate } = require('./whatsappTemplates');

const GRAPH_VERSION = 'v19.0';
const SEND_TIMEOUT_MS = 10000;
const PLACEHOLDER = /^\s*$|your_|changeme/i;

const env = (key) => process.env[key] || '';
const flag = (key) => String(env(key)).toLowerCase() === 'true';

const isConfigured = () =>
    !PLACEHOLDER.test(env('WHATSAPP_META_PHONE_NUMBER_ID')) &&
    !PLACEHOLDER.test(env('WHATSAPP_META_ACCESS_TOKEN'));

const duesEnabled = () => flag('WHATSAPP_DUES_ENABLED');

/**
 * Meta wants digits only, with country code. Most numbers entered in the app are
 * 10-digit Indian mobiles, so those get 91 prepended. Returns '' if unusable.
 */
function normalizePhone(raw) {
    let digits = String(raw || '').replace(/\D/g, '');
    if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
    if (digits.length === 10) digits = `91${digits}`;
    return digits.length >= 11 && digits.length <= 15 ? digits : '';
}

async function sendTemplate({ to, type, data }) {
    const phone = normalizePhone(to);
    if (!phone) throw new Error(`Invalid WhatsApp number: "${to}"`);

    const { textFallback, metaTemplate } = compileTemplate(type, data);

    if (!isConfigured()) {
        console.log(`[whatsapp] DEV MODE, not configured. ${type} -> ${phone}: ${textFallback}`);
        return { success: true, mode: 'local-fallback', messageId: null };
    }

    const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phone,
        type: 'template',
        template: {
            name: metaTemplate.name,
            language: { code: metaTemplate.languageCode || 'en_US' },
            components: metaTemplate.components || []
        }
    };

    const url = `https://graph.facebook.com/${GRAPH_VERSION}/${env('WHATSAPP_META_PHONE_NUMBER_ID')}/messages`;
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${env('WHATSAPP_META_ACCESS_TOKEN')}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(SEND_TIMEOUT_MS)
    });
    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
        const msg = body.error?.message || `HTTP ${response.status}`;
        throw new Error(`Meta WhatsApp API (${metaTemplate.name}): ${msg}`);
    }

    const messageId = body.messages?.[0]?.id || null;
    console.log(`[whatsapp] ${type} sent to ${phone} (${messageId})`);
    return { success: true, mode: 'production', messageId };
}

/**
 * Upload a file (e.g. an invoice PDF) to Meta's media store and return its media id,
 * which a template header can reference. Meta keeps uploaded media for 30 days.
 */
async function uploadMedia(buffer, { filename = 'file.pdf', mimeType = 'application/pdf' } = {}) {
    if (!isConfigured()) {
        console.log(`[whatsapp] DEV MODE, not configured. Would upload ${filename} (${buffer.length} bytes)`);
        return 'dev-media-id';
    }

    const form = new FormData();
    form.append('messaging_product', 'whatsapp');
    form.append('type', mimeType);
    form.append('file', new Blob([buffer], { type: mimeType }), filename);

    const url = `https://graph.facebook.com/${GRAPH_VERSION}/${env('WHATSAPP_META_PHONE_NUMBER_ID')}/media`;
    const response = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${env('WHATSAPP_META_ACCESS_TOKEN')}` },
        body: form,
        signal: AbortSignal.timeout(30000)
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || !body.id) {
        throw new Error(`Meta WhatsApp media upload: ${body.error?.message || `HTTP ${response.status}`}`);
    }
    return body.id;
}

/** Fire a template and swallow errors (logged). Returns true if it was sent. */
async function trySendTemplate(args) {
    try {
        await sendTemplate(args);
        return true;
    } catch (err) {
        console.error(`[whatsapp] ${args.type} to ${args.to} failed:`, err.message);
        return false;
    }
}

module.exports = {
    isConfigured,
    duesEnabled,
    normalizePhone,
    uploadMedia,
    sendTemplate,
    trySendTemplate
};
