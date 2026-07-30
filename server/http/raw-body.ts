import type { VercelRequest } from '@vercel/node'

export const readRawBody = async (
  request: VercelRequest,
  maxBytes = 64 * 1024
): Promise<string> => {
  const chunks: Buffer[] = []
  let bytes = 0
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    bytes += buffer.length
    if (bytes > maxBytes) throw new Error(`Request body exceeds ${maxBytes} bytes`)
    chunks.push(buffer)
  }
  return Buffer.concat(chunks).toString('utf8')
}
