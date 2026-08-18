import { NextRequest, NextResponse } from 'next/server'

// Non-negotiable requirement for the test fixtures under app/*: log every
// request that actually reaches the server (method, path, timestamp, and
// body for POSTs). This is the only ground truth for proving that
// client-side-blocked requests (destructive URLs, GraphQL mutations,
// destructive JSON actions) never hit the network.
export async function middleware(req: NextRequest) {
  const timestamp = new Date().toISOString()
  const { method } = req
  const path = req.nextUrl.pathname + req.nextUrl.search

  let bodyLog = ''
  if (method === 'POST') {
    try {
      const body = await req.clone().text()
      if (body) bodyLog = ` body=${body}`
    } catch {
      bodyLog = ' body=<unreadable>'
    }
  }

  console.log(`[${timestamp}] ${method} ${path}${bodyLog}`)

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
