const Sequelize = require('sequelize');
const getSequelize = require('../config/db');

const db = {};

// Initialize lazily
const sequelize = getSequelize();

db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Import models
db.Tenant = require('./tenant')(sequelize, Sequelize);
db.User = require('./user')(sequelize, Sequelize);
db.Site = require('./site')(sequelize, Sequelize);
db.Subscription = require('./subscription')(sequelize, Sequelize);
db.Invoice = require('./invoice')(sequelize, Sequelize);
db.UserSession = require('./UserSession')(sequelize, Sequelize);

// Define associations
// Tenant has many Users
db.Tenant.hasMany(db.User, { foreignKey: 'tenant_id' });
db.User.belongsTo(db.Tenant, { foreignKey: 'tenant_id' });

// User has many Sessions
db.User.hasMany(db.UserSession, { foreignKey: 'user_id' });
db.UserSession.belongsTo(db.User, { foreignKey: 'user_id' });

// Tenant has many Sessions
db.Tenant.hasMany(db.UserSession, { foreignKey: 'tenant_id' });
db.UserSession.belongsTo(db.Tenant, { foreignKey: 'tenant_id' });

// Tenant has many Sites
db.Tenant.hasMany(db.Site, { foreignKey: 'tenant_id' });
db.Site.belongsTo(db.Tenant, { foreignKey: 'tenant_id' });

// Tenant has one Subscription
db.Tenant.hasOne(db.Subscription, { foreignKey: 'tenant_id' });
db.Subscription.belongsTo(db.Tenant, { foreignKey: 'tenant_id' });

// Site has many Users (optional, if users are site-specific)
db.Site.hasMany(db.User, { foreignKey: 'site_id' });
db.User.belongsTo(db.Site, { foreignKey: 'site_id' });

// Tenant has many Invoices
db.Tenant.hasMany(db.Invoice, { foreignKey: 'tenant_id' });
db.Invoice.belongsTo(db.Tenant, { foreignKey: 'tenant_id' });

// Site has many Invoices
db.Site.hasMany(db.Invoice, { foreignKey: 'site_id' });
db.Invoice.belongsTo(db.Site, { foreignKey: 'site_id' });

// Billing History
db.BillingHistory = require('./BillingHistory')(sequelize, Sequelize);

// Associations
// Tenant has many BillingHistory items
db.Tenant.hasMany(db.BillingHistory, { foreignKey: 'tenant_id' });
db.BillingHistory.belongsTo(db.Tenant, { foreignKey: 'tenant_id' });

// Notification system
db.Notification = require('./notification')(sequelize, Sequelize);
db.User.hasMany(db.Notification, { foreignKey: 'created_by' });
db.Notification.belongsTo(db.User, { foreignKey: 'created_by' });

module.exports = db;
