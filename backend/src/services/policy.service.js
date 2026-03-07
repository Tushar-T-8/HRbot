import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
    } catch (error) {
        console.warn('⚠️ Could not read policy files:', error.message);
    }

    return documents;
}

// Load policies once at startup
const policyDocuments = await loadPolicyFiles();

export const policyService = {
    /**
     * Search policies using keyword matching.
     * Scores each chunk by how many query keywords it contains,
     * then returns the top results as context for the AI.
     */
    searchPolicies(query, topN = 3) {
        const keywords = query
            .toLowerCase()
            .replace(/[?.,!]/g, '')
            .split(/\s+/)
            .filter((w) => w.length > 2); // skip tiny words

        const scored = policyDocuments.map((doc) => {
            const lower = doc.text.toLowerCase();
            let score = 0;

            for (const kw of keywords) {
                if (lower.includes(kw)) score += 1;
                // Boost exact phrase matches
                if (lower.includes(query.toLowerCase().slice(0, 20))) score += 2;
            }

            return { ...doc, score };
        });

        scored.sort((a, b) => b.score - a.score);

        const results = scored
            .filter((d) => d.score > 0)
            .slice(0, topN)
            .map((d) => `[Source: ${d.source}]\n${d.text}`);

        return results.join('\n\n---\n\n') || 'No relevant policy information found.';
    },

    /**
     * Get all loaded policy documents.
     */
    getAllPolicies() {
        return policyDocuments;
    },

    /**
     * Reload policies from disk (useful after adding new files).
     */
    async reload() {
        policyDocuments.length = 0;
        const newDocs = await loadPolicyFiles();
        policyDocuments.push(...newDocs);
    },
};
