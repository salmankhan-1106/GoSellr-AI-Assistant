'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { ArrowLeft, Package, Send, Sparkles } from 'lucide-react';
import type { RootState } from '@/lib/store/root-state';
import { useSendAiChatMessageMutation, type AiChatProduct } from '@/lib/store/api/ai-assistant.api';
import { getErrorMessage } from '@/lib/utils/api-error';
import { formatPrice } from '@/lib/utils/format-price';
import { handleImgError } from '@/lib/utils/image-fallback';

interface ChatMessage {
  id: number;
  from: 'assistant' | 'user';
  text: string;
  suggestions?: string[];
}

const WELCOME_MESSAGE: ChatMessage = {
  id: 0,
  from: 'assistant',
  text: "Hi! I'm the GoSellr AI shopping assistant. Tell me what you're looking for — or even describe a problem, like \"my AC isn't working\" — and I'll find matching products for you.",
};

function AssistantAvatar() {
  return (
    <span className="shrink-0 w-7 h-7 rounded-full bg-gradient-primary flex items-center justify-center shadow-sm">
      <Sparkles className="w-3.5 h-3.5 text-white" />
    </span>
  );
}

function ProductPanelCard({ product }: { product: AiChatProduct }) {
  return (
    <Link
      href={`/browse/${product.id}`}
      className="group block bg-card border border-border rounded-xl overflow-hidden hover:shadow-md hover:border-accent transition-all"
    >
      <div className="aspect-square bg-surface-alt overflow-hidden">
        {product.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image}
            alt={product.title}
            onError={handleImgError}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <Package className="w-8 h-8" />
          </div>
        )}
      </div>
      <div className="p-3">
        <div className="text-[11px] text-muted-foreground mb-1">{product.category}</div>
        <h3 className="text-sm font-medium text-foreground line-clamp-2 mb-2 min-h-[2.5rem]">{product.title}</h3>
        <div className="flex items-center justify-between gap-1">
          <span className="text-base font-bold text-foreground">{formatPrice(product.price)}</span>
          {product.sq_badge_label && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-pill bg-accent-50 text-accent font-semibold shrink-0">
              {product.sq_badge_label}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function ProductSkeletonCard() {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden animate-pulse">
      <div className="aspect-square bg-surface-alt" />
      <div className="p-3 space-y-2">
        <div className="h-2.5 w-14 bg-surface-alt rounded" />
        <div className="h-3.5 w-full bg-surface-alt rounded" />
        <div className="h-3.5 w-2/3 bg-surface-alt rounded" />
      </div>
    </div>
  );
}

