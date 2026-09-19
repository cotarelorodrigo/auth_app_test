import { NextRequest } from 'next/server'

const SITEVERIFY_ENDPOINT = 'https://www.google.com/recaptcha/api/siteverify'

const USERS: Record<string, { password: string; role: string }> = {
  testuser_01: { password: 'Test@1234!', role: 'Usuario' },
  testuser_02: { password: 'Secure#5678!', role: 'Usuario' },
  admin_test: { password: 'Admin@Pass99!', role: 'Admin' },
}

export async function POST(req: NextRequest) {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY
  if (!secretKey) {
    return Response.json({ error: 'not_configured' }, { status: 500 })
  }

  const body = await req.json().catch(() => null)
  const username = typeof body?.username === 'string' ? body.username : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  const token = typeof body?.token === 'string' ? body.token : ''

  if (!token) {
    return Response.json({ error: 'missing_token' }, { status: 400 })
  }

  // El challenge se verifica antes de tocar las credenciales: sin un token
  // válido de Google, ni siquiera se evalúa el usuario/contraseña.
  const verifyRes = await fetch(SITEVERIFY_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ secret: secretKey, response: token }),
  })
  const verifyBody = await verifyRes.json().catch(() => null)
  if (!verifyRes.ok || !verifyBody?.success) {
    return Response.json({ error: 'recaptcha_failed' }, { status: 401 })
  }

  const user = USERS[username]
  if (!user || user.password !== password) {
    return Response.json({ error: 'invalid_credentials' }, { status: 401 })
  }

  return Response.json({ ok: true, role: user.role })
}
