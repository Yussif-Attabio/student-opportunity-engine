# AI-Powered Match Explanations Implementation

## Overview
This document describes the implementation of AI-powered match explanations using OpenAI or Azure OpenAI APIs. The system maintains full backward compatibility with existing features while adding intelligent, personalized opportunity guidance.

## Architecture Changes

### New Files Created

1. **`src/utils/aiService.ts`**
   - Core AI service for generating match explanations
   - Supports both OpenAI and Azure OpenAI APIs
   - Builds structured prompts from student profile and opportunity data
   - Parses AI responses into structured guidance format
   - Implements graceful fallback to local guidance on API failure

2. **`src/hooks/useAIGuidance.ts`**
   - React hook for managing AI guidance fetching
   - Handles loading and error states
   - Implements cleanup and memoization
   - Dependency tracking for re-fetching when inputs change

3. **`.env.example`**
   - Template for environment variable configuration
   - Documents all supported OpenAI and Azure OpenAI settings
   - Includes helpful comments and setup instructions

### Modified Files

1. **`src/App.tsx`**
   - Replaced `generateGuidance` import with `useAIGuidance` hook
   - Updated guidance generation to use async AI service
   - Enhanced modal display with:
     - Loading state indicator ("⏳ Generating personalized guidance...")
     - Error state with error message display ("⚠️" icon)
     - AI badge indicator ("✨ AI Application Guidance" vs "Application Guidance")
   - Full backward compatibility maintained - all existing features unchanged

## Environment Configuration

### Vite Environment Variables

Vite automatically loads variables prefixed with `VITE_` from `.env`, `.env.local`, and `.env.{mode}` files.

#### OpenAI Configuration
```env
VITE_OPENAI_API_KEY=sk_test_...
```

#### Azure OpenAI Configuration
```env
VITE_OPENAI_API_TYPE=azure
VITE_AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
VITE_AZURE_OPENAI_API_KEY=your_api_key
VITE_AZURE_OPENAI_DEPLOYMENT_ID=gpt-35-turbo
VITE_AZURE_OPENAI_API_VERSION=2024-02-15-preview
```

#### No API Key (Uses Local Fallback)
Leave all API keys empty to use local guidance generation without AI.

## Feature Details

### AI Guidance Generation

**Prompt Structure:**
- Includes complete student profile (major, skills, interests, goals)
- Incorporates resume highlights (if provided)
- Contains full opportunity details
- Structured format requesting specific sections:
  - Why this opportunity is a strong fit
  - Which skills/interests/resume highlights match
  - One actionable recommendation for improving the application

**Response Parsing:**
- Parses AI response into three sections (WHY FIT, MATCHING STRENGTHS, RECOMMENDATION)
- Graceful fallback if parsing fails
- Response capped at 150 words

### Loading States

- **Loading:** "⏳ Generating personalized guidance..."
- **Success:** Displays AI-generated or local guidance with source indicator
- **Error:** "⚠️ [error message]" with automatic fallback to local guidance

### Fallback Behavior

If API call fails for any reason:
1. Error is logged to console (non-blocking)
2. System automatically falls back to local guidance generation
3. User sees guidance without noticing the failure
4. Guidance displays "Application Guidance" instead of "AI Application Guidance"

## Type Safety

All new code is fully TypeScript-typed:

```typescript
export interface AIGuidance {
  why: string
  nextStep: string
  highlights: string[]
  tip: string
  isAI: boolean  // Indicates whether guidance came from AI
}
```

## Backward Compatibility

✅ **All existing features remain unchanged:**
- Resume upload and highlights extraction
- Profile management and localStorage persistence
- Opportunity matching scores (calculateMatch unchanged)
- Saved opportunities tracking
- Deadline filtering and sorting
- Application status tracking (Saved, Applying, Applied, Interview, Done)
- Filters (search, type, location, deadline urgency)

## API Requirements

### OpenAI
- **Endpoint:** https://api.openai.com/v1/chat/completions
- **Model:** gpt-3.5-turbo
- **Auth:** Bearer token in Authorization header
- **Rate Limits:** Subject to OpenAI account limits

### Azure OpenAI
- **Endpoint:** Custom Azure resource endpoint
- **Auth:** api-key header
- **Deployment:** Must be pre-configured in Azure
- **API Version:** 2024-02-15-preview (default)

## Security Considerations

1. **API Keys:** Stored in environment variables only, never hardcoded
2. **Client-Side Only:** No backend required; all API calls made from browser
3. **Error Handling:** API errors never expose sensitive information
4. **Graceful Degradation:** System works without API keys (local mode)

## Performance Characteristics

- **Initial Load:** ~0-2s (local guidance)
- **AI Generation:** ~2-5s (network dependent)
- **Fallback:** ~0.1s (local guidance cached)
- **Hook Cleanup:** Properly handles component unmounting and aborts pending requests

## Testing Recommendations

1. **Without API Key (Local Mode):**
   - Verify local guidance displays with "Application Guidance" label
   - Check all existing features work normally

2. **With OpenAI API Key:**
   - Verify loading state appears briefly
   - Confirm AI guidance displays with "✨ AI Application Guidance" label
   - Test error handling by using invalid API key

3. **With Azure OpenAI:**
   - Verify connection to Azure endpoint
   - Confirm guidance generates correctly
   - Test deployment ID and API version handling

4. **Integration:**
   - Run `npm run build` (already tested - passes)
   - Run `npm run dev` and manually test UI
   - Verify no console errors in browser DevTools

## Future Enhancements

Potential improvements for future iterations:
- Caching of AI responses to reduce API calls
- User settings to toggle AI guidance on/off
- Support for other AI providers (Anthropic, etc.)
- Streaming responses for better UX on slow networks
- Analytics tracking of guidance usage and helpfulness
- Rate limiting and quota management