export default function AiAssistantPage() {
  const router = useRouter();
  const { isAuthenticated, isHydrated } = useSelector((s: RootState) => s.auth);

  useEffect(() => {
    if (!isHydrated) return;
    if (!isAuthenticated) {
      if (typeof window !== 'undefined') localStorage.setItem('gosellr_next', '/ai-assistant');
      router.push('/login');
    }
  }, [isAuthenticated, isHydrated, router]);

  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [draft, setDraft] = useState('');
  const [products, setProducts] = useState<AiChatProduct[]>([]);
  const [limitMessage, setLimitMessage] = useState<string | null>(null);
  const [usage, setUsage] = useState<{ count: number; limit: number; remaining: number } | null>(null);

  const [sendMessage, { isLoading }] = useSendAiChatMessageMutation();
  const nextIdRef = useRef(1);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isLoading]);

  if (!isHydrated || !isAuthenticated) return null;

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading || limitMessage) return;

    setMessages((prev) => [...prev, { id: nextIdRef.current++, from: 'user', text: trimmed }]);
    setDraft('');

    try {
      const res = await sendMessage(trimmed).unwrap();
      setUsage(res.usage);
      // Overwrite with this turn's matches — empty array naturally hides the panel.
      setProducts(res.products);
      setMessages((prev) => [
        ...prev,
        { id: nextIdRef.current++, from: 'assistant', text: res.reply, suggestions: res.suggestions },
      ]);
    } catch (err) {
      const status = (err as { status?: number })?.status;
      const data = (err as { data?: { message?: string; limit?: number; remaining?: number } })?.data;
      const errMsg = data?.message ?? getErrorMessage(err, 'Sorry, something went wrong. Please try again.');
      if (status === 429) {
        setLimitMessage(errMsg);
        if (typeof data?.limit === 'number') {
          setUsage({ count: data.limit, limit: data.limit, remaining: data.remaining ?? 0 });
        }
      }
      setMessages((prev) => [...prev, { id: nextIdRef.current++, from: 'assistant', text: errMsg }]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void send(draft);
  };

  const showProductPanel = products.length > 0 || isLoading;

  return (
    <div className="h-screen flex flex-col bg-surface-alt">
      {/* Header */}
      <header className="relative flex items-center gap-3 px-4 md:px-6 h-16 bg-gradient-primary text-white shrink-0 overflow-hidden">
        <span
          className="absolute inset-0 bg-[radial-gradient(circle_at_20%_-40%,rgba(255,255,255,0.2),transparent_60%)]"
          aria-hidden="true"
        />
        <button
          type="button"
          onClick={() => router.push('/')}
          aria-label="Back to GoSellr"
          className="relative w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/15 transition-colors shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="relative w-9 h-9 rounded-full bg-white/15 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5" />
        </span>
        <div className="relative flex-1 min-w-0">
          <div className="font-bold text-base leading-tight">GoSellr AI Assistant</div>
          <div className="flex items-center gap-1.5 text-xs text-white/80 leading-tight">
            <span className="w-1.5 h-1.5 rounded-full bg-success-400 animate-pulse-soft" />
            {usage ? `${usage.remaining}/${usage.limit} messages left today` : 'Online'}
          </div>
        </div>
      </header>

      <div className="flex-1 min-h-0 flex flex-col md:flex-row">
        {/* Left: related-products panel — only takes up space when there's something (or something loading) to show */}
        {showProductPanel && (
          <aside className="md:w-[340px] lg:w-[380px] shrink-0 max-h-[42vh] md:max-h-none border-b md:border-b-0 md:border-r border-border bg-card overflow-y-auto">
            <div className="p-4">
              <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-1.5">
                <Package className="w-4 h-4 text-accent" />
                Related Products
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-1 gap-3">
                {products.length > 0
                  ? products.map((p) => <ProductPanelCard key={p.id} product={p} />)
                  : Array.from({ length: 2 }).map((_, i) => <ProductSkeletonCard key={i} />)}
              </div>
            </div>
          </aside>
        )}

        {/* Right: chat */}
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            <div className="max-w-3xl w-full mx-auto space-y-4">
              {messages.map((m) => (
                <div key={m.id} className={`flex flex-col gap-2 ${m.from === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`flex items-end gap-2 ${m.from === 'user' ? 'justify-end' : 'justify-start'} w-full`}>
                    {m.from === 'assistant' && <AssistantAvatar />}
                    <div
                      className={`max-w-[80%] md:max-w-[70%] text-sm rounded-2xl px-4 py-2.5 shadow-sm ${
                        m.from === 'assistant'
                          ? 'bg-card border border-border text-foreground rounded-bl-sm'
                          : 'bg-gradient-primary text-white rounded-br-sm'
                      }`}
                    >
                      {m.text}
                    </div>
                  </div>

                  {m.from === 'assistant' && m.suggestions && m.suggestions.length > 0 && (
                    <div className="w-full max-w-[70%] ml-9 flex flex-wrap gap-1.5">
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
                  <div className="bg-card border border-border rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-pulse-soft [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-pulse-soft [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-pulse-soft [animation-delay:300ms]" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="border-t border-border bg-card p-3 md:p-4 shrink-0">
            <div className="max-w-3xl mx-auto flex items-center gap-2">
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={limitMessage ? 'Daily limit reached — come back tomorrow' : "Ask about a product, or describe what you need..."}
                disabled={isLoading || !!limitMessage}
                className="flex-1 bg-surface-alt border border-border rounded-pill h-11 px-4 text-sm outline-none focus:border-accent transition-colors disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={isLoading || !!limitMessage || !draft.trim()}
                aria-label="Send message"
                className="w-11 h-11 rounded-pill bg-gradient-primary hover:opacity-90 text-white flex items-center justify-center transition-opacity shrink-0 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
