import { NextRequest } from 'next/server'

import { COOKIE_NAME, destroySession } from '@/app/lib/portal'

export function POST(req: NextRequest) {
  destroySession(req)
  const res = Response.json({ ok: true })
  res.headers.append('Set-Cookie', `${COOKIE_NAME}=; Path=/api/portal; HttpOnly; SameSite=Lax; Max-Age=0`)
  return res
}
