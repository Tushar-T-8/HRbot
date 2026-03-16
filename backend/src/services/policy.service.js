import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const xlsx = require('xlsx');

// Import pdfjs-dist for better PDF extraction
const pdfjsLib = import('pdfjs-dist/legacy/build/pdf.js');

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
/**
 * Smart chunking: section-aware, size-controlled, with overlap.
 * 1. Splits text into sections by headings (numbered: "1. …", or ALL-CAPS lines).
 * 2. Within each section, accumulates sentences until ~TARGET_CHUNK_SIZE chars.
 * 3. Adds ~OVERLAP_SIZE chars from the end of the previous chunk to the start of the next.
 * 4. Prefixes every chunk with its section heading for retrieval context.
 */
const TARGET_CHUNK_SIZE = 500;
const MAX_CHUNK_SIZE = 800;
const OVERLAP_SIZE = 100;

function smartChunkText(text, source) {
    const chunks = [];

    // Split into sections by numbered headings or ALL-CAPS header lines
    const sectionRegex = /(?=\n\s*\d+\.\s+[A-Za-z])|(?=\n[A-Z][A-Z\s\-]{3,}\n)/;
    const rawSections = text.split(sectionRegex).map(s => s.trim()).filter(s => s.length > 0);

    for (const section of rawSections) {
        const lines = section.split('\n');
        // Detect the section heading (first non-empty line)
        let heading = '';
        let bodyStartIndex = 0;
        for (let i = 0; i < lines.length; i++) {
            const trimmed = lines[i].trim();
            if (trimmed.length > 0) {
                // Check if it looks like a heading (numbered or ALL-CAPS)
                if (/^\d+\.\s+/.test(trimmed) || /^[A-Z][A-Z\s\-—]{3,}/.test(trimmed)) {
                    heading = trimmed;
                    bodyStartIndex = i + 1;
                }
                break;
            }
        }

        const bodyText = lines.slice(bodyStartIndex).join('\n').trim();
        if (bodyText.length === 0 && heading.length === 0) continue;

        // If the whole section (heading + body) fits in one chunk, keep it together
        const fullSection = heading ? `[${heading}]\n${bodyText}` : bodyText;
        if (fullSection.length <= MAX_CHUNK_SIZE) {
            if (fullSection.length > 15) {
                chunks.push(fullSection);
            }
            continue;
        }

        // Otherwise split the body into sentence-level pieces
        // Split on sentence boundaries (period/question/exclamation followed by space or newline) or bullet points
        const sentences = bodyText.split(/(?<=\.)\s+|(?<=\n)\s*(?=[-•*])/);
        let currentChunk = heading ? `[${heading}]\n` : '';
        let previousChunkTail = '';

        for (const sentence of sentences) {
            const trimmedSentence = sentence.trim();
            if (!trimmedSentence) continue;

            if (currentChunk.length + trimmedSentence.length > TARGET_CHUNK_SIZE && currentChunk.length > 50) {
                // Save current chunk
                chunks.push(currentChunk.trim());
                // Start new chunk with overlap from the tail of the previous
                previousChunkTail = currentChunk.slice(-OVERLAP_SIZE);
                currentChunk = heading
                    ? `[${heading}]\n${previousChunkTail}${trimmedSentence}\n`
                    : `${previousChunkTail}${trimmedSentence}\n`;
            } else {
                currentChunk += trimmedSentence + '\n';
            }
        }

        // Flush remaining text
        if (currentChunk.trim().length > 15) {
            chunks.push(currentChunk.trim());
        }
    }

    return chunks;
}

