try {
    const index = require('./index');
    console.log('Successfully loaded index.js');
    console.log('Exports:', Object.keys(index));
    process.exit(0);
} catch (error) {
    console.error('Failed to load index.js', error);
    process.exit(1);
}
