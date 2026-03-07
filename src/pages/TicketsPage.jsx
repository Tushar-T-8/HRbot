import { useState, useEffect } from 'react';
import { getTickets, updateTicketStatus } from '../services/api';

export default function TicketsPage() {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('ALL');

    useEffect(() => {
        loadTickets();
    }, []);

    const loadTickets = async () => {
        try {
            const res = await getTickets();
            setTickets(res.data.data || []);
        } catch (err) {
            console.error('Failed to load tickets:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (id, newStatus) => {
        try {
            await updateTicketStatus(id, newStatus);
            setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, status: newStatus } : t)));
        } catch (err) {
            console.error('Failed to update ticket:', err);
        }
    };

    const statusStyles = {
        OPEN: 'bg-amber-50 text-amber-600',
        IN_PROGRESS: 'bg-blue-50 text-blue-600',
        RESOLVED: 'bg-green-50 text-green-600',
        CLOSED: 'bg-gray-100 text-gray-500',
    };

    const filteredTickets = filter === 'ALL' ? tickets : tickets.filter((t) => t.status === filter);

    return (
        <div className="p-6 overflow-y-auto h-full bg-[#fafafa]">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-semibold text-gray-900">Tickets</h1>
                    <p className="text-sm text-gray-400 mt-0.5">Escalated issues</p>
                </div>
                <div className="flex items-center gap-0.5 bg-white rounded-lg p-0.5 border border-gray-200">
                    {['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED'].map((s) => (
                        <button
                            key={s}
                            onClick={() => setFilter(s)}
                            className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors ${filter === s ? 'bg-gray-900 text-white' : 'text-gray-400 hover:text-gray-700'
                                }`}
                        >
                            {s === 'IN_PROGRESS' ? 'In Progress' : s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <svg className="w-6 h-6 text-gray-300 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                </div>
            ) : filteredTickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                    <svg className="w-12 h-12 mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
                    </svg>
                    <p className="text-sm">No tickets found</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {filteredTickets.map((ticket) => (
                        <div key={ticket.id} className="bg-white rounded-xl border border-gray-100 p-4 hover:border-gray-200 transition-colors">
                            <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <span className="text-xs font-mono text-gray-400">HR-{String(ticket.id).padStart(3, '0')}</span>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${statusStyles[ticket.status]}`}>
                                            {ticket.status}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-800 mb-1.5">{ticket.issue}</p>
                                    <div className="flex items-center gap-3 text-[11px] text-gray-400">
                                        <span>{ticket.employee?.name || 'Unknown'}</span>
                                        <span>•</span>
                                        <span>{ticket.employee?.department || ''}</span>
                                        <span>•</span>
                                        <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                <select
                                    value={ticket.status}
                                    onChange={(e) => handleStatusChange(ticket.id, e.target.value)}
                                    className="ml-4 text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 focus:outline-none focus:ring-1 focus:ring-gray-300"
                                >
                                    <option value="OPEN">Open</option>
                                    <option value="IN_PROGRESS">In Progress</option>
                                    <option value="RESOLVED">Resolved</option>
                                    <option value="CLOSED">Closed</option>
                                </select>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
