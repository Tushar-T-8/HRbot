export default function MessageBubble({ message }) {
    const isUser = message.role === 'user';

    return (
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
            {/* Bot avatar */}
            {!isUser && (
                <div className="w-7 h-7 rounded-full bg-gray-900 flex items-center justify-center mr-2.5 shrink-0">
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611l-.772.13c-1.687.282-3.393.425-5.105.425s-3.418-.143-5.105-.425l-.772-.13c-1.717-.293-2.3-2.379-1.067-3.61L5 14.5" />
                    </svg>
                </div>
            )}

            {/* Message */}
            <div
                className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${isUser
                    ? 'bg-gray-900 text-white rounded-br-md'
                    : 'bg-gray-100 text-gray-800 rounded-bl-md'
                    }`}
            >
                <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{message.content}</p>
                <p className={`text-[10px] mt-1 ${isUser ? 'text-gray-400' : 'text-gray-400'}`}>
                    {message.timestamp}
                </p>
            </div>

            {/* User avatar */}
            {isUser && (
                <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center ml-2.5 shrink-0">
                    <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                </div>
            )}
        </div>
    );
}
