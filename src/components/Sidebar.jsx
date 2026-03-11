import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getTickets } from '../services/api';

export default function Sidebar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [ticketCount, setTicketCount] = useState(0);

    useEffect(() => {
        if (user?.role !== 'HR') return;

        const fetchCount = () => {
            getTickets()
                .then(res => {
                    const active = (res.data.data || []).filter(
                        t => t.status !== 'CLOSED' && t.status !== 'RESOLVED'
                    );
                    setTicketCount(active.length);
                })
                .catch(() => { });
        };

        fetchCount();
        const interval = setInterval(fetchCount, 10000); // refresh every 10s
        return () => clearInterval(interval);
    }, [user]);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navItems = [
        {
            to: '/',
            label: 'Chat',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                </svg>
            ),
        },
    ];

    // Only show Dashboard to HR users
    if (user?.role === 'HR') {
        navItems.push({
            to: '/dashboard',
            label: 'Dashboard',
            badge: ticketCount > 0 ? ticketCount : null,
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605" />
                </svg>
            ),
        });
    }

    const initials = user?.name
        ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
        : '??';

    const roleBadge = user?.role === 'HR' ? 'HR Admin' : 'Employee';

    return (
        <div className="w-60 h-full bg-[#fdfbf7] border-r border-gray-100 flex flex-col">
            {/* Logo */}
            <div className="p-5 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center">
                        <span className="text-sm font-bold text-white">H</span>
                    </div>
                    <div>
                        <h1 className="text-sm font-semibold text-gray-900 tracking-tight">HR Assistant</h1>
                        <p className="text-[10px] text-gray-400">AI Chatbot</p>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-3 space-y-0.5">
                {navItems.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.to === '/'}
                        className={({ isActive }) =>
                            `flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${isActive
                                ? 'bg-gray-900 text-white'
                                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                            }`
                        }
                    >
                        {item.icon}
                        <span className="flex-1">{item.label}</span>
                        {item.badge && (
                            <span className="ml-auto min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center">
                                {item.badge}
                            </span>
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* User Footer */}
            <div className="p-3 border-t border-gray-100">
                <div className="flex items-center gap-2.5 px-3 py-2">
                    <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-[10px] font-semibold">
                        {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-700 truncate">{user?.name || 'Guest'}</p>
                        <p className="text-[10px] text-gray-400">{roleBadge}</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        title="Sign out"
                        className="p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3-3l3-3m0 0l-3-3m3 3H9" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}
