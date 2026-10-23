'use client'

import Image from 'next/image'
import { useState } from 'react'

type Status = 'login' | 'verifying' | 'success' | 'error'

const IMAGE_PATH = '/api/auth/image-captcha'
const VERIFY_PATH = '/api/auth/image-captcha/verify'

const ERROR_MESSAGES: Record<string, string> = {
  missing_captcha: 'Escribí los caracteres de la imagen.',
  captcha_failed: 'El texto no coincide con la imagen, o la imagen expiró o ya se usó.',
  invalid_credentials: 'Usuario o contraseña incorrectos.',
  network_error: 'Error de red al hablar con el servidor.',
}

function errorMessage(reason: string): string {
  return ERROR_MESSAGES[reason] ?? `Error: ${reason}`
}

export default function ImageCaptchaLoginPage() {
  const [status, setStatus] = useState<Status>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [captcha, setCaptcha] = useState('')
  const [imageVersion, setImageVersion] = useState(0)
  const [errorReason, setErrorReason] = useState('')
  const [role, setRole] = useState('')

  // Cada imagen sirve para un solo intento: después de cada intento pedimos otra.
  const newImage = () => {
    setCaptcha('')
    setImageVersion(v => v + 1)
  }

  const doLogin = async () => {
    setStatus('verifying')
    try {
      const res = await fetch(VERIFY_PATH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, captcha }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrorReason(data.error ?? 'unknown')
        setStatus('error')
        newImage()
        return
      }
      setRole(data.role)
      setStatus('success')
    } catch {
      setErrorReason('network_error')
      setStatus('error')
      newImage()
    }
  }

  const retry = () => {
    setUsername('')
    setPassword('')
    setRole('')
    setErrorReason('')
    setStatus('login')
    newImage()
  }

  const canSubmit = username && password && captcha.trim() && status !== 'verifying'

  return (
    <div className="wrap">
      <div className="logo">
        <div className="logo-mark">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <div className="logo-name">TestAuth · CAPTCHA de imagen</div>
      </div>

      <div className="card">
        {status !== 'success' && (
          <div className="screen">
            <div className="ftitle">Iniciar sesión</div>
            <div className="fsub">
              Usuario + contraseña, protegidos con un CAPTCHA de imagen: escribí los caracteres que ves. Cada imagen
              sirve para un solo intento y vence a los 5 minutos.
            </div>
            {status === 'error' && <div className="msg msg-err show">{errorMessage(errorReason)}</div>}
            <div className="fg">
              <label>Usuario</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="username" autoComplete="off" />
            </div>
            <div className="fg">
              <label>Contraseña</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="******" />
            </div>
            <div className="fg">
              <label>Código de la imagen</label>
              <Image
                src={`${IMAGE_PATH}?v=${imageVersion}`}
                alt="CAPTCHA: escribí los caracteres de esta imagen"
                width={300}
                height={100}
                unoptimized
                style={{ display: 'block', width: '100%', height: 'auto', borderRadius: 8 }}
              />
              <button type="button" className="btn bg" onClick={newImage} style={{ marginBottom: 10 }}>
                Otra imagen
              </button>
              <input
                type="text"
                value={captcha}
                onChange={e => setCaptcha(e.target.value)}
                placeholder="Escribí los caracteres"
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
              />
            </div>
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
            <div className="ss">Credenciales y CAPTCHA de imagen verificados server-side.</div>
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
  )
}
