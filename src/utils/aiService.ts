import type { Opportunity, StudentProfile } from '../types'
import { generateGuidance } from './guidance'
import type { MatchResult } from './matching'

export interface AIGuidance {
  why: string
  nextStep: string
  highlights: string[]
  tip: string
  isAI: boolean
}

// Check if AI is enabled via environment variable
const isAIEnabled = (): boolean => {
  return import.meta.env.VITE_AI_ENABLED === 'true'
}

// Get the API endpoint URL
const getAPIEndpoint = (): string => {
  // In development: proxy to http://localhost:3001 via Vite (http://localhost:5173/api/generate-guidance)
  // In production (Vercel): /api/generate-guidance (Vercel serverless function)
  return '/api/generate-guidance'
}

// Call server-side API for guidance
const callServerAPI = async (
  profile: StudentProfile,
  resumeHighlights: string[],
  opportunity: Opportunity
): Promise<{
  why: string
  nextStep: string
  highlights: string[]
  tip: string
}> => {
  const endpoint = getAPIEndpoint()
  console.log('[AI] Provider: Groq')
  console.log('[AI] Request started')

  const payload = {
    profile,
    resumeHighlights: resumeHighlights.filter(Boolean),
    opportunity
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || `API error: ${response.statusText}`)
  }

  const result = await response.json()
  console.log('[AI] Request succeeded')
  return result
}

export const generateAIGuidance = async (
  opportunity: Opportunity,
  profile: StudentProfile,
  match: MatchResult,
  resumeHighlights: string[] = []
): Promise<AIGuidance> => {
  // If AI is not enabled, use local guidance
  if (!isAIEnabled()) {
    console.warn('[AI] Falling back to local guidance')
    const localGuidance = generateGuidance(opportunity, profile, match, resumeHighlights)
    return {
      ...localGuidance,
      isAI: false
    }
  }

  try {
    // Call server-side API
    const aiResponse = await callServerAPI(profile, resumeHighlights, opportunity)

    return {
      why: aiResponse.why,
      nextStep: aiResponse.nextStep,
      highlights: aiResponse.highlights,
      tip: aiResponse.tip,
      isAI: true
    }
  } catch (error) {
    // Log error for debugging but don't throw - fall back to local guidance
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate AI guidance'
    console.warn('[AI] Falling back to local guidance')
    console.warn(errorMessage)

    // Return local guidance as fallback
    const localGuidance = generateGuidance(opportunity, profile, match, resumeHighlights)
    return {
      ...localGuidance,
      isAI: false
    }
  }
}
