'use client'

import Script from 'next/script'
import { useRef, useState } from 'react'

declare global {
  interface Window {
    grecaptcha?: {
      ready: (callback: () => void) => void
      render: (
        container: HTMLElement,
        params: {
          sitekey: string
          callback: (token: string) => void
          'expired-callback'?: () => void
          'error-callback'?: () => void
        },
      ) => number
      reset: (widgetId?: number) => void
    }
  }
}

type Status = 'login' | 'verifying' | 'success' | 'error'

const ERROR_MESSAGES: Record<string, string> = {
  not_configured: 'RECAPTCHA_SITE_KEY / RECAPTCHA_SECRET_KEY no están configurados en el servidor.',
  missing_token: 'Resolvé el reCAPTCHA antes de continuar.',
  recaptcha_failed: 'Google rechazó el token de reCAPTCHA (challenge no superado o expirado).',
  invalid_credentials: 'Usuario o contraseña incorrectos.',
  network_error: 'Error de red al hablar con el servidor.',
}

function errorMessage(reason: string): string {
  return ERROR_MESSAGES[reason] ?? `Error: ${reason}`
}

export default function RecaptchaLoginClient({ siteKey }: { siteKey: string | null }) {
  const [status, setStatus] = useState<Status>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [token, setToken] = useState<string | null>(null)
  const [errorReason, setErrorReason] = useState('')
  const [role, setRole] = useState('')
  const widgetRef = useRef<HTMLDivElement | null>(null)
  const widgetIdRef = useRef<number | undefined>(undefined)

  const setupRecaptcha = () => {
    if (!siteKey || !window.grecaptcha) return
    // El evento `load` del <script> solo confirma que el archivo se
    // descargó: `grecaptcha` existe como stub en ese momento, pero
    // `.render` se adjunta en una segunda etapa async. `ready()` encola
    // el callback hasta que la API esté realmente completa.
    window.grecaptcha.ready(() => {
      if (!window.grecaptcha || !widgetRef.current) return
      widgetIdRef.current = window.grecaptcha.render(widgetRef.current, {
        sitekey: siteKey,
        callback: t => setToken(t),
        'expired-callback': () => setToken(null),
        'error-callback': () => setToken(null),
      })
    })
  }

  const resetWidget = () => {
    setToken(null)
    if (window.grecaptcha && widgetIdRef.current !== undefined) window.grecaptcha.reset(widgetIdRef.current)
  }

  const doLogin = async () => {
    if (!token) return
    setStatus('verifying')
    try {
      const res = await fetch('/api/auth/recaptcha/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, token }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrorReason(data.error ?? 'unknown')
        setStatus('error')
        resetWidget()
        return
      }
      setRole(data.role)
      setStatus('success')
    } catch {
      setErrorReason('network_error')
      setStatus('error')
      resetWidget()
    }
  }

  const retry = () => {
    setUsername('')
    setPassword('')
    setRole('')
    setErrorReason('')
    setStatus('login')
    setTimeout(resetWidget, 0)
  }

  const canSubmit = username && password && token && status !== 'verifying'

  return (
    <>
      {/* La página base centra todo en 100vh con overflow:hidden para el
          caso de un único card (2FA). Acá agregamos el diagrama debajo, así
          que habilitamos scroll solo mientras este componente está montado. */}
      <style>{`
        :root{ --accent-3:#f59e0b; --accent-3-soft:rgba(245,158,11,.12); }
        body{ overflow-y:auto; height:auto; min-height:100vh; align-items:flex-start; padding-block:56px 72px; }
        .flow-page{ display:flex; flex-direction:column; align-items:center; gap:36px; width:100%; max-width:960px; margin:0 auto; padding-inline:20px; }
        .diagram-card{ width:100%; background:var(--surface); border:1px solid var(--border); border-radius:16px; padding:24px 20px 20px; }
        .diagram-card svg{ display:block; width:100%; height:auto; margin-top:14px; }
        .diagram-card figcaption{ font-size:12.5px; color:var(--muted); line-height:1.6; margin-top:14px; max-width:72ch; }
        .diag-mono{ font-family:'IBM Plex Mono',monospace; }
        .g-recaptcha-wrap{ margin-bottom:18px; }
      `}</style>

      <div className="flow-page">
        <div className="wrap" style={{ margin: 0 }}>
          <div className="logo">
            <div className="logo-mark">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <div className="logo-name">TestAuth · reCAPTCHA v2</div>
          </div>

          <div className="card">
            {!siteKey && (
              <div className="msg msg-err show">
                RECAPTCHA_SITE_KEY no está configurado en el servidor.
              </div>
            )}

            {siteKey && status !== 'success' && (
              <div className="screen">
                <div className="ftitle">Iniciar sesión</div>
                <div className="fsub">
                  Usuario + contraseña, protegidos con la casilla real de Google reCAPTCHA v2
                  (&ldquo;No soy un robot&rdquo;). El submit queda bloqueado hasta resolverla.
                </div>
                {status === 'error' && (
                  <div className="msg msg-err show">{errorMessage(errorReason)}</div>
                )}
                <div className="fg">
                  <label>Usuario</label>
                  <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="testuser_01" autoComplete="off" />
                </div>
                <div className="fg">
                  <label>Contraseña</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
                </div>
                <Script src="https://www.google.com/recaptcha/api.js?render=explicit&hl=es" strategy="afterInteractive" onLoad={setupRecaptcha} />
                <div className="g-recaptcha-wrap" ref={widgetRef} />
                <button className="btn bp" onClick={doLogin} disabled={!canSubmit}>
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
                <div className="ss">Credenciales y reCAPTCHA verificados server-side.</div>
                <div className="badge">
                  <div className="dot" />
                  <span>{username} · {role}</span>
                </div>
                <br />
                <button className="btn bg" onClick={retry}>Volver a iniciar sesión</button>
              </div>
            )}
          </div>
        </div>

        <figure className="diagram-card">
          <div className="ftitle" style={{ fontSize: 16 }}>Cómo funciona este flujo</div>
          <div className="fsub" style={{ marginBottom: 0 }}>
            reCAPTCHA v2 checkbox — gatea un login local, verificado server-to-server.
          </div>
          <svg viewBox="0 0 940 400" role="img"
               aria-label="El flujo reCAPTCHA v2 resuelve el challenge en el browser, envía credenciales y token al server, y el server valida el token contra Google antes de aceptar el login.">
            <defs>
              <marker id="c-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 z" fill="currentColor" />
              </marker>
            </defs>

            <g className="diag-mono" fontSize="12.5" fontWeight="600" textAnchor="middle" fill="currentColor">
              <text x="150" y="26">Página (misma tab)</text>
              <text x="510" y="26">Server (Next.js)</text>
              <text x="870" y="26">Google</text>
            </g>
            <g stroke="var(--border)" strokeWidth="1.5" strokeDasharray="2 5">
              <line x1="150" y1="42" x2="150" y2="360" />
              <line x1="510" y1="42" x2="510" y2="360" />
              <line x1="870" y1="42" x2="870" y2="360" />
            </g>

            <rect x="40" y="62" width="220" height="120" rx="10" fill="var(--accent-3-soft)" stroke="var(--accent-3)" strokeDasharray="4 4" />
            <g className="diag-mono" fontSize="11" fill="var(--accent-3)" textAnchor="middle">
              <text x="150" y="85" fontWeight="600">grecaptcha.render()</text>
              <text x="150" y="112">usuario tilda el checkbox</text>
              <text x="150" y="130">(widget de Google, mismo DOM)</text>
              <text x="150" y="160" fontStyle="italic">callback(token) ↓</text>
            </g>

            <g fontSize="11.5" className="diag-mono">
              <line x1="150" y1="210" x2="510" y2="210" stroke="currentColor" markerEnd="url(#c-arrow)" />
              <text x="330" y="202" textAnchor="middle" fill="var(--muted)">POST /api/auth/recaptcha/verify</text>
              <text x="330" y="218" textAnchor="middle" fill="var(--muted)" fontSize="10">{'{ username, password, token }'}</text>

              <g style={{ color: 'var(--accent-3)' }}>
                <line x1="510" y1="272" x2="870" y2="272" stroke="currentColor" strokeDasharray="4 4" markerStart="url(#c-arrow)" markerEnd="url(#c-arrow)" />
                <text x="690" y="264" textAnchor="middle" fill="var(--accent-3)" fontWeight="600">siteverify: secret + token</text>
              </g>

              <line x1="510" y1="326" x2="150" y2="326" stroke="currentColor" markerEnd="url(#c-arrow)" />
              <text x="330" y="318" textAnchor="middle" fill="var(--muted)">200 {'{ ok, role }'} / 401 error</text>
            </g>
          </svg>
          <figcaption>
            3 superficies. El checkbox se resuelve en el mismo DOM de la página (halo ámbar);
            recién después el server valida el <span className="diag-mono">token</span> contra
            Google server-to-server, junto con las credenciales, antes de aceptar el login.
          </figcaption>
        </figure>
      </div>
    </>
  )
}
