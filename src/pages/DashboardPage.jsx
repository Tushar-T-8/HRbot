import { useState, useEffect } from 'react';
import { getChatAnalytics, getTickets } from '../services/api';

export default function DashboardPage() {
    const [analytics, setAnalytics] = useState({ totalQueries: 0, intentCounts: [], recentChats: [] });
    const [ticketStats, setTicketStats] = useState({ total: 0, open: 0, resolved: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [analyticsRes, ticketsRes] = await Promise.all([
                getChatAnalytics().catch(() => ({ data: { data: { totalQueries: 0, intentCounts: [], recentChats: [] } } })),
                getTickets().catch(() => ({ data: { data: [] } })),
            ]);
            setAnalytics(analyticsRes.data.data);
            const tickets = ticketsRes.data.data || [];
            setTicketStats({
                total: tickets.length,
                open: tickets.filter(t => t.status === 'OPEN').length,
                resolved: tickets.filter(t => t.status === 'RESOLVED').length,
            });
        } catch (err) {
            console.error('Failed to load dashboard:', err);
        } finally {
            setLoading(false);
        }
    };

    const statCards = [
        { title: 'Total Queries', value: analytics.totalQueries, color: 'bg-gray-900' },
        { title: 'Open Tickets', value: ticketStats.open, color: 'bg-amber-500' },
        { title: 'Resolved', value: ticketStats.resolved, color: 'bg-green-500' },
        { title: 'Total Tickets', value: ticketStats.total, color: 'bg-gray-400' },
    ];

    const intentLabels = {
        leave_balance: 'Leave Balance',
        policy_question: 'Policy Questions',
        escalation: 'Escalations',
        general_hr: 'General HR',
    };

    return (
        <div className="p-6 overflow-y-auto h-full bg-[#fafafa]">
            <div className="mb-6">
                <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
                <p className="text-sm text-gray-400 mt-0.5">Activity overview</p>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <svg className="w-6 h-6 text-gray-300 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                </div>
            ) : (
                <>
                    {/* Stats */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                        {statCards.map((card) => (
                            <div key={card.title} className="bg-white rounded-xl border border-gray-100 p-4">
                                <div className={`w-2 h-2 rounded-full ${card.color} mb-3`} />
                                <p className="text-2xl font-semibold text-gray-900">{card.value}</p>
                                <p className="text-xs text-gray-400 mt-0.5">{card.title}</p>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Query Categories */}
                        <div className="bg-white rounded-xl border border-gray-100 p-5">
                            <h2 className="text-sm font-semibold text-gray-900 mb-4">Query Breakdown</h2>
                            {analytics.intentCounts.length > 0 ? (
                                <div className="space-y-3">
                                    {analytics.intentCounts.map((ic) => {
                                        const total = analytics.totalQueries || 1;
                                        const pct = Math.round((ic._count.intent / total) * 100);
                                        return (
                                            <div key={ic.intent}>
                                                <div className="flex justify-between text-xs mb-1">
                                                    <span className="text-gray-600">{intentLabels[ic.intent] || ic.intent}</span>
                                                    <span className="text-gray-400">{pct}%</span>
                                                </div>
                                                <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                                                    <div className="h-full rounded-full bg-gray-900 transition-all" style={{ width: `${pct}%` }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-gray-400 text-xs">No queries yet.</p>
                            )}
                        </div>

                        {/* Recent Chats */}
                        <div className="bg-white rounded-xl border border-gray-100 p-5">
                            <h2 className="text-sm font-semibold text-gray-900 mb-4">Recent Conversations</h2>
                            {analytics.recentChats.length > 0 ? (
                                <div className="space-y-2">
                                    {analytics.recentChats.slice(0, 5).map((chat) => (
                                        <div key={chat.id} className="p-2.5 rounded-lg bg-gray-50">
                                            <p className="text-xs text-gray-700 truncate">{chat.message}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 text-gray-500">{intentLabels[chat.intent] || chat.intent}</span>
                                                <span className="text-[10px] text-gray-400">{new Date(chat.createdAt).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-400 text-xs">No conversations yet.</p>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
