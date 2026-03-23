import { useState } from 'react';

export default function ChatInput({ onSend, onStop, isLoading }) {
    const [message, setMessage] = useState('');
    const [isTicketMode, setIsTicketMode] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (isLoading) {
            if (onStop) onStop();
            return;
        }
        if (!message.trim()) return;
        
        const finalMessage = isTicketMode ? `[TICKET] ${message.trim()}` : message.trim();
        onSend(finalMessage);
        setMessage('');
        setIsTicketMode(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="w-full relative">
            <div className="flex items-end gap-3 w-full relative group">
                <button
                    type="button"
                    onClick={() => setIsTicketMode(!isTicketMode)}
                    className={`shrink-0 w-10 h-10 mb-1 rounded-full flex items-center justify-center transition-all shadow-sm border ${
                        isTicketMode 
                        ? 'bg-blue-50 border-blue-200 text-blue-600' 
                        : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                    title="Raise a Ticket"
                >
                    <svg className={`w-5 h-5 transition-transform ${isTicketMode ? 'rotate-45' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                </button>

                <textarea
                    id="chat-input"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={isTicketMode ? "Enter ticket description..." : "Ask about leave, benefits, WFH policies..."}
                    rows={1}
                    disabled={isLoading}
                    className="flex-1 resize-none rounded-full bg-white shadow-md border border-gray-200 pl-5 py-3.5 pr-16 text-[15px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ maxHeight: '150px' }}
                />

                <button
                    type="submit"
                    id="send-button"
                    className={`absolute bottom-2.5 right-2 shrink-0 h-9 w-9 rounded-full flex items-center justify-center transition-all ${isLoading
                        ? 'bg-red-500 text-white shadow-md hover:bg-red-600'
                        : message.trim()
                            ? 'bg-blue-500 text-white shadow-md hover:bg-blue-600'
                            : 'bg-gray-100 text-gray-400'
                        }`}
                >
                    {isLoading ? (
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                            <rect x="6" y="6" width="12" height="12" rx="2" ry="2" />
                        </svg>
                    ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
                        </svg>
                    )}
                </button>
            </div>
            
            {isTicketMode && (
                <div className="absolute -top-8 left-14 bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-md font-medium shadow-sm flex items-center gap-1.5 animate-in fade-in slide-in-from-bottom-2">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Ticket mode active
                </div>
            )}
        </form>
    );
}
