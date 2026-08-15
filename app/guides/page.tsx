import type { Metadata } from 'next'
import Link from 'next/link'
import { GUIDES } from '@/app/lib/guides'

export const metadata: Metadata = {
  title: '博士申请指南｜选校、套磁与研究计划',
  description: 'GoMentorGo原创博士申请指南，涵盖选校、研究匹配、联系博士生、套磁、研究计划及多个专业方向。',
  keywords: ['博士申请指南', '博士选校', '博士套磁', '研究计划', '留学申请'],
  alternates: { canonical: '/guides' },
}

export default function GuidesPage() {
  return (
    <main className="min-h-screen bg-gray-50 px-5 py-10">
      <div className="mx-auto max-w-5xl">
        <Link href="/" className="text-sm text-gray-500 hover:text-black">← 返回首页</Link>
        <header className="mt-6 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">GoMentorGo Guides</p>
          <h1 className="mt-2 text-3xl font-bold">博士申请与科研准备指南</h1>
          <p className="mt-4 leading-7 text-gray-600">
            从研究方向、选校和导师匹配开始，逐步准备研究经历、联系邮件与申请材料。内容用于帮助你建立判断框架，不承诺录取、资助或导师回复。
          </p>
        </header>

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          {GUIDES.map(guide => (
            <article key={guide.slug} className="flex flex-col rounded-2xl border bg-white p-6">
              <p className="text-xs text-gray-400">约 {guide.readingMinutes} 分钟阅读</p>
              <h2 className="mt-2 text-xl font-semibold leading-8">
                <Link href={`/guides/${guide.slug}`} className="hover:underline">{guide.title}</Link>
              </h2>
              <p className="mt-3 flex-1 text-sm leading-6 text-gray-600">{guide.description}</p>
              <Link href={`/guides/${guide.slug}`} className="mt-5 text-sm font-medium text-black underline underline-offset-4">
                阅读完整指南 →
              </Link>
            </article>
          ))}
        </section>

        <section className="mt-10 rounded-2xl bg-black p-6 text-white">
          <h2 className="text-xl font-semibold">想寻找同专业的在读博士生或博士后？</h2>
          <p className="mt-2 text-sm leading-6 text-gray-300">浏览大学官网公开的学术联系人，联系前请阅读对方研究并发送个性化邮件。</p>
          <Link href="/academics" className="mt-4 inline-block rounded-xl bg-white px-5 py-3 text-sm font-medium text-black">查看学术联系人目录</Link>
        </section>
      </div>
    </main>
  )
}
