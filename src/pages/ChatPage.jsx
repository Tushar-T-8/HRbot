import { useState } from 'react';
import ChatWindow from '../components/ChatWindow';
import ChatInput from '../components/ChatInput';
import { sendMessage } from '../services/api';

export default function ChatPage() {
    const [messages, setMessages] = useState([
        {
            role: 'bot',
            content: "Hello! 👋 I'm your HR assistant. I can help you with company policies, leave balances, benefits, and more. How can I help you today?",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            date: new Date().toISOString(),
        }
    ]);
    const [isLoading, setIsLoading] = useState(false);

    const handleSend = async (text) => {
        const now = new Date();
        const timestamp = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const date = now.toISOString();
        setMessages((prev) => [...prev, { role: 'user', content: text, timestamp, date }]);
        setIsLoading(true);

        try {
            const res = await sendMessage(text);
            const resNow = new Date();
            setMessages((prev) => [
                ...prev,
                {
                    role: 'bot',
                    content: res.data.data.message,
                    timestamp: resNow.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    date: resNow.toISOString(),
                },
            ]);
        } catch {
            const errNow = new Date();
            setMessages((prev) => [
                ...prev,
                {
                    role: 'bot',
                    content: 'Could not connect to the server. Make sure the backend is running on port 5000.',
                    timestamp: errNow.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    date: errNow.toISOString(),
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Header */}
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="text-sm font-semibold text-gray-900">HR Assistant</h1>
                        <p className="text-[11px] text-gray-400">AI-powered</p>
                    </div>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    <span className="text-[11px] text-gray-400">Online</span>
                </div>
            </div>

            <ChatWindow messages={messages} isLoading={isLoading} />
            <ChatInput onSend={handleSend} isLoading={isLoading} />
        </div>
    );
}
