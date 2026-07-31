import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getLocale } from '@/app/lib/locale'
import { getPublicAcademic, PUBLIC_ACADEMICS } from '@/app/lib/public-academics'

export function generateStaticParams() {
  return PUBLIC_ACADEMICS.map(person => ({ slug: person.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const person = getPublicAcademic((await params).slug)
  if (!person) return { title: '学术联系人' }

  return {
    title: `${person.name}｜${person.institution} ${person.role}`,
    description: `${person.name}，${person.institution} ${person.role}，研究方向：${person.researchAreas.join('、')}。`,
    alternates: { canonical: `/academics/${person.slug}` },
  }
}

function emailHref(name: string, email: string, institution: string, zh: boolean) {
  const subject = zh
    ? `关于您在 ${institution} 的研究——来自一位研究生申请者`
    : `Question about your research at ${institution} from a prospective graduate student`
  const body = zh
    ? `您好 ${name}，\n\n我在 ${institution} 官网和 GoMentorGo 的公开学术联系人目录中了解到您的研究。\n\n[请在这里用 2–3 句话介绍你的背景、与对方研究的具体关联，以及一个清晰的问题。]\n\n感谢您抽出时间阅读。若不方便回复也完全理解。\n\n祝好，\n[你的姓名]`
    : `Hi ${name},\n\nI found your research through the ${institution} website and GoMentorGo's public academic directory.\n\n[In 2–3 sentences, introduce your background, explain the specific research connection, and ask one clear question.]\n\nThank you for your time. I completely understand if you are unable to respond.\n\nBest,\n[Your name]`

  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

export default async function AcademicProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const person = getPublicAcademic((await params).slug)
  if (!person) notFound()
  const zh = (await getLocale()) === 'zh'

  return (
    <main className="min-h-screen bg-gray-50 px-5 py-8">
      <div className="mx-auto max-w-3xl space-y-5">
        <Link href="/academics" className="text-sm text-gray-500 hover:text-black">
          ← {zh ? '返回学术联系人目录' : 'Back to directory'}
        </Link>

        <section className="rounded-2xl border bg-white p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">
                Public academic contact
              </p>
              <h1 className="text-2xl font-bold">{person.name}</h1>
              <p className="mt-2 text-sm text-gray-600">{person.role} · {person.department}</p>
              <p className="mt-1 text-sm text-gray-500">{person.institution} · {person.location}</p>
            </div>
            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-800">
              {zh ? '公开资料 · 尚未认领' : 'Public source · Unclaimed'}
            </span>
          </div>
        </section>

        <section className="rounded-2xl border bg-white p-6">
          <h2 className="font-semibold">{zh ? '研究方向' : 'Research interests'}</h2>
          <p className="mt-3 text-sm leading-7 text-gray-600">
            {zh ? person.summaryZh : person.summaryEn}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {person.researchAreas.map(area => (
              <span key={area} className="rounded-full border px-3 py-1 text-xs text-gray-600">{area}</span>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border bg-white p-6">
          <h2 className="font-semibold">{zh ? '通过学校邮箱联系' : 'Contact via university email'}</h2>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            {zh
              ? '点击按钮会打开你的邮件应用并生成一份可修改的邮件草稿。请先阅读官方主页，并针对对方的具体研究修改内容。'
              : 'The button opens a customizable draft in your email app. Read the official profile and personalize the message before sending.'}
          </p>
          <p className="mt-4 break-all rounded-xl bg-gray-50 px-4 py-3 font-mono text-sm">{person.email}</p>
          <a
            href={emailHref(person.name, person.email, person.institution, zh)}
            className="mt-4 inline-flex rounded-xl bg-black px-5 py-3 text-sm font-medium text-white hover:bg-gray-800"
          >
            {zh ? '写一封个性化邮件' : 'Write a personalized email'}
          </a>
        </section>

        <section className="rounded-2xl border bg-white p-6 text-sm leading-6 text-gray-600">
          <h2 className="font-semibold text-gray-900">{zh ? '信息来源与说明' : 'Source and notice'}</h2>
          <p className="mt-2">
            {zh
              ? '此页面根据大学官网公开的专业信息整理，不是该人士创建的平台账户，也不表示其认可 GoMentorGo、接受申请咨询或承诺回复。'
              : 'This page summarizes public professional information from a university website. It is not an account created by this person and does not imply endorsement, advising availability, or a promise to reply.'}
          </p>
          <a
            href={person.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block text-blue-700 underline"
          >
            {person.sourceLabel} ↗
          </a>
          <p className="mt-2 text-xs text-gray-400">
            {zh ? '最后核对日期' : 'Last checked'}：{person.checkedAt}
          </p>
          <p className="mt-4 text-xs">
            {zh ? (
              <>本人可通过 <Link href="/contact" className="underline">联系我们</Link> 申请认领、更正或删除此页面。</>
            ) : (
              <>The person listed may <Link href="/contact" className="underline">contact us</Link> to claim, correct, or remove this page.</>
            )}
          </p>
        </section>
      </div>
    </main>
  )
}
