'use client'

import { useSearchParams } from 'next/navigation'

const ERROR_MESSAGES: Record<string, string> = {
  invalid_state: 'La respuesta de Google no coincide con el intento de login (state inválido).',
  not_configured: 'GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET no están configurados en el servidor.',
  token_exchange_failed: 'Falló el intercambio del authorization code por un token.',
  userinfo_failed: 'Falló la consulta del perfil de Google.',
  network_error: 'Error de red al hablar con Google.',
  access_denied: 'Cancelaste el acceso en la pantalla de Google.',
}

function errorMessage(reason: string | null): string {
  if (!reason) return 'Ocurrió un error desconocido durante el login con Google.'
  return ERROR_MESSAGES[reason] ?? `Error de Google: ${reason}`
}

export default function GoogleLoginClient() {
  const params = useSearchParams()
  const status = params.get('status')

  const signIn = () => {
    // Se abre en una tab nueva: la pantalla de cuentas de Google (y el
    // callback que la sigue) corren fuera de esta pestaña por diseño.
    window.open('/api/auth/google/start', '_blank', 'noopener,noreferrer')
  }

  return (
    <>
      {/* La página base centra todo en 100vh con overflow:hidden para el
          caso de un único card (2FA). Acá agregamos el diagrama debajo, así
          que habilitamos scroll solo mientras este componente está montado. */}
      <style>{`
        body{ overflow-y:auto; height:auto; min-height:100vh; align-items:flex-start; padding-block:56px 72px; }
        .flow-page{ display:flex; flex-direction:column; align-items:center; gap:36px; width:100%; max-width:940px; margin:0 auto; padding-inline:20px; }
        .diagram-card{ width:100%; background:var(--surface); border:1px solid var(--border); border-radius:16px; padding:24px 20px 20px; }
        .diagram-card svg{ display:block; width:100%; height:auto; margin-top:14px; }
        .diagram-card figcaption{ font-size:12.5px; color:var(--muted); line-height:1.6; margin-top:14px; max-width:72ch; }
        .diag-mono{ font-family:'IBM Plex Mono',monospace; }
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
            <div className="logo-name">TestAuth · Google Login</div>
          </div>

          <div className="card">
            {status === 'success' && (
              <div className="sc screen">
                <div className="si">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div className="st">Acceso concedido</div>
                <div className="ss">Autenticación con Google completada correctamente.</div>
                <div className="badge">
                  <div className="dot" />
                  <span>{params.get('name') || params.get('email') || 'Cuenta de Google'}</span>
                </div>
                <br />
                <button className="btn bg" onClick={signIn}>Volver a iniciar sesión</button>
              </div>
            )}

            {status === 'error' && (
              <div className="screen">
                <div className="ftitle">No se pudo iniciar sesión</div>
                <div className="msg msg-err show">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {errorMessage(params.get('reason'))}
                </div>
                <button className="btn bp" onClick={signIn}>Reintentar con Google →</button>
              </div>
            )}

            {status !== 'success' && status !== 'error' && (
              <div className="screen">
                <div className="ftitle">Iniciar sesión</div>
                <div className="fsub">Accedé con tu cuenta de Google para continuar.</div>
                <button className="btn bp" onClick={signIn}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
                    <GoogleGlyph />
                    Sign in with Google
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>

        <figure className="diagram-card">
          <div className="ftitle" style={{ fontSize: 16 }}>Cómo funciona este flujo</div>
          <div className="fsub" style={{ marginBottom: 0 }}>
            OAuth 2.0 Authorization Code — redirect completo en una tab nueva.
          </div>
          <svg viewBox="0 0 920 540" role="img"
               aria-label="El flujo OAuth redirect recorre 4 superficies y 8 saltos: la tab nueva navega hasta accounts.google.com y vuelve, mientras la tab original permanece intacta.">
            <defs>
              <marker id="r-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 z" fill="currentColor" />
              </marker>
            </defs>

            <g className="diag-mono" fontSize="12.5" fontWeight="600" textAnchor="middle" fill="currentColor">
              <text x="80" y="26">Tab original</text>
              <text x="333" y="26">Tab nueva</text>
              <text x="587" y="26">Server (Next.js)</text>
              <text x="840" y="26">accounts.google.com</text>
            </g>
            <g stroke="var(--border)" strokeWidth="1.5" strokeDasharray="2 5">
              <line x1="80" y1="42" x2="80" y2="492" />
              <line x1="333" y1="42" x2="333" y2="492" />
              <line x1="587" y1="42" x2="587" y2="492" />
              <line x1="840" y1="42" x2="840" y2="492" />
            </g>

            <rect x="20" y="96" width="120" height="380" rx="8" fill="none" stroke="var(--border)" strokeDasharray="3 4" />
            <text x="80" y="496" textAnchor="middle" fontSize="10.5" fontStyle="italic" fill="var(--muted)" className="diag-mono">sin más actividad</text>

            <g fontSize="11.5" className="diag-mono">
              <line x1="80" y1="80" x2="333" y2="80" stroke="currentColor" markerEnd="url(#r-arrow)" />
              <text x="206" y="72" textAnchor="middle" fill="var(--muted)">click → window.open()</text>

              <line x1="333" y1="134" x2="587" y2="134" stroke="currentColor" markerEnd="url(#r-arrow)" />
              <text x="460" y="126" textAnchor="middle" fill="var(--muted)">GET /api/auth/google/start</text>

              <line x1="587" y1="188" x2="333" y2="188" stroke="currentColor" markerEnd="url(#r-arrow)" />
              <text x="460" y="180" textAnchor="middle" fill="var(--muted)">302 + Set-Cookie(state)</text>

              <line x1="333" y1="242" x2="840" y2="242" stroke="currentColor" markerEnd="url(#r-arrow)" />
              <text x="586" y="234" textAnchor="middle" fill="var(--muted)">navega con client_id + redirect_uri + state</text>

              <line x1="840" y1="296" x2="333" y2="296" stroke="currentColor" markerEnd="url(#r-arrow)" />
              <text x="586" y="288" textAnchor="middle" fill="var(--muted)">usuario elige cuenta → 302 code+state</text>

              <line x1="333" y1="350" x2="587" y2="350" stroke="currentColor" markerEnd="url(#r-arrow)" />
              <text x="460" y="342" textAnchor="middle" fill="var(--muted)">GET /callback?code&amp;state</text>

              <g style={{ color: 'var(--accent)' }}>
                <line x1="587" y1="404" x2="840" y2="404" stroke="currentColor" strokeDasharray="4 4" markerStart="url(#r-arrow)" markerEnd="url(#r-arrow)" />
                <text x="713" y="396" textAnchor="middle" fill="var(--accent)" fontWeight="600">code+secret → token → profile</text>
              </g>

              <line x1="587" y1="458" x2="333" y2="458" stroke="currentColor" markerEnd="url(#r-arrow)" />
              <text x="460" y="450" textAnchor="middle" fill="var(--muted)">redirect → status=success</text>
            </g>
          </svg>
          <figcaption>
            4 superficies, 8 saltos. La tab nueva hace la navegación completa contra
            Google; el <span className="diag-mono">client_secret</span> solo se usa server-to-server.
            La tab original nunca recibe respuesta — sigue intacta.
          </figcaption>
        </figure>
      </div>
    </>
  )
}

function GoogleGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
    </svg>
  )
}
