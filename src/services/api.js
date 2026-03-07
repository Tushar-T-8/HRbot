import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:5000/api',
    headers: { 'Content-Type': 'application/json' },
});

// Chat API
export const sendMessage = (message, employeeId = null) =>
    api.post('/chat', { message, employeeId });

export const getChatAnalytics = () => api.get('/chat/analytics');

// Employee API
export const getEmployees = () => api.get('/employees');
export const getEmployee = (id) => api.get(`/employees/${id}`);

// Ticket API
export const getTickets = () => api.get('/tickets');
export const getTicketStats = () => api.get('/tickets/stats');
export const createTicket = (data) => api.post('/tickets', data);
export const updateTicketStatus = (id, status) =>
    api.patch(`/tickets/${id}/status`, { status });

export default api;
