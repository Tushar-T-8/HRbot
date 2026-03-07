import { ticketService } from '../services/ticket.service.js';

export const ticketController = {
    async getAll(req, res, next) {
        try {
            const tickets = await ticketService.getAllTickets();
            res.json({ success: true, data: tickets });
        } catch {
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    },

    async getById(req, res, next) {
        try {
            const ticket = await ticketService.getTicketById(req.params.id);
            res.json({ success: true, data: ticket });
        } catch (error) {
            res.status(error.statusCode || 500).json({ success: false, error: error.message });
        }
    },

    async create(req, res, next) {
        try {
            const ticket = await ticketService.createTicket(req.body);
            res.status(201).json({ success: true, data: ticket });
        } catch (error) {
            res.status(error.statusCode || 500).json({ success: false, error: error.message });
        }
    },

    async updateStatus(req, res, next) {
        try {
            const ticket = await ticketService.updateTicketStatus(req.params.id, req.body.status);
            res.json({ success: true, data: ticket });
        } catch (error) {
            res.status(error.statusCode || 500).json({ success: false, error: error.message });
        }
    },

    async getStats(req, res, next) {
        try {
            const stats = await ticketService.getStats();
            res.json({ success: true, data: stats });
        } catch (error) {
            res.status(error.statusCode || 500).json({ success: false, error: error.message });
        }
    },
};
