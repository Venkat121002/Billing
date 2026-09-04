const initBilling = () => {
    const PDFDocument = require('pdfkit');
    const nodemailer = require('nodemailer');
    const db = require('../models');
    const { Op } = require('sequelize');

    // Email Configuration (Should ideall be in env)
    const transporter = nodemailer.createTransport({
        host: 'smtp-relay.brevo.com',
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
            user: process.env.BREVO_SMTP_USER,
            pass: process.env.BREVO_SMTP_PASSWORD
        }
    });

    return {
        PDFDocument,
        transporter,
        db,
        Op,
        BillingHistory: db.BillingHistory,
        Tenant: db.Tenant,
        User: db.User
    };
};

// Helper: Generate PDF Buffer (Lazy loaded requires moved to caller or passed in? 
// PDFDocument is used here. So it must be available. 
// I will pass PDFDocument as arg or require it inside.)
const generateInvoicePDF = (invoiceData) => {
    const PDFDocument = require('pdfkit'); // Lazy require here
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50 });
        const buffers = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        // Header
        doc.fillColor('#444444')
            .fontSize(20)
            .text('INVOICE', 50, 57)
            .fontSize(10)
            .text('SwordNex', 200, 50, { align: 'right' })
            .text('noreply@swordnex.com', 200, 65, { align: 'right' })
            .moveDown();

        // Customer Info
        doc.text(`Invoice Number: ${invoiceData.invoice_number}`, 50, 200)
            .text(`Invoice Date: ${new Date().toLocaleDateString()}`, 50, 215)
            .text(`Bill To: ${invoiceData.customer_name}`, 300, 200)
            .text(`Email: ${invoiceData.email}`, 300, 215)
            .moveDown();

        // Table Header
        const invoiceTableTop = 330;
        doc.font("Helvetica-Bold");
        doc.text("Description", 50, invoiceTableTop);
        doc.text("Amount", 400, invoiceTableTop, { align: "right" });
        doc.font("Helvetica");

        // Item
        const itemTop = invoiceTableTop + 25;
        doc.text(`${invoiceData.plan_name} Plan - ${invoiceData.type}`, 50, itemTop);
        doc.text(`Rs. ${invoiceData.amount}`, 400, itemTop, { align: "right" });

        // Total
        const totalTop = itemTop + 30;
        doc.font("Helvetica-Bold");
        doc.text("Total:", 300, totalTop);
        doc.text(`Rs. ${invoiceData.amount}`, 400, totalTop, { align: "right" });

        // Footer
        doc.fontSize(10).text(
            'Thank you for your business.',
            50,
            700,
            { align: 'center', width: 500 }
        );

        doc.end();
    });
};

// Start Payment Success (Immediate)
exports.handlePaymentSuccess = async (req, res) => {
    try {
        const { BillingHistory, Tenant, User, transporter } = initBilling();
        const { paymentId, plan, amount, billingCycle } = req.body;
        const tenantId = req.user.tenant_id;

        // Fetch Tenant/User details
        const tenant = await Tenant.findByPk(tenantId);
        const user = await User.findOne({ where: { tenant_id: tenantId, role: 'TenantAdmin' } }); // Assuming main admin pays?

        if (!tenant || !user) return res.status(404).json({ msg: 'Tenant not found' });

        const invoiceNumber = `SN-${Date.now()}`;

        const invoiceData = {
            invoice_number: invoiceNumber,
            customer_name: tenant.name,
            email: user.email,
            plan_name: plan,
            amount: amount,
            type: 'Subscription',
            date: new Date()
        };

        // 1. Generate PDF
        const pdfBuffer = await generateInvoicePDF(invoiceData);

        // 2. Send Email
        await transporter.sendMail({
            from: '"SwordNex" <noreply@swordnex.com>',
            to: user.email,
            subject: 'Your SwordNex Invoice',
            html: `<p>Dear ${tenant.name},</p><p>Thank you for your payment. Please find your invoice attached.</p>`,
            attachments: [
                {
                    filename: `Invoice-${invoiceNumber}.pdf`,
                    content: pdfBuffer,
                    contentType: 'application/pdf'
                }
            ]
        });

        // 3. Save to History
        await BillingHistory.create({
            tenant_id: tenantId,
            invoice_number: invoiceNumber,
            amount: amount,
            plan_name: plan,
            billing_cycle: billingCycle || 'Monthly',
            status: 'Paid',
            payment_id: paymentId,
            invoice_date: new Date()
        });

        res.json({ success: true, msg: 'Invoice processed' });

    } catch (err) {
        console.error("Payment Record Error:", err);
        res.status(500).json({ msg: 'Failed to record payment' });
    }
};

