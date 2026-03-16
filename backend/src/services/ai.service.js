import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load prompts dynamically
const promptsPath = path.join(__dirname, '../config/prompts.json');
let prompts = {};
try {
    prompts = JSON.parse(fs.readFileSync(promptsPath, 'utf8'));
} catch (e) {
    console.warn('⚠️ Could not load prompts.json', e.message);
}

const OPENAI_API_KEY = process.env.OPEN_API_KEY || '';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

export const aiService = {
    /**
     * Generate a response using OpenAI API with streaming.
     * Falls back to smart policy-aware responses if OpenAI is unavailable.
     */
    async *generateResponseStream(prompt, context = '', employeeProfile = null) {
        let systemMessage = '';
        
        // Compile all the rules from the newly structured prompts.json into one master instruction block
        const buildMasterPrompt = () => {
            let compiled = '';
            for (const [key, ruleset] of Object.entries(prompts)) {
                // Ensure we only append actual prompt strings, avoiding metadata
                if (ruleset && ruleset.prompt) {
                    compiled += `[${key.toUpperCase()}]: ${ruleset.prompt}\n`;
                }
            }
            return compiled;
        };

        const masterPrompt = buildMasterPrompt();

        if (employeeProfile) {
            systemMessage = `${masterPrompt}\n\nCURRENT USER DATA:\nName: ${employeeProfile.name}\nRole: ${employeeProfile.role}\nDepartment: ${employeeProfile.department}\nLeave Balance: ${employeeProfile.leaveBalance} days\n\nPOLICY CONTEXT:\n${context}`;
        } else {
            systemMessage = `${masterPrompt}\n\nPOLICY CONTEXT:\n${context}`;
        }

        if (!OPENAI_API_KEY) {
            console.error('❌ OPEN_API_KEY not set in .env');
            const fallbackText = this.generateFromContext(prompt, context);
            const words = fallbackText.split(' ');
            for (const word of words) {
                yield word + ' ';
                await new Promise(r => setTimeout(r, 20));
            }
            return;
        }

        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                },
                body: JSON.stringify({
                    model: OPENAI_MODEL,
                    messages: [
                        { role: 'system', content: systemMessage },
                        { role: 'user', content: prompt }
                    ],
                    temperature: 0.2,
                    max_tokens: 512,
                    stream: true,
                })
            });

            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`OpenAI error ${response.status}: ${errorBody}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let buffer = '';

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');

                // Keep the last partial line in the buffer
                buffer = lines.pop() || '';

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (trimmed === '' || trimmed === 'data: [DONE]') continue;

                    if (trimmed.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(trimmed.slice(6));
                            const content = data.choices?.[0]?.delta?.content || '';
                            if (content) {
                                yield content;
                            }
                        } catch (e) {
                            // Ignore parse errors for incomplete JSON
                        }
                    }
                }
            }
        } catch (error) {
            console.error('❌ OpenAI Error:', error?.message || error);
            // Fallback to context-based response if OpenAI fails
            const fallbackText = this.generateFromContext(prompt, context);
            const words = fallbackText.split(' ');
            for (const word of words) {
                yield word + ' ';
                await new Promise(r => setTimeout(r, 20));
            }
        }
    },

    /**
     * Generate a structured answer directly from policy context
     * when OpenAI/LLM is unavailable.
     */
    generateFromContext(prompt, context) {
        if (!context || context === 'No relevant policy information found.') {
            return this.getGenericResponse(prompt);
        }

        // 1. Separate the context back into individual chunks (they are joined by \n\n---\n\n)
        const rawChunks = context.split('\n\n---\n\n');

        // 2. Clean up the BEST chunk (the first one)
        const bestChunkRaw = rawChunks[0] || '';
        const cleanChunk = bestChunkRaw
            .replace(/\[Source: [^\]]+\]/g, '') // Remove [Source: file.pdf]
            .trim();

        const lower = prompt.toLowerCase();

        // Build a structured answer from the policy context
        let intro = '';

        if (lower.includes('leave') || lower.includes('vacation') || lower.includes('time off')) {
            intro = 'Here\'s what our leave policy says:';
        } else if (lower.includes('work from home') || lower.includes('wfh') || lower.includes('remote')) {
            intro = 'Here\'s what our work-from-home policy covers:';
        } else if (lower.includes('benefit') || lower.includes('insurance') || lower.includes('health') || lower.includes('wellness')) {
            intro = 'Here\'s the relevant information from our benefits policy:';
        } else if (lower.includes('sick')) {
            intro = 'Here\'s what our policy says about sick leave:';
        } else if (lower.includes('parental') || lower.includes('maternity') || lower.includes('paternity')) {
            intro = 'Here\'s what our policy says about parental leave:';
        } else {
            intro = 'Based on our company policies, here\'s what I found:';
        }

        // The chunks are already split, so we just use the cleanChunk we extracted
        return `${intro}\n\n${cleanChunk}\n\nWould you like more details on any specific aspect?`;
    },

    /**
     * Generic response when no policy context is available.
     */
    getGenericResponse(prompt) {
        const lower = prompt.toLowerCase();

        if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
            return (prompts.fallbacks?.greetings || ['Hello! 👋 How can I help you?']).join('\n');
        }

        if (lower.includes('thank')) {
            return (prompts.fallbacks?.thanks || ['You\'re welcome!']).join('\n');
        }

        return (prompts.fallbacks?.default || ['I am an HR assistant.']).join('\n');
    },
};
