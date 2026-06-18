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

        <div className="flex gap-4">
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
        </div>
      </div>

      <footer className="mx-auto max-w-5xl mt-24 pt-6 border-t flex flex-wrap items-center justify-between gap-4 text-xs text-gray-400">
        <span>© {new Date().getFullYear()} {d.common.platformName}</span>
        <div className="flex gap-5">
          <Link href="/terms"   className="hover:text-black transition">{locale === 'zh' ? '服务条款' : 'Terms'}</Link>
          <Link href="/privacy" className="hover:text-black transition">{locale === 'zh' ? '隐私政策' : 'Privacy'}</Link>
          <Link href="/contact" className="hover:text-black transition">{locale === 'zh' ? '联系我们' : 'Contact'}</Link>
        </div>
      </footer>
    </div>
  )
}
