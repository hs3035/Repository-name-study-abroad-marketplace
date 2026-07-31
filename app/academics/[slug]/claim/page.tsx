import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getLocale } from '@/app/lib/locale'
import { getPublicAcademic, PUBLIC_ACADEMICS } from '@/app/lib/public-academics'

export function generateStaticParams() {
  return PUBLIC_ACADEMICS.map(person => ({ slug: person.slug }))
}

export const metadata: Metadata = {
  title: '认领学术资料',
  description: '验证学校邮箱并认领 GoMentorGo 公共学术目录资料。',
  robots: { index: false, follow: true },
}

export default async function ClaimAcademicProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const person = getPublicAcademic((await params).slug)
  if (!person) notFound()
  const zh = (await getLocale()) === 'zh'

  return (
    <main className="min-h-screen bg-gray-50 px-5 py-10">
      <div className="mx-auto max-w-2xl">
        <Link href={`/academics/${person.slug}`} className="text-sm text-gray-500 hover:text-black">
          ← {zh ? '返回资料页' : 'Back to profile'}
        </Link>

        <section className="mt-5 rounded-2xl border bg-white p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">Profile claim</p>
          <h1 className="mt-2 text-2xl font-bold">
            {zh ? `认领 ${person.name} 的资料` : `Claim ${person.name}'s profile`}
          </h1>
          <p className="mt-3 text-sm leading-6 text-gray-600">
            {zh
              ? `为了避免冒领，我们会优先使用资料中公开的学校邮箱 ${person.email} 核对身份。认领后，你可以修改介绍、选择是否接收联系，并决定是否申请成为平台导师。`
              : `To prevent impersonation, we will verify ownership using the listed university email, ${person.email}. After claiming, you can edit the profile, set contact preferences, and decide whether to apply as a platform mentor.`}
          </p>

          <ol className="mt-6 space-y-4 text-sm leading-6 text-gray-700">
            <li className="rounded-xl bg-gray-50 p-4">
              <strong>{zh ? '第一步：注册导师账户' : 'Step 1: Create an adviser account'}</strong>
              <p className="mt-1 text-gray-600">
                {zh ? '请尽量使用上面的学校邮箱注册，以便快速完成身份核对。注册本身不代表你必须提供付费服务。' : 'Use the university email above when possible. Registration does not obligate you to offer paid services.'}
              </p>
            </li>
            <li className="rounded-xl bg-gray-50 p-4">
              <strong>{zh ? '第二步：提交认领请求' : 'Step 2: Send a claim request'}</strong>
              <p className="mt-1 text-gray-600">
                {zh ? `注册后通过“联系我们”提交：姓名 ${person.name}、注册邮箱及本资料页地址。平台核对后会把资料与账户关联。` : `After registering, contact us with the name ${person.name}, your account email, and this profile URL. We will review and link the profile to your account.`}
              </p>
            </li>
          </ol>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/register/adviser" className="rounded-xl bg-black px-5 py-3 text-sm font-medium text-white hover:bg-gray-800">
              {zh ? '注册导师账户' : 'Create adviser account'}
            </Link>
            <Link href="/contact" className="rounded-xl border px-5 py-3 text-sm font-medium hover:bg-gray-50">
              {zh ? '提交认领请求' : 'Submit claim request'}
            </Link>
          </div>
        </section>
      </div>
    </main>
  )
}
