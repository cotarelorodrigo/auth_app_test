import { NextRequest } from 'next/server'

import { USERS } from '@/app/lib/users'

// Login for the dropdown case: checks username + password on the server.
// It sets no cookies: the dropdown is only a UI obstacle in front of the form.
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
