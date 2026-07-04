import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

export interface CatalogEntry {
  title: string;
  category: string;
}

export interface GroqIntent {
  in_store: boolean;
  /** 1-based indices into the catalog array passed to classifyAndMatch. */
  matched_indices: number[];
  reply: string;
}

interface GroqChatCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

const FALLBACK_REPLY =
  "I can only help you find products we actually sell here on GoSellr. Try asking about something like electronics, fashion, health, food, home, or sports items!";

// Keeps the prompt bounded even if the catalog grows large — a small/medium
// store's full catalog fits comfortably in an 8B model's context window.
const MAX_CATALOG_ITEMS = 200;

/**
 * Thin wrapper around Groq's OpenAI-compatible chat completions endpoint.
 * The FULL product catalog (title + category only, to keep tokens cheap) is
 * given to the model so it can ground synonym/relevance matching in what the
 * store *actually* sells (e.g. "wedding clothing" → a listed kurta/shirt)
 * instead of guessing generic English keywords that might not appear
 * verbatim in any listing. One call per message does classification +
 * matching + reply phrasing together.
 */
@Injectable()
export class GroqClientService {
  private readonly logger = new Logger(GroqClientService.name);
  private readonly apiKey: string;
  private readonly apiUrl: string;
  private readonly model: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly config: ConfigService,
  ) {
    this.apiKey = this.config.getOrThrow<string>('GROQ_API_KEY');
    this.apiUrl = this.config.get<string>('GROQ_API_URL') ?? 'https://api.groq.com/openai/v1/chat/completions';
    this.model = this.config.get<string>('GROQ_MODEL') ?? 'llama-3.1-8b-instant';
  }

  async classifyAndMatch(userMessage: string, catalog: CatalogEntry[]): Promise<GroqIntent> {
    const bounded = catalog.slice(0, MAX_CATALOG_ITEMS);
    const catalogList = bounded.length
      ? bounded.map((c, i) => `${i + 1}. ${c.title} (${c.category})`).join('\n')
      : '(the store has no active products yet)';

    const systemPrompt = [
      'You are a shopping-search assistant for an online marketplace called GoSellr.',
      'Here is the FULL current product catalog, one per line as "<index>. <title> (<category>)":',
      catalogList,
      '',
      "Given the shopper's message, decide:",
      '1. "in_store": true if the message plausibly asks about a product, item, brand, or category a general online marketplace like this could sell — even if nothing in the current catalog matches yet. false for small talk, greetings with no product intent, or topics unrelated to shopping (weather, coding help, general trivia, etc.).',
      '2. "matched_indices": an array of catalog index NUMBERS (from the numbered list above) that are relevant to the shopper\'s request. Use judgement about synonyms and related items — e.g. "wedding clothing" should match listed shirts/kurtas/apparel even though the word "clothing" never appears in a title. Empty array if nothing in the catalog matches or in_store is false.',
      '3. "reply": ONE short, friendly sentence. If matches were found, briefly acknowledge what you found. If in_store is true but nothing matched, say so briefly. If in_store is false, politely explain you can only help find products sold in this store.',
      'Respond ONLY with strict JSON in this exact shape: {"in_store": boolean, "matched_indices": number[], "reply": string}',
    ].join('\n');

    try {
      const response = await firstValueFrom(
        this.httpService.post<GroqChatCompletionResponse>(
          this.apiUrl,
          {
            model: this.model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userMessage },
            ],
            temperature: 0.3,
            max_tokens: 400,
            response_format: { type: 'json_object' },
          },
          {
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      const raw = response.data.choices?.[0]?.message?.content;
      if (!raw) throw new Error('Empty Groq response');
      const parsed = JSON.parse(raw) as Partial<GroqIntent>;

      return {
        in_store: typeof parsed.in_store === 'boolean' ? parsed.in_store : true,
        matched_indices: Array.isArray(parsed.matched_indices)
          ? parsed.matched_indices.filter((n): n is number => typeof n === 'number' && Number.isInteger(n))
          : [],
        reply: typeof parsed.reply === 'string' && parsed.reply.trim() ? parsed.reply.trim() : FALLBACK_REPLY,
      };
    } catch (err: unknown) {
      this.logger.warn(`Groq call failed, falling back to local keyword search: ${String(err)}`);
      return this.localFallback(userMessage, bounded);
    }
  }

  /** Naive local substring fallback if Groq is unreachable/rate-limited — keeps the assistant usable. */
  private localFallback(userMessage: string, catalog: CatalogEntry[]): GroqIntent {
    const stopwords = new Set(['the', 'a', 'an', 'is', 'are', 'do', 'you', 'have', 'has', 'for', 'me', 'i', 'want', 'need', 'any', 'some', 'looking', 'find', 'search', 'show', 'please']);
    const terms = userMessage
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length >= 3 && !stopwords.has(t));

    if (terms.length === 0) {
      return { in_store: false, matched_indices: [], reply: FALLBACK_REPLY };
    }

    const matched_indices: number[] = [];
    catalog.forEach((c, i) => {
      const haystack = `${c.title} ${c.category}`.toLowerCase();
      if (terms.some((t) => haystack.includes(t))) matched_indices.push(i + 1);
    });

    return {
      in_store: true,
      matched_indices,
      reply: matched_indices.length > 0
        ? `Here's what I found for "${userMessage.trim()}":`
        : `I couldn't find anything matching "${userMessage.trim()}" in our store.`,
    };
  }
}
