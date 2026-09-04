const PLAN_LIMITS = {
    Trial: {
        invoiceLimit: 20,
        userLimit: 1,
        storageLimitMB: 100,
        expiryDays: 15,
        allowedFeatures: [
            'dashboard',
            'add_customers',
            'add_products',
            'create_invoices',
            'basic_reports',
            'gst_tax_basic',
            'manual_backup',
            'single_user'
        ]
    },
    Standard: {
        invoiceLimit: Infinity,
        userLimit: 2,
        storageLimitMB: 5120, // 5GB
        expiryDays: 30, // Renew monthly/yearly
        allowedFeatures: [
            'unlimited_invoices',
            'unlimited_customers_products',
            'expense_management',
            'inventory_tracking',
            'gst_reports',
            'monthly_backup',
            'multi_user_2',
            'email_invoice_manual',
            'basic_analytics',
            'receivables_payables'
        ]
    },
    Premium: {
        invoiceLimit: Infinity,
        userLimit: Infinity,
        storageLimitMB: Infinity,
        expiryDays: 30,
        allowedFeatures: ['all']
    }
};

module.exports = PLAN_LIMITS;
