import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:5000/api',
});

// Chat API
export const sendMessage = (message, employeeId = null) =>
    api.post('/chat', { message, employeeId });

export const streamMessage = async (message, employeeId = null, onChunk, onDone, signal) => {
    try {
        const token = localStorage.getItem('token');
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'text/event-stream',
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch('http://localhost:5000/api/chat', {
            method: 'POST',
            headers,
            body: JSON.stringify({ message, employeeId, stream: true }),
            signal
        });

        if (!response.ok) throw new Error('Network response was not ok');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            const lines = buffer.split('\n\n');
            buffer = lines.pop(); // Keep the last incomplete chunk in the buffer

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const dataStr = line.replace('data: ', '').trim();
                    if (!dataStr) continue;

                    try {
                        const data = JSON.parse(dataStr);
                        if (data.done) {
                            if (onDone) onDone(data);
                        } else if (data.chunk) {
                            if (onChunk) onChunk(data.chunk);
                        }
                    } catch (e) {
                        console.error('Error parsing SSE json:', e, dataStr);
                    }
                }
            }
        }

    } catch (error) {
        console.error('Error in stream message:', error);
        throw error;
    }
};

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

// Admin API
export const uploadPolicyFiles = (formData) =>
    api.post('/admin/upload', formData);
export const reloadPoliciesAndLeaves = () =>
    api.post('/admin/reload');

// Auth API
export const loginUser = (email, password) =>
    api.post('/auth/login', { email, password });
export const signupUser = (data) =>
    api.post('/auth/signup', data);

export default api;
