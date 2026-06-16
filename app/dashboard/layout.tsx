import Link from 'next/link'
import { getSession } from '@/app/lib/session'
import { logout } from '@/app/actions/auth'
import { redirect } from 'next/navigation'
import { getDict } from '@/app/lib/i18n'
import { getLocale } from '@/app/lib/locale'
import LanguageSwitcher from '@/app/components/LanguageSwitcher'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [session, locale] = await Promise.all([getSession(), getLocale()])
  if (!session) redirect('/login')

  const d = getDict(locale)
  const badge = session.role === 'adviser' ? d.dashboard.adviserBadge : d.dashboard.studentBadge

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-lg font-bold">{d.common.platformName}</Link>
        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          <span className="text-sm text-gray-600">{badge} · {session.name}</span>
          <form action={logout}>
            <button type="submit" className="text-sm text-gray-500 hover:text-black transition">
              {d.common.logout}
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
    </div>
  )
}
