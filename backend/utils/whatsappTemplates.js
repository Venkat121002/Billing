/**
 * WhatsApp message template registry (Meta Cloud API).
 *
 * Templates belong to the WhatsApp Business Account, not to this app, so Billing
 * uses the templates already approved on the SwordNex account (shared with JobSheet).
 * Names and parameters below were checked against the account on 2026-09-28:
 *   auth_code (AUTHENTICATION), bill_remainder, subscription_expired, invoice_created
 *
 * BILL_SUMMARY points at "bill_summary", which is NOT approved yet either (see below).
 *
 * DUES_PAY_LINK points at "dues_pay_link", which is NOT approved yet. It is only
 * sent when WHATSAPP_DUES_ENABLED=true. Create it in Meta Business Manager
 * (UTILITY, named body params listed below), then switch the flag on.
 *
 * Each entry returns { textFallback, metaTemplate: { name, languageCode, components } }.
 * textFallback is only used for console logging when WhatsApp is not configured.
 */

const SOFTWARE_NAME = 'SwordNex Billing';

const named = (params) =>
    Object.entries(params).map(([parameter_name, value]) => ({
        type: 'text',
        parameter_name,
        text: String(value)
    }));

const templates = {
    // auth_code: body {{1}} = code, plus a "Copy code" URL button that also takes the code.
    // Note: its fixed footer says "Expires in 10 minutes"; our signup OTP expires in 5.
    OTP_VERIFICATION: ({ otp = '' }) => ({
        textFallback: `${otp} is your verification code. For your security, do not share this code.`,
        metaTemplate: {
            name: 'auth_code',
            languageCode: 'en_US',
            components: [
                { type: 'body', parameters: [{ type: 'text', text: String(otp) }] },
                { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: String(otp) }] }
            ]
        }
    }),

    // bill_remainder: header customer_name; body software_name, days_left, plan_name, expiry_date.
    BILL_REMAINDER: ({ customer_name = 'Customer', plan_name = 'Standard', expiry_date = '', days_left = '3' }) => ({
        textFallback: `Hello ${customer_name}, your subscription for ${SOFTWARE_NAME} will expire in ${days_left} days. Plan: ${plan_name}. Expiry Date: ${expiry_date}.`,
        metaTemplate: {
            name: 'bill_remainder',
            languageCode: 'en_US',
            components: [
                { type: 'header', parameters: named({ customer_name }) },
                { type: 'body', parameters: named({ software_name: SOFTWARE_NAME, days_left, plan_name, expiry_date }) }
            ]
        }
    }),

    // subscription_expired: header customer_name; body software_name, plan_name, expiry_date.
    BILL_EXPIRED: ({ customer_name = 'Customer', plan_name = 'Standard', expiry_date = '' }) => ({
        textFallback: `Hello ${customer_name}, your subscription for ${SOFTWARE_NAME} has expired. Plan Name: ${plan_name}. Expired On: ${expiry_date}.`,
        metaTemplate: {
            name: 'subscription_expired',
            languageCode: 'en_US',
            components: [
                { type: 'header', parameters: named({ customer_name }) },
                { type: 'body', parameters: named({ software_name: SOFTWARE_NAME, plan_name, expiry_date }) }
            ]
        }
    }),

    // invoice_created: DOCUMENT header (the bill PDF, uploaded first -> document_id);
    // body customer_name, invoice_number, invoice_date, amount.
    INVOICE_CREATED: ({ customer_name = 'Customer', invoice_number = '', invoice_date = '', amount = '', document_id = '' }) => ({
        textFallback: `Hello ${customer_name}, your invoice has been created successfully. Invoice Number: ${invoice_number}. Invoice Date: ${invoice_date}. Amount: ${amount}. [PDF attached]`,
        metaTemplate: {
            name: 'invoice_created',
            languageCode: 'en_US',
            components: [
                {
                    type: 'header',
                    parameters: [{
                        type: 'document',
                        document: { id: document_id, filename: `Invoice_${invoice_number || 'bill'}.pdf` }
                    }]
                },
                { type: 'body', parameters: named({ customer_name, invoice_number, invoice_date, amount }) }
            ]
        }
    }),

    // NOT APPROVED YET. Create "bill_summary" (UTILITY, English) with named body params:
    //   customer_name, business_name, invoice_number, invoice_date, items, amount
    // Suggested body: "Hello {{customer_name}}, thank you for shopping at {{business_name}}.
    //   Bill No: {{invoice_number}} | Date: {{invoice_date}} | Items: {{items}} | Total: {{amount}}"
    // Only sent when WHATSAPP_BILL_TEXT_ENABLED=true (see utils/billDelivery.js).
    BILL_SUMMARY: ({ customer_name = 'Customer', business_name = SOFTWARE_NAME, invoice_number = '', invoice_date = '', items = '', amount = '' }) => ({
        textFallback: `Hello ${customer_name}, thank you for shopping at ${business_name}. Bill No: ${invoice_number} | Date: ${invoice_date} | Items: ${items} | Total: ${amount}`,
        metaTemplate: {
            name: 'bill_summary',
            languageCode: 'en_US',
            components: [
                { type: 'body', parameters: named({ customer_name, business_name, invoice_number, invoice_date, items, amount }) }
            ]
        }
    }),

    // NOT APPROVED YET. Create "dues_pay_link" (UTILITY) with named body params:
    //   customer_name, business_name, amount, pay_link
    DUES_PAY_LINK: ({ customer_name = 'Customer', business_name = SOFTWARE_NAME, amount = '', pay_link = '' }) => ({
        textFallback: `Hi ${customer_name}, ${business_name} has requested a payment of ${amount}. Pay securely here: ${pay_link}`,
        metaTemplate: {
            name: 'dues_pay_link',
            languageCode: 'en_US',
            components: [
                { type: 'body', parameters: named({ customer_name, business_name, amount, pay_link }) }
            ]
        }
    })
};

function compileTemplate(type, data) {
    const fn = templates[type];
    if (!fn) throw new Error(`WhatsApp template type "${type}" is not registered.`);
    return fn(data || {});
}

module.exports = { templates, compileTemplate };
