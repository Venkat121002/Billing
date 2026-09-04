const SibApiV3Sdk = require("sib-api-v3-sdk");

const client = SibApiV3Sdk.ApiClient.instance;
const apiKey = client.authentications["api-key"];

apiKey.apiKey = process.env.BREVO_API_KEY;

const tranEmailApi = new SibApiV3Sdk.TransactionalEmailsApi();

const sendEmail = async ({ to, subject, html }) => {
  return tranEmailApi.sendTransacEmail({
    to: [{ email: to }],
    sender: {
      email: process.env.SENDER_EMAIL,
      name: "Your App"
    },
    subject,
    htmlContent: html
  });
};

module.exports = sendEmail;