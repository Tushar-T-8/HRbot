import { aiService } from './ai.service.js';
import { policyService } from './policy.service.js';
import { ticketService } from './ticket.service.js';

// In-memory chat log for when DB is unavailable
const chatLogs = [];

/**
 * Detect the intent of a user message.
 */
function detectIntent(message) {
    const lower = message.toLowerCase();

    if (lower.includes('leave') && (lower.includes('balance') || lower.includes('how many') || lower.includes('remaining'))) {
        return 'leave_balance';
    }

    if (
        lower.includes('policy') ||
        lower.includes('rule') ||
        lower.includes('guideline') ||
        lower.includes('work from home') ||
        lower.includes('wfh') ||
        lower.includes('remote') ||
        lower.includes('benefit') ||
        lower.includes('insurance') ||
        lower.includes('leave policy') ||
        lower.includes('parental') ||
        lower.includes('maternity') ||
        lower.includes('paternity') ||
        lower.includes('sick') ||
        lower.includes('health') ||
        lower.includes('gym') ||
        lower.includes('wellness') ||
        lower.includes('retirement') ||
        lower.includes('401k') ||
        lower.includes('commut')
    ) {
        return 'policy_question';
    }

    if (
        lower.includes('escalate') ||
        lower.includes('speak to') ||
        lower.includes('talk to') ||
        lower.includes('human') ||
        lower.includes('real person') ||
        lower.includes('complaint') ||
        lower.includes('file a')
    ) {
        return 'escalation';
    }

    return 'general_hr';
}

export const chatService = {
    /**
     * Process a chat message and return a response.
     * Works fully offline using policy files + AI fallback.
     */
    async processMessage(message, employeeId = null, onChunk = null) {
        const intent = detectIntent(message);
        let context = '';
        let response = '';

        const consumeStream = async (stream) => {
            for await (const chunk of stream) {
                response += chunk;
                if (onChunk) onChunk(chunk);
            }
        };

        switch (intent) {
            case 'leave_balance': {
                if (!context) {
                    context = await policyService.searchPolicies('leave balance annual sick days entitlement');
                }
                const stream = await aiService.generateResponseStream(message, context);
                await consumeStream(stream);
                break;
            }

            case 'policy_question': {
                context = await policyService.searchPolicies(message);
                const stream = await aiService.generateResponseStream(message, context);
                await consumeStream(stream);
                break;
            }

            case 'escalation': {
                const result = await ticketService.escalateIssue(employeeId || 1, message);
                response = result.message;
                if (onChunk) onChunk(response);
                break;
            }

            case 'general_hr':
            default: {
                context = await policyService.searchPolicies(message);
                const stream = await aiService.generateResponseStream(message, context);
                await consumeStream(stream);
                break;
            }
        }

        // Log chat to in-memory store
        const logEntry = { message, response, intent, createdAt: new Date() };
        chatLogs.push(logEntry);

        return { message: response, intent };
    },

    /**
     * Get chat analytics.
     */
    async getAnalytics() {
        // In-memory fallback
        const intentMap = {};
        for (const log of chatLogs) {
            intentMap[log.intent] = (intentMap[log.intent] || 0) + 1;
        }
        const intentCounts = Object.entries(intentMap).map(([intent, count]) => ({
            intent,
            _count: { intent: count },
        }));

        return {
            totalQueries: chatLogs.length,
            intentCounts,
            recentChats: chatLogs.slice(-10).reverse(),
        };
    },
};
