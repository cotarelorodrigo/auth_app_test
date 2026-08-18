// Control positivo: endpoint sin ninguna semántica destructiva.
// Sirve para verificar que el recorder captura status/headers/body tal
// cual los responde el servidor, sin ninguna intervención de bloqueo.
export function GET() {
  return Response.json({ ok: true, message: 'safe endpoint' })
}
