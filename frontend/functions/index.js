const { onCall, onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");


const initAdmin = () => {
  const admin = require("firebase-admin");
  if (!admin.apps.length) {
    admin.initializeApp();
  }
  return admin;
};

// Send OTP Function
exports.sendOTP = onRequest(async (req, res) => {
  const axios = require('axios'); // Lazy load
  // Manually handle CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, api-key');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  const { email, otp } = req.body;
  const BREVO_API_KEY = process.env.BREVO_API_KEY;

  if (!email || !otp) {
    return res.status(400).json({ success: false, message: "Email or OTP missing" });
  }

  try {
    await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: { name: "SwordNex Billing", email: "noreply@swordnex.com" },
        to: [{ email }],
        subject: "Your SwordNex OTP Code",
        htmlContent: `<div style="font-family: Arial, sans-serif;">
            <h2>SwordNex OTP Verification</h2>
            <p>Your OTP is <strong style="font-size: 1.2em;">${otp}</strong>.</p>
            <p>Valid for 10 minutes.</p>
          </div>`
      },
      {
        headers: {
          "api-key": process.env.BREVO_API_KEY,
          "Content-Type": "application/json"
        }
      }
    );

    return res.json({ success: true, message: "OTP sent" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Failed to send OTP" });
  }
});

// Resend OTP Function
exports.resendOTP = onCall({ cors: true, invoker: 'public', enforceAppCheck: false }, async (request) => {
  const data = request.data;

  if (!data.email || !data.otp) {
    const { HttpsError } = require("firebase-functions/v2/https");
    throw new HttpsError('invalid-argument', 'Email and OTP are required');
  }

  const { email, otp } = data;

  try {
    const nodemailer = require('nodemailer'); // Lazy load
    const transporter = nodemailer.createTransport({
      host: 'smtp-relay.brevo.com',
      port: 587,
      secure: false,
      auth: {
          user: process.env.BREVO_SMTP_USER,
          pass: process.env.BREVO_SMTP_PASSWORD
      }
    });

    await transporter.sendMail({
      from: '"SwordNex" <noreply@swordnex.com>',
      to: email,
      subject: 'Your OTP Code - SwordNex',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">SwordNex OTP Verification</h2>
          <p>Your One-Time Password (OTP) is:</p>
          <div style="background: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
            ${otp}
          </div>
          <p>This OTP will expire in 10 minutes.</p>
        </div>
      `
    });

    return { success: true, message: 'OTP resent successfully' };
  } catch (error) {
    const { HttpsError } = require("firebase-functions/v2/https");
    throw new HttpsError('internal', 'Failed to resend OTP email: ' + error.message);
  }
});

// Scheduled Monthly Billing Job (1st of every month)
/* Temporarily commented out to debug deployment timeout
exports.monthlyInvoiceJob = onSchedule({
  schedule: "0 0 1 * *",
  timeZone: "Asia/Kolkata",
  memory: '512MiB',
  timeoutSeconds: 60,
}, async (event) => {
  const billingController = require('./controllers/billingController');
  initAdmin();
  console.log("Starting Monthly Invoice Job...");
  await billingController.runMonthlyBilling();
  console.log("Monthly Invoice Job Completed.");
});
*/

// Monthly Trainer Salary Deduction Job (1st of every month) for Academy Industry
exports.trainerSalaryJob = onSchedule({
  schedule: "0 0 1 * *", // Runs at 00:00 on the 1st day of every month
  timeZone: "Asia/Kolkata", // Set to your target timezone
  memory: '512MiB',
  timeoutSeconds: 300,
}, async (event) => {
  const admin = initAdmin();
  const db = admin.firestore();
  console.log("Starting Monthly Trainer Salary Deduction Job for Academies...");

  try {
    // 1. Fetch all users belonging to the 'academy' industry
    const usersSnapshot = await db.collection('users').where('industry', '==', 'academy').get();

    if (usersSnapshot.empty) {
      console.log("No academy users found. Job finished.");
      return;
    }

    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    // Use a batch for atomic writes
    const batch = db.batch();
    let deductionsToProcess = 0;

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const trainersRef = db.collection('users').doc(userId).collection('suppliers');
      const transactionsRef = db.collection('users').doc(userId).collection('transactions');

      // 2. Check if deduction already happened this month to ensure idempotency
      const existingTxnSnapshot = await transactionsRef
        .where('category', '==', 'Trainer Salary')
        .where('date', '>=', admin.firestore.Timestamp.fromDate(startOfMonth))
        .where('date', '<=', admin.firestore.Timestamp.fromDate(endOfMonth))
        .limit(1)
        .get();

      if (!existingTxnSnapshot.empty) {
        console.log(`Salary deduction already exists for user ${userId} for this month. Skipping.`);
        continue;
      }

      // 3. Fetch all Trainers for this user and calculate total salary
      const trainersSnapshot = await trainersRef.get();
      if (trainersSnapshot.empty) continue;

      let totalSalary = 0;
      trainersSnapshot.forEach(trainerDoc => {
        const data = trainerDoc.data();
        const salary = parseFloat(data.paymentMode || 0);
        if (!isNaN(salary) && salary > 0) totalSalary += salary;
      });

      if (totalSalary > 0) {
        // 4. Add the salary deduction as an 'expense' to the cashbook
        const newTxnRef = transactionsRef.doc();
        batch.set(newTxnRef, {
          type: 'expense', category: 'Trainer Salary', amount: totalSalary,
          date: admin.firestore.Timestamp.fromDate(today),
          description: `Auto-deduction: Monthly Trainer Salary for ${today.toLocaleString('default', { month: 'long' })}`,
          paymentMethod: 'System', status: 'completed', createdBy: 'system',
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        deductionsToProcess++;
        console.log(`Queued salary deduction of ${totalSalary} for user ${userId}`);
      }
    }

    if (deductionsToProcess > 0) {
      await batch.commit();
      console.log(`Successfully processed salary deductions for ${deductionsToProcess} academies.`);
    } else {
      console.log("No new salary deductions were required.");
    }

  } catch (error) {
    console.error("Error in Trainer Salary Job:", error);
  }
});

// Export the Express app as a Cloud Function (Lazy Load)
exports.api = onRequest({ memory: '512MiB', timeoutSeconds: 120 }, (req, res) => {
  // Lazy load app to prevent deployment timeouts
  initAdmin();

  // 🟢 FORCE RELOAD IN EMULATOR: Clear cache to pick up app.js changes
  if (process.env.FUNCTIONS_EMULATOR) {
    const appPath = require.resolve('./app');
    if (require.cache[appPath]) {
      delete require.cache[appPath];
    }
  }

  const app = require('./app');
  return app(req, res);
});


// Send Brevo Template Email
exports.sendBrevoTemplateEmail = onRequest(async (req, res) => {
  const axios = require("axios");

  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).send("");
  }

  const { templateKey, data } = req.body;

  if (!templateKey || !data || !data.to) {
    return res.status(400).json({
      success: false,
      message: "Template key and recipient email are required",
    });
  }

  const templateIdMap = {
    template_reminder: 5,
    template_expired: 4,
    template_payment_success: 6,
  };

  const templateId = templateIdMap[templateKey];

  if (!templateId) {
    return res.status(400).json({
      success: false,
      message: "Invalid email template",
    });
  }

  try {
    await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: {
          name: "SwordNex Team",
          email: "no-reply@yourdomain.com",
        },
        to: [
          {
            email: data.to,
            name: data.name,
          },
        ],
        templateId,
        params: {
          NAME: data.name,
          PLAN: data.plan,
          DAYS_LEFT: data.daysLeft,
          EXPIRY_DATE: data.expiryDate,
          START_DATE: data.startDate,
        },
      },
      {
        headers: {
          "Content-Type": "application/json",
          "api-key": process.env.BREVO_API_KEY,
        },
      }
    );

    return res.status(200).json({
      success: true,
      message: "Email sent successfully",
    });
  } catch (error) {
    console.error(
      "Brevo template email error:",
      error.response?.data || error.message
    );

    return res.status(500).json({
      success: false,
      message: "Failed to send email",
    });
  }
});