
const app = require('./app');
const http = require('http');

// Try port 5000 to match Vite Proxy
const PORT = process.env.PORT || 5000;

console.log('🚀 Starting Development API Server...');

const server = http.createServer(app);

server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is ALREADY IN USE.`);
        console.error('This means an old server or Firebase Emulator is running.');
        console.error('Please STOP the other terminal/server and try again.');
        process.exit(1);
    } else {
        console.error('❌ Server Error:', e);
    }
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Development Server running on http://localhost:${PORT}`);
    console.log(`verify: curl http://localhost:${PORT}/api/auth/me`);
});
