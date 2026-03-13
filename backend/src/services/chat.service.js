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

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const chatService = {
    /**
     * Process a chat message and return a response.
     * Works fully offline using policy files + AI fallback.
     */
    async processMessage(message, employeeId = null, onChunk = null) {
        const intent = detectIntent(message);
        let context = '';
        let response = '';
        let employeeProfile = null;

        if (employeeId) {
            employeeProfile = await prisma.employee.findUnique({
                where: { id: parseInt(employeeId) }
            });
        }

        const consumeStream = async (stream) => {
            for await (const chunk of stream) {
                response += chunk;
                if (onChunk) onChunk(chunk);
            }
        };

        switch (intent) {
            case 'leave_balance': {
                // Fastest path: answer directly from DB without calling the LLM.
                if (employeeProfile && typeof employeeProfile.leaveBalance === 'number') {
                    const balance = employeeProfile.leaveBalance;
                    response = `You currently have ${balance} days of leave remaining.`;
                    if (onChunk) onChunk(response);
                } else {
                    // Fallback: if we cannot resolve from DB, do NOT guess a number.
                    // Tell the user to contact HR so they can update the Excel tracker and resync.
                    response = "I couldn't find a personal leave balance for you in the system. " +
                        "Please ask HR to update the leave tracker and sync it, then try again.";
                    if (onChunk) onChunk(response);
                }
                break;
            }

            case 'policy_question': {
                context = await policyService.searchPolicies(message);
                const stream = await aiService.generateResponseStream(message, context, employeeProfile);
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
                const stream = await aiService.generateResponseStream(message, context, employeeProfile);
                await consumeStream(stream);
                break;
            }
        }

        // Log chat to in-memory store
        const logEntry = {
            message,
            response,
            intent,
            employeeId: employeeId ? parseInt(employeeId) : null,
            employeeName: employeeProfile?.name || 'Unknown',
            department: employeeProfile?.department || 'Unknown',
            createdAt: new Date(),
        };
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

        // Per-employee query analytics
        const employeeMap = {};
        for (const log of chatLogs) {
            const key = log.employeeId || 'unknown';
            if (!employeeMap[key]) {
                employeeMap[key] = {
                    employeeId: log.employeeId,
                    name: log.employeeName,
                    department: log.department,
                    totalQueries: 0,
                    intents: {},
                    lastActive: log.createdAt,
                };
            }
            employeeMap[key].totalQueries += 1;
            employeeMap[key].intents[log.intent] = (employeeMap[key].intents[log.intent] || 0) + 1;
            if (log.createdAt > employeeMap[key].lastActive) {
                employeeMap[key].lastActive = log.createdAt;
            }
        }

        const employeeActivity = Object.values(employeeMap)
            .sort((a, b) => b.totalQueries - a.totalQueries);

        return {
            totalQueries: chatLogs.length,
            intentCounts,
            employeeActivity,
            recentChats: chatLogs.slice(-10).reverse(),
        };
    },
};
