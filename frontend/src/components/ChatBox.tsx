import { useState, useRef, useEffect } from 'react';
import { api } from '../lib/api';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatBox() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', content: trimmed };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const data = await api.post<{ reply: string }>('/chat', {
        message: trimmed,
        history: messages,
      });

      const assistantMessage: ChatMessage = { role: 'assistant', content: data.reply };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: "Sorry, I couldn't respond right now. Try again!" },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 w-14 h-14 bg-charcoal text-cream-50 rounded-full shadow-card-elevated flex items-center justify-center hover:bg-charcoal-light transition-colors"
        aria-label="Open style assistant"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      </button>
    );
  }

  return (
    <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 w-[calc(100%-2rem)] sm:w-96 max-h-[calc(100vh-10rem)] sm:max-h-[500px] h-[50vh] sm:h-[500px] bg-white rounded-card-lg shadow-card-elevated flex flex-col overflow-hidden border border-cream-300">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-charcoal text-cream-50">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Style Assistant</span>
          <span className="w-2 h-2 bg-green-400 rounded-full" aria-hidden="true" />
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-cream-50/70 hover:text-cream-50 transition-colors"
          aria-label="Close chat"
        >
          <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-charcoal-muted text-sm py-8">
            <p className="font-medium mb-1">Hey! I'm your style assistant 👋</p>
            <p>Ask me what to wear — I know your wardrobe.</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] px-3 py-2 rounded-card text-sm ${
                msg.role === 'user'
                  ? 'bg-charcoal text-cream-50'
                  : 'bg-cream-200 text-charcoal'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-cream-200 text-charcoal-muted px-3 py-2 rounded-card text-sm">
              <span className="animate-pulse">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-cream-300">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What should I wear today?"
            disabled={isLoading}
            className="flex-1 rounded-card border border-cream-400 bg-white px-3 py-2 text-sm text-charcoal focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-colors disabled:opacity-50"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="px-3 py-2 bg-charcoal text-cream-50 rounded-card text-sm font-medium hover:bg-charcoal-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
