import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// We need to keep the dynamic import for Voy as it is a WASM module
let voyClient = null;
let pipeline = null;

/**
 * Initialize Voy DB and Sentence Transformers
 */
async function initVectorSearch() {
    try {
        console.log("⏳ Initializing Voy Search and downloading embedding model (this may take a moment on first run)...");

        // 1. Initialize Transformers.js pipeline
        const transformers = await import('@xenova/transformers');
        const { pipeline: getPipeline } = transformers;

        // Use a lightweight, fast model suitable for Node.js
        pipeline = await getPipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

        // 2. Initialize Voy DB
        const voy = await import('voy-search/voy_search.js');
        voyClient = new voy.Voy({
            embeddings: [{ id: "init", title: "init", url: "init", embeddings: [0.0] }] // Voy requires an initial dummy structure
        });

        console.log("✅ Vector Search Environment Initialized");
    } catch (error) {
        console.error("❌ Failed to initialize Vector Search:", error);
    }
}

/**
 * Generate embeddings for a given text
 */
async function generateEmbedding(text) {
    if (!pipeline) throw new Error("Pipeline not initialized");
    const output = await pipeline(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
}

/**
 * Parse text content from policy files.
 * Extracts text from both .txt and .pdf files.
 */
async function loadPolicyFiles() {
    const policiesDir = path.resolve(__dirname, '../../..', 'policies');
    const documents = [];

    try {
        const files = fs.readdirSync(policiesDir);

        for (const file of files) {
            if (!file.endsWith('.txt') && !file.endsWith('.pdf')) continue;

            const filePath = path.join(policiesDir, file);
            let content = '';

            if (file.endsWith('.pdf')) {
                const dataBuffer = fs.readFileSync(filePath);
                try {
                    const data = await pdf(dataBuffer);
                    content = data.text;
                } catch (pdfErr) {
                    console.warn(`⚠️ Failed to parse PDF ${file}:`, pdfErr.message);
                    continue;
                }
            } else {
                content = fs.readFileSync(filePath, 'utf-8');
            }

            // Better chunking strategy: split by double newlines OR numbered lists/headers/bullets
            const chunks = content
                .split(/(?=\n\d+\.)|(?=\n[A-Z][A-Z\s-]+\n)|(?=\n\s*[-•*])|(?:\n\n+)/)
                .map(c => c.trim())
                .filter(c => c.length > 20);

            chunks.forEach((chunk) => {
                documents.push({
                    text: chunk,
                    source: file,
                });
            });
        }

        console.log(`📄 Loaded ${documents.length} policy chunks from ${files.length} files`);

        // Compute embeddings for Voy
        if (voyClient && pipeline) {
            console.log("Generating embeddings for policy chunks...");
            const voyData = [];
            for (let i = 0; i < documents.length; i++) {
                const doc = documents[i];
                const embedding = await generateEmbedding(doc.text);
                voyData.push({
                    id: String(i),
                    title: doc.source,
                    url: doc.text, // Abusing URL field to store text, as Voy is simple
                    embeddings: embedding
                });
            }

            // Re-instantiate Voy with actual data
            const voy = await import('voy-search/voy_search.js');
            voyClient = new voy.Voy({ embeddings: voyData });
            console.log("✅ Embeddings stored in memory.");
        }

    } catch (error) {
        console.warn('⚠️ Could not read policy files:', error.message);
    }

    return documents;
}

// Initialize in the background so the server can start immediately
let policyDocuments = [];
let initPromise = (async () => {
    await initVectorSearch();
    policyDocuments = await loadPolicyFiles();
})().catch(err => console.error('Background init failed:', err));


export const policyService = {
    /**
     * Search policies using Semantic Vector Matching (Voy).
     */
    async searchPolicies(query, topN = 3) {
        if (!voyClient || !pipeline) {
            console.warn("Vector search not ready, falling back to basic search...");
            return "Vector search engine not initialized yet.";
        }

        try {
            // Generate embedding for the user's question
            const queryEmbedding = await generateEmbedding(query);

            // Search in Voy
            const results = voyClient.search(queryEmbedding, topN);

            if (!results || results.length === 0) {
                return 'No relevant policy information found.';
            }

            // Format results
            const formattedResults = results.map(result => {
                return `[Source: ${result.title}]\n${result.url}`;
            });

            return formattedResults.join('\n\n---\n\n');
        } catch (error) {
            console.error("Search failed:", error);
            return 'No relevant policy information found due to search error.';
        }
    },

    /**
     * Get all loaded policy documents.
     */
    getAllPolicies() {
        return policyDocuments;
    },

    /**
     * Reload policies and re-embed from disk.
     */
    async reload() {
        policyDocuments = await loadPolicyFiles();
    },
};
