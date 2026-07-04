/**
 * Local development server for handling /api routes
 * This bridges the gap between Vite frontend and Vercel serverless functions
 * Used only during local development; Vercel deployment uses api/ functions directly
 */

import http from 'http'
import type { IncomingMessage, ServerResponse } from 'http'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { config as loadEnv } from 'dotenv'

const envLocalPath = path.resolve(process.cwd(), '.env.local')
const envPath = existsSync(envLocalPath) ? envLocalPath : path.resolve(process.cwd(), '.env')
loadEnv({ path: envPath })

interface StudentProfile {
  name: string
  school: string
  major: string
  year: string
  interests: string[]
  skills: string[]
  locationPreference: string
  availability: string
  shortTermGoal: string
  longTermGoal: string
}

interface Opportunity {
  id: string
  title: string
  type: string
  source: string
  description: string
  requiredSkills: string[]
  relatedMajors: string[]
  tags: string[]
}

interface GuidanceRequest {
  profile: StudentProfile
  resumeHighlights: string[]
  opportunity: Opportunity
}

interface GuidanceResponse {
  why: string
  nextStep: string
  highlights: string[]
  tip: string
}

// Validate environment variables and return config status
const validateConfig = (): { valid: boolean; missingVars: string[] } => {
  const missing: string[] = []
  if (!process.env.GROQ_API_KEY) missing.push('GROQ_API_KEY')
  return { valid: missing.length === 0, missingVars: missing }
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

// Handle API requests
const handleRequest = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
  // Set CORS headers for development
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Content-Type', 'application/json')

  // Handle OPTIONS for CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200)
    res.end()
    return
  }

  // Only handle POST /api/generate-guidance
  if (req.method !== 'POST' || req.url !== '/api/generate-guidance') {
    res.writeHead(404)
    res.end(JSON.stringify({ error: 'Not found' }))
    return
  }

  try {
    // Validate configuration
    const config = validateConfig()
    if (!config.valid) {
      const missingVars = config.missingVars.join(', ')
      console.error(
        `[dev-server] Missing environment variables: ${missingVars}. Set them in .env.local`
      )
      res.writeHead(500)
      res.end(
        JSON.stringify({
          error: 'AI API Configuration Missing',
          message: `Missing environment variables: ${missingVars}. Add them to .env.local and restart the dev server.`,
          missingVars: config.missingVars,
          hint: 'See .env.example for setup instructions'
        })
      )
      return
    }

    // Parse request body
    let body = ''
    req.on('data', (chunk) => {
      body += chunk.toString()
    })

    req.on('end', async () => {
      try {
        const { profile, resumeHighlights, opportunity } = JSON.parse(body) as GuidanceRequest

        if (!profile || !opportunity) {
          res.writeHead(400)
          res.end(JSON.stringify({ error: 'Bad request', message: 'Missing required fields' }))
          return
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

        res.writeHead(200)
        res.end(JSON.stringify(guidance))
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.warn('[AI] Falling back to local guidance')
        console.error('Guidance generation error:', errorMessage)

        res.writeHead(500)
        res.end(JSON.stringify({ error: 'Failed to generate guidance', message: errorMessage }))
      }
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Request handling error:', errorMessage)

    res.writeHead(500)
    res.end(JSON.stringify({ error: 'Server error', message: errorMessage }))
  }
}

// Create and start server
const PORT = process.env.API_PORT || 3001
const server = http.createServer(handleRequest)

server.listen(PORT, () => {
  const config = validateConfig()
  
  console.log(`[dev-server] API server listening on http://localhost:${PORT}`)
  console.log(`[dev-server] Handling POST /api/generate-guidance`)
  console.log('[AI] Provider: Groq')
  
  if (!config.valid) {
    console.warn(`[dev-server] ⚠️  Missing: ${config.missingVars.join(', ')}`)
    console.warn(`[dev-server] Frontend will fall back to local guidance until you add these to .env.local`)
  } else {
    console.log(`[dev-server] ✓ Configuration valid, AI guidance enabled`)
  }
})
