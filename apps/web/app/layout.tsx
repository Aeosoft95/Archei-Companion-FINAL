import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'ARCHEI Companion',
  description: 'GM/Player tools for ARCHEI',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body className="min-h-screen bg-zinc-950 text-zinc-100">
        {children}
      </body>
    </html>
  )
}
