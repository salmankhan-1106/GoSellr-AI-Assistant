'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Sparkles, X, Send, Minimize2, Package } from 'lucide-react';
import { useSendAiChatMessageMutation, type AiChatProduct } from '@/lib/store/api/ai-assistant.api';
import { getErrorMessage } from '@/lib/utils/api-error';
import { formatPrice } from '@/lib/utils/format-price';
import { handleImgError } from '@/lib/utils/image-fallback';

interface AiChatWindowProps {
  open: boolean;
  onClose: () => void;
}

interface ChatMessage {
  id: number;
  from: 'assistant' | 'user';
  text: string;
  products?: AiChatProduct[];
  suggestions?: string[];
}

const WELCOME_MESSAGE: ChatMessage = {
  id: 0,
  from: 'assistant',
  text: "Hi! I'm the GoSellr AI assistant. Ask me about any product we sell and I'll find it for you.",
};

// Expand to fullscreen once the shopper has sent more than this many messages.
const EXPAND_AFTER_MESSAGES = 3;

function AssistantAvatar() {
  return (
    <span className="shrink-0 w-6 h-6 rounded-full bg-gradient-primary flex items-center justify-center shadow-sm">
      <Sparkles className="w-3 h-3 text-white" />
    </span>
  );
}

function ProductResultCard({ product }: { product: AiChatProduct }) {
  return (
    <Link
      href={`/browse/${product.id}`}
      className="flex items-center gap-2.5 bg-card border border-border rounded-lg p-2 hover:border-accent hover:shadow-sm transition-all"
    >
      <div className="w-11 h-11 rounded-md bg-surface-alt overflow-hidden shrink-0 flex items-center justify-center">
        {product.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.image} alt={product.title} onError={handleImgError} className="w-full h-full object-cover" />
        ) : (
          <Package className="w-4 h-4 text-muted-foreground" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium text-foreground line-clamp-1">{product.title}</div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-accent">{formatPrice(product.price)}</span>
          {product.sq_badge_label && (
            <span className="text-[10px] text-muted-foreground">· {product.sq_badge_label}</span>
          )}
        </div>
      </div>
    </Link>
  );
}

