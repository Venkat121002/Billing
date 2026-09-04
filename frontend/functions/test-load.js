
console.log('Start loading index.js');
const start = Date.now();
try {
    require('./index.js');
    console.log('Successfully loaded index.js in ' + (Date.now() - start) + 'ms');
} catch (e) {
    console.error('Failed to load index.js:', e);
}
