import { NextRequest } from 'next/server'

// Fixture de testing: cualquier body con la keyword "mutation" debería
// disparar el bloqueo de GraphQL antes de llegar acá.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const query = typeof body.query === 'string' ? body.query : ''
  const isMutation = /\bmutation\b/i.test(query)

  return Response.json({
    note: 'reached server — should have been blocked client-side if this was a mutation',
    isMutation,
    data: { deleteUser: { success: true } },
  })
}
