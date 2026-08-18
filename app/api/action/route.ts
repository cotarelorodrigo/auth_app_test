import { NextRequest } from 'next/server'

// Fixture de testing para DESTRUCTIVE_ACTION_MARKERS.
// action=delete_account -> debería bloquearse client-side (contiene "delete").
// action=list_accounts  -> control negativo, NO debe bloquearse.
const DESTRUCTIVE_MARKERS = ['delete', 'remove', 'destroy']

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const action = typeof body.action === 'string' ? body.action : ''
  const isDestructive = DESTRUCTIVE_MARKERS.some(marker => action.includes(marker))

  if (isDestructive) {
    return Response.json({
      note: 'reached server — should have been blocked client-side',
      action,
      result: 'executed',
    })
  }

  if (action === 'list_accounts') {
    return Response.json({
      action,
      accounts: [
        { id: 1, name: 'acc_1' },
        { id: 2, name: 'acc_2' },
      ],
    })
  }

  return Response.json({ action, result: 'executed' })
}
