import React, { useRef, useEffect } from 'react';
import MessageBubble from './MessageBubble';

function formatSeparatorDate(isoString) {
    if (!isoString) return 'Today';
    const msgDate = new Date(isoString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (msgDate.toDateString() === today.toDateString()) {
        return 'Today';
    } else if (msgDate.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
    } else {
        return msgDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    }
}

export default function ChatWindow({ messages, isLoading }) {
    const bottomRef = useRef(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    return (
        <div className="flex-1 overflow-y-auto px-5 py-6 scrollbar-thin">
            {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-5">
                        <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">How can I help?</h3>
                    <p className="text-gray-400 text-sm max-w-xs mb-6">
                        Ask about company policies, leave, benefits, or escalate to HR.
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center">
                        {['Leave policy', 'WFH guidelines', 'Benefits info'].map((q) => (
                            <span key={q} className="text-xs px-3 py-1.5 rounded-full border border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700 transition-colors cursor-default">
                                {q}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {messages.map((msg, idx) => {
                const currentGroup = formatSeparatorDate(msg.date);
                const prevGroup = idx > 0 ? formatSeparatorDate(messages[idx - 1].date) : null;

                // Show separator if it's the very first user message (idx 1),
                // or if the date group changed (and it's not the default greeting at idx 0)
                const showSeparator = idx === 1 || (idx > 1 && currentGroup !== prevGroup);

                return (
                    <React.Fragment key={idx}>
                        {showSeparator && (
                            <div className="flex justify-center my-6">
                                <span className="text-[10px] font-medium text-gray-500 bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
                                    {currentGroup}
                                </span>
                            </div>
                        )}
                        <MessageBubble message={msg} />
                    </React.Fragment>
                );
            })}

            {isLoading && (
                <div className="flex justify-start mb-3">
                    <div className="w-7 h-7 rounded-full bg-gray-900 flex items-center justify-center mr-2.5 shrink-0">
                        <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611l-.772.13c-1.687.282-3.393.425-5.105.425s-3.418-.143-5.105-.425l-.772-.13c-1.717-.293-2.3-2.379-1.067-3.61L5 14.5" />
                        </svg>
                    </div>
                    <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3.5 flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                </div>
            )}

            <div ref={bottomRef} />
        </div>
    );
}
