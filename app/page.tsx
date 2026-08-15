import Link from 'next/link'
import { getSession } from '@/app/lib/session'
import { logout } from '@/app/actions/auth'
import { getDict } from '@/app/lib/i18n'
import { getLocale } from '@/app/lib/locale'
import LanguageSwitcher from '@/app/components/LanguageSwitcher'

export default async function HomePage() {
  const [session, locale] = await Promise.all([getSession(), getLocale()])
  const d = getDict(locale)

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-6">
      <header className="mx-auto max-w-5xl flex items-center justify-between mb-20">
        <span className="font-bold text-lg">{d.common.platformName}</span>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          {session ? (
            <>
              <Link
                href={session.role === 'adviser' ? '/dashboard/adviser' : '/dashboard/applicant'}
                className="text-sm text-gray-600 hover:text-black transition"
              >
                {session.name}{d.home.myPage}
              </Link>
              <form action={logout}>
                <button
                  type="submit"
                  className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-100 transition"
                >
                  {d.common.logout}
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm text-gray-600 hover:text-black transition">
                {d.common.login}
              </Link>
              <Link
                href="/register"
                className="rounded-xl bg-black px-4 py-2 text-sm text-white hover:bg-gray-800 transition"
              >
                {d.common.register}
              </Link>
            </>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-5xl">
        <h1 className="mb-6 whitespace-pre-line text-4xl font-bold leading-tight">{d.home.title}</h1>
        <p className="mb-8 text-lg text-gray-600">{d.home.subtitle}</p>
        <p className="mb-4 max-w-2xl text-sm text-gray-500">{d.home.roleHint}</p>

        <div className="flex flex-wrap gap-4">
          {session?.role === 'applicant' ? (
            <Link href="/dashboard/applicant"
              className="rounded-xl bg-black px-6 py-3 text-white text-sm font-medium hover:bg-gray-800 transition">
              {d.home.browseMentors}
            </Link>
          ) : (
            <Link href="/register/applicant"
              className="rounded-xl bg-black px-6 py-3 text-white text-sm font-medium hover:bg-gray-800 transition">
              {d.home.browseMentors}
            </Link>
          )}
          {session?.role === 'adviser' ? (
            <Link href="/dashboard/adviser"
              className="rounded-xl border px-6 py-3 text-sm font-medium hover:bg-gray-100 transition">
              {locale === 'zh' ? '我的主页' : 'My Profile'}
            </Link>
          ) : (
            <Link href="/register/adviser"
              className="rounded-xl border px-6 py-3 text-sm font-medium hover:bg-gray-100 transition">
              {d.home.becomeMentor}
            </Link>
          )}
          <Link
            href="/academics"
            className="rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-medium hover:bg-gray-100 transition"
          >
            {locale === 'zh' ? '查找美国博士生与博士后' : 'Find US PhD students & postdocs'}
          </Link>
          <Link
            href="/guides"
            className="rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-medium hover:bg-gray-100 transition"
          >
            {locale === 'zh' ? '阅读博士申请指南' : 'Read PhD application guides'}
          </Link>
        </div>

        <section className="mt-16 border-t pt-10">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">Application Guides</p>
              <h2 className="mt-2 text-2xl font-bold">{locale === 'zh' ? '博士申请实用指南' : 'Practical PhD application guides'}</h2>
            </div>
            <Link href="/guides" className="text-sm underline underline-offset-4">{locale === 'zh' ? '查看全部' : 'View all'}</Link>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <Link href="/guides/find-phd-students" className="rounded-2xl border bg-white p-5 hover:bg-gray-100">
              <h3 className="font-semibold">{locale === 'zh' ? '如何寻找同专业博士生' : 'How to find PhD contacts'}</h3>
              <p className="mt-2 text-sm leading-6 text-gray-500">{locale === 'zh' ? '从大学官网寻找并礼貌联系研究匹配的人。' : 'Find and respectfully contact research-matched people.'}</p>
            </Link>
            <Link href="/guides/phd-application-guide" className="rounded-2xl border bg-white p-5 hover:bg-gray-100">
              <h3 className="font-semibold">{locale === 'zh' ? '博士申请完整准备指南' : 'Complete PhD application guide'}</h3>
              <p className="mt-2 text-sm leading-6 text-gray-500">{locale === 'zh' ? '研究方向、选校、材料与提交前检查。' : 'Research direction, programs, materials, and review.'}</p>
            </Link>
            <Link href="/guides/cs-phd" className="rounded-2xl border bg-white p-5 hover:bg-gray-100">
              <h3 className="font-semibold">{locale === 'zh' ? 'CS博士申请与套磁' : 'CS PhD applications and outreach'}</h3>
              <p className="mt-2 text-sm leading-6 text-gray-500">{locale === 'zh' ? '用研究问题、项目证据和具体邮件建立匹配。' : 'Build fit through questions, evidence, and specific outreach.'}</p>
            </Link>
          </div>
        </section>
      </div>

      <footer className="mx-auto max-w-5xl mt-24 pt-6 border-t flex flex-wrap items-center justify-between gap-4 text-xs text-gray-400">
        <span>© {new Date().getFullYear()} {d.common.platformName}</span>
        <div className="flex gap-5">
          <Link href="/terms"   className="hover:text-black transition">{locale === 'zh' ? '服务条款' : 'Terms'}</Link>
          <Link href="/privacy" className="hover:text-black transition">{locale === 'zh' ? '隐私政策' : 'Privacy'}</Link>
          <Link href="/contact" className="hover:text-black transition">{locale === 'zh' ? '联系我们' : 'Contact'}</Link>
          <Link href="/academics" className="hover:text-black transition">{locale === 'zh' ? '学术联系人' : 'Academic contacts'}</Link>
          <Link href="/guides" className="hover:text-black transition">{locale === 'zh' ? '申请指南' : 'Guides'}</Link>
        </div>
      </footer>
    </div>
  )
}
