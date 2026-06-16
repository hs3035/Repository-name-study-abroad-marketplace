import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { getLocale } from '@/app/lib/locale'
import { LanguageProvider } from '@/app/context/language-context'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: '留学导师平台 / Study Abroad Mentors',
  description: 'Find PhD students and postdocs to guide your study abroad application',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale()
  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <LanguageProvider locale={locale}>{children}</LanguageProvider>
      </body>
    </html>
  )
}
