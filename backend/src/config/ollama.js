// OpenAI Configuration (migrated from Ollama)
export const OPENAI_API_KEY = process.env.OPEN_API_KEY || '';
export const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

export const openaiConfig = {
    apiKey: OPENAI_API_KEY,
    model: OPENAI_MODEL,
    baseUrl: 'https://api.openai.com/v1',
    chatUrl: 'https://api.openai.com/v1/chat/completions',
};
