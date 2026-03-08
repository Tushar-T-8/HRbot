import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const aiService = {
    /**
     * Generate a response using Ollama API directly.
     * Falls back to smart policy-aware responses if Ollama is unavailable.
     */
    async *generateResponseStream(prompt, context = '') {
        const systemMessage = context
            ? `You are a helpful HR assistant. Use the following context from company policy documents to answer the question accurately.\n\nPolicy Context:\n${context}`
            : `You are a helpful HR assistant. Answer the following HR-related question professionally.`;

        const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434/v1';
        const model = process.env.OLLAMA_MODEL || 'llama3';

        try {
            const response = await fetch(`${ollamaUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: model,
                    messages: [
                        { role: 'system', content: systemMessage },
                        { role: 'user', content: prompt }
                    ],
                    temperature: 0.7,
                    stream: true,
                })
            });

            if (!response.ok) {
                throw new Error(`Ollama error: ${response.status}`);
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
            console.error('❌ Ollama Error:', error?.message || error);
            // Simulate typing for the fallback content if Ollama fails
            const fallbackText = this.generateFromContext(prompt, context);
            const words = fallbackText.split(' ');
            for (const word of words) {
                yield word + ' ';
                // Optional small delay to make it look like typing if we really want to, 
                // but let's just yield chunks quickly.
                await new Promise(r => setTimeout(r, 20));
            }
        }
    },

    /**
     * Generate a structured answer directly from policy context
     * when Ollama/LLM is unavailable.
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
            return 'Hello! 👋 I\'m your HR assistant. I can help you with leave policies, work-from-home guidelines, employee benefits, and more. What would you like to know?';
        }

        if (lower.includes('thank')) {
            return 'You\'re welcome! Let me know if you have any other questions about company policies.';
        }

        return 'I\'m your HR assistant and I can help with questions about:\n\n• **Leave policies** — annual, sick, parental leave\n• **Work from home** — eligibility, schedule, guidelines\n• **Benefits** — health insurance, retirement, wellness\n• **Escalation** — connect you with an HR representative\n\nWhat would you like to know?';
    },
};
