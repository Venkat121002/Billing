const { Sequelize } = require('sequelize');

const passwords = ['postgres', 'password', 'admin', 'root', '123456', '12345678', ''];
const user = 'postgres';
const host = 'localhost';
const database = 'swordnex_billing';

async function testPasswords() {
    for (const pass of passwords) {
        console.log(`Testing password: '${pass}'...`);
        const sequelize = new Sequelize(database, user, pass, {
            host: host,
            dialect: 'postgres',
            logging: false
        });

        try {
            await sequelize.authenticate();
            console.log(`SUCCESS! The correct password is: '${pass}'`);
            process.exit(0);
        } catch (error) {
            console.log(`Failed: ${error.message}`);
        }
    }
    console.log('All passwords failed.');
    process.exit(1);
}

testPasswords();
