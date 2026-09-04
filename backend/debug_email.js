const dotenv = require('dotenv');
const path = require('path');
// Try loading .env.custom first, fallback to .env if you prefer, or just switch the line below
dotenv.config({ path: path.join(__dirname, '.env.custom') });
// dotenv.config({ path: path.join(__dirname, '.env') });


const { sendEmail } = require('./utils/emailService');

const testEmail = async () => {
    console.log("BREVO_API_KEY:", process.env.BREVO_API_KEY);
    console.log("Starting email test...");
    console.log("Using API Key:", process.env.BREVO_API_KEY ? "EXISTS (Starts with " + process.env.BREVO_API_KEY.substring(0, 10) + "...)" : "MISSING");

    try {
        const result = await sendEmail({
            to: "vikramsuriy@gmail.com",
            subject: "Debug Email Test",
            htmlContent: "<h1>Debug Test</h1><p>This is a test from the debug script.</p>"
        });
        console.log("Success result:", result);
    } catch (error) {
        console.error("Test failed with error:", error.message);
    }
};

testEmail();
