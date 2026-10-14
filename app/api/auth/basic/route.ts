import { NextRequest } from 'next/server'
import { timingSafeEqual } from 'node:crypto'

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  return ba.length === bb.length && timingSafeEqual(ba, bb)
}

function unauthorized(error: string) {
  return Response.json(
    { error },
    { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="auth_app_test"' } },
  )
}

function handle(req: NextRequest) {
  const expectedUser = process.env.BASIC_AUTH_USER
  const expectedPassword = process.env.BASIC_AUTH_PASSWORD
  if (!expectedUser || !expectedPassword) {
    return Response.json({ error: 'not_configured' }, { status: 500 })
  }

  const header = req.headers.get('authorization') ?? ''
  const match = /^Basic\s+(\S+)$/i.exec(header)
  if (!match) return unauthorized('missing_basic_auth')

  const decoded = Buffer.from(match[1], 'base64').toString('utf8')
  const sep = decoded.indexOf(':')
  if (sep < 0) return unauthorized('malformed_credentials')

  const user = decoded.slice(0, sep)
  const password = decoded.slice(sep + 1)
  // Evaluate both so the response time doesn't reveal which one was wrong.
  const userOk = safeEqual(user, expectedUser)
  const passwordOk = safeEqual(password, expectedPassword)
  if (!userOk || !passwordOk) return unauthorized('invalid_credentials')

  return Response.json({ ok: true, user })
}

export const GET = handle
export const POST = handle
