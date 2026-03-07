import { aiService } from './ai.service.js';
import { policyService } from './policy.service.js';
import { ticketService } from './ticket.service.js';
import prisma from '../config/db.js';

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
    async processMessage(message, employeeId = null) {
        const intent = detectIntent(message);
        let context = '';
        let response = '';

        switch (intent) {
            case 'leave_balance': {
                // Try DB first, fall back to policy content
                if (prisma && employeeId) {
                    try {
                        const balance = await prisma.leaveBalance.findUnique({
                            where: { employeeId: parseInt(employeeId) },
                        });
                        if (balance) {
                            context = `Employee's remaining leave days: ${balance.remainingDays}`;
                        }
                    } catch {
                        // DB unavailable, use policy content
                    }
                }
                if (!context) {
                    context = await policyService.searchPolicies('leave balance annual sick days entitlement');
                }
                response = await aiService.generateResponse(message, context);
                break;
            }

            case 'policy_question': {
                context = await policyService.searchPolicies(message);
                response = await aiService.generateResponse(message, context);
                break;
            }

            case 'escalation': {
                const result = await ticketService.escalateIssue(employeeId || 1, message);
                response = result.message;
                break;
            }

            case 'general_hr':
            default: {
                context = await policyService.searchPolicies(message);
                response = await aiService.generateResponse(message, context);
                break;
            }
        }

        // Log chat — try DB, fall back to in-memory
        const logEntry = { message, response, intent, createdAt: new Date() };
        if (prisma) {
            try {
                await prisma.chatLog.create({ data: { message, response, intent } });
            } catch {
                chatLogs.push(logEntry);
            }
        } else {
            chatLogs.push(logEntry);
        }

        return { message: response, intent };
    },

    /**
     * Get chat analytics.
     */
    async getAnalytics() {
        // Try DB first
        if (prisma) {
            try {
                const totalQueries = await prisma.chatLog.count();
                const intentCounts = await prisma.chatLog.groupBy({
                    by: ['intent'],
                    _count: { intent: true },
                    orderBy: { _count: { intent: 'desc' } },
                });
                const recentChats = await prisma.chatLog.findMany({
                    take: 10,
                    orderBy: { createdAt: 'desc' },
                });
                return { totalQueries, intentCounts, recentChats };
            } catch {
                // Fall through to in-memory
            }
        }

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