// Monthly Scheduler Logic
exports.runMonthlyBilling = async () => {
    console.log("Running Monthly Billing Job...");
    const { BillingHistory, Tenant, User, Op, transporter } = initBilling();

    // Logic: Find Active Tenants with Standard/Premium Plans
    const activeTenants = await Tenant.findAll({
        where: {
            subscription_status: 'Active',
            subscription_plan: {
                [Op.or]: ['Standard', 'Premium']
            }
        },
        include: [{ model: User }] // To get email
    });

    console.log(`Found ${activeTenants.length} tenants for billing.`);

    for (const tenant of activeTenants) {
        try {
            // Determine Price
            let price = 0;
            if (tenant.subscription_plan === 'Standard') price = 10; // Current logic
            if (tenant.subscription_plan === 'Premium') price = 10;

            const adminUser = await User.findOne({ where: { tenant_id: tenant.id, role: 'TenantAdmin' } });
            if (!adminUser) continue;

            const invoiceNumber = `SN-MTH-${Date.now()}-${tenant.id.substring(0, 4)}`;

            const invoiceData = {
                invoice_number: invoiceNumber,
                customer_name: tenant.name,
                email: adminUser.email,
                plan_name: tenant.subscription_plan,
                amount: price,
                type: 'Monthly Renewal'
            };

            const pdfBuffer = await generateInvoicePDF(invoiceData);

            await transporter.sendMail({
                from: '"SwordNex" <noreply@swordnex.com>',
                to: adminUser.email,
                subject: 'Your Monthly SwordNex Invoice',
                html: `<p>Dear ${tenant.name},</p><p>Here is your monthly invoice for the ${tenant.subscription_plan} plan.</p>`,
                attachments: [
                    {
                        filename: `Invoice-${invoiceNumber}.pdf`,
                        content: pdfBuffer,
                        contentType: 'application/pdf'
                    }
                ]
            });

            await BillingHistory.create({
                tenant_id: tenant.id,
                invoice_number: invoiceNumber,
                amount: price,
                plan_name: tenant.subscription_plan,
                billing_cycle: 'Monthly',
                status: 'Paid', // Assuming auto-charge or marking as invoiced
                invoice_date: new Date()
            });

            console.log(`Processed billing for ${tenant.name}`);

        } catch (err) {
            console.error(`Failed billing for tenant ${tenant.id}:`, err);
        }
    }
};

// Get History Endpoint
exports.getBillingHistory = async (req, res) => {
    try {
        const { BillingHistory } = initBilling();
        const history = await BillingHistory.findAll({
            where: { tenant_id: req.user.tenant_id },
            order: [['invoice_date', 'DESC']]
        });
        res.json(history);
    } catch (err) {
        res.status(500).json({ msg: 'Server Error' });
    }
};

// Download Invoice Endpoint (Re-generate PDF)
exports.downloadInvoice = async (req, res) => {
    try {
        const { BillingHistory, Tenant, User } = initBilling();
        const { invoiceId } = req.params; // Expecting ID or Invoice Number. Let's use ID from DB for safety or invoice_number.
        // Assuming params has ID of the BillingHistory record

        const record = await BillingHistory.findOne({
            where: {
                id: invoiceId, // or invoice_number depending on route
                tenant_id: req.user.tenant_id // Security check
            }
        });

        if (!record) return res.status(404).json({ msg: 'Invoice not found' });

        const tenant = await Tenant.findByPk(record.tenant_id);
        const user = await User.findOne({ where: { tenant_id: record.tenant_id, role: 'TenantAdmin' } });

        const invoiceData = {
            invoice_number: record.invoice_number,
            customer_name: tenant ? tenant.name : 'Valued Customer',
            email: user ? user.email : '',
            plan_name: record.plan_name,
            amount: record.amount,
            type: record.billing_cycle === 'Monthly' ? 'Monthly Renewal' : 'Subscription',
            date: record.invoice_date
        };

        const pdfBuffer = await generateInvoicePDF(invoiceData);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="Invoice-${record.invoice_number}.pdf"`); // Inline to view in browser
        res.send(pdfBuffer);

    } catch (err) {
        console.error("Download Invoice Error:", err);
        res.status(500).json({ msg: 'Failed to generate invoice PDF' });
    }
};
