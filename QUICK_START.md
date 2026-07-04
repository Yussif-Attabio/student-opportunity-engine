# Quick Start Guide - AI Match Explanations (Secure Backend Setup)

## Security-First Architecture

✅ **API keys are server-side only** - Never exposed to browser
✅ **Frontend calls /api/generate-guidance** - Secure serverless endpoint
✅ **Graceful fallback** - Uses local guidance if API fails
✅ **No VITE_ prefixes for secrets** - Only safe config exposed to frontend

## Setup (5 minutes)

### 1. Enable AI Feature

```bash
# Copy template to local env file
cp .env.example .env.local
```

**Edit .env.local** - Set frontend config:
```env
VITE_AI_ENABLED=true
```

### 2. Configure Server-Side API Keys

**For Local Development:**

Add to `.env.local` (for Vercel Functions emulation):

**Option A: OpenAI**
```env
OPENAI_API_KEY=sk_test_...
OPENAI_API_TYPE=openai
```

**Option B: Azure OpenAI**
```env
OPENAI_API_TYPE=azure
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_KEY=your_api_key
AZURE_OPENAI_DEPLOYMENT_ID=gpt-35-turbo
AZURE_OPENAI_API_VERSION=2024-02-15-preview
```

### 3. Get API Keys

**OpenAI:**
- Go to https://platform.openai.com/account/api-keys
- Create a new secret key
- Copy and paste into .env.local

**Azure OpenAI:**
- Set up Azure OpenAI instance
- Get endpoint, deployment ID, and API key from Azure Portal
- Note the API version (default: 2024-02-15-preview)

### 4. Run Development Server

```bash
npm run dev
```

### 5. Test AI Guidance

1. Open app in browser
2. Browse opportunities
3. Click "Learn More" on an opportunity
4. Wait for "⏳ Generating personalized guidance..."
5. See "✨ AI Application Guidance" with explanation

## Deployment to Vercel

### Step 1: Add Environment Variables in Vercel

Go to **Project Settings → Environment Variables** and add:

```env
VITE_AI_ENABLED=true
OPENAI_API_KEY=sk_test_...
OPENAI_API_TYPE=openai

# OR for Azure:
OPENAI_API_TYPE=azure
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_KEY=your_key
AZURE_OPENAI_DEPLOYMENT_ID=gpt-35-turbo
AZURE_OPENAI_API_VERSION=2024-02-15-preview
```

### Step 2: Deploy

```bash
git add .
git commit -m "Enable AI guidance with secure backend"
git push
```

Vercel will automatically:
- Deploy the frontend (React/Vite)
- Deploy the serverless function `/api/generate-guidance.ts`
- Provide environment variables to the function
- Keep API keys secret on the server

### Step 3: Verify Deployment

- Visit your deployed app
- Open opportunity modal
- Verify AI guidance generates
- Check browser console - should NOT see any API keys

## Architecture

```
Browser (Frontend)
    ↓
[App.tsx] ← Calls useAIGuidance hook
    ↓
[/api/generate-guidance] ← HTTP POST
    ↓
Server-Side API Endpoint
    ├─ OPENAI_API_KEY (server-side only!)
    ├─ AZURE_OPENAI_* (server-side only!)
    └─ Calls OpenAI or Azure OpenAI
    ↓
Returns: { why, nextStep, highlights, tip }
    ↓
Browser Shows: "✨ AI Application Guidance"
```

## Environment Variables Reference

### Frontend (Safe to expose)
| Variable | Purpose | Example |
|----------|---------|---------|
| `VITE_AI_ENABLED` | Enable/disable AI | `true` |
| `VITE_API_URL` | API endpoint (dev only) | `http://localhost:3000/api/generate-guidance` |

### Server-Side (Never in browser)
| Variable | Purpose | Example |
|----------|---------|---------|
| `OPENAI_API_KEY` | OpenAI secret | `sk_test_...` |
| `OPENAI_API_TYPE` | Provider type | `openai` or `azure` |
| `AZURE_OPENAI_ENDPOINT` | Azure resource | `https://name.openai.azure.com/` |
| `AZURE_OPENAI_API_KEY` | Azure secret | `your_key` |
| `AZURE_OPENAI_DEPLOYMENT_ID` | Deployment name | `gpt-35-turbo` |
| `AZURE_OPENAI_API_VERSION` | API version | `2024-02-15-preview` |

## Disabling AI (Local-Only Mode)

Set in `.env.local`:
```env
VITE_AI_ENABLED=false
```

App will use local guidance (no API calls, works without secrets).

## Troubleshooting

### "Generating personalized guidance..." takes too long
- Check internet connection
- Verify API key is correct in `.env.local`
- Check Vercel deployment logs
- Monitor API provider's status page

### Error message displays
- System automatically falls back to local guidance
- Check browser console (F12 → Console) for error details
- Verify `.env.local` has correct API key format
- Check `/api/generate-guidance` response in Network tab

### "Application Guidance" instead of "AI Application Guidance"
- This is normal if VITE_AI_ENABLED is not true
- Or if API endpoint is not reachable
- Check that `VITE_AI_ENABLED=true` in .env.local

### API key exposed warning
- **Should never happen** with this setup
- Browser should only see `VITE_AI_ENABLED`
- If you see `VITE_OPENAI_API_KEY` in browser - **STOP** and fix your setup
- Delete that key immediately and generate a new one
- Never commit .env.local to git

## Security Checklist

- [x] API keys stored server-side only (no VITE_ prefix)
- [x] Frontend cannot access secrets
- [x] All secrets in Vercel Project Settings (not .env.local for production)
- [x] `.env.local` in .gitignore (never committed)
- [x] /api/generate-guidance validates input
- [x] Graceful fallback if API fails
- [x] Error messages don't expose secrets
- [x] Browser console shows no API keys

## Build for Production

```bash
npm run build
```

Vercel automatically:
- Compiles TypeScript and React
- Builds serverless function
- Deploys both to CDN
- Keeps environment variables secure

## Files Changed

| File | Type | Purpose |
|------|------|---------|
| `/api/generate-guidance.ts` | NEW | Serverless function (Vercel) |
| `src/utils/aiService.ts` | MODIFIED | Calls API instead of OpenAI directly |
| `.env.example` | MODIFIED | Server-side config (no VITE_ for secrets) |
| `vercel.json` | OPTIONAL | Configure serverless function (auto-detected) |

## Key Differences from Browser-Based Setup

### ❌ OLD (Insecure)
```
Browser → [VITE_OPENAI_API_KEY] → OpenAI API
          (Exposed to user!)
```

### ✅ NEW (Secure)
```
Browser → /api/generate-guidance → [OPENAI_API_KEY] → OpenAI API
          (Calls server function)     (Server-side only)
```

## Next Steps

1. ✅ Add `VITE_AI_ENABLED=true` to `.env.local`
2. ✅ Add server-side API key to `.env.local`
3. ✅ Run `npm run dev`
4. ✅ Test in browser
5. ✅ Deploy to Vercel with environment variables
6. ✅ Verify deployment works

---

**Ready!** Your AI guidance is now secure and production-ready. 🚀

