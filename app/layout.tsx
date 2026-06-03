import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'TestAuth 2FA',
  description: '2FA Demo App',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
