'use client'

import { useState } from 'react'
import type { CSSProperties, MouseEvent } from 'react'

type Status = 'login' | 'verifying' | 'success' | 'error'

const LOGIN_PATH = '/api/auth/cookie-banner/login'

// The card hangs CARD_BOTTOM_GAP px above the bottom of the viewport and the
// cookie banner is BANNER_HEIGHT px tall and fixed to the bottom, so the banner
// covers the center of the login button at any window height. Keep both
// numbers together: they only make sense as a pair.
const CARD_BOTTOM_GAP = 24
const BANNER_HEIGHT = 96

const ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: 'Usuario o contraseña incorrectos.',
  network_error: 'Error de red al hablar con el servidor.',
}

function errorMessage(reason: string): string {
  return ERROR_MESSAGES[reason] ?? `Error: ${reason}`
}

const bannerStyle: CSSProperties = {
  position: 'fixed',
  left: 0,
  right: 0,
  bottom: 0,
  height: BANNER_HEIGHT,
  boxSizing: 'border-box',
  zIndex: 1000,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 24,
  // Extra left padding keeps the text clear of the Next.js dev indicator
  // (bottom-left, dev mode only).
  padding: '0 32px 0 72px',
  background: 'var(--surface)',
  borderTop: '1px solid var(--border)',
  boxShadow: '0 -8px 30px rgba(0, 0, 0, 0.35)',
}

const bannerButtonStyle: CSSProperties = { width: 'auto', marginTop: 0, padding: '10px 18px' }

export default function CookieBannerLoginPage() {
  const [status, setStatus] = useState<Status>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [errorReason, setErrorReason] = useState('')
  const [role, setRole] = useState('')
  // In-memory only on purpose: the banner comes back on every page load.
  const [bannerOpen, setBannerOpen] = useState(true)

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
    } catch {
      setErrorReason('network_error')
      setStatus('error')
    }
  }

  // While the banner is open only a pointer click that really reaches the
  // button counts. Enter/Space on the focused button and scripted .click()
  // calls arrive with detail === 0 and are ignored, so a successful login
  // proves the click got through the banner.
  const onLoginClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (bannerOpen && e.detail === 0) return
    doLogin()
  }

  // Resets the form only: the banner stays closed until the next page load.
  const retry = () => {
    setUsername('')
    setPassword('')
    setRole('')
    setErrorReason('')
    setStatus('login')
  }

  return (
    <>
      <div className="wrap" style={{ alignSelf: 'flex-end', marginBottom: CARD_BOTTOM_GAP }}>
        <div className="logo">
          <div className="logo-mark">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <div className="logo-name">TestAuth · Cookie banner</div>
        </div>

        <div className="card">
          {status !== 'success' && (
            <div className="screen">
              <div className="ftitle">Iniciar sesión</div>
              <div className="fsub">Usuario + contraseña. Un aviso de cookies puede interponerse en el camino.</div>
              {status === 'error' && <div className="msg msg-err show">{errorMessage(errorReason)}</div>}
              <div className="fg">
                <label>Usuario</label>
                <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="username" autoComplete="off" />
              </div>
              <div className="fg">
                <label>Contraseña</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="******" />
              </div>
              <button className="btn bp" onClick={onLoginClick} disabled={status === 'verifying'}>
                {status === 'verifying' ? 'Verificando…' : 'Continuar →'}
              </button>
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
              <button className="btn bg" onClick={retry}>Volver a iniciar sesión</button>
            </div>
          )}
        </div>
      </div>

      {bannerOpen && (
        <div role="region" aria-label="Aviso de cookies" style={bannerStyle}>
          <div style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--text)' }}>
            Usamos cookies para mejorar tu experiencia. Podés aceptarlas o rechazarlas.
          </div>
          <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
            <button className="btn bg" style={bannerButtonStyle} onClick={() => setBannerOpen(false)}>
              Rechazar
            </button>
            <button className="btn bp" style={bannerButtonStyle} onClick={() => setBannerOpen(false)}>
              Aceptar
            </button>
          </div>
        </div>
      )}
    </>
  )
}
