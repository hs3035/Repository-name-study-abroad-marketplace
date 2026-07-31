import type { Metadata } from 'next'
import Link from 'next/link'
import { getLocale } from '@/app/lib/locale'
import { PUBLIC_ACADEMICS } from '@/app/lib/public-academics'

export const metadata: Metadata = {
  title: '美国博士生与博士后学术联系人',
  description: '浏览美国大学官网公开的博士生与博士后研究方向、学校邮箱和官方资料来源。',
  alternates: { canonical: '/academics' },
}

export default async function AcademicsPage() {
  const zh = (await getLocale()) === 'zh'
  const fieldGroups = [
    {
      key: 'Speech & Language' as const,
      zh: '言语、语言与认知科学',
      en: 'Speech, Language & Cognitive Science',
    },
    {
      key: 'Art & Visual Culture' as const,
      zh: '艺术史与视觉文化',
      en: 'Art History & Visual Culture',
    },
    {
      key: 'Bioengineering & Biomedical Engineering' as const,
      zh: '生物工程与生物医学工程',
      en: 'Bioengineering & Biomedical Engineering',
    },
    {
      key: 'Computer Science' as const,
      zh: '计算机科学',
      en: 'Computer Science',
    },
  ]

  return (
    <main className="min-h-screen bg-gray-50 px-5 py-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8">
          <Link href="/" className="text-sm text-gray-500 hover:text-black">← {zh ? '返回首页' : 'Home'}</Link>
          <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                GoMentorGo Academic Directory
              </p>
              <h1 className="text-3xl font-bold">{zh ? '美国博士生与博士后学术联系人' : 'US PhD & Postdoc Directory'}</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
                {zh
                  ? '资料来自大学公开网页，方便申请者按研究方向寻找学术联系人。这里的联系人尚未加入或认可 GoMentorGo，也不代表对方提供申请辅导。'
                  : 'Profiles come from public university pages. Listed researchers have not joined or endorsed GoMentorGo and are not represented as application advisers.'}
              </p>
            </div>
            <span className="rounded-full border bg-white px-4 py-2 text-xs text-gray-600">
              {PUBLIC_ACADEMICS.length} {zh ? '位公开联系人' : 'public contacts'}
            </span>
          </div>
        </header>

        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          {zh
            ? '联系前请先阅读对方的官方主页，写一封与其研究相关的个性化邮件。请勿群发、索要私人信息或假设对方愿意提供免费咨询。'
            : 'Read the official profile before contacting anyone. Send a personalized, research-relevant message; do not mass-email or assume free advising.'}
        </div>

        <div className="space-y-10">
          {fieldGroups.map(group => {
            const people = PUBLIC_ACADEMICS.filter(person => person.field === group.key)
            return (
              <section key={group.key}>
                <div className="mb-4 flex items-center justify-between gap-4 border-b pb-3">
                  <h2 className="text-xl font-bold">{zh ? group.zh : group.en}</h2>
                  <span className="text-xs text-gray-500">{people.length} {zh ? '位联系人' : 'contacts'}</span>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {people.map(person => (
                    <article key={person.slug} className="flex flex-col rounded-2xl border bg-white p-5">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">{person.name}</h2>
                  <p className="mt-1 text-sm text-gray-600">{person.institution} · {person.department}</p>
                </div>
                <span className="shrink-0 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700">
                  {person.role}
                </span>
              </div>
              <p className="mb-4 text-sm leading-6 text-gray-600">
                {zh ? person.summaryZh : person.summaryEn}
              </p>
              <div className="mb-5 flex flex-wrap gap-1.5">
                {person.researchAreas.map(area => (
                  <span key={area} className="rounded-full border px-2.5 py-1 text-xs text-gray-600">{area}</span>
                ))}
              </div>
              <div className="mt-auto flex gap-2">
                <Link
                  href={`/academics/${person.slug}`}
                  className="flex-1 rounded-xl bg-black px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-gray-800"
                >
                  {zh ? '查看资料与联系' : 'View & contact'}
                </Link>
                <a
                  href={person.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl border px-4 py-2.5 text-sm font-medium hover:bg-gray-50"
                >
                  {zh ? '官方来源 ↗' : 'Source ↗'}
                </a>
              </div>
                    </article>
                  ))}
                </div>
              </section>
            )
          })}
        </div>

        <footer className="mt-10 border-t pt-6 text-xs leading-5 text-gray-500">
          {zh ? (
            <>本人希望认领、更正或删除资料？请通过 <Link href="/contact" className="underline hover:text-black">联系我们</Link> 提交请求。</>
          ) : (
            <>Want to claim, correct, or remove a profile? <Link href="/contact" className="underline hover:text-black">Contact us</Link>.</>
          )}
        </footer>
      </div>
    </main>
  )
}
