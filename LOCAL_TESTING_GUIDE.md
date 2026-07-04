# Local Testing Guide (Groq)

## 1. Configure environment

Create `.env.local` from `.env.example` and set:

```env
VITE_AI_ENABLED=true
API_PORT=3001
GROQ_API_KEY=your_real_groq_api_key
GROQ_MODEL=llama-3.3-70b-versatile
```

## 2. Run locally

```bash
npm run dev
```

This starts:
1. `http://localhost:5173` (Vite frontend)
2. `http://localhost:3001` (local API server)

## 3. Verify API flow

1. Open `http://localhost:5173`
2. Open DevTools → Network
3. Click **Learn More** on an opportunity
4. Confirm `POST /api/generate-guidance`

## 4. Interpret response

- **200 OK**: Groq request succeeded and modal shows AI guidance (✨ label).
- **500**: Groq/backend failed or missing config. Frontend falls back to local guidance.

## 5. Expected logs

- `[AI] Provider: Groq`
- `[AI] Request started`
- `[AI] Request succeeded` (on success)
- `[AI] Falling back to local guidance` (on failure/disabled path)

## 6. Fallback check

To test fallback, temporarily set an invalid `GROQ_API_KEY`, restart `npm run dev`, and verify:
- Network shows `500`
- Modal still shows non-crashing local guidance.
