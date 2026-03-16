import DOMPurify from 'dompurify';
import { marked } from 'marked';

export default function MessageBubble({ message, isTyping }) {
    const isUser = message.role === 'user';

    // Convert markdown to clean HTML
    const createMarkup = (text) => {
        if (!text) return { __html: '' };
        const rawMarkup = marked.parse(text, { async: false, breaks: true });
        return { __html: DOMPurify.sanitize(rawMarkup) };
    };
    return (
        <div className={`w-full flex my-8 ${isUser ? 'justify-end' : 'justify-start'}`}>

            {/* Bot Avatar section - only show for bot */}
            {!isUser && (
                <div className="shrink-0 mr-4 mt-1">
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center shadow-sm">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611l-.772.13c-1.687.282-3.393.425-5.105.425s-3.418-.143-5.105-.425l-.772-.13c-1.717-.293-2.3-2.379-1.067-3.61L5 14.5" />
                        </svg>
                    </div>
                </div>
            )}

            {/* Message section */}
            <div className={`flex flex-col ${isUser ? 'items-end max-w-[80%]' : 'flex-1'}`}>
                {/* Name Label */}
                <div className="font-medium text-[13px] mb-1.5 text-gray-500 px-1">
                    {isUser ? 'You' : 'HR Assistant'}
                </div>

                {/* Content Bubble/Text */}
                <div className={`text-[15px] leading-relaxed whitespace-pre-wrap ${isUser
                    ? 'bg-blue-500 text-white px-4 py-2.5 rounded-2xl rounded-br-sm shadow-sm'
                    : 'text-gray-800 markdown-body flex items-baseline flex-wrap'
                    }`}>
                    {isUser ? (
                        message.content
                    ) : (
                        <div
                            className="prose prose-sm max-w-none prose-p:my-1 prose-strong:font-bold prose-p:inline"
                            dangerouslySetInnerHTML={createMarkup(message.content)}
                        />
                    )}

                    {/* Inline typing indicator */}
                    {!isUser && isTyping && !message.content && (
                        <span className="inline-flex items-center gap-1 h-4">
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                        </span>
                    )}
                </div>

                {/* Generation time badge - only for bot messages after generation completes */}
                {!isUser && message.generationTime && !isTyping && (
                    <div className="flex items-center gap-1 mt-1.5 px-1">
                        <svg className="w-3 h-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-[11px] text-gray-300">
                            {message.generationTime < 1000
                                ? `${message.generationTime}ms`
                                : `${(message.generationTime / 1000).toFixed(1)}s`
                            }
                        </span>
                    </div>
                )}


            </div>
        </div>
    );
}
