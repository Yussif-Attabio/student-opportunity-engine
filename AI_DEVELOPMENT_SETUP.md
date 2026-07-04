# AI Development Setup (Groq Provider)

## Architecture (unchanged)

`App.tsx`  
→ `useAIGuidance`  
→ `src/utils/aiService.ts`  
→ `POST /api/generate-guidance`  
→ local server (`server-dev.ts`) or Vercel function (`api/generate-guidance.ts`)  
→ Groq API

Frontend fallback behavior is unchanged:
- API success → AI guidance shown
- API failure → local `generateGuidance(...)` shown

## Environment variables

Frontend-safe:

```env
VITE_AI_ENABLED=true
```

Server-side:

```env
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama-3.3-70b-versatile
```

Local server:

```env
API_PORT=3001
```

## Runtime behavior

1. `npm run dev` runs API + Vite.
2. Frontend sends `POST /api/generate-guidance`.
3. Vite proxies `/api/*` to `localhost:3001`.
4. Server calls Groq chat completions endpoint.
5. Parsed guidance is returned to modal.

## Logging

The AI path emits:
- `[AI] Provider: Groq`
- `[AI] Request started`
- `[AI] Request succeeded`
- `[AI] Falling back to local guidance`

## Vercel deployment

Set these in Vercel project environment variables:

```env
VITE_AI_ENABLED=true
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama-3.3-70b-versatile
```

Vercel continues using `api/generate-guidance.ts` server-side.
