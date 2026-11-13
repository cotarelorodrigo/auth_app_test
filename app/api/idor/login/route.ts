import { NextRequest } from 'next/server'

import { COOKIE_NAME, createSession } from '@/app/lib/idor'
import { USERS } from '@/app/lib/users'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const username = typeof body.username === 'string' ? body.username : ''
  const password = typeof body.password === 'string' ? body.password : ''

  const user = Object.hasOwn(USERS, username) ? USERS[username] : undefined
  if (!user || user.password !== password) {
    return Response.json({ error: 'invalid_credentials' }, { status: 401 })
  }

  const res = Response.json({ ok: true, role: user.role })
  res.headers.append(
    'Set-Cookie',
    `${COOKIE_NAME}=${createSession(username)}; Path=/api/idor; HttpOnly; SameSite=Lax`,
  )
  return res
}
