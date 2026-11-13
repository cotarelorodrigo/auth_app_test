import { NextRequest } from 'next/server'

import { verifyTotp } from '@/app/lib/totp'
import { PENDING_COOKIE, destroyPending, getPending } from '@/app/lib/twofa'
import { USERS } from '@/app/lib/users'

// Step 2 of the 2FA case: checks the 6-digit code against the secret of the
// user who passed step 1 (taken from the pending cookie, not from the body).
export async function POST(req: NextRequest) {
  const pending = getPending(req)
  if (!pending) return Response.json({ error: 'unauthenticated' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const code = typeof body?.code === 'string' ? body.code : ''

  const user = USERS[pending.username]
  if (!/^\d{6}$/.test(code) || !verifyTotp(user.totpSecret, code)) {
    return Response.json({ error: 'invalid_code' }, { status: 401 })
  }

  destroyPending(pending.token)
  const res = Response.json({ ok: true, role: user.role })
  res.headers.append('Set-Cookie', `${PENDING_COOKIE}=; Path=/api/auth/2fa; HttpOnly; SameSite=Lax; Max-Age=0`)
  return res
}
