import { useState, useEffect } from 'react'
import type { Opportunity, StudentProfile } from '../types'
import type { MatchResult } from '../utils/matching'
import type { AIGuidance } from '../utils/aiService'
import { generateAIGuidance } from '../utils/aiService'

export interface UseAIGuidanceState {
  guidance: AIGuidance | null
  loading: boolean
  error: string | null
}

export const useAIGuidance = (
  opportunity: Opportunity | null,
  profile: StudentProfile,
  match: MatchResult | null,
  resumeHighlights: string[] = []
): UseAIGuidanceState => {
  const [state, setState] = useState<UseAIGuidanceState>({
    guidance: null,
    loading: false,
    error: null
  })

  useEffect(() => {
    if (!opportunity || !match) {
      setState({ guidance: null, loading: false, error: null })
      return
    }

    let isMounted = true
    const abortController = new AbortController()

    const fetchGuidance = async () => {
      setState({ guidance: null, loading: true, error: null })

      try {
        const guidance = await generateAIGuidance(opportunity, profile, match, resumeHighlights)

        if (isMounted) {
          setState({ guidance, loading: false, error: null })
        }
      } catch (err) {
        if (isMounted && !abortController.signal.aborted) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to generate guidance'
          setState({ guidance: null, loading: false, error: errorMessage })
        }
      }
    }

    fetchGuidance()

    return () => {
      isMounted = false
      abortController.abort()
    }
  }, [opportunity?.id, profile, match?.matchScore, resumeHighlights.join(',')])

  return state
}
