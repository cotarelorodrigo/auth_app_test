import { NextRequest } from 'next/server'

import { DOCUMENTS, getSessionUser } from '@/app/lib/idor'

// ⚠️ INTENTIONALLY VULNERABLE — IDOR / broken access control sink for authorized security testing only.
// Do NOT ship this to a real/production deployment.
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const username = getSessionUser(req)
  if (!username) return Response.json({ error: 'unauthenticated' }, { status: 401 })

  const { id } = await ctx.params
  const doc = DOCUMENTS.find(d => d.id === id)
  if (!doc) return Response.json({ error: 'not_found' }, { status: 404 })

  // VULN: the session is checked, but not that `doc.owner === username` nor
  // that the caller is an admin for admin documents. Any logged-in user can
  // read any document if they know its ID:
  //   - horizontal: testuser_01 reads testuser_02's documents
  //   - vertical:   testuser_01/02 read admin_test's documents
  return Response.json(doc)
}
