import OpenAI from 'openai';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export const aiService = {
    /**
     * Generate a response using OpenAI (GPT-3.5 or GPT-4).
     * Falls back to smart policy-aware responses if OpenAI is unavailable.
     */
    async generateResponse(prompt, context = '') {
        const systemMessage = context
            ? `You are a helpful HR assistant. Use the following context from company policy documents to answer the question accurately.\n\nPolicy Context:\n${context}`
            : `You are a helpful HR assistant. Answer the following HR-related question professionally.`;

        try {
            const response = await openai.chat.completions.create({
                model: 'gpt-3.5-turbo', // You can change this to gpt-4 or gpt-4o if preferred
                messages: [
                    { role: 'system', content: systemMessage },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 500,
            });

            return response.choices[0].message.content;
        } catch (error) {
            console.error('❌ OpenAI Error:', error?.message || error);
            return this.generateFromContext(prompt, context);
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
