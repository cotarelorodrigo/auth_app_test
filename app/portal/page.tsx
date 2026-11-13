'use client'

import { useCallback, useEffect, useState } from 'react'

type Status = 'checking' | 'login' | 'verifying' | 'documents' | 'error'
type PortalDocument = { id: string; title: string }

const ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: 'Usuario o contraseña incorrectos.',
  network_error: 'Error de red al hablar con el servidor.',
}

function errorMessage(reason: string): string {
  return ERROR_MESSAGES[reason] ?? `Error: ${reason}`
}

export default function PortalPage() {
  const [status, setStatus] = useState<Status>('checking')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [errorReason, setErrorReason] = useState('')
  const [user, setUser] = useState('')
  const [role, setRole] = useState('')
  const [documents, setDocuments] = useState<PortalDocument[]>([])

  // Muestra la lista de documentos que devolvió el server.
  const showDocuments = useCallback((data: { user: string; role: string; documents: PortalDocument[] }) => {
    setUser(data.user)
    setRole(data.role)
    setDocuments(data.documents)
    setStatus('documents')
  }, [])

  // Si el browser ya tiene sesión (por ejemplo tras recargar), salta el login.
  useEffect(() => {
    let cancelled = false
    fetch('/api/portal/documents')
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (cancelled) return
        if (data) showDocuments(data)
        else setStatus('login')
      })
      .catch(() => {
        if (!cancelled) setStatus('login')
      })
    return () => {
      cancelled = true
    }
  }, [showDocuments])

  const doLogin = async () => {
    setStatus('verifying')
    try {
      const res = await fetch('/api/portal/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      if (!res.ok) {
        const data = await res.json()
        setErrorReason(data.error ?? 'unknown')
        setStatus('error')
        return
      }
      const list = await fetch('/api/portal/documents')
      showDocuments(await list.json())
    } catch {
      setErrorReason('network_error')
      setStatus('error')
    }
  }

  const doLogout = async () => {
    await fetch('/api/portal/logout', { method: 'POST' }).catch(() => undefined)
    setUsername('')
    setPassword('')
    setErrorReason('')
    setDocuments([])
    setStatus('login')
  }

  const canSubmit = username && password && status !== 'verifying'

  return (
    <div className="wrap">
      <div className="logo">
        <div className="logo-mark">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <div className="logo-name">TestAuth · Portal</div>
      </div>

      <div className="card">
        {status === 'checking' && <div className="fsub">Cargando…</div>}

        {(status === 'login' || status === 'verifying' || status === 'error') && (
          <form
            className="screen"
            onSubmit={e => {
              e.preventDefault()
              if (canSubmit) doLogin()
            }}
          >
            <div className="ftitle">Iniciar sesión</div>
            <div className="fsub">Ingresá con tu usuario y contraseña para ver tus documentos.</div>
            {status === 'error' && <div className="msg msg-err show">{errorMessage(errorReason)}</div>}
            <div className="fg">
              <label>Usuario</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="username" autoComplete="off" />
            </div>
            <div className="fg">
              <label>Contraseña</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="******" />
            </div>
            <button type="submit" className="btn bp" disabled={!canSubmit}>
              {status === 'verifying' ? 'Verificando…' : 'Continuar →'}
            </button>
          </form>
        )}

        {status === 'documents' && (
          <div className="screen">
            <div className="ftitle">Mis documentos</div>
            <div className="badge">
              <div className="dot" />
              <span>
                {user} · {role}
              </span>
            </div>
            <ul className="doclist">
              {documents.map(doc => (
                <li key={doc.id}>
                  <a href={`/api/portal/documents/${doc.id}`}>{doc.title}</a>
                </li>
              ))}
            </ul>
            <button className="btn bg" onClick={doLogout}>
              Cerrar sesión
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
