/*
const Sequelize = require('sequelize');
const sequelize = require('../config/db');

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Import models
db.Tenant = require('./tenant')(sequelize, Sequelize);
db.User = require('./user')(sequelize, Sequelize);
db.Site = require('./site')(sequelize, Sequelize);
db.Subscription = require('./subscription')(sequelize, Sequelize);
db.Invoice = require('./invoice')(sequelize, Sequelize);

// Define associations
// Tenant has many Users
db.Tenant.hasMany(db.User, { foreignKey: 'tenant_id' });
db.User.belongsTo(db.Tenant, { foreignKey: 'tenant_id' });

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

module.exports = db;
*/
module.exports = {};

