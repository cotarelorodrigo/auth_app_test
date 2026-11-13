import { NextRequest } from 'next/server'

import { PENDING_COOKIE, createPending } from '@/app/lib/twofa'
import { USERS } from '@/app/lib/users'

// Step 1 of the 2FA case: checks username + password on the server. On success
// it only sets the httpOnly "pending" cookie; the TOTP secret is never sent.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const username = typeof body?.username === 'string' ? body.username : ''
  const password = typeof body?.password === 'string' ? body.password : ''

  const user = Object.hasOwn(USERS, username) ? USERS[username] : undefined
  if (!user || user.password !== password) {
    return Response.json({ error: 'invalid_credentials' }, { status: 401 })
  }

  const res = Response.json({ ok: true })
  res.headers.append(
    'Set-Cookie',
    `${PENDING_COOKIE}=${createPending(username)}; Path=/api/auth/2fa; HttpOnly; SameSite=Lax`,
  )
  return res
}
