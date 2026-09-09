const mongoose = require('mongoose');

let isConnected = false;

const connectMongoDB = async () => {
    if (isConnected) {
        console.log('✅ MongoDB already connected');
        return;
    }

    const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/swordnex_billing_dev';

    try {
        await mongoose.connect(mongoURI);

        isConnected = true;
        console.log(`🚀 Connected to Local MongoDB: ${mongoose.connection.db.databaseName}`);

        // Handle connection events
        mongoose.connection.on('error', (err) => {
            console.error('❌ MongoDB connection error:', err);
            isConnected = false;
        });

        mongoose.connection.on('disconnected', () => {
            console.warn('⚠️ MongoDB disconnected. Attempting to reconnect...');
            isConnected = false;
        });

        mongoose.connection.on('reconnected', () => {
            console.log('✅ MongoDB reconnected');
            isConnected = true;
        });

    } catch (error) {
        console.error('❌ Failed to connect to MongoDB:', error.message);
        console.error('💡 Make sure MongoDB is running on', mongoURI);
        throw error;
    }
};

// Graceful shutdown
const disconnectMongoDB = async () => {
    if (!isConnected) return;

    try {
        await mongoose.connection.close();
        isConnected = false;
        console.log('🔌 MongoDB connection closed');
    } catch (error) {
        console.error('❌ Error closing MongoDB connection:', error);
    }
};

// Handle process termination
process.on('SIGINT', async () => {
    await disconnectMongoDB();
    process.exit(0);
});

module.exports = {
    connectMongoDB,
    disconnectMongoDB,
    mongoose,
    isConnected: () => isConnected
};
