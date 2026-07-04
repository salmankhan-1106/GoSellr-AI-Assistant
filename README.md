# GoSellr AI Assistant

An AI shopping-assistant chatbot: a NestJS backend module + two Next.js
frontend surfaces (a floating chat widget and a full-screen chat page).
Extracted from the GoSellr platform — this repo contains **only the
chatbot-specific code**, decoupled from the host app's product/order/user
business logic. It's a reference package to drop into (or adapt for) your
own NestJS + Next.js + Prisma + Redux/RTK Query app.

## What it does

- Chats with a shopper using [Groq](https://console.groq.com)'s
  `llama-3.1-8b-instant` (fast + free-tier friendly).
- Grounds every response in your **actual live product catalog** (title +
  category), so it matches synonyms/related items correctly — e.g. "wedding
  clothing" → a listed kurta or shirt — instead of guessing generic keywords
  that might not appear in any listing.
- Refuses off-topic requests (weather, small talk, general trivia) and
  redirects the shopper back to store categories, without spending an API
  call on the product search itself.
- Rate-limits each subject (logged-in user id, or a guest's client-generated
  UUID) to a configurable number of messages per day (default 50), returning
  HTTP 429 once exhausted.
- Falls back to local substring matching if Groq is unreachable, so the
  assistant stays usable.

## Structure

```
backend/
  ai-assistant/
    ai-assistant.controller.ts   POST /ai-assistant/chat
    ai-assistant.module.ts
    ai-assistant.service.ts      rate-limit + catalog fetch + orchestration
    groq-client.service.ts       Groq HTTP client + prompt + local fallback
  auth/
    optional-jwt-auth.guard.ts   auth guard that never rejects — populates
                                 req.user for logged-in callers, leaves it
                                 undefined for guests
  prisma/
    prisma.service.ts            thin PrismaClient wrapper
    schema.snippet.prisma         the AiChatUsage model to add to your schema,
                                   + a comment documenting the Product field
                                   subset this module reads
    migrations/…/migration.sql    the AiChatUsage table DDL
  .env.example

frontend/
  components/
    ai-chat-window.tsx           floating bottom-right widget (any page)
  pages/
    ai-assistant-page.tsx        full-screen chat page — rename/move into
                                   your Next.js app router as app/ai-assistant/page.tsx
  lib/
    store/
      api/
        base-api.ts               trimmed RTK Query base (adapt to your app's real one)
        ai-assistant.api.ts        the chat mutation hook
      auth.slice.ts               stub — only exports the `logout` action
      root-state.ts                stub RootState shape (just `auth`)
    utils/
      ai-client-id.ts             persistent guest UUID (localStorage)
      api-error.ts                 RTK Query error → human message helper
      format-price.ts              currency formatter
      image-fallback.ts            <img onError> placeholder handler
  .env.example
```

## Integration notes

This was extracted from a larger app, so three files are **stubs you should
replace** with your app's real equivalents rather than use as-is:

- `frontend/lib/store/api/base-api.ts` — your app almost certainly already
  has an RTK Query base with its own tagTypes; just make sure
  `ai-assistant.api.ts`'s `baseApi.injectEndpoints(...)` targets it.
- `frontend/lib/store/auth.slice.ts` and `root-state.ts` — swap for your
  real auth slice / combined Redux state type.
- `backend/prisma/schema.snippet.prisma`'s commented `Product` block — your
  real Product model will have more fields; this just documents the subset
  `ai-assistant.service.ts` selects. Adjust field names in
  `ai-assistant.service.ts`'s `getCatalog()` if yours differ (e.g. if your
  schema doesn't use `sq_status`/`sq_level`/`sq_badge_label`, simplify the
  `where`/`select` there — those are GoSellr-specific "seller quality" fields,
  not required by the AI logic itself).
- `backend/ai-assistant/ai-assistant.controller.ts`'s `AuthenticatedUser`
  interface is a one-field (`id`) stand-in for your real JWT user type.

## Setup

**Backend** (inside your NestJS app):
1. Copy `backend/ai-assistant/` and `backend/auth/optional-jwt-auth.guard.ts`
   into your `src/modules/`.
2. Add the `AiChatUsage` model from `backend/prisma/schema.snippet.prisma` to
   your `schema.prisma`, then `npx prisma migrate dev`.
3. Register `AiAssistantModule` in your `app.module.ts`.
4. Copy `.env.example` → `.env` and fill in a real `GROQ_API_KEY`
   (free at console.groq.com) and your `DATABASE_URL`.

**Frontend** (inside your Next.js app):
1. Copy the files under `frontend/lib/` and `frontend/components/` into the
   matching paths in your app (adapting the three stub files above).
2. Move `frontend/pages/ai-assistant-page.tsx` to
   `app/ai-assistant/page.tsx` in your app router.
3. Copy `.env.example` → `.env.local` and point `NEXT_PUBLIC_API_URL` at
   your backend.
4. Add an entry point (nav link, button, etc.) wherever makes sense in your
   app — the full-screen page gates on `isAuthenticated`/`isHydrated` from
   your auth state and redirects to `/login` otherwise.

## Security

- Never commit a real `.env` — both `.env.example` files use placeholders
  only, and `.gitignore` excludes `.env*`.
- The daily message cap and the store-relevance check exist specifically to
  bound Groq API usage — keep both in place if you fork this.
