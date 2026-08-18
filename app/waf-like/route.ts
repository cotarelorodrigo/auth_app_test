// Simula headers de un WAF (Cloudflare) para disparar la detección de WAF
// en el fallback HTTP de browser_goto_url.
export function GET() {
  return new Response(JSON.stringify({ ok: true }), {
    headers: {
      'Content-Type': 'application/json',
      Server: 'cloudflare',
      'CF-RAY': '7f3a9c2d4e5f6789-EWR',
    },
  })
}
