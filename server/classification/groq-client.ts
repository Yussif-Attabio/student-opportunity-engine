import { z } from 'zod'

const groqEnvelopeSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({ content: z.string().min(1) })
      })
    )
    .min(1)
})

export class GroqClassificationClient {
  readonly model: string

  constructor() {
    this.model = process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile'
  }

  async classify(prompt: string): Promise<unknown> {
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) throw new Error('GROQ_API_KEY is not configured')

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.model,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You are a precise information extraction system. Output valid JSON only.'
          },
          { role: 'user', content: prompt }
        ]
      }),
      signal: AbortSignal.timeout(60_000)
    })
    if (!response.ok) {
      throw new Error(`Groq classification request failed with status ${response.status}`)
    }

    const envelope = groqEnvelopeSchema.parse(await response.json())
    return JSON.parse(envelope.choices[0]!.message.content) as unknown
  }
}
