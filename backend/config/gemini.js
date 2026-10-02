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

const DEFAULT_MODELS = [
    'gemini-3.5-flash',
    'gemini-2.5-flash',
    'gemini-3-flash-preview',
    'gemini-flash-latest'
];

const getGeminiModel = (modelName = 'gemini-3.5-flash') => {
    const client = getGeminiClient();
    if (!client) return null;
    return client.getGenerativeModel({ model: modelName });
};

/**
 * Execute a promise with a hard timeout
 */
const withTimeout = (promise, ms = 15000, errorMsg = 'AI request timed out') => {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error(errorMsg)), ms))
    ]);
};

/**
 * Execute a prompt or generator with automatic model fallback and strict per-attempt timeout
 */
const generateWithFallback = async (runWithModel, candidateModels = DEFAULT_MODELS, timeoutMs = 15000) => {
    const client = getGeminiClient();
    if (!client) throw new Error('Gemini AI is not configured');

    let lastError = null;
    for (const modelName of candidateModels) {
        try {
            const model = client.getGenerativeModel({
                model: modelName,
                generationConfig: {
                    temperature: 0.1,
                    maxOutputTokens: 2048,
                    responseMimeType: "application/json"
                }
            });
            return await withTimeout(
                runWithModel(model, modelName),
                timeoutMs,
                `Model ${modelName} exceeded ${timeoutMs / 1000}s limit`
            );
        } catch (err) {
            lastError = err;
            console.warn(`⚠️ [Gemini] Model ${modelName} failed or timed out (${err.message}). Trying next...`);
        }
    }
    throw lastError || new Error('All Gemini model candidates failed');
};

module.exports = {
    isGeminiConfigured,
    getGeminiClient,
    getGeminiModel,
    generateWithFallback,
    getApiKey,
    DEFAULT_MODELS
};

