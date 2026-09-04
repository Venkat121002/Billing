const express = require("express");
const router = express.Router();

const jwt = require("jsonwebtoken");
const generateOTP = require("../utils/otpGenerator");
const sendEmail = require("../utils/emailService");


// 📩 SEND OTP (NO DB)
router.post("/send-otp", async (req, res) => {
  try {
    const { email } = req.body;

    const otp = generateOTP();
    
    // Create JWT token with OTP
    const token = jwt.sign(
      { email, otp },
      process.env.JWT_SECRET,
      { expiresIn: "1m" } // expires in 1 minute
    );

    // Send OTP Email
    await sendEmail({
      to: email,
      subject: "Your OTP Code",
      html: `
        <h2>Your OTP is: ${otp}</h2>
        <p>This OTP is valid for 1 minute.</p>
      `
    });

    res.json({
      message: "OTP sent successfully",
      token   // send token to frontend
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to send OTP" });
  }
});


// ✅ VERIFY OTP (NO DB)
router.post("/verify-otp", async (req, res) => {
  try {
    const { otp, token } = req.body;
   

    // Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.otp !== otp) {
      return res.status(400).json({ error: "Invalid OTP" });
    }

    // 🎉 Send Welcome Email
    await sendEmail({
      to: decoded.email,
      subject: "🎉 Welcome",
      html: `
        <h1>🎉 Welcome!</h1>
        <p>Your email has been successfully verified.</p>
        <p>You can now start using our application.</p>
      `
    });

    res.json({ message: "OTP verified & welcome email sent" });

  } catch (err) {
    return res.status(400).json({ error: "OTP expired or invalid" });
  }
});

// router.post("/welcome", async (req, res) => {
//   try {
//     const { email } = req.body;
//     console.log(email);
//     if (!email) {
//       return res.status(400).json({ error: "Email is required" });
//     }
//    await sendEmail({
//     to:email ,
//     subject: "Welcome",
//     htmlContent: `
//   <div style="font-family: Arial; text-align: center;">
//     <h1>Welcome to Swordnex 🎉</h1>
//     <p>You have successfully selected the Premium plan.</p>
//     <p>We are happy to have you onboard.</p>
//   </div>
// `
//   });


//    return res.json({ message: "subrcription email sent" });
   

//   } catch (err) {
//     console.log(err)
//    return res.status(500).json({ error: "message failed to send nbjhbhu" });
   
//   }
// });

router.post("/welcome", async (req, res) => {
 
  console.log("Incoming email:");
  try {
    const { email } = req.body;

    console.log("Incoming email:", email);

    if (!email) {
      return res.status(400).json({ error: "Email required" });
    }

    // send email logic
    await sendEmail({
      to: email,
      subject: "Welcome",
      html: "<h1>Welcome!</h1>",
    });

    res.status(200).json({ message: "Email sent" });

  } catch (error) {
    console.error("WELCOME ERROR:", error); // 🔥 VERY IMPORTANT

    res.status(500).json({
      error: "Internal Server Error",
      details: error.message, // helpful for debugging
    });
  }
});



module.exports = router;