import { useState } from 'react';

export default function ChatInput({ onSend, isLoading }) {
    const [message, setMessage] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!message.trim() || isLoading) return;
        onSend(message.trim());
        setMessage('');
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className="flex items-end gap-2 px-5 py-4 border-t border-gray-100 bg-white">
                <textarea
                    id="chat-input"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask about leave, benefits, WFH policies..."
                    rows={1}
                    disabled={isLoading}
                    className="flex-1 resize-none rounded-lg bg-gray-50 border border-gray-200 px-3.5 py-2.5 text-[13px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 transition-all disabled:opacity-50"
                    style={{ maxHeight: '100px' }}
                />

                <button
                    type="submit"
                    disabled={!message.trim() || isLoading}
                    id="send-button"
                    className="shrink-0 h-10 w-10 rounded-lg bg-gray-900 flex items-center justify-center text-white hover:bg-gray-800 transition-colors disabled:opacity-20 disabled:cursor-not-allowed active:scale-95"
                >
                    {isLoading ? (
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                    ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
                        </svg>
                    )}
                </button>
            </div>
        </form>
    );
}
