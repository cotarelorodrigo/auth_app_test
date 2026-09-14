import { NextRequest } from 'next/server'

const TOKENINFO_ENDPOINT = 'https://oauth2.googleapis.com/tokeninfo'

// El credential que entrega el flujo FedCM/GIS es un ID token ya firmado por
// Google. En vez de verificar la firma JWT a mano (necesitaríamos las JWKS de
// Google y una lib), lo validamos contra su endpoint público de tokeninfo,
// que chequea firma + expiración y devuelve los claims.
export async function POST(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) {
    return Response.json({ error: 'not_configured' }, { status: 500 })
  }

  const body = await req.json().catch(() => null)
  const credential = typeof body?.credential === 'string' ? body.credential : ''
  if (!credential) {
    return Response.json({ error: 'missing_credential' }, { status: 400 })
  }

  const verifyRes = await fetch(`${TOKENINFO_ENDPOINT}?id_token=${encodeURIComponent(credential)}`)
  const payload = await verifyRes.json().catch(() => null)

  if (!verifyRes.ok || !payload) {
    return Response.json({ error: 'invalid_token' }, { status: 401 })
  }
  if (payload.aud !== clientId) {
    return Response.json({ error: 'audience_mismatch' }, { status: 401 })
  }

  return Response.json({
    email: typeof payload.email === 'string' ? payload.email : '',
    name: typeof payload.name === 'string' ? payload.name : '',
  })
}
