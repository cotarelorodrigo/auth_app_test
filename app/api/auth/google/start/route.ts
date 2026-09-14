import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'node:crypto'

const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth'
const SCOPE = 'openid email profile'
const STATE_COOKIE = 'google_oauth_state'

export function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) {
    return Response.json(
      { error: 'GOOGLE_CLIENT_ID no está configurado. Definilo en .env.local (ver README).' },
      { status: 500 },
    )
  }

  // state viaja como cookie httpOnly (no en el query del link) para que el
  // callback pueda validar que la respuesta corresponde a este intento y no
  // a un authorization code inyectado por un tercero (CSRF de OAuth).
  const state = randomBytes(16).toString('hex')
  const redirectUri = new URL('/api/auth/google/callback', req.nextUrl.origin).toString()

  const authUrl = new URL(AUTH_ENDPOINT)
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('scope', SCOPE)
  authUrl.searchParams.set('state', state)
  authUrl.searchParams.set('prompt', 'select_account')

  const res = NextResponse.redirect(authUrl)
  res.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 300,
  })
  return res
}
