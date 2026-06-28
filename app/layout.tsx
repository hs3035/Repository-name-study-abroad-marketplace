import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { getLocale } from '@/app/lib/locale'
import { LanguageProvider } from '@/app/context/language-context'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_URL || 'https://gomentorgo.com'),
  title: {
    default: 'GoMentorGo — 你的留学搭子',
    template: '%s | GoMentorGo',
  },
  description: 'GoMentorGo 帮助留学申请者预约来自目标专业和学校背景的导师。你要走的路，他们已经成功走过。',
  keywords: ['GoMentorGo', '留学导师', '留学申请', '博士导师', '申请辅导', '文书修改', '面试辅导'],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'GoMentorGo — 你的留学搭子',
    description: '你要走的路，他们已经成功走过。',
    url: '/',
    siteName: 'GoMentorGo',
    locale: 'zh_CN',
    type: 'website',
  },
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
