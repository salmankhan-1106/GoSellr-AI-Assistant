import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { GroqClientService } from './groq-client.service';

export interface AiChatProduct {
  id: string;
  title: string;
  price: number;
  category: string;
  image: string | null;
  sq_badge_label: string | null;
}

export interface AiChatResponse {
  reply: string;
  in_store: boolean;
  products: AiChatProduct[];
  suggestions: string[];
  usage: { count: number; limit: number; remaining: number };
}

interface CatalogRow {
  id: string;
  title: string;
  category: string;
  price: number;
  images: string[];
  sq_badge_label: string | null;
}

const MAX_RESULTS = 8;
const MAX_SUGGESTIONS = 6;

@Injectable()
export class AiAssistantService {
  private readonly dailyLimit: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly groq: GroqClientService,
    private readonly config: ConfigService,
  ) {
    this.dailyLimit = Number(this.config.get<string>('AI_CHAT_DAILY_LIMIT') ?? 50);
  }

  async chat(subjectKey: string, message: string): Promise<AiChatResponse> {
    const usageDate = new Date().toISOString().slice(0, 10);

    const existing = await this.prisma.aiChatUsage.findUnique({
      where: { subject_key_usage_date: { subject_key: subjectKey, usage_date: usageDate } },
    });
    if (existing && existing.count >= this.dailyLimit) {
      throw new HttpException(
        {
          message: `You've reached today's limit of ${this.dailyLimit} messages. Please come back tomorrow!`,
          limit: this.dailyLimit,
          remaining: 0,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const catalog = await this.getCatalog();
    const categories = Array.from(new Set(catalog.map((c) => c.category))).sort();

    const intent = await this.groq.classifyAndMatch(
      message,
      catalog.map((c) => ({ title: c.title, category: c.category })),
    );

    let products: AiChatProduct[] = [];
    let suggestions: string[] = [];

    if (intent.in_store) {
      const matchedRows = intent.matched_indices
        .map((i) => catalog[i - 1])
        .filter((row): row is CatalogRow => !!row);

      products = matchedRows.slice(0, MAX_RESULTS).map(toAiChatProduct);

      if (products.length > 0) {
        const matchedCategories = Array.from(new Set(matchedRows.map((m) => m.category)));
        const extraTitles = matchedRows.slice(MAX_RESULTS, MAX_RESULTS + 3).map((m) => m.title);
        suggestions = Array.from(new Set([...matchedCategories, ...extraTitles])).slice(0, MAX_SUGGESTIONS);
      } else {
        suggestions = categories.slice(0, MAX_SUGGESTIONS);
      }
    } else {
      suggestions = categories.slice(0, MAX_SUGGESTIONS);
    }

    const usage = await this.recordUsage(subjectKey, usageDate);

    return {
      reply: intent.reply,
      in_store: intent.in_store,
      products,
      suggestions,
      usage,
    };
  }

  private async getCatalog(): Promise<CatalogRow[]> {
    return this.prisma.product.findMany({
      where: { is_active: true, sq_status: 'approved' },
      select: { id: true, title: true, category: true, price: true, images: true, sq_badge_label: true },
      orderBy: [{ sq_level: 'desc' }, { created_at: 'desc' }],
      take: 200,
    });
  }

  private async recordUsage(subjectKey: string, usageDate: string) {
    const updated = await this.prisma.aiChatUsage.upsert({
      where: { subject_key_usage_date: { subject_key: subjectKey, usage_date: usageDate } },
      create: { subject_key: subjectKey, usage_date: usageDate, count: 1 },
      update: { count: { increment: 1 } },
    });
    return {
      count: updated.count,
      limit: this.dailyLimit,
      remaining: Math.max(0, this.dailyLimit - updated.count),
    };
  }
}

function toAiChatProduct(p: CatalogRow): AiChatProduct {
  return {
    id: p.id,
    title: p.title,
    price: p.price,
    category: p.category,
    image: p.images?.[0] ?? null,
    sq_badge_label: p.sq_badge_label,
  };
}
