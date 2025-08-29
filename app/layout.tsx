import type { Metadata } from 'next'
import { Outfit } from 'next/font/google'
import './globals.css'
import { CacheProvider } from '@/lib/cache-context'

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['400', '600'],
  variable: '--font-outfit',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Hubcap Curator',
  description: 'AI-powered content curation for any topic',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${outfit.variable} ${outfit.className}`}>
        <CacheProvider>
          {children}
        </CacheProvider>
      </body>
    </html>
  )
}