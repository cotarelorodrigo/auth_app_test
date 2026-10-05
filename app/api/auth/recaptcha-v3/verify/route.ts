import { NextRequest } from 'next/server'

const SITEVERIFY_ENDPOINT = 'https://www.google.com/recaptcha/api/siteverify'
const EXPECTED_ACTION = 'login'
const DEFAULT_MIN_SCORE = 0.5

const USERS: Record<string, { password: string; role: string }> = {
  testuser_01: { password: 'Test@1234!', role: 'Usuario' },
  testuser_02: { password: 'Secure#5678!', role: 'Usuario' },
  admin_test: { password: 'Admin@Pass99!', role: 'Admin' },
}

export async function POST(req: NextRequest) {
  // v3 (score) son un tipo de key distinto a las de v2 (checkbox).
  const secretKey = process.env.RECAPTCHA_V3_SECRET_KEY
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

  const minScore = Number(process.env.RECAPTCHA_MIN_SCORE ?? DEFAULT_MIN_SCORE)

  // El challenge se verifica antes de tocar las credenciales: sin un token
  // válido de Google, ni siquiera se evalúa el usuario/contraseña.
  const verifyRes = await fetch(SITEVERIFY_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ secret: secretKey, response: token }),
  })
  const verify = await verifyRes.json().catch(() => null)

  // Fail closed. Pasada la cuota gratuita, siteverify responde HTTP 200 con
  // success:true, un score fijo de 0.9, Y un error — el success solo no
  // alcanza, hay que rechazar si Google adjuntó algún error-codes.
  const errorCodes: string[] = verify?.['error-codes'] ?? []
  if (!verifyRes.ok || !verify?.success || errorCodes.length > 0) {
    return Response.json({ error: 'recaptcha_failed' }, { status: 401 })
  }

  if (verify.action !== EXPECTED_ACTION) {
    return Response.json({ error: 'action_mismatch' }, { status: 401 })
  }

  const score = typeof verify.score === 'number' ? verify.score : 0
  if (score < minScore) {
    return Response.json({ error: 'low_score', score }, { status: 401 })
  }

  const user = USERS[username]
  if (!user || user.password !== password) {
    return Response.json({ error: 'invalid_credentials' }, { status: 401 })
  }

  return Response.json({ ok: true, role: user.role, score })
}
