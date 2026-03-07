import express from 'express';
import cors from 'cors';
import chatRoutes from './routes/chat.routes.js';
import employeeRoutes from './routes/employee.routes.js';
import ticketRoutes from './routes/ticket.routes.js';

const app = express();

// Middleware
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/chat', chatRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/tickets', ticketRoutes);

// Global error handler
app.use((err, req, res, _next) => {
    console.error('❌ Error:', err.message);
    res.status(err.statusCode || 500).json({
        success: false,
        error: err.message || 'Internal server error',
    });
});

export default app;
