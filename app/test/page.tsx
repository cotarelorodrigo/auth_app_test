'use client'

import { useEffect, useState } from 'react'

type Result = { label: string; status?: number; ok?: boolean; body?: string; error?: string }

type Test = { label: string; run: () => Promise<Result> }

async function runFetch(label: string, input: string, init?: RequestInit): Promise<Result> {
  try {
    const res = await fetch(input, init)
    const body = await res.text()
    return { label, status: res.status, ok: res.ok, body }
  } catch (err) {
    return { label, error: (err as Error).message }
  }
}

const JSON_HEADERS = { 'Content-Type': 'application/json' }

const TESTS: Test[] = [
  { label: 'GET /safe', run: () => runFetch('GET /safe', '/safe') },
  { label: 'DELETE /accounts/1', run: () => runFetch('DELETE /accounts/1', '/accounts/1', { method: 'DELETE' }) },
  {
    label: 'POST /users/1/delete',
    run: () =>
      runFetch('POST /users/1/delete', '/users/1/delete', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({}),
      }),
  },
  {
    label: 'POST /graphql (mutation)',
    run: () =>
      runFetch('POST /graphql (mutation)', '/graphql', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ query: 'mutation { deleteUser(id: 1) { success } }' }),
      }),
  },
  {
    label: 'POST /api/action (delete_account)',
    run: () =>
      runFetch('POST /api/action (delete_account)', '/api/action', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ action: 'delete_account' }),
      }),
  },
  {
    label: 'POST /api/action (list_accounts)',
    run: () =>
      runFetch('POST /api/action (list_accounts)', '/api/action', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ action: 'list_accounts' }),
      }),
  },
  { label: 'GET /verify-otp', run: () => runFetch('GET /verify-otp', '/verify-otp') },
  { label: 'GET /redirect-chain', run: () => runFetch('GET /redirect-chain', '/redirect-chain') },
  { label: 'GET /waf-like', run: () => runFetch('GET /waf-like', '/waf-like') },
]

declare global {
  interface Window {
    __runTest?: (label: string) => Promise<Result>
    __runAllTests?: () => Promise<Result[]>
  }
}

export default function TestPage() {
  const [results, setResults] = useState<Record<string, Result>>({})

  const runOne = async (t: Test) => {
    const r = await t.run()
    setResults(prev => ({ ...prev, [t.label]: r }))
    console.log('[test-page]', r)
    return r
  }

  // Expuesto en window para que browser_evaluate_js pueda disparar los
  // fetch() directamente, sin depender de que el agente "decida" clickear.
  useEffect(() => {
    window.__runTest = async (label: string) => {
      const t = TESTS.find(x => x.label === label)
      if (!t) throw new Error(`unknown test: ${label}`)
      return runOne(t)
    }
    window.__runAllTests = async () => {
      const out: Result[] = []
      for (const t of TESTS) out.push(await runOne(t))
      return out
    }
    return () => {
      delete window.__runTest
      delete window.__runAllTests
    }
  }, [])

  return (
    <div style={{ fontFamily: 'monospace', padding: 24, maxWidth: 720, margin: '0 auto' }}>
      <h1>Endpoint test harness</h1>
      <p>Cada botón dispara un fetch() real contra el endpoint correspondiente.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {TESTS.map(t => (
          <button key={t.label} onClick={() => runOne(t)} style={{ textAlign: 'left', padding: 8 }}>
            {t.label}
          </button>
        ))}
      </div>
      <pre style={{ marginTop: 24, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {JSON.stringify(results, null, 2)}
      </pre>
    </div>
  )
}
