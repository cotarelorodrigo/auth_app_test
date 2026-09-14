import { Suspense } from 'react'
import GoogleLoginClient from './GoogleLoginClient'

export default function GoogleLoginPage() {
  return (
    <Suspense fallback={null}>
      <GoogleLoginClient />
    </Suspense>
  )
}
