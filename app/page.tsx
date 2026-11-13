'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

type Screen = 'login' | 'totp' | 'success'

export default function Home() {
  const [screen, setScreen] = useState<Screen>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState(false)
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', ''])
  const [otpError, setOtpError] = useState(false)
  const [timerSec, setTimerSec] = useState(30)
  const [currentUser, setCurrentUser] = useState('')
  const [role, setRole] = useState('')
  const digitRefs = useRef<(HTMLInputElement | null)[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const circumference = 2 * Math.PI * 12

  useEffect(() => {
    if (screen !== 'totp') return
    const tick = () => {
      const sec = 30 - (Math.floor(Date.now() / 1000) % 30)
      setTimerSec(sec)
    }
    tick()
    timerRef.current = setInterval(tick, 500)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [screen])

  const failLogin = useCallback(() => {
    setLoginError(true)
    setTimeout(() => setLoginError(false), 3000)
  }, [])

  const doLogin = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/2fa/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      if (!res.ok) return failLogin()
    } catch {
      return failLogin()
    }
    setCurrentUser(username)
    setOtpDigits(['', '', '', '', '', ''])
    setScreen('totp')
    setTimeout(() => digitRefs.current[0]?.focus(), 100)
  }, [username, password, failLogin])

  const goBack = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    setCurrentUser('')
    setScreen('login')
  }, [])

  const failVerify = useCallback(() => {
    setOtpError(true)
    setTimeout(() => { setOtpError(false); setOtpDigits(['', '', '', '', '', '']); digitRefs.current[0]?.focus() }, 1800)
  }, [])

  const doVerify = useCallback(async () => {
    const code = otpDigits.join('')
    let data: { role?: string } = {}
    try {
      const res = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      if (res.status === 401 && (await res.clone().json().catch(() => ({})))?.error === 'unauthenticated') {
        return goBack() // the pending step expired: start over from the password
      }
      if (!res.ok) return failVerify()
      data = await res.json()
    } catch {
      return failVerify()
    }
    if (timerRef.current) clearInterval(timerRef.current)
    setRole(data.role ?? '')
    setScreen('success')
  }, [otpDigits, goBack, failVerify])

  const doLogout = useCallback(() => {
    setUsername('')
    setPassword('')
    setCurrentUser('')
    setRole('')
    setOtpDigits(['', '', '', '', '', ''])
    setScreen('login')
  }, [])

  const handleDigitChange = (i: number, val: string) => {
    const digit = val.replace(/\D/g, '').slice(-1)
    const next = [...otpDigits]
    next[i] = digit
    setOtpDigits(next)
    if (digit && i < 5) digitRefs.current[i + 1]?.focus()
  }

  const handleDigitKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[i] && i > 0) {
      digitRefs.current[i - 1]?.focus()
      const next = [...otpDigits]
      next[i - 1] = ''
      setOtpDigits(next)
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const p = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    e.preventDefault()
    const next = ['', '', '', '', '', '']
    p.split('').forEach((c, j) => { next[j] = c })
    setOtpDigits(next)
    if (p.length === 6) digitRefs.current[5]?.focus()
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return
      if (screen === 'login') doLogin()
      else if (screen === 'totp' && otpDigits.join('').length === 6) doVerify()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [screen, doLogin, doVerify, otpDigits])

  const arcOffset = circumference * (1 - timerSec / 30)
  const arcColor = timerSec <= 5 ? '#ef4444' : timerSec <= 10 ? '#f59e0b' : '#4f46e5'
  const otpComplete = otpDigits.join('').length === 6

  return (
    <div className="wrap">
      <div className="logo">
        <div className="logo-mark">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>
        <div className="logo-name">TestAuth · 2FA Demo</div>
      </div>

      <div className="card">
        {screen !== 'success' && (
          <div className="steps">
            <div className={`step ${screen === 'login' ? 'active' : 'done'}`}>
              <div className="step-num">1</div>Credenciales
            </div>
            <div className="step-line"/>
            <div className={`step ${screen === 'totp' ? 'active' : ''}`}>
              <div className="step-num">2</div>Verificación
            </div>
          </div>
        )}

        {screen === 'login' && (
          <div className="screen">
            <div className="ftitle">Iniciar sesión</div>
            <div className="fsub">Ingresa tus credenciales para continuar.</div>
            {loginError && (
              <div className="msg msg-err show">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                Usuario o contraseña incorrectos.
              </div>
            )}
            <div className="fg">
              <label>Usuario</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="username" className={loginError ? 'ei' : ''} autoComplete="off"/>
            </div>
            <div className="fg">
              <label>Contraseña</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="******" className={loginError ? 'ei' : ''}/>
            </div>
            <button className="btn bp" onClick={doLogin}>Continuar →</button>
          </div>
        )}

        {screen === 'totp' && (
          <div className="screen">
            <div className="ftitle">Verificación 2FA</div>
            <div className="fsub">Usa el secret de tu usuario en tu app autenticadora y escribe el código de 6 dígitos.</div>
            {otpError && (
              <div className="msg msg-err show">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                Código incorrecto o expirado.
              </div>
            )}
            <div className="timer-row">
              <div className="ring">
                <svg width="28" height="28" viewBox="0 0 28 28" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="14" cy="14" r="12" fill="none" stroke="var(--border)" strokeWidth="2" strokeDasharray={circumference} strokeDashoffset="0"/>
                  <circle cx="14" cy="14" r="12" fill="none" stroke={arcColor} strokeWidth="2" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={arcOffset} style={{ transition: 'stroke-dashoffset 1s linear, stroke .3s' }}/>
                </svg>
                <div className="ring-num">{timerSec}</div>
              </div>
              <span>{timerSec === 1 ? 'segundo restante' : 'segundos restantes'}</span>
            </div>
            <div className="otp-row" onPaste={handlePaste}>
              {otpDigits.map((d, i) => (
                <input
                  key={i}
                  ref={el => { digitRefs.current[i] = el }}
                  className={`od${d ? ' filled' : ''}${otpError ? ' ei' : ''}`}
                  maxLength={1}
                  type="text"
                  inputMode="numeric"
                  value={d}
                  onChange={e => handleDigitChange(i, e.target.value)}
                  onKeyDown={e => handleDigitKeyDown(i, e)}
                />
              ))}
            </div>
            <button className="btn bp" onClick={doVerify} disabled={!otpComplete}>Verificar →</button>
            <button className="btn bg" onClick={goBack}>← Volver</button>
          </div>
        )}

        {screen === 'success' && (
          <div className="sc screen">
            <div className="si">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <div className="st">Acceso concedido</div>
            <div className="ss">Autenticación de dos factores completada correctamente.</div>
            <div className="badge">
              <div className="dot"/>
              <span>{currentUser} · {role}</span>
            </div>
            <br/>
            <button className="btn bg" onClick={doLogout}>Cerrar sesión</button>
          </div>
        )}
      </div>
    </div>
  )
}
