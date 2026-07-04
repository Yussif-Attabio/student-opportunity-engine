import type { VercelRequest, VercelResponse } from '@vercel/node'
import type { StudentProfile, Opportunity } from '../src/types'

// Request payload validation
interface GuidanceRequest {
  profile: StudentProfile
  resumeHighlights: string[]
  opportunity: Opportunity
}

// Response payload
interface GuidanceResponse {
  why: string
  nextStep: string
  highlights: string[]
  tip: string
}

// Validate environment variables are set
const validateConfig = (): boolean => {
  return !!process.env.GROQ_API_KEY
}

// Build the prompt
const buildPrompt = (
  profile: StudentProfile,
  resumeHighlights: string[],
  opportunity: Opportunity
): string => {
  const highlights = resumeHighlights.filter(Boolean).join(', ')
  return `You are a career advisor helping a student evaluate opportunities.

Student Profile:
- Name: ${profile.name}
- School: ${profile.school}
- Major: ${profile.major}
- Year: ${profile.year}
- Interests: ${profile.interests.join(', ')}
- Skills: ${profile.skills.join(', ')}
- Location preference: ${profile.locationPreference}
- Availability: ${profile.availability}
- Short-term goal: ${profile.shortTermGoal}
- Long-term goal: ${profile.longTermGoal}

Resume Highlights:
${highlights || 'None provided'}

Opportunity:
- Title: ${opportunity.title}
- Type: ${opportunity.type}
- Organization: ${opportunity.source}
- Description: ${opportunity.description}
- Required skills: ${opportunity.requiredSkills.join(', ')}
- Related majors: ${opportunity.relatedMajors.join(', ')}
- Tags: ${opportunity.tags.join(', ')}

Please provide personalized advice (under 150 words total) that includes:
1. Why this opportunity is a strong fit for this student
2. Which skills, interests, or experiences from their profile match the opportunity
3. One specific, actionable recommendation to strengthen their application

Format your response with these exact sections:
WHY FIT: [1-2 sentences explaining why this is a good match]
MATCHING STRENGTHS: [1-2 key areas where the student's profile aligns with the opportunity]
RECOMMENDATION: [One specific, actionable suggestion to strengthen the application]`
}

// Parse AI response
const parseAIResponse = (text: string): { why: string; highlights: string[]; tip: string } => {
  const whyMatch = text.match(/WHY FIT:\s*(.+?)(?=MATCHING STRENGTHS:|$)/is)
  const strengthsMatch = text.match(/MATCHING STRENGTHS:\s*(.+?)(?=RECOMMENDATION:|$)/is)
  const recMatch = text.match(/RECOMMENDATION:\s*(.+?)$/is)

  const why = whyMatch ? whyMatch[1].trim() : ''
  const strengthsText = strengthsMatch ? strengthsMatch[1].trim() : ''
  const recommendation = recMatch ? recMatch[1].trim() : ''

  const highlights = strengthsText
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3)

  return {
    why: why || 'Strong match for your profile.',
    highlights: highlights.length > 0 ? highlights : ['Relevant match'],
    tip: recommendation || 'Tailor your application to highlight relevant experience.'
  }
}

// Call Groq API (OpenAI-compatible chat completions)
const callGroq = async (prompt: string): Promise<string> => {
  const apiKey = process.env.GROQ_API_KEY
  const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'
  if (!apiKey) throw new Error('GROQ_API_KEY not configured')

  console.log('[AI] Provider: Groq')
  console.log('[AI] Request started')

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 300
    })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Groq API error: ${error.error?.message || response.statusText}`)
  }

  const data = (await response.json()) as { choices: Array<{ message: { content: string } }> }
  console.log('[AI] Request succeeded')
  return data.choices[0]?.message?.content || ''
}

// Main handler
export default async (req: VercelRequest, res: VercelResponse) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Validate configuration
    if (!validateConfig()) {
      return res.status(500).json({
        error: 'AI API not configured on server',
        message: 'Set GROQ_API_KEY environment variable'
      })
    }

    // Parse and validate request body
    const { profile, resumeHighlights, opportunity } = req.body as GuidanceRequest

    if (!profile || !opportunity) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'Missing required fields: profile and opportunity'
      })
    }

    // Build prompt
    const prompt = buildPrompt(profile, resumeHighlights || [], opportunity)

    // Call Groq AI service
    const aiResponse = await callGroq(prompt)

    // Parse response
    const parsed = parseAIResponse(aiResponse)

    // Return guidance
    const guidance: GuidanceResponse = {
      why: parsed.why,
      nextStep: `Apply to ${opportunity.source} and highlight your ${parsed.highlights[0]?.toLowerCase() || 'relevant skills'}.`,
      highlights: parsed.highlights,
      tip: parsed.tip
    }

    res.status(200).json(guidance)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.warn('[AI] Falling back to local guidance')
    console.error('Guidance generation error:', errorMessage)

    // Return 500 so frontend can fall back to local guidance
    res.status(500).json({
      error: 'Failed to generate guidance',
      message: errorMessage
    })
  }
}
