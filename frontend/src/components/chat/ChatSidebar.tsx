'use client';

import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import TitleBadge from '@/components/common/TitleBadge';

interface Message {
  id: string;
  message: string;
  createdAt: string;
  user: {
    username: string;
    activeTitle: string | null;
  };
}

export default function ChatSidebar() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Poll for messages every 3 seconds
  useEffect(() => {
    const fetchMessages = () => {
      api.chat.messages()
        .then((res: any) => {
          if (res?.messages) {
            setMessages(res.messages);
          }
        })
        .catch(() => {});
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isSending) return;

    setIsSending(true);
    try {
      await api.chat.send(inputText.trim());
      setInputText('');
      // Refresh messages immediately
      const res = await api.chat.messages();
      if (res?.messages) setMessages(res.messages);
    } catch (err: any) {
      alert(err.message || 'Chyba při odesílání.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 p-4 rounded-full glass-card border-st-cyan/30 shadow-[0_0_20px_rgba(6,182,212,0.2)] transition-all hover:scale-110 active:scale-95 ${
          isOpen ? 'bg-st-cyan text-white' : 'text-st-cyan'
        }`}
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          {isOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          )}
        </svg>
      </button>

      {/* Sidebar Panel */}
      <aside
        className={`fixed top-0 right-0 h-screen w-80 z-40 glass-card-static border-l border-white/10 transition-transform duration-300 ease-in-out transform ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        } flex flex-col pt-[80px]`}
      >
        <div className="px-6 py-4 border-b border-white/5 bg-white/5">
          <h2 className="text-sm font-bold tracking-widest uppercase text-st-cyan flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-st-emerald animate-pulse"></span>
            Globální Chat
          </h2>
        </div>

        {/* Message List */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10"
        >
          {messages.map((msg) => (
            <div key={msg.id} className="group">
              <div className="flex items-baseline gap-1.5 mb-0.5">
                <TitleBadge titleKey={msg.user.activeTitle} />
                <span className="text-sm font-bold text-white/90">
                  {msg.user.username}
                </span>
                <span className="text-[9px] text-text-muted font-mono ml-auto">
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-sm text-text-muted leading-relaxed break-words bg-white/3 p-2.5 rounded-xl border border-white/5 group-hover:border-white/10 transition-colors">
                {msg.message}
              </p>
            </div>
          ))}
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center opacity-30 text-center px-6">
              <svg className="w-12 h-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
              </svg>
              <p className="text-xs font-mono uppercase tracking-widest">Žádné zprávy</p>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white/5 border-t border-white/5">
          {user ? (
            <form onSubmit={handleSend} className="relative">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Napište něco..."
                maxLength={500}
                autoComplete="off"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 pr-12 text-sm focus:outline-none focus:border-st-cyan/50 focus:ring-1 focus:ring-st-cyan/50 transition-all font-sans"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || isSending}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-st-cyan hover:text-st-cyan/80 disabled:opacity-30 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </form>
          ) : (
            <p className="text-xs text-center text-text-muted italic py-2">
              Chcete-li psát, přihlaste se.
            </p>
          )}
        </div>
      </aside>
    </>
  );
}
