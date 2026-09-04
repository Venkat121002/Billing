
const db = require('./models');

async function updateSchema() {
    try {
        console.log('Authenticating...');
        await db.sequelize.authenticate();
        console.log('Connection established.');

        console.log('Syncing schema (alter: true)...');
        await db.sequelize.sync({ alter: true });
        console.log('Schema updated successfully.');

        process.exit(0);
    } catch (error) {
        console.error('Unable to update schema:', error);
        process.exit(1);
    }
}

updateSchema();
