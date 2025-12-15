'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User as UserIcon, Minimize2, Sparkles } from 'lucide-react';

export function ChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant', content: string }>>([
        { role: 'assistant', content: '¡Hola! Soy tu asistente de Evolutivos. ¿En qué puedo ayudarte hoy?' }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const userMsg = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setLoading(true);

        try {
            // Context could be current page info, but for now generic.
            // Ideally we pass some summary context?
            const res = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [...messages, { role: 'user', content: userMsg }],
                    context: { page: window.location.pathname }
                })
            });
            const data = await res.json();

            if (data.reply) {
                setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
            } else {
                setMessages(prev => [...prev, { role: 'assistant', content: "Hubo un error al procesar tu mensaje." }]);
            }
        } catch (e) {
            console.error(e);
            setMessages(prev => [...prev, { role: 'assistant', content: "Lo siento, tuve un problema de conexión." }]);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 p-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-full shadow-xl hover:shadow-2xl hover:scale-110 transition-all z-50 group"
            >
                <div className="absolute inset-0 bg-white rounded-full opacity-0 group-hover:animate-ping"></div>
                <MessageSquare className="w-6 h-6 relative z-10" />
            </button>
        );
    }

    return (
        <div className="fixed bottom-6 right-6 w-96 h-[500px] bg-white rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300 border border-antiflash">

            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-white/20 rounded-lg">
                        <Bot className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-bold">Asistente IA</h3>
                        <p className="text-xs text-white/70">Control AMA</p>
                    </div>
                </div>
                <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1.5 rounded-lg transition-colors">
                    <Minimize2 className="w-4 h-4" />
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-sea-salt/30">
                {messages.map((m, i) => (
                    <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${m.role === 'user' ? 'bg-teal/10 text-teal' : 'bg-indigo-100 text-indigo-600'}`}>
                            {m.role === 'user' ? <UserIcon className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                        </div>
                        <div className={`p-3 rounded-2xl text-sm max-w-[80%] ${m.role === 'user'
                                ? 'bg-teal text-white rounded-tr-none'
                                : 'bg-white border border-antiflash text-blue-grey rounded-tl-none shadow-sm'
                            }`}>
                            {m.content}
                        </div>
                    </div>
                ))}

                {loading && (
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-indigo-100 text-indigo-600">
                            <Sparkles className="w-4 h-4 animate-spin" />
                        </div>
                        <div className="p-3 rounded-2xl text-sm bg-white border border-antiflash text-blue-grey rounded-tl-none shadow-sm flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></span>
                            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce delay-75"></span>
                            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce delay-150"></span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-4 bg-white border-t border-antiflash flex gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Escribe tu pregunta..."
                    className="flex-1 bg-sea-salt border border-transparent focus:bg-white focus:border-indigo-300 rounded-xl px-4 py-2 text-sm text-prussian-blue outline-none transition-all placeholder:text-blue-grey/40"
                    disabled={loading}
                />
                <button
                    type="submit"
                    disabled={loading || !input.trim()}
                    className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <Send className="w-5 h-5" />
                </button>
            </form>
        </div>
    );
}
