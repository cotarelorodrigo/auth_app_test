import RecaptchaLoginClient from './RecaptchaLoginClient'

export default function RecaptchaLoginPage() {
  // site key no es secreta (viaja igual en el JS del browser); la leemos
  // server-side para no tener que duplicarla en una env var NEXT_PUBLIC_*.
  return <RecaptchaLoginClient siteKey={process.env.RECAPTCHA_SITE_KEY ?? null} />
}
