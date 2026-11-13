import { NextRequest } from 'next/server'

import { DOCUMENTS, getSessionUser } from '@/app/lib/idor'

// Correct behavior: lists only the caller's own documents, so a tester can
// learn their own IDs here and nobody else's.
export function GET(req: NextRequest) {
  const username = getSessionUser(req)
  if (!username) return Response.json({ error: 'unauthenticated' }, { status: 401 })

  const documents = DOCUMENTS.filter(doc => doc.owner === username).map(({ id, title }) => ({ id, title }))
  return Response.json({ documents })
}
