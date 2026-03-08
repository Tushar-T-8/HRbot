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
        // Use 'auto' instead of 'smooth' to prevent massive rendering lag during streaming
        bottomRef.current?.scrollIntoView({ behavior: 'auto' });
    }, [messages]);

    return (
        <div className="px-5 py-6">
            <div className="max-w-3xl mx-auto flex flex-col gap-2">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center mt-20">
                        <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-5">
                            <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">How can I help?</h3>
                        <p className="text-gray-400 text-sm max-w-xs mb-6">
                            Ask about company policies, leave, benefits, or escalate to HR.
                        </p>
                    </div>
                )}

                {messages.map((msg, idx) => {
                    const currentGroup = formatSeparatorDate(msg.date);

                    let showSeparator = false;
                    if (msg.role === 'user') {
                        let prevUserGroup = null;
                        for (let i = idx - 1; i >= 0; i--) {
                            if (messages[i].role === 'user') {
                                prevUserGroup = formatSeparatorDate(messages[i].date);
                                break;
                            }
                        }

                        if (currentGroup !== prevUserGroup) {
                            showSeparator = true;
                        }
                    }

                    return (
                        <React.Fragment key={idx}>
                            {showSeparator && (
                                <div className="flex justify-center my-6">
                                    <span className="text-[10px] font-medium text-gray-500 bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
                                        {currentGroup}
                                    </span>
                                </div>
                            )}
                            <MessageBubble
                                message={msg}
                                isTyping={isLoading && idx === messages.length - 1}
                            />
                        </React.Fragment>
                    );
                })}

                <div ref={bottomRef} className="h-4" />
            </div>
        </div>
    );
}
