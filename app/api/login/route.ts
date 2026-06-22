import { NextRequest } from 'next/server'
import { DatabaseSync } from 'node:sqlite'

// ⚠️ INTENTIONALLY VULNERABLE — SQL injection sink for authorized security testing only.
// Do NOT ship this to a real/production deployment.

// In-memory SQLite DB seeded with the same test users used by the app UI.
const db = new DatabaseSync(':memory:')
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    username TEXT PRIMARY KEY,
    password TEXT NOT NULL,
    role     TEXT NOT NULL
  );
`)
const seeded = db.prepare('SELECT COUNT(*) AS n FROM users').get() as { n: number }
if (seeded.n === 0) {
  const insert = db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)')
  insert.run('testuser_01', 'Test@1234!', 'Usuario')
  insert.run('testuser_02', 'Secure#5678!', 'Usuario')
  insert.run('admin_test', 'Admin@Pass99!', 'Admin')
}

export function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get('username') ?? ''
  const password = req.nextUrl.searchParams.get('password') ?? ''

  // VULN: user input is concatenated directly into the SQL string — no parameterization.
  // e.g. ?username=admin_test'-- or ?username=' OR '1'='1 bypasses authentication.
  const sql =
    `SELECT username, role FROM users ` +
    `WHERE username = '${username}' AND password = '${password}'`

  try {
    const rows = db.prepare(sql).all() as { username: string; role: string }[]
    if (rows.length > 0) {
      return Response.json({ authenticated: true, users: rows })
    }
    return Response.json({ authenticated: false }, { status: 401 })
  } catch (err) {
    // VULN: raw SQL error is echoed back, enabling error-based injection.
    return Response.json({ error: (err as Error).message, query: sql }, { status: 500 })
  }
}
