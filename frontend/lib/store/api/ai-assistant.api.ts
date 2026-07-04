import { baseApi } from './base-api';
import { getAiClientId } from '@/lib/utils/ai-client-id';

export interface AiChatProduct {
  id: string;
  title: string;
  price: number;
  category: string;
  image: string | null;
  sq_badge_label: string | null;
}

export interface AiChatUsage {
  count: number;
  limit: number;
  remaining: number;
}

export interface AiChatResponse {
  reply: string;
  in_store: boolean;
  products: AiChatProduct[];
  suggestions: string[];
  usage: AiChatUsage;
}

export const aiAssistantApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    sendAiChatMessage: build.mutation<AiChatResponse, string>({
      query: (message) => ({
        url: '/ai-assistant/chat',
        method: 'POST',
        body: { message },
        headers: { 'x-ai-client-id': getAiClientId() },
      }),
    }),
  }),
});

export const { useSendAiChatMessageMutation } = aiAssistantApi;
