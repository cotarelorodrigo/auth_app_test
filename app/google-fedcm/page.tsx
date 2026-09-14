import GoogleFedcmClient from './GoogleFedcmClient'

export default function GoogleFedcmPage() {
  // client_id no es secreto (viaja igual en el JS del browser); lo leemos
  // server-side para no tener que duplicarlo en una env var NEXT_PUBLIC_*.
  return <GoogleFedcmClient clientId={process.env.GOOGLE_CLIENT_ID ?? null} />
}
