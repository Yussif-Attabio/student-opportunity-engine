import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose'

export interface AuthenticatedUser {
  id: string
  email: string | null
  claims: JWTPayload
}

let cachedJwksUrl: string | null = null
let cachedJwks: ReturnType<typeof createRemoteJWKSet> | null = null

const getJwks = () => {
  const value = process.env.SUPABASE_JWKS_URL
  if (!value) throw new Error('SUPABASE_JWKS_URL is not configured')
  if (cachedJwks && cachedJwksUrl === value) return cachedJwks
  const url = new URL(value)
  if (url.protocol !== 'https:') throw new Error('SUPABASE_JWKS_URL must use HTTPS')
  cachedJwksUrl = value
  cachedJwks = createRemoteJWKSet(url)
  return cachedJwks
}

export const verifySessionToken = async (authorization: string | undefined) => {
  const match = authorization?.match(/^Bearer\s+(.+)$/i)
  if (!match?.[1]) throw new Error('A bearer access token is required')

  const supabaseUrl = process.env.SUPABASE_URL
  if (!supabaseUrl) throw new Error('SUPABASE_URL is not configured')
  const issuer = `${supabaseUrl.replace(/\/+$/, '')}/auth/v1`
  const { payload } = await jwtVerify(match[1], getJwks(), {
    issuer,
    audience: 'authenticated'
  })
  if (!payload.sub) throw new Error('Access token does not contain a user ID')

  return {
    id: payload.sub,
    email: typeof payload.email === 'string' ? payload.email : null,
    claims: payload
  } satisfies AuthenticatedUser
}
