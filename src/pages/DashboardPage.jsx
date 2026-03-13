import { useState, useEffect } from 'react';
import { getChatAnalytics, getTickets, updateTicketStatus, uploadPolicyFiles, reloadPoliciesAndLeaves } from '../services/api';

export default function DashboardPage() {
    const [analytics, setAnalytics] = useState({ totalQueries: 0, intentCounts: [], employeeActivity: [], recentChats: [] });
    const [tickets, setTickets] = useState([]);
    const [ticketStats, setTicketStats] = useState({ total: 0, open: 0, inProgress: 0, resolved: 0 });
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [uploadMessage, setUploadMessage] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [analyticsRes, ticketsRes] = await Promise.all([
                getChatAnalytics().catch(() => ({ data: { data: { totalQueries: 0, intentCounts: [], employeeActivity: [], recentChats: [] } } })),
                getTickets().catch(() => ({ data: { data: [] } })),
            ]);
            setAnalytics(analyticsRes.data.data);
            const loadedTickets = ticketsRes.data.data || [];
            setTickets(loadedTickets);
            setTicketStats({
                total: loadedTickets.length,
                open: loadedTickets.filter(t => t.status === 'OPEN').length,
                inProgress: loadedTickets.filter(t => t.status === 'IN_PROGRESS').length,
                resolved: loadedTickets.filter(t => t.status === 'RESOLVED').length,
            });
        } catch (err) {
            console.error('Failed to load dashboard:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (event) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        const formData = new FormData();
        Array.from(files).forEach((file) => formData.append('files', file));

        try {
            setUploading(true);
            setUploadMessage('');
            await uploadPolicyFiles(formData);
            setUploadMessage('Files uploaded and knowledge base refreshed.');
            await loadData();
        } catch (err) {
            console.error('Failed to upload policy files:', err);
            setUploadMessage('Failed to upload files. Please try again.');
        } finally {
            setUploading(false);
            // reset input so same file can be re-selected
            event.target.value = '';
        }
    };

    const handleStatusChange = async (id, newStatus) => {
        try {
            await updateTicketStatus(id, newStatus);
            setTickets((prev) => {
                const updated = prev.map((t) => (t.id === id ? { ...t, status: newStatus } : t));
                setTicketStats({
                    total: updated.length,
                    open: updated.filter(t => t.status === 'OPEN').length,
                    inProgress: updated.filter(t => t.status === 'IN_PROGRESS').length,
                    resolved: updated.filter(t => t.status === 'RESOLVED').length,
                });
                return updated;
            });
        } catch (err) {
            console.error('Failed to update ticket:', err);
        }
    };

    const statCards = [
        { title: 'Total Queries', value: analytics.totalQueries, color: 'text-gray-900' },
        { title: 'Open Tickets', value: ticketStats.open, color: 'text-amber-500' },
        { title: 'In Progress', value: ticketStats.inProgress, color: 'text-blue-500' },
        { title: 'Resolved', value: ticketStats.resolved, color: 'text-green-500' },
        { title: 'Total Tickets', value: ticketStats.total, color: 'text-gray-400' },
    ];

    const intentLabels = {
        leave_balance: 'Leave Balance',
        policy_question: 'Policy Questions',
        escalation: 'Escalations',
        general_hr: 'General HR',
    };

    const statusStyles = {
        OPEN: 'bg-amber-50 text-amber-600',
        IN_PROGRESS: 'bg-blue-50 text-blue-600',
        RESOLVED: 'bg-green-50 text-green-600',
        CLOSED: 'bg-gray-100 text-gray-500',
    };

    return (
        <div className="flex h-full w-full overflow-hidden bg-[#fafafa]">
            {/* Main Content Area */}
            <div className="flex-1 p-6 overflow-y-auto h-full bg-white">
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
                        {/* Top Row: Stats + HR Upload */}
                        <div className="flex items-center gap-12 mb-8">
                            <div className="flex items-center gap-12">
                                {statCards.map((card) => (
                                    <div key={card.title} className="flex flex-col">
                                        <p className={`text-4xl font-semibold tracking-tight ${card.color} mb-1`}>{card.value}</p>
                                        <p className="text-xs text-gray-500 font-medium tracking-wide uppercase">{card.title}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="ml-auto flex flex-col items-end gap-1">
                                <label className="inline-flex items-center px-3 py-1.5 rounded-full border border-gray-200 bg-gray-50 text-xs text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors">
                                    <svg className="w-3.5 h-3.5 mr-1 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M16 8l-4-4m0 0L8 8m4-4v12" />
                                    </svg>
                                    <span className="font-medium">Upload policies / Excel</span>
                                    <input
                                        type="file"
                                        multiple
                                        accept=".pdf,.txt,.xlsx,.xls"
                                        className="hidden"
                                        onChange={handleFileUpload}
                                        disabled={uploading}
                                    />
                                </label>
                                {uploadMessage && (
                                    <p className="text-[11px] text-gray-400">
                                        {uploading ? 'Processing upload…' : uploadMessage}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
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

                            {/* Employee Activity */}
                            {analytics.employeeActivity.length > 0 && (
                                <div className="bg-white rounded-xl border border-gray-100 p-5">
                                    <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center justify-between">
                                        <span>Employee Activity</span>
                                        <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-normal">
                                            {analytics.employeeActivity.length} {analytics.employeeActivity.length === 1 ? 'user' : 'users'}
                                        </span>
                                    </h2>
                                    <div className="space-y-0 divide-y divide-gray-50">
                                        {analytics.employeeActivity.map((emp, idx) => {
                                            const maxQueries = analytics.employeeActivity[0]?.totalQueries || 1;
                                            const barPct = Math.round((emp.totalQueries / maxQueries) * 100);
                                            const intentColors = {
                                                leave_balance: 'bg-emerald-400',
                                                policy_question: 'bg-blue-400',
                                                escalation: 'bg-red-400',
                                                general_hr: 'bg-gray-400',
                                            };
                                            const totalIntentQueries = Object.values(emp.intents).reduce((a, b) => a + b, 0);

                                            // Relative time helper
                                            const getRelativeTime = (date) => {
                                                const now = new Date();
                                                const diff = Math.floor((now - new Date(date)) / 1000);
                                                if (diff < 60) return 'Just now';
                                                if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
                                                if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
                                                return `${Math.floor(diff / 86400)}d ago`;
                                            };

                                            return (
                                                <div key={emp.employeeId || idx} className="py-3 first:pt-0 last:pb-0">
                                                    <div className="flex items-center gap-3">
                                                        {/* Avatar */}
                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-[11px] font-semibold text-gray-600 shrink-0">
                                                            {emp.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??'}
                                                        </div>
                                                        {/* Info */}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center justify-between mb-1">
                                                                <div className="flex items-center gap-2 min-w-0">
                                                                    <span className="text-[13px] font-medium text-gray-800 truncate">{emp.name}</span>
                                                                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-gray-50 text-gray-400 shrink-0">{emp.department}</span>
                                                                </div>
                                                                <div className="flex items-center gap-2 shrink-0">
                                                                    <span className="text-[11px] text-gray-400">{getRelativeTime(emp.lastActive)}</span>
                                                                    <span className="text-sm font-semibold text-gray-900 tabular-nums">{emp.totalQueries}</span>
                                                                </div>
                                                            </div>
                                                            {/* Intent breakdown bar */}
                                                            <div className="flex items-center gap-2">
                                                                <div className="flex-1 h-1.5 rounded-full bg-gray-50 overflow-hidden flex">
                                                                    {Object.entries(emp.intents).map(([intent, count]) => (
                                                                        <div
                                                                            key={intent}
                                                                            className={`h-full ${intentColors[intent] || 'bg-gray-300'} first:rounded-l-full last:rounded-r-full`}
                                                                            style={{ width: `${(count / totalIntentQueries) * barPct}%` }}
                                                                            title={`${intentLabels[intent] || intent}: ${count}`}
                                                                        />
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {/* Legend */}
                                    <div className="flex items-center gap-3 mt-4 pt-3 border-t border-gray-50">
                                        {Object.entries({ leave_balance: 'bg-emerald-400', policy_question: 'bg-blue-400', escalation: 'bg-red-400', general_hr: 'bg-gray-400' }).map(([key, color]) => (
                                            <div key={key} className="flex items-center gap-1">
                                                <div className={`w-2 h-2 rounded-full ${color}`} />
                                                <span className="text-[10px] text-gray-400">{intentLabels[key] || key}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Right Sidebar - Tickets */}
            <div className="w-80 h-full bg-[#fdfbf7] border-l border-gray-100 flex flex-col shrink-0 overflow-hidden">
                {!loading && (
                    <>
                        <div className="p-5 border-b border-gray-100 shrink-0">
                            <h2 className="text-sm font-semibold text-gray-900 flex justify-between items-center">
                                <span>Recent Tickets</span>
                                <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{tickets.length} Total</span>
                            </h2>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-gray-50/30">
                            {tickets.length > 0 ? (
                                tickets.slice(0, 15).map((ticket) => (
                                    <div key={ticket.id} className="p-3 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all bg-white">
                                        <div className="flex items-start justify-between mb-2">
                                            <span className="text-[11px] font-mono text-gray-400 font-medium tracking-wide">HR-{String(ticket.id).padStart(3, '0')}</span>
                                            <select
                                                value={ticket.status}
                                                onChange={(e) => handleStatusChange(ticket.id, e.target.value)}
                                                className={`text-[9.5px] px-2 py-0.5 rounded-[10px] font-bold tracking-wider uppercase border outline-none cursor-pointer hover:opacity-80 transition-opacity ${statusStyles[ticket.status]} border-transparent`}
                                            >
                                                <option value="OPEN">Open</option>
                                                <option value="IN_PROGRESS">In Progress</option>
                                                <option value="RESOLVED">Resolved</option>
                                                <option value="CLOSED">Closed</option>
                                            </select>
                                        </div>
                                        <p className="text-[13px] text-gray-800 font-medium leading-snug mb-2 line-clamp-2">{ticket.issue}</p>
                                        <div className="flex items-center justify-between text-[10px] text-gray-400">
                                            <span className="truncate pr-2">{ticket.employee?.name || 'Unknown User'}</span>
                                            <span className="whitespace-nowrap">{new Date(ticket.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-center py-10">
                                    <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center mb-2">
                                        <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <p className="text-sm text-gray-500 font-medium">No active tickets</p>
                                    <p className="text-xs text-gray-400 mt-1">All issues have been resolved.</p>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
