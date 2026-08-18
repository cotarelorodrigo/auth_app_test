import { NextRequest, NextResponse } from 'next/server'

// Cadena de redirects 302 -> 302 -> 200 para validar que el recorder arma
// bien redirected_from/redirected_to. step=0 y step=1 devuelven 302,
// step=2 devuelve el 200 final.
export function GET(req: NextRequest) {
  const step = Number(req.nextUrl.searchParams.get('step') ?? '0')

  if (step < 2) {
    const nextUrl = new URL(req.url)
    nextUrl.searchParams.set('step', String(step + 1))
    return NextResponse.redirect(nextUrl, 302)
  }

  return Response.json({ done: true, hops: step })
}
