const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');
dotenv.config({ quiet: true });

// ⬇️ Your Neon PostgreSQL Cloud Database Credentials
// const DB_HOST = "ep-empty-art-a1j1uytp-pooler.ap-southeast-1.aws.neon.tech";
// const DB_USER = "neondb_owner";
// const DB_PASS = "npg_7vkzPuwpRZX9";
// const DB_NAME = "neondb";

// ⬇️ Singleton Lazy Initialization
let sequelize = null;

const getSequelize = () => {
    if (!sequelize) {
        console.log("🔌 Initializing DB Connection...");
        sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
            host: DB_HOST,
            dialect: 'postgres',
            logging: false,
            dialectOptions: {
                ssl: {
                    require: true,
                    rejectUnauthorized: false
                }
            },
            pool: {
                max: 10,
                min: 0,
                acquire: 30000,
                idle: 10000
            }
        });
    }
    return sequelize;
};

module.exports = getSequelize;
