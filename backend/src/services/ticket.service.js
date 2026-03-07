import { ticketRepository } from '../repositories/ticket.repository.js';

// Shared mock store for development/offline mode
const mockTickets = [];
let mockIdCounter = 1;

export const ticketService = {
    async getAllTickets() {
        try {
            return await ticketRepository.findAll();
        } catch {
            return mockTickets;
        }
    },

    async getTicketById(id) {
        try {
            const ticket = await ticketRepository.findById(id);
            if (!ticket) throw Object.assign(new Error('Ticket not found'), { statusCode: 404 });
            return ticket;
        } catch (err) {
            if (err.statusCode === 404) throw err;
            const mock = mockTickets.find(t => t.id === parseInt(id));
            if (mock) return mock;
            throw Object.assign(new Error('Ticket not found'), { statusCode: 404 });
        }
    },

    async createTicket(data) {
        if (!data.employeeId || !data.issue) {
            throw Object.assign(new Error('employeeId and issue are required'), { statusCode: 400 });
        }
        try {
            return await ticketRepository.create(data);
        } catch {
            const ticket = {
                id: mockIdCounter++,
                employeeId: parseInt(data.employeeId),
                issue: data.issue,
                status: 'OPEN',
                createdAt: new Date(),
                employee: { id: 1, name: 'Tushar Thapliyal', department: 'Engineering' } // Default mock employee
            };
            mockTickets.push(ticket);
            return ticket;
        }
    },

    async updateTicketStatus(id, status) {
        const validStatuses = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
        if (!validStatuses.includes(status)) {
            throw Object.assign(new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`), { statusCode: 400 });
        }
        try {
            return await ticketRepository.updateStatus(id, status);
        } catch {
            const idx = mockTickets.findIndex(t => t.id === parseInt(id));
            if (idx >= 0) {
                mockTickets[idx].status = status;
                return mockTickets[idx];
            }
            throw Object.assign(new Error('Ticket not found'), { statusCode: 404 });
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
        try {
            return await ticketRepository.getStats();
        } catch {
            return {
                total: mockTickets.length,
                open: mockTickets.filter(t => t.status === 'OPEN').length,
                resolved: mockTickets.filter(t => t.status === 'RESOLVED').length
            };
        }
    },
};
