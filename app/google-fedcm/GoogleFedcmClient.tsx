'use client'

import Script from 'next/script'
import { useRef, useState } from 'react'

type CredentialResponse = { credential: string; select_by?: string }

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string
            callback: (response: CredentialResponse) => void
            use_fedcm_for_prompt?: boolean
          }) => void
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void
          prompt: () => void
        }
      }
    }
  }
}

type Status = 'idle' | 'verifying' | 'success' | 'error'

export default function GoogleFedcmClient({ clientId }: { clientId: string | null }) {
  const [status, setStatus] = useState<Status>('idle')
  const [profile, setProfile] = useState<{ email: string; name: string } | null>(null)
  const [errorReason, setErrorReason] = useState('')
  const buttonRef = useRef<HTMLDivElement | null>(null)

  const handleCredential = async (response: CredentialResponse) => {
    setStatus('verifying')
    try {
      const res = await fetch('/api/auth/google/fedcm-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrorReason(data.error ?? 'unknown')
        setStatus('error')
        return
      }
      setProfile({ email: data.email, name: data.name })
      setStatus('success')
    } catch {
      setErrorReason('network_error')
      setStatus('error')
    }
  }

  const setupGis = () => {
    if (!clientId || !window.google || !buttonRef.current) return
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: handleCredential,
      // Fuerza a que el browser medie el prompt vía FedCM (chrome://identity-internals)
      // en vez del iframe/cookie legacy que GIS usaba antes de FedCM.
      use_fedcm_for_prompt: true,
    })
    window.google.accounts.id.renderButton(buttonRef.current, {
      theme: 'outline',
      size: 'large',
      text: 'signin_with',
    })
    // One Tap: dispara el diálogo nativo del browser sin que el usuario
    // tenga que clickear el botón (si el browser/estado de sesión lo permite).
    window.google.accounts.id.prompt()
  }

  const retry = () => {
    setStatus('idle')
    setErrorReason('')
    setProfile(null)
    setTimeout(setupGis, 0)
  }

  return (
    <>
      {/* La página base centra todo en 100vh con overflow:hidden para el
          caso de un único card (2FA). Acá agregamos el diagrama debajo, así
          que habilitamos scroll solo mientras este componente está montado. */}
      <style>{`
        :root{ --accent-2:#2dd4bf; --accent-2-soft:rgba(45,212,191,.12); }
        body{ overflow-y:auto; height:auto; min-height:100vh; align-items:flex-start; padding-block:56px 72px; }
        .flow-page{ display:flex; flex-direction:column; align-items:center; gap:36px; width:100%; max-width:960px; margin:0 auto; padding-inline:20px; }
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
            <div className="logo-name">TestAuth · Google FedCM</div>
          </div>

          <div className="card">
            {!clientId && (
              <div className="msg msg-err show">
                GOOGLE_CLIENT_ID no está configurado en el servidor.
              </div>
            )}

            {clientId && status !== 'success' && (
              <div className="screen">
                <div className="ftitle">Iniciar sesión</div>
                <div className="fsub">
                  Este caso usa Federated Credential Management (FedCM): el navegador
                  media el login con su diálogo nativo de identidad, sin redirect ni tab nueva.
                </div>
                {status === 'error' && (
                  <div className="msg msg-err show">Error verificando el credential: {errorReason}</div>
                )}
                <Script
                  src="https://accounts.google.com/gsi/client"
                  strategy="afterInteractive"
                  onLoad={setupGis}
                />
                <div ref={buttonRef} />
                {status === 'verifying' && <div className="fsub">Verificando credential…</div>}
              </div>
            )}

            {status === 'success' && profile && (
              <div className="sc screen">
                <div className="si">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div className="st">Acceso concedido</div>
                <div className="ss">Login mediado por FedCM, credential verificado en el server.</div>
                <div className="badge">
                  <div className="dot" />
                  <span>{profile.name || profile.email}</span>
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
            Federated Credential Management — mediado por el navegador, misma tab.
          </div>
          <svg viewBox="0 0 940 400" role="img"
               aria-label="El flujo FedCM se resuelve en 3 superficies y 3 llamadas visibles: el navegador media el login fuera del DOM, sin nueva tab ni navegación de la página.">
            <defs>
              <marker id="f-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">
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

            <rect x="40" y="62" width="220" height="120" rx="10" fill="var(--accent-2-soft)" stroke="var(--accent-2)" strokeDasharray="4 4" />
            <g className="diag-mono" fontSize="11" fill="var(--accent-2)" textAnchor="middle">
              <text x="150" y="85" fontWeight="600">initialize() + prompt()</text>
              <text x="150" y="112">navegador ↔ Google</text>
              <text x="150" y="130">(diálogo nativo, fuera del DOM)</text>
              <text x="150" y="160" fontStyle="italic">callback(credential) ↓</text>
            </g>

            <g fontSize="11.5" className="diag-mono">
              <line x1="150" y1="210" x2="510" y2="210" stroke="currentColor" markerEnd="url(#f-arrow)" />
              <text x="330" y="202" textAnchor="middle" fill="var(--muted)">POST /api/auth/google/fedcm-verify</text>

              <g style={{ color: 'var(--accent-2)' }}>
                <line x1="510" y1="264" x2="870" y2="264" stroke="currentColor" strokeDasharray="4 4" markerStart="url(#f-arrow)" markerEnd="url(#f-arrow)" />
                <text x="690" y="256" textAnchor="middle" fill="var(--accent-2)" fontWeight="600">tokeninfo: firma, exp, aud</text>
              </g>

              <line x1="510" y1="318" x2="150" y2="318" stroke="currentColor" markerEnd="url(#f-arrow)" />
              <text x="330" y="310" textAnchor="middle" fill="var(--muted)">200 {'{ email, name }'}</text>
            </g>
          </svg>
          <figcaption>
            3 superficies, 3 llamadas visibles. El intercambio con Google ocurre dentro
            del navegador (halo teal) — la página nunca navega ni abre una tab, solo
            recibe un <span className="diag-mono">credential</span> ya firmado.
          </figcaption>
        </figure>
      </div>
    </>
  )
}
