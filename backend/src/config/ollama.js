export const OLLAMA_BASE_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
export const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3';

export const ollamaConfig = {
    baseUrl: OLLAMA_BASE_URL,
    model: OLLAMA_MODEL,
    generateUrl: `${OLLAMA_BASE_URL}/api/generate`,
    embeddingsUrl: `${OLLAMA_BASE_URL}/api/embeddings`,
};