export function AiChatWindow({ open, onClose }: AiChatWindowProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [draft, setDraft] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [limitMessage, setLimitMessage] = useState<string | null>(null);
  const [usage, setUsage] = useState<{ count: number; limit: number; remaining: number } | null>(null);

  const [sendMessage, { isLoading }] = useSendAiChatMessageMutation();
  const nextIdRef = useRef(1);
  const sentCountRef = useRef(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isLoading]);

  if (!open) return null;

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading || limitMessage) return;

    const userMsg: ChatMessage = { id: nextIdRef.current++, from: 'user', text: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setDraft('');

    sentCountRef.current += 1;
    if (sentCountRef.current > EXPAND_AFTER_MESSAGES) setIsExpanded(true);

    try {
      const res = await sendMessage(trimmed).unwrap();
      setUsage(res.usage);
      setMessages((prev) => [
        ...prev,
        { id: nextIdRef.current++, from: 'assistant', text: res.reply, products: res.products, suggestions: res.suggestions },
      ]);
    } catch (err) {
      const status = (err as { status?: number })?.status;
      const data = (err as { data?: { message?: string; limit?: number; remaining?: number } })?.data;
      const fallback = 'Sorry, something went wrong. Please try again.';
      const errMsg = data?.message ?? getErrorMessage(err, fallback);
      if (status === 429) {
        setLimitMessage(errMsg);
        if (typeof data?.limit === 'number') {
          setUsage({ count: data.limit, limit: data.limit, remaining: data.remaining ?? 0 });
        }
      }
      setMessages((prev) => [...prev, { id: nextIdRef.current++, from: 'assistant', text: errMsg }]);
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    void send(draft);
  };

  const containerStyle = isExpanded
    ? { top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh', borderRadius: 0 }
    : {
        top: 'auto',
        left: 'auto',
        right: '1rem',
        bottom: '1rem',
        width: 'min(92vw, 24rem)',
        height: 'min(70vh, 560px)',
        borderRadius: '0.75rem',
      };

  return (
    <div
      style={containerStyle}
      className="fixed z-[60] transition-all duration-500 ease-in-out"
    >
      {/* Ambient glow — only in the compact floating state */}
      {!isExpanded && (
        <div
          className="absolute -inset-1.5 rounded-3xl bg-gradient-primary opacity-30 blur-xl animate-pulse-soft transition-opacity duration-500"
          aria-hidden="true"
        />
      )}

      <div
        role="dialog"
        aria-label="AI Assistant"
        className="relative w-full h-full max-w-2xl mx-auto flex flex-col bg-card border border-border shadow-xl overflow-hidden transition-[border-radius] duration-500"
        style={{ borderRadius: isExpanded ? 0 : '0.75rem' }}
      >
        {/* Header */}
        <div className="relative flex items-center gap-2.5 px-4 h-14 bg-gradient-primary text-white shrink-0 overflow-hidden">
          <span
            className="absolute inset-0 bg-[radial-gradient(circle_at_20%_-20%,rgba(255,255,255,0.25),transparent_60%)]"
            aria-hidden="true"
          />
          <span className="relative w-7 h-7 rounded-full bg-white/15 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </span>
          <div className="relative flex-1 min-w-0">
            <div className="font-semibold text-sm leading-tight">GoSellr AI Assistant</div>
            <div className="flex items-center gap-1 text-[11px] text-white/80 leading-tight">
              <span className="w-1.5 h-1.5 rounded-full bg-success-400 animate-pulse-soft" />
              {usage ? `${usage.remaining}/${usage.limit} messages left today` : 'Online'}
            </div>
          </div>
          {isExpanded && (
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              aria-label="Collapse to floating window"
              className="relative w-7 h-7 rounded-md flex items-center justify-center hover:bg-white/15 transition-colors shrink-0"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close AI Assistant"
            className="relative w-7 h-7 rounded-md flex items-center justify-center hover:bg-white/15 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-soft">
          {messages.map((m) => (
            <div key={m.id} className={`flex flex-col gap-2 ${m.from === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`flex items-end gap-2 ${m.from === 'user' ? 'justify-end' : 'justify-start'} w-full`}>
                {m.from === 'assistant' && <AssistantAvatar />}
                <div
                  className={`max-w-[75%] text-sm rounded-2xl px-3.5 py-2 shadow-sm ${
                    m.from === 'assistant'
                      ? 'bg-surface-alt text-foreground rounded-bl-sm'
                      : 'bg-gradient-primary text-white rounded-br-sm'
                  }`}
                >
                  {m.text}
                </div>
              </div>

              {m.from === 'assistant' && m.products && m.products.length > 0 && (
                <div className="w-full max-w-[85%] ml-8 space-y-1.5">
                  {m.products.map((p) => (
                    <ProductResultCard key={p.id} product={p} />
                  ))}
                </div>
              )}

              {m.from === 'assistant' && m.suggestions && m.suggestions.length > 0 && (
                <div className="w-full max-w-[85%] ml-8 flex flex-wrap gap-1.5">
                  {m.suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => void send(s)}
                      disabled={isLoading || !!limitMessage}
                      className="text-xs px-3 py-1.5 rounded-pill border border-accent/30 text-accent bg-accent-50 hover:bg-accent-100 transition-colors disabled:opacity-50"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex items-end gap-2">
              <AssistantAvatar />
              <div className="bg-surface-alt rounded-2xl rounded-bl-sm px-3.5 py-2.5 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-pulse-soft [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-pulse-soft [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-pulse-soft [animation-delay:300ms]" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="flex items-center gap-2 p-3 border-t border-border shrink-0 bg-card">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={limitMessage ? 'Daily limit reached — come back tomorrow' : 'Ask the AI assistant...'}
            disabled={isLoading || !!limitMessage}
            className="flex-1 bg-surface-alt border border-border rounded-pill h-10 px-4 text-sm outline-none focus:border-accent transition-colors disabled:opacity-60"
          />
          <button
            type="submit"
            aria-label="Send message"
            disabled={isLoading || !!limitMessage || !draft.trim()}
            className="w-10 h-10 rounded-pill bg-gradient-primary hover:opacity-90 text-white flex items-center justify-center transition-opacity shrink-0 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
