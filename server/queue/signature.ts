import { Receiver } from '@upstash/qstash'

let receiver: Receiver | null = null

const getReceiver = () => {
  if (receiver) return receiver
  const currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY
  const nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY
  if (!currentSigningKey || !nextSigningKey) {
    throw new Error('QStash signing keys are not configured')
  }
  receiver = new Receiver({ currentSigningKey, nextSigningKey })
  return receiver
}

export const verifyQStashSignature = async (input: {
  signature: string | undefined
  body: string
  url: string
  upstashRegion?: string
}) => {
  if (!input.signature) throw new Error('Missing QStash signature')
  return getReceiver().verify({
    signature: input.signature,
    body: input.body,
    url: input.url,
    upstashRegion: input.upstashRegion,
    clockTolerance: 5
  })
}
