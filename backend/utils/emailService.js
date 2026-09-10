const SibApiV3Sdk = require("sib-api-v3-sdk");

const PLACEHOLDER = /^\s*$|your_brevo|your_api_key|changeme/i;

function isConfigured() {
  return !!process.env.BREVO_API_KEY && !PLACEHOLDER.test(process.env.BREVO_API_KEY);
}

/**
 * Send a transactional email via Brevo.
 * No-op (logs and returns) when BREVO_API_KEY is not configured, so local
 * development runs without an email provider.
 *
 * @param {{to:string, subject:string, html?:string, htmlContent?:string,
 *          attachment?:{name:string, content:string}|Array}} opts
 */
async function sendEmail({ to, subject, html, htmlContent, attachment } = {}) {
  const body = html || htmlContent || "";

  if (!isConfigured()) {
    console.log("[emailService] no-op (no BREVO_API_KEY) →", { to, subject });
    return { skipped: true };
  }

  const client = SibApiV3Sdk.ApiClient.instance;
  client.authentications["api-key"].apiKey = process.env.BREVO_API_KEY;
  const tranEmailApi = new SibApiV3Sdk.TransactionalEmailsApi();

  const payload = {
    to: [{ email: to }],
    sender: {
      email: process.env.SENDER_EMAIL || "noreply@example.com",
      name: process.env.SENDER_NAME || "SwordNex Billing",
    },
    subject,
    htmlContent: body,
  };

  if (attachment) {
    payload.attachment = Array.isArray(attachment) ? attachment : [attachment];
  }

  return tranEmailApi.sendTransacEmail(payload);
}

// Support both `require('..')(...)` and `const { sendEmail } = require('..')`.
module.exports = sendEmail;
module.exports.sendEmail = sendEmail;
module.exports.isConfigured = isConfigured;
