import type { Metadata } from 'next'
import { Orbitron, Roboto } from 'next/font/google'
import '@/styles/globals.css'
import { Providers } from './providers'

const orbitron = Orbitron({
  subsets: ['latin'],
  variable: '--font-orbitron',
  weight: ['400', '500', '700', '900'],
})

const roboto = Roboto({
  subsets: ['latin'],
  variable: '--font-roboto',
  weight: ['300', '400', '500', '700'],
})

export const metadata: Metadata = {
  title: 'Ominy Ads Dashboard',
  description: 'Análise inteligente de campanhas Meta Ads',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`dark ${orbitron.variable} ${roboto.variable}`}>
      <body className="bg-ominy-bg text-ominy-text font-body antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
