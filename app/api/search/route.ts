import { NextRequest } from 'next/server'

// ⚠️ INTENTIONALLY VULNERABLE — reflected XSS sink for authorized security testing only.
// Do NOT ship this to a real/production deployment.
export function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? ''

  // VULN: `q` is interpolated directly into HTML with no escaping/sanitization.
  const html = `<!doctype html>
<html lang="es">
  <body>
    <h1>Search results</h1>
    <p>You searched for: ${q}</p>
  </body>
</html>`

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
