import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const ticketService = {
    async getAllTickets() {
        return await prisma.ticket.findMany({
            include: { employee: true },
            orderBy: { createdAt: 'desc' }
        });
    },

    async getTicketById(id) {
        const ticket = await prisma.ticket.findUnique({
            where: { id: parseInt(id) },
            include: { employee: true }
        });
        if (ticket) return ticket;
        throw Object.assign(new Errsearchor('Ticket not found'), { statusCode: 404 });
    },

    async createTicket(data) {
        if (!data.employeeId || !data.issue) {
            throw Object.assign(new Error('employeeId and issue are required'), { statusCode: 400 });
        }
        return await prisma.ticket.create({
            data: {
                employeeId: parseInt(data.employeeId),
                issue: data.issue,
                status: 'OPEN',
            },
            include: { employee: true }
        });
    },

    async updateTicketStatus(id, status) {
        const validStatuses = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
        if (!validStatuses.includes(status)) {
            throw Object.assign(new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`), { statusCode: 400 });
        }
        try {
            return await prisma.ticket.update({
                where: { id: parseInt(id) },
                data: { status },
                include: { employee: true }
            });
        } catch (error) {
            throw Object.assign(new Error('Ticket not found or update failed'), { statusCode: 404 });
        }
    },

    async escalateIssue(employeeId, issue) {
        const ticket = await this.createTicket({
            employeeId,
            issue: `[ESCALATED] ${issue}`,
        });
        return {
            ticketId: `HR-${String(ticket.id).padStart(3, '0')}`,
            message: `Your issue has been escalated. Ticket ID: HR-${String(ticket.id).padStart(3, '0')}. An HR representative will reach out to you within 24 hours.`,
            ticket,
        };
    },

    async getStats() {
        const total = await prisma.ticket.count();
        const open = await prisma.ticket.count({ where: { status: 'OPEN' } });
        const resolved = await prisma.ticket.count({ where: { status: 'RESOLVED' } });

        return {
            total,
            open,
            resolved
        };
    },
};
