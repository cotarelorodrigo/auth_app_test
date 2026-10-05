import RecaptchaV3LoginClient from './RecaptchaV3LoginClient'

export default function RecaptchaV3LoginPage() {
  // site key no es secreta (viaja igual en el JS del browser); la leemos
  // server-side para no tener que duplicarla en una env var NEXT_PUBLIC_*.
  return <RecaptchaV3LoginClient siteKey={process.env.RECAPTCHA_V3_SITE_KEY ?? null} />
}
