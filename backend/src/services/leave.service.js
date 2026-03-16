/**
 * leave.service.js
 * 
 * Provides chatbot-ready query methods for leave data stored in PostgreSQL.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const MONTH_NAMES = [
    '', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

export const leaveService = {
    /**
     * Get leave count for a specific employee in a specific month.
     * Answers: "How many leaves did X take in July?"
     */
    async getLeavesByMonth(employeeId, month, year = 2025) {
        const record = await prisma.leaveRecord.findUnique({
            where: { employeeId_year: { employeeId, year } },
        });
        if (!record) return null;

        const entries = await prisma.leaveEntry.findMany({
            where: {
                leaveRecordId: record.id,
                month,
                type: 'LEAVE',
            },
        });

        return {
            employeeId,
            month: MONTH_NAMES[month],
            year,
            leaveCount: entries.length,
            dates: entries.map(e => e.date),
        };
    },

    /**
     * Get WFH count for a specific employee in a specific month.
     * Answers: "How many WFH days did X have in July?"
     */
    async getWfhByMonth(employeeId, month, year = 2025) {
        const record = await prisma.leaveRecord.findUnique({
            where: { employeeId_year: { employeeId, year } },
        });
        if (!record) return null;

        const entries = await prisma.leaveEntry.findMany({
            where: {
                leaveRecordId: record.id,
                month,
                type: 'WFH',
            },
        });

        return {
            employeeId,
            month: MONTH_NAMES[month],
            year,
            wfhCount: entries.length,
            dates: entries.map(e => e.date),
        };
    },

    /**
     * Get yearly leave summary for an employee.
     * Answers: "How many leaves has X utilized?" / "How many are remaining?"
     */
    async getLeaveSummary(employeeId, year = 2025) {
        const record = await prisma.leaveRecord.findUnique({
            where: { employeeId_year: { employeeId, year } },
            include: {
                employee: { select: { name: true, empCode: true } },
            },
        });
        if (!record) return null;

        // Get per-month breakdown
        const entries = await prisma.leaveEntry.findMany({
            where: { leaveRecordId: record.id },
            orderBy: { date: 'asc' },
        });

        const monthlyBreakdown = {};
        for (let m = 1; m <= 12; m++) {
            const monthEntries = entries.filter(e => e.month === m);
            monthlyBreakdown[MONTH_NAMES[m]] = {
                leaves: monthEntries.filter(e => e.type === 'LEAVE').length,
                wfh: monthEntries.filter(e => e.type === 'WFH').length,
            };
        }

        return {
            employee: record.employee,
            year,
            eligibleLeaves: record.eligibleLeaves,
            grantedLeaves: record.grantedLeaves,
            utilizedLeaves: record.utilizedLeaves,
            availableLeaves: record.availableLeaves,
            lop: record.lop,
            monthlyBreakdown,
        };
    },

    /**
     * Get detailed leave entries for an employee.
     * Returns all leave/WFH dates with full details.
     */
    async getLeaveDetails(employeeId, year = 2025) {
        const record = await prisma.leaveRecord.findUnique({
            where: { employeeId_year: { employeeId, year } },
        });
        if (!record) return null;

        const entries = await prisma.leaveEntry.findMany({
            where: { leaveRecordId: record.id },
            orderBy: { date: 'asc' },
        });

        return entries.map(e => ({
            date: e.date,
            month: MONTH_NAMES[e.month],
            type: e.type,
        }));
    },

    /**
     * Find employee by empCode or name (partial match).
     * Used by the chatbot to resolve employee references.
     */
    async findEmployee(query) {
        // Try exact empCode match first
        const byCode = await prisma.employee.findUnique({
            where: { empCode: query.toUpperCase() },
        });
        if (byCode) return byCode;

        // Fallback to name search
        const byName = await prisma.employee.findMany({
            where: {
                name: { contains: query, mode: 'insensitive' },
            },
            take: 5,
        });
        return byName.length === 1 ? byName[0] : byName;
    },
};
