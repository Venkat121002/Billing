
const db = require('./models');

console.log('Syncing database...');
db.sequelize.sync({ alter: true })
    .then(() => {
        console.log('✅ Database synced successfully');
        process.exit(0);
    })
    .catch((err) => {
        console.error('❌ Failed to sync database:', err);
        process.exit(1);
    });
