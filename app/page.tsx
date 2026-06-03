'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

const USERS: Record<string, { password: string; secret: string; role: string }> = {
  testuser_01: { password: 'Test@1234!', secret: 'JBSWY3DPEHPK3PXP', role: 'Usuario' },
  testuser_02: { password: 'Secure#5678!', secret: 'KRUGKIDROVUWG2ZA', role: 'Usuario' },
  admin_test:  { password: 'Admin@Pass99!', secret: 'N5UGC3THNFQWMZLB', role: 'Admin' },
}

function b32(s: string): Uint8Array {
  const C = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  s = s.toUpperCase().replace(/=+$/, '')
  let bits = 0, val = 0
  const out: number[] = []
  for (const c of s) { val = (val << 5) | C.indexOf(c); bits += 5; if (bits >= 8) { bits -= 8; out.push((val >> bits) & 0xff) } }
  return new Uint8Array(out)
}

async function hmacSHA1(key: Uint8Array, data: ArrayBuffer): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey('raw', key.buffer.slice(key.byteOffset, key.byteOffset + key.byteLength) as ArrayBuffer, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign'])
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, data))
}

async function genTOTP(secret: string, w = 0): Promise<string> {
  const T = Math.floor(Date.now() / 1000 / 30) + w
  const buf = new ArrayBuffer(8)
  new DataView(buf).setUint32(4, T, false)
  const mac = await hmacSHA1(b32(secret), buf)
  const o = mac[19] & 0xf
  const code = (((mac[o] & 0x7f) << 24) | (mac[o + 1] << 16) | (mac[o + 2] << 8) | mac[o + 3]) % 1_000_000
  return String(code).padStart(6, '0')
}

async function verifyTOTP(secret: string, code: string): Promise<boolean> {
  for (const w of [-1, 0, 1]) if (await genTOTP(secret, w) === code) return true
  return false
}

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

  const doLogin = useCallback(() => {
    const user = USERS[username]
    if (!user || user.password !== password) {
      setLoginError(true)
      setTimeout(() => setLoginError(false), 3000)
      return
    }
    setCurrentUser(username)
    setOtpDigits(['', '', '', '', '', ''])
    setScreen('totp')
    setTimeout(() => digitRefs.current[0]?.focus(), 100)
  }, [username, password])

  const doVerify = useCallback(async () => {
    const code = otpDigits.join('')
    const ok = await verifyTOTP(USERS[currentUser].secret, code)
    if (!ok) {
      setOtpError(true)
      setTimeout(() => { setOtpError(false); setOtpDigits(['', '', '', '', '', '']); digitRefs.current[0]?.focus() }, 1800)
      return
    }
    if (timerRef.current) clearInterval(timerRef.current)
    setScreen('success')
  }, [otpDigits, currentUser])

  const goBack = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    setCurrentUser('')
    setScreen('login')
  }, [])

  const doLogout = useCallback(() => {
    setUsername('')
    setPassword('')
    setCurrentUser('')
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
              <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="testuser_01" className={loginError ? 'ei' : ''} autoComplete="off"/>
            </div>
            <div className="fg">
              <label>Contraseña</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className={loginError ? 'ei' : ''}/>
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
              <span>{currentUser} · {USERS[currentUser]?.role}</span>
            </div>
            <br/>
            <button className="btn bg" onClick={doLogout}>Cerrar sesión</button>
          </div>
        )}
      </div>
    </div>
  )
}
