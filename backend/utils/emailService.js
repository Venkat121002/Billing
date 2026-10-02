const fs = require("fs");
const path = require("path");
const SibApiV3Sdk = require("sib-api-v3-sdk");
const nodemailer = require("nodemailer");

const PLACEHOLDER = /^\s*$|your_brevo|your_api_key|your_app_password|changeme/i;

const brevoConfigured = () =>
  !!process.env.BREVO_API_KEY && !PLACEHOLDER.test(process.env.BREVO_API_KEY);

// Free option: any SMTP server, e.g. a Gmail account with an App Password.
//   SMTP_USER=you@gmail.com  SMTP_PASS=<16-char app password>
//   (SMTP_HOST defaults to smtp.gmail.com, SMTP_PORT to 465)
const smtpConfigured = () =>
  !!process.env.SMTP_USER && !!process.env.SMTP_PASS && !PLACEHOLDER.test(process.env.SMTP_PASS);

function isConfigured() {
  return smtpConfigured() || brevoConfigured();
}

let smtpTransport = null;
function getSmtpTransport() {
  if (!smtpTransport) {
    const port = Number(process.env.SMTP_PORT) || 465;
    smtpTransport = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port,
      secure: port === 465,
      requireTLS: port !== 465,
      auth: {
        user: process.env.SMTP_USER,
        // Google shows app passwords with spaces; they are not part of the password.
        pass: String(process.env.SMTP_PASS).replace(/\s+/g, ""),
      },
    });
  }
  return smtpTransport;
}

/**
 * Send a transactional email. Uses SMTP (Nodemailer) when SMTP_USER/SMTP_PASS are
 * set, otherwise Brevo when BREVO_API_KEY is set.
 * No-op (logs and returns) when neither is configured, so local development runs
 * without an email provider.
 *
 * @param {{to:string, subject:string, html?:string, htmlContent?:string,
 *          attachment?:{name:string, content:string}|Array}} opts
 *        attachment content is base64, as with Brevo.
 */
async function sendEmail({ to, subject, html, htmlContent, text, textContent, attachment } = {}) {
  const body = html || htmlContent || "";
  const plainText = text || textContent || "";

  if (!isConfigured()) {
    console.log("[emailService] no-op (no SMTP or BREVO config) →", { to, subject });
    return { skipped: true };
  }

  const senderName = process.env.SENDER_NAME || "SwordNex Billing";
  const attachments = attachment ? (Array.isArray(attachment) ? attachment : [attachment]) : [];

  if (smtpConfigured()) {
    const inlineAttachments = [];
    const logoFile = path.resolve(__dirname, '../assets/company-logo.png');
    if (fs.existsSync(logoFile) && body.includes('cid:swordnex-company-logo')) {
      inlineAttachments.push({
        filename: 'company-logo.png',
        path: logoFile,
        cid: 'swordnex-company-logo'
      });
    }

    const mailOptions = {
      from: `"${senderName}" <${process.env.SENDER_EMAIL || process.env.SMTP_USER}>`,
      to,
      subject,
      html: body,
      attachments: [
        ...inlineAttachments,
        ...attachments.map((a) => ({
          filename: a.name,
          content: a.content,
          encoding: "base64",
        }))
      ],
    };
    if (plainText) {
      mailOptions.text = plainText;
    }
    return getSmtpTransport().sendMail(mailOptions);
  }

  const client = SibApiV3Sdk.ApiClient.instance;
  client.authentications["api-key"].apiKey = process.env.BREVO_API_KEY;
  const tranEmailApi = new SibApiV3Sdk.TransactionalEmailsApi();

  const payload = {
    to: [{ email: to }],
    sender: {
      email: process.env.SENDER_EMAIL || "noreply@example.com",
      name: senderName,
    },
    subject,
    htmlContent: body,
  };

  if (attachments.length) {
    payload.attachment = attachments;
  }

  return tranEmailApi.sendTransacEmail(payload);
}

// Support both `require('..')(...)` and `const { sendEmail } = require('..')`.
module.exports = sendEmail;
module.exports.sendEmail = sendEmail;
module.exports.isConfigured = isConfigured;
