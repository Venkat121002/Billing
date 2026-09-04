require('dotenv').config({ path: '.env.custom' });
const { admin } = require('./config/firebase');

async function debugTenantAuth() {
    const tenantId = process.env.TENANT_ID;
    console.log("Tenant ID:", tenantId);
    
    try {
        const tenantAuth = admin.auth().tenantManager().authForTenant(tenantId);
        console.log("Tenant Auth object created successfully");
        
        // Try to list users or something benign
        const result = await tenantAuth.listUsers(1);
        console.log("Successfully connected to Tenant Auth. Users found:", result.users.length);
    } catch (err) {
        console.error("Firebase Tenant Auth Error:", err.message);
        if (err.code) console.error("Error Code:", err.code);
    }
}

debugTenantAuth();
