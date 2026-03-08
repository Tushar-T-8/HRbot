import { chatService } from '../services/chat.service.js';

export const chatController = {
    async sendMessage(req, res, next) {
        try {
            const { message, employeeId, stream } = req.body;

            if (!message) {
                return res.status(400).json({ success: false, error: 'Message is required' });
            }

            if (stream || req.headers.accept === 'text/event-stream') {
                res.setHeader('Content-Type', 'text/event-stream');
                res.setHeader('Cache-Control', 'no-cache');
                res.setHeader('Connection', 'keep-alive');
                res.flushHeaders();

                const onChunk = (chunk) => {
                    res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
                };

                const result = await chatService.processMessage(message, employeeId, onChunk);

                res.write(`data: ${JSON.stringify({ done: true, intent: result.intent })}\n\n`);
                res.end();
            } else {
                const result = await chatService.processMessage(message, employeeId);

                res.json({
                    success: true,
                    data: result,
                });
            }
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
