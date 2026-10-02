/**
 * Google Gemini AI Configuration
 * Configured using the GEMINI_AI environment variable.
 */
const { GoogleGenerativeAI } = require('@google/generative-ai');

const PLACEHOLDER = /^\s*$|your_|changeme/i;

const getApiKey = () => process.env.GEMINI_AI || '';

const isGeminiConfigured = () => {
    const key = getApiKey();
    return !!key && !PLACEHOLDER.test(key);
};

let genAIInstance = null;

const getGeminiClient = () => {
    if (!isGeminiConfigured()) {
        console.warn('⚠️ [Gemini] GEMINI_AI environment variable is not configured or placeholder.');
        return null;
    }
    if (!genAIInstance) {
        genAIInstance = new GoogleGenerativeAI(getApiKey());
    }
    return genAIInstance;
};

const getGeminiModel = (modelName = 'gemini-1.5-flash') => {
    const client = getGeminiClient();
    if (!client) return null;
    return client.getGenerativeModel({ model: modelName });
};

module.exports = {
    isGeminiConfigured,
    getGeminiClient,
    getGeminiModel,
    getApiKey
};
