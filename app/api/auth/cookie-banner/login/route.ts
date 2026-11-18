import { NextRequest } from 'next/server'

import { USERS } from '@/app/lib/users'

// Login for the cookie-banner case: checks username + password on the server.
// It does not require cookie consent and sets no cookies: the banner is only
// a visual obstacle in front of the button.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const username = typeof body?.username === 'string' ? body.username : ''
  const password = typeof body?.password === 'string' ? body.password : ''

  const user = Object.hasOwn(USERS, username) ? USERS[username] : undefined
  if (!user || user.password !== password) {
    return Response.json({ error: 'invalid_credentials' }, { status: 401 })
  }

  return Response.json({ ok: true, role: user.role })
}
