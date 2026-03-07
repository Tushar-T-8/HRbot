import { chatService } from '../services/chat.service.js';

export const chatController = {
    async sendMessage(req, res, next) {
        try {
            const { message, employeeId } = req.body;

            if (!message) {
                return res.status(400).json({ success: false, error: 'Message is required' });
            }

            const result = await chatService.processMessage(message, employeeId);

            res.json({
                success: true,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    },

    async getAnalytics(req, res, next) {
        try {
            const analytics = await chatService.getAnalytics();
            res.json({ success: true, data: analytics });
        } catch (error) {
            next(error);
        }
    },
};
