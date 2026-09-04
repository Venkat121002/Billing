const { exec } = require('child_process');

const PORT = 5003;

exec(`netstat -ano | findstr :${PORT}`, (err, stdout, stderr) => {
    if (err) {
        console.log(`No process found on port ${PORT}`);
        return;
    }

    const lines = stdout.trim().split('\n');
    lines.forEach(line => {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid) {
            console.log(`Killing PID ${pid} on port ${PORT}`);
            exec(`taskkill /F /PID ${pid}`, (kErr, kOut, kStderr) => {
                if (kErr) console.error(`Failed to kill ${pid}:`, kErr.message);
                else console.log(`Killed ${pid}`);
            });
        }
    });
});