async function loadPolicyFiles() {
    const policiesDir = path.resolve(__dirname, '../../..', 'policies');
    const documents = [];

    try {
        const files = fs.readdirSync(policiesDir);

        for (const file of files) {
            // Index all supported document types: txt, pdf, and Excel
            if (!file.endsWith('.txt') && !file.endsWith('.pdf') && !file.endsWith('.xlsx') && !file.endsWith('.xls')) continue;

            const filePath = path.join(policiesDir, file);
            let content = '';

            if (file.endsWith('.pdf')) {
                const dataBuffer = new Uint8Array(fs.readFileSync(filePath));
                try {
                    const pdfjs = await pdfjsLib;
                    const loadingTask = pdfjs.getDocument({
                        data: dataBuffer,
                        useSystemFonts: true,
                        disableFontFace: true,
                    });
                    
                    const pdfDocument = await loadingTask.promise;
                    let fullText = '';
                    
                    for (let i = 1; i <= pdfDocument.numPages; i++) {
                        const page = await pdfDocument.getPage(i);
                        const textContent = await page.getTextContent();

                        // Smarter text extraction: detect line breaks from Y-position changes
                        let lastY = null;
                        let pageText = '';
                        for (const item of textContent.items) {
                            const y = item.transform ? item.transform[5] : null;
                            if (lastY !== null && y !== null && Math.abs(lastY - y) > 2) {
                                pageText += '\n'; // New line when Y position changes
                            } else if (pageText.length > 0 && !pageText.endsWith(' ') && !pageText.endsWith('\n')) {
                                pageText += ' ';
                            }
                            pageText += item.str;
                            lastY = y;
                        }
                        fullText += pageText + '\n\n'; // Page break
                    }
                    content = fullText;
                } catch (pdfErr) {
                    console.warn(`⚠️ Failed to parse PDF ${file}:`, pdfErr.message);
                    continue;
                }
            } else if (file.endsWith('.xlsx') || file.endsWith('.xls')) {
                try {
                    const workbook = xlsx.readFile(filePath);
                    for (const sheetName of workbook.SheetNames) {
                        const sheet = workbook.Sheets[sheetName];
                        const rows = xlsx.utils.sheet_to_json(sheet);
                        
                        // Treat each row as a document chunk
                        for (const row of rows) {
                            const rowText = Object.entries(row).map(([k, v]) => `${k}: ${v}`).join(', ');
                            if (rowText.length > 10) {
                                documents.push({
                                    text: `[Sheet: ${sheetName}] ${rowText}`,
                                    source: file,
                                });
                            }
                        }
                    }
                } catch (err) {
                    console.warn(`⚠️ Failed to parse Excel ${file}:`, err.message);
                }
                continue; // Skip the text chunking logic below since we already added the chunks
            } else {
                content = fs.readFileSync(filePath, 'utf-8');
            }

            // Use smart section-aware chunking with overlap
            const chunks = smartChunkText(content, file);

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
            const seenTexts = new Set();
            let effectiveIndex = 0;

            for (let i = 0; i < documents.length; i++) {
                const doc = documents[i];
                // Deduplicate identically-worded chunks to save processing
                if (seenTexts.has(doc.text)) continue;
                seenTexts.add(doc.text);

                const embedding = await generateEmbedding(doc.text);
                
                // Add tiny noise jitter to avoid 'kiddo' KD-tree identical position panics
                const jitteredEmbedding = embedding.map(val => val + (Math.random() - 0.5) * 1e-7);

                voyData.push({
                    id: String(effectiveIndex++),
                    title: doc.source,
                    url: doc.text, // Abusing URL field to store text, as Voy is simple
                    embeddings: jitteredEmbedding
                });

                // Yield to the Node.js event loop every 50 iterations so HTTP requests (like login) aren't blocked!
                if (i % 50 === 0) {
                    await new Promise(resolve => setTimeout(resolve, 0));
                }
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
    async searchPolicies(query, topN = 5) {
        if (!voyClient || !pipeline) {
            console.warn("Vector search not ready, falling back to basic search...");
            return "Vector search engine not initialized yet.";
        }

        try {
            // Generate embedding for the user's question
            const queryEmbedding = await generateEmbedding(query);

            // Search in Voy
            const rawResults = voyClient.search(queryEmbedding, topN);
            
            // Handle new Voy version structure (it often returns { neighbors: [...] })
            const results = rawResults.neighbors ? rawResults.neighbors : rawResults;

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
