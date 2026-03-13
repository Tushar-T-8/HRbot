import { useState } from 'react';
import ChatWindow from '../components/ChatWindow';
import ChatInput from '../components/ChatInput';
import { streamMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function ChatPage() {
    const { user } = useAuth();
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [abortController, setAbortController] = useState(null);

    const suggestQueries = ['Leave policy', 'WFH guidelines', 'Benefits info'];

    const handleStop = () => {
        if (abortController) {
            abortController.abort();
            setIsLoading(false);
        }
    };

    const handleSend = async (text) => {
        const now = new Date();
        const timestamp = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const date = now.toISOString();
        setMessages((prev) => [...prev, { role: 'user', content: text, timestamp, date }]);
        setIsLoading(true);
        const startTime = Date.now();

        try {
            const controller = new AbortController();
            setAbortController(controller);

            const resNow = new Date();
            const botMsgId = Date.now().toString();

            // Add empty bot message block to the ChatWindow first
            setMessages((prev) => [
                ...prev,
                {
                    id: botMsgId,
                    role: 'bot',
                    content: '', // Will be filled as stream arrives
                    timestamp: resNow.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    date: resNow.toISOString(),
                },
            ]);

            // Call the streaming API endpoint
            await streamMessage(
                text,
                user?.id || null,
                (chunk) => {
                    setMessages((prev) => {
                        const newMessages = [...prev];
                        const lastIndex = newMessages.length - 1;
                        // Avoid mutating state directly
                        newMessages[lastIndex] = {
                            ...newMessages[lastIndex],
                            content: newMessages[lastIndex].content + chunk
                        };
                        return newMessages;
                    });
                },
                null,
                controller.signal
            );

            // Stamp generation time on the bot message
            const elapsedMs = Date.now() - startTime;
            setMessages((prev) => {
                const newMessages = [...prev];
                const lastIndex = newMessages.length - 1;
                newMessages[lastIndex] = {
                    ...newMessages[lastIndex],
                    generationTime: elapsedMs,
                };
                return newMessages;
            });

        } catch (err) {
            if (err.name === 'AbortError') {
                return; // User cancelled generation
            }
            const errNow = new Date();
            setMessages((prev) => {
                // If it fails during stream, just append an error message or replace the empty one
                const newMessages = [...prev];
                const lastIndex = newMessages.length - 1;
                newMessages[lastIndex] = {
                    role: 'bot',
                    content: 'Could not connect to the server. Make sure the backend is running on port 5000 and Ollama is available.',
                    timestamp: errNow.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    date: errNow.toISOString(),
                };
                return newMessages;
            });
        } finally {
            setIsLoading(false);
            setAbortController(null);
        }
    };

    return (
        <div className="flex flex-col h-full bg-white relative">
            {/* Header Removed as requested by user */}

            {/* Chat Body container: only show messages if there's more than the default greeting, otherwise sit empty so input centers */}
            <div className="flex-1 overflow-y-auto w-full pb-40">
                {messages.length > 0 && (
                    <ChatWindow messages={messages} isLoading={isLoading} />
                )}
            </div>

            {/* Input Area: Centered vertically if empty, fixed to bottom if active */}
            <div className={`absolute w-full left-0 z-10 pointer-events-none transition-all duration-500 ease-in-out ${messages.length === 0 ? 'top-1/2 -translate-y-1/2 px-5' : 'bottom-0 bg-gradient-to-t from-white via-white to-transparent pt-8 pb-6 px-5'}`}>
                <div className="max-w-3xl mx-auto w-full flex flex-col items-center pointer-events-auto">

                    {/* Suggestion Chips */}
                    {messages.length === 0 && (
                        <div className="flex flex-wrap gap-2 justify-center mb-6">
                            {suggestQueries.map((q) => (
                                <button
                                    key={q}
                                    onClick={() => handleSend(q)}
                                    disabled={isLoading}
                                    className="text-[13px] px-3.5 py-1.5 rounded-full border border-gray-200 text-gray-600 bg-white hover:bg-gray-50 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-colors disabled:opacity-50"
                                >
                                    {q}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Input Component Wrapper */}
                    <div className="w-full relative">
                        <ChatInput onSend={handleSend} onStop={handleStop} isLoading={isLoading} />
                    </div>

                    {messages.length > 0 && (
                        <p className="text-[11px] text-gray-400 mt-2 text-center w-full">
                            AI-generated content may be inaccurate. Verify policies on the HR portal.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
