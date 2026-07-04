# Local Development Setup - API Routing

## Problem Identified

The frontend was calling `POST /api/generate-guidance` and receiving **404 Not Found**. The root cause was:

- `api/generate-guidance.ts` is a **Vercel serverless function** (uses `@vercel/node` format)
- Vercel serverless functions **only run when deployed to Vercel**
- During local development with Vite, **no backend server exists** to handle `/api` routes
- Vite serves the frontend on port 5173 but has no way to handle API calls

## Solution Implemented

Created a complete local development server setup that mirrors the Vercel production behavior:

### 1. **Local Development Server** (`server-dev.ts`)
- Node.js/TypeScript HTTP server listening on `http://localhost:3001`
- Reuses AI generation logic from `api/generate-guidance.ts`
- Handles CORS headers for development
- Supports both OpenAI and Azure OpenAI APIs
- Only used during local development

### 2. **Vite Proxy Configuration** (`vite.config.ts`)
```typescript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:3001',
      changeOrigin: true,
      rewrite: (path) => path
    }
  }
}
```
- Automatically routes `/api/*` requests from Vite to the local server
- Transparently proxies requests: `http://localhost:5173/api/...` → `http://localhost:3001/api/...`

### 3. **npm Scripts** (`package.json`)
```json
{
  "dev": "npm run dev:api & npm run dev:client",
  "dev:client": "vite",
  "dev:api": "node --import tsx server-dev.ts"
}
```
- `npm run dev` starts **both servers in parallel**
- API server on port 3001
- Vite client server on port 5173

### 4. **Updated API Endpoint** (`src/utils/aiService.ts`)
```typescript
const getAPIEndpoint = (): string => {
  // Same URL works in both dev and production
  return '/api/generate-guidance'
}
```
- Simplified to always use relative path
- Works in development (via Vite proxy) and production (via Vercel serverless)

## Deployment Architecture

### Local Development
```
Browser (http://localhost:5173)
    ↓
Vite Dev Server (port 5173)
    ↓ Proxy /api/* requests
Local API Server (port 3001) ← server-dev.ts
    ↓
OpenAI / Azure OpenAI API
```

### Vercel Production
```
Browser (https://your-app.vercel.app)
    ↓
Vercel Edge Network
    ↓
Frontend (static files)
    ↓ /api/* routes
Vercel Serverless Functions ← api/generate-guidance.ts
    ↓
OpenAI / Azure OpenAI API
```

## Running Locally

### Prerequisites
1. Node.js 18+ installed
2. `.env.local` file with configuration (see below)

### Environment Setup (`.env.local`)
```bash
# Frontend Configuration
VITE_AI_ENABLED=true

# API Server Configuration
API_PORT=3001

# OpenAI Configuration (choose one)
# Option 1: OpenAI
OPENAI_API_KEY=your_real_api_key_here
OPENAI_API_TYPE=openai

# Option 2: Azure OpenAI
# OPENAI_API_TYPE=azure
# AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
# AZURE_OPENAI_API_KEY=your_azure_api_key
# AZURE_OPENAI_DEPLOYMENT_ID=gpt-35-turbo
```

### Starting Development Servers
```bash
# Install dependencies
npm install

# Start both servers
npm run dev

# You should see:
# [dev-server] API server listening on http://localhost:3001
# [dev-server] Handling POST /api/generate-guidance
# 
# ➜  Local:   http://localhost:5173/
```

### Testing the Flow
1. Open http://localhost:5173 in your browser
2. Open DevTools (F12) → Console tab
3. Click "Learn More" on any opportunity
4. **Expected behavior**:
   - Debug logs appear in console
   - Network tab shows `POST /api/generate-guidance` (status 200 or 500 depending on API key)
   - Modal displays AI guidance or fallback local guidance

### Debugging API Issues
```bash
# Check if API server is running
curl -X POST http://localhost:3001/api/generate-guidance \
  -H "Content-Type: application/json" \
  -d '{"profile":{...}, "resumeHighlights":[], "opportunity":{...}}'

# Should respond with 400 (missing fields) or AI guidance
```

## Files Changed

| File | Change | Purpose |
|------|--------|---------|
| `server-dev.ts` | **CREATED** | Local Node.js API server for development |
| `vite.config.ts` | Added `server.proxy` | Route `/api/*` to local server |
| `package.json` | Updated scripts, added `tsx` | Run API server alongside Vite |
| `.env.local` | Added `API_PORT` | Configure API server port |
| `src/utils/aiService.ts` | Simplified `getAPIEndpoint()` | Always use `/api/generate-guidance` |

## Key Differences: Development vs Production

| Aspect | Development | Production (Vercel) |
|--------|------------|-------------------|
| Frontend Server | Vite (port 5173) | Vercel Edge Network |
| API Server | `server-dev.ts` (port 3001) | `api/generate-guidance.ts` (serverless) |
| Request Flow | Vite proxy → local server | Vercel routes → serverless function |
| Environment | `.env.local` | Vercel Project Settings |
| API Keys | Local file | Vercel secrets (safe) |

## Security Notes

- **Development**: API keys in `.env.local` (**never commit to git**)
- **Production**: Secrets stored in Vercel Project Settings (hidden from browser)
- **Frontend**: Never has direct access to API keys in both dev and prod
- **Fallback**: If API fails, frontend gracefully falls back to local guidance

## Common Issues

### Issue: API server not starting
```
Error: OPENAI_API_KEY not configured
```
**Fix**: Add real API key or test key to `.env.local`

### Issue: 404 on /api requests
```
Ensure:
1. API server is running: npm run dev:api
2. Vite proxy is configured in vite.config.ts
3. You're using relative path: /api/generate-guidance
```

### Issue: Port 3001 already in use
```
Change in .env.local:
API_PORT=3002
And update vite.config.ts proxy target
```

## Next Steps

1. Set up real OpenAI or Azure OpenAI API keys
2. Run `npm run dev` and test the AI guidance flow
3. Verify Network tab shows successful API calls
4. When ready for production, deploy to Vercel with environment variables configured
