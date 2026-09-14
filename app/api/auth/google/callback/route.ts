import { NextRequest, NextResponse } from 'next/server'

const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'
const USERINFO_ENDPOINT = 'https://openidconnect.googleapis.com/v1/userinfo'
const STATE_COOKIE = 'google_oauth_state'

function backToLogin(origin: string, params: Record<string, string>) {
  const url = new URL('/google-login', origin)
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
  const res = NextResponse.redirect(url)
  res.cookies.delete(STATE_COOKIE)
  return res
}

export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl
  const error = searchParams.get('error')
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const expectedState = req.cookies.get(STATE_COOKIE)?.value

  if (error) return backToLogin(origin, { status: 'error', reason: error })

  if (!code || !state || !expectedState || state !== expectedState) {
    return backToLogin(origin, { status: 'error', reason: 'invalid_state' })
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    return backToLogin(origin, { status: 'error', reason: 'not_configured' })
  }

  const redirectUri = new URL('/api/auth/google/callback', origin).toString()

  try {
    const tokenRes = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })
    const tokenBody = await tokenRes.json()
    if (!tokenRes.ok || typeof tokenBody.access_token !== 'string') {
      return backToLogin(origin, { status: 'error', reason: 'token_exchange_failed' })
    }

    const userRes = await fetch(USERINFO_ENDPOINT, {
      headers: { Authorization: `Bearer ${tokenBody.access_token}` },
    })
    const profile = await userRes.json()
    if (!userRes.ok) {
      return backToLogin(origin, { status: 'error', reason: 'userinfo_failed' })
    }

    return backToLogin(origin, {
      status: 'success',
      email: typeof profile.email === 'string' ? profile.email : '',
      name: typeof profile.name === 'string' ? profile.name : '',
    })
  } catch {
    return backToLogin(origin, { status: 'error', reason: 'network_error' })
  }
}
