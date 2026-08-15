import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getGuide, GUIDES } from '@/app/lib/guides'

export function generateStaticParams() {
  return GUIDES.map(guide => ({ slug: guide.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const guide = getGuide((await params).slug)
  if (!guide) return { title: '博士申请指南' }
  return {
    title: guide.title,
    description: guide.description,
    keywords: guide.keywords,
    alternates: { canonical: `/guides/${guide.slug}` },
    openGraph: {
      title: guide.title,
      description: guide.description,
      type: 'article',
      url: `/guides/${guide.slug}`,
    },
  }
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const guide = getGuide((await params).slug)
  if (!guide) notFound()

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: guide.title,
    description: guide.description,
    dateModified: guide.updatedAt,
    datePublished: guide.updatedAt,
    inLanguage: 'zh-CN',
    author: { '@type': 'Organization', name: 'GoMentorGo', url: 'https://gomentorgo.com' },
    publisher: { '@type': 'Organization', name: 'GoMentorGo', url: 'https://gomentorgo.com' },
    mainEntityOfPage: `https://gomentorgo.com/guides/${guide.slug}`,
  }

  return (
    <main className="min-h-screen bg-gray-50 px-5 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }} />
      <article className="mx-auto max-w-3xl">
        <nav className="text-sm text-gray-500">
          <Link href="/">首页</Link> <span className="mx-2">/</span> <Link href="/guides">博士申请指南</Link>
        </nav>

        <header className="mt-6 rounded-2xl border bg-white p-7 md:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">GoMentorGo 原创指南</p>
          <h1 className="mt-3 text-3xl font-bold leading-tight">{guide.title}</h1>
          <p className="mt-5 text-lg leading-8 text-gray-600">{guide.intro}</p>
          <p className="mt-5 text-xs text-gray-400">更新于 {guide.updatedAt} · 约 {guide.readingMinutes} 分钟阅读</p>
        </header>

        <div className="mt-6 space-y-5">
          {guide.sections.map(section => (
            <section key={section.heading} className="rounded-2xl border bg-white p-7">
              <h2 className="text-xl font-bold">{section.heading}</h2>
              {section.paragraphs.map(paragraph => (
                <p key={paragraph} className="mt-4 leading-8 text-gray-700">{paragraph}</p>
              ))}
              {section.bullets && (
                <ul className="mt-4 list-disc space-y-2 pl-6 leading-7 text-gray-700">
                  {section.bullets.map(item => <li key={item}>{item}</li>)}
                </ul>
              )}
            </section>
          ))}
        </div>

        <aside className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm leading-7 text-amber-950">
          本文提供一般性申请规划信息。各学校政策、截止日期、招生方式和资助可能变化，请始终以目标大学当年的官方网站为准。
        </aside>

        <nav className="mt-8 flex flex-wrap gap-3">
          <Link href="/guides" className="rounded-xl border bg-white px-5 py-3 text-sm font-medium">查看更多申请指南</Link>
          <Link href="/academics" className="rounded-xl bg-black px-5 py-3 text-sm font-medium text-white">寻找博士生与博士后</Link>
        </nav>
      </article>
    </main>
  )
}
