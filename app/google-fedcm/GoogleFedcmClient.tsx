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
    <div className="wrap">
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
  )
}
