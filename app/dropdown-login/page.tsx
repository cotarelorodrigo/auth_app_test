'use client'

import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'

type Status = 'login' | 'verifying' | 'success' | 'error'

const LOGIN_PATH = '/api/auth/dropdown/login'

// How long the panel takes to slide open or close. While it is closed it is
// visibility:hidden, so its fields cannot be clicked or focused. On close the
// visibility change waits this same time, so the slide-out stays visible.
const SLIDE_MS = 400

const ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: 'Usuario o contraseña incorrectos.',
  network_error: 'Error de red al hablar con el servidor.',
}

function errorMessage(reason: string): string {
  return ERROR_MESSAGES[reason] ?? `Error: ${reason}`
}

const barStyle: CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  height: 64,
  zIndex: 20,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 32px',
  background: 'var(--surface)',
  borderBottom: '1px solid var(--border)',
}

const triggerStyle: CSSProperties = {
  width: 'auto',
  marginTop: 0,
  padding: '10px 16px',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  color: 'var(--text)',
}

// The panel hangs under the bar, right-aligned with the trigger. It is a
// sibling of the card, not a child: the card has overflow:hidden. The grid-row
// trick (0fr -> 1fr) slides it open without a hard-coded height.
function panelStyle(open: boolean): CSSProperties {
  return {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    right: 0,
    width: 'min(340px, calc(100vw - 32px))',
    display: 'grid',
    gridTemplateRows: open ? '1fr' : '0fr',
    visibility: open ? 'visible' : 'hidden',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 16,
    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.45)',
    transition: `grid-template-rows ${SLIDE_MS}ms ease, visibility 0s linear ${open ? 0 : SLIDE_MS}ms`,
  }
}

export default function DropdownLoginPage() {
  const [status, setStatus] = useState<Status>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [errorReason, setErrorReason] = useState('')
  const [role, setRole] = useState('')
  // In-memory only on purpose: the panel starts closed on every page load.
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Like a normal dropdown: a click outside it or Escape closes it. What was
  // typed stays in the fields.
  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const doLogin = async () => {
    setStatus('verifying')
    try {
      const res = await fetch(LOGIN_PATH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrorReason(data.error ?? 'unknown')
        setStatus('error')
        return
      }
      setRole(data.role)
      setStatus('success')
      setOpen(false)
    } catch {
      setErrorReason('network_error')
      setStatus('error')
    }
  }

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    doLogin()
  }

  const logout = () => {
    setUsername('')
    setPassword('')
    setRole('')
    setErrorReason('')
    setStatus('login')
  }

  return (
    <>
      <header style={barStyle}>
        <div className="logo-name">TestAuth · Dropdown</div>

        {status !== 'success' && (
          <div ref={menuRef} style={{ position: 'relative', height: '100%', display: 'flex', alignItems: 'center' }}>
            <button
              type="button"
              className="btn bg"
              style={triggerStyle}
              aria-expanded={open}
              aria-controls="login-panel"
              onClick={() => setOpen(o => !o)}
            >
              Iniciar sesión
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                style={{ transform: open ? 'rotate(180deg)' : 'none', transition: `transform ${SLIDE_MS}ms ease` }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            <div id="login-panel" style={panelStyle(open)}>
              <div style={{ overflow: 'hidden', minHeight: 0 }}>
                <form onSubmit={onSubmit} style={{ padding: 24 }}>
                  <div className="ftitle">Iniciar sesión</div>
                  <div className="fsub">Usuario + contraseña.</div>
                  {status === 'error' && <div className="msg msg-err show">{errorMessage(errorReason)}</div>}
                  <div className="fg">
                    <label htmlFor="dd-username">Usuario</label>
                    <input
                      id="dd-username"
                      type="text"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      placeholder="username"
                      autoComplete="off"
                    />
                  </div>
                  <div className="fg">
                    <label htmlFor="dd-password">Contraseña</label>
                    <input
                      id="dd-password"
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="******"
                    />
                  </div>
                  <button type="submit" className="btn bp" disabled={status === 'verifying'}>
                    {status === 'verifying' ? 'Verificando…' : 'Continuar →'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </header>

      <div className="wrap">
        <div className="card">
          {status !== 'success' && (
            <div className="screen">
              <div className="ftitle">Área privada</div>
              <div className="fsub" style={{ marginBottom: 0 }}>Necesitás iniciar sesión para continuar.</div>
            </div>
          )}

          {status === 'success' && (
            <div className="sc screen">
              <div className="si">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div className="st">Acceso concedido</div>
              <div className="ss">Credenciales verificadas server-side.</div>
              <div className="badge">
                <div className="dot" />
                <span>
                  {username} · {role}
                </span>
              </div>
              <br />
              <button className="btn bg" onClick={logout}>Cerrar sesión</button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
