import { aiService } from './ai.service.js';
import { policyService } from './policy.service.js';
import { ticketService } from './ticket.service.js';
import { leaveService } from './leave.service.js';

// In-memory chat log for when DB is unavailable
const chatLogs = [];

/**
 * Detect the intent of a user message.
 */
const MONTH_NAME_TO_NUM = {
    'january': 1, 'february': 2, 'march': 3, 'april': 4, 'may': 5, 'june': 6,
    'july': 7, 'august': 8, 'september': 9, 'october': 10, 'november': 11, 'december': 12,
    'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'jun': 6,
    'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12,
};

function detectMonth(message) {
    const lower = message.toLowerCase();
    for (const [name, num] of Object.entries(MONTH_NAME_TO_NUM)) {
        if (lower.includes(name)) return num;
    }
    return null;
}

function detectIntent(message) {
    const lower = message.toLowerCase();

    if (lower.startsWith('[ticket]')) {
        return 'escalation';
    }

    // Specific month leave query — "how many leaves in July?"
    const hasMonth = detectMonth(message);
    if (hasMonth && (lower.includes('leave') || lower.includes('wfh') || lower.includes('off'))) {
        return 'leave_query';
    }

    if (lower.includes('history') || lower.includes('details') || lower.includes('dates')) {
        return 'leave_history';
    }

    if (lower.includes('leave') && (lower.includes('balance') || lower.includes('how many') || lower.includes('remaining') || lower.includes('utilized') || lower.includes('taken') || lower.includes('summary') || lower.includes('total'))) {
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
        lower.includes('file a') ||
        lower.includes('file a complaint') ||
        lower.includes('ticket')
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

        // Fetch recent history of up to 5 messages to provide conversation context
        const userHistory = chatLogs
            .filter(log => log.employeeId === (employeeId ? parseInt(employeeId) : null))
            .slice(-5);

        switch (intent) {
            case 'leave_query': {
                // Month-specific leave query
                const month = detectMonth(message);
                if (employeeProfile && month) {
                    const lower = message.toLowerCase();
                    let data;
                    if (lower.includes('wfh') || lower.includes('work from home')) {
                        data = await leaveService.getWfhByMonth(employeeProfile.id, month);
                        if (data && data.wfhCount > 0) {
                            const dateStrs = data.dates.map(d => `${d.getDate()}`).join(', ');
                            context = `User had ${data.wfhCount} WFH day(s) in ${data.month} ${data.year} on these dates: ${dateStrs}.`;
                        } else {
                            context = `User had 0 WFH days in ${data?.month || month} ${data?.year || new Date().getFullYear()}.`;
                        }
                    } else {
                        data = await leaveService.getLeavesByMonth(employeeProfile.id, month);
                        if (data && data.leaveCount > 0) {
                            const dateStrs = data.dates.map(d => `${d.getDate()}`).join(', ');
                            context = `User took ${data.leaveCount} leave(s) in ${data.month} ${data.year} on these dates: ${dateStrs}.`;
                        } else {
                            context = `User took 0 leaves in ${data?.month || month} ${data?.year || new Date().getFullYear()}.`;
                        }
                    }
                    if (!context) {
                        context = "No leave data found for that month. The data may not have been imported yet.";
                    }
                } else {
                    context = await policyService.searchPolicies(message);
                }
                const stream = await aiService.generateResponseStream(message, context, employeeProfile, userHistory);
                await consumeStream(stream);
                break;
            }

            case 'leave_history': {
                if (employeeProfile) {
                    const details = await leaveService.getLeaveDetails(employeeProfile.id);
                    if (details && details.length > 0) {
                        context = `Here is the user's detailed leave and WFH history for the year:\n\n`;
                        const grouped = {};
                        for (const d of details) {
                            if (!grouped[d.month]) grouped[d.month] = [];
                            grouped[d.month].push(d);
                        }
                        for (const [month, entries] of Object.entries(grouped)) {
                            context += `**${month}:**\n`;
                            for (const e of entries) {
                                context += `- ${e.date.getDate()} : ${e.type}\n`;
                            }
                        }
                    } else {
                        context = "The user doesn't have any leave or WFH records in the system.";
                    }
                } else {
                    context = "Couldn't find a personal leave record for the user in the system.";
                }
                const stream = await aiService.generateResponseStream(message, context, employeeProfile, userHistory);
                await consumeStream(stream);
                break;
            }

            case 'leave_balance': {
                // Yearly summary from DB
                if (employeeProfile) {
                    const summary = await leaveService.getLeaveSummary(employeeProfile.id);
                    if (summary) {
                        context = `Database Leave Summary for ${summary.year}:\n`;
                        context += `- Eligible Leaves: ${summary.eligibleLeaves}\n`;
                        context += `- Granted Leaves: ${summary.grantedLeaves}\n`;
                        context += `- Utilized Leaves: ${summary.utilizedLeaves}\n`;
                        context += `- Available Leaves: ${summary.availableLeaves}\n`;
                        context += `- LOP: ${summary.lop}\n\n`;
                        context += `Instruct the AI: Answer the user's specific question using this data natively.`;
                    } else {
                        context = `Database Leave summary: User has ${employeeProfile.leaveBalance} days remaining.`;
                    }
                } else {
                    context = "Couldn't find a personal leave record for the user. Ask HR to update the leave tracker.";
                }
                const stream = await aiService.generateResponseStream(message, context, employeeProfile, userHistory);
                await consumeStream(stream);
                break;
            }

            case 'policy_question': {
                context = await policyService.searchPolicies(message);
                const stream = await aiService.generateResponseStream(message, context, employeeProfile, userHistory);
                await consumeStream(stream);
                break;
            }

            case 'escalation': {
                const cleanMessage = message.replace(/^\[ticket\]\s*/i, '');
                const result = await ticketService.escalateIssue(employeeId || 1, cleanMessage);
                response = result.message;
                if (onChunk) onChunk(response);
                break;
            }

            case 'general_hr':
            default: {
                context = await policyService.searchPolicies(message);
                const stream = await aiService.generateResponseStream(message, context, employeeProfile, userHistory);
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
