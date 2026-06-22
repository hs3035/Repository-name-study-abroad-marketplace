import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getLocale } from '@/app/lib/locale'
import { isAdminSession } from '@/app/lib/payment-mode'
import { getSession } from '@/app/lib/session'
import AdminAdvisersPanel from './AdminAdvisersPanel'
import AdminOrdersPanel from './AdminOrdersPanel'
import AdminStudentsPanel from './AdminStudentsPanel'

export default async function AdminPage() {
  const [session, locale] = await Promise.all([getSession(), getLocale()])
  if (!session) redirect('/login')

  const isAdmin = isAdminSession(session)
  const zh = locale === 'zh'

  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border bg-white p-8 text-center shadow-sm space-y-4">
          <div className="text-4xl">🔒</div>
          <h1 className="text-xl font-bold">{zh ? '无权访问管理后台' : 'Admin access required'}</h1>
          <p className="text-sm text-gray-500">
            {zh ? '请使用管理员邮箱登录后再打开此页面。' : 'Please sign in with an admin email to view this page.'}
          </p>
          <Link href="/" className="inline-block rounded-xl bg-black px-5 py-2.5 text-sm font-medium text-white">
            {zh ? '返回首页' : 'Back home'}
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{zh ? '平台管理后台' : 'Platform admin'}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {zh ? '查看订单、学生和导师数据，并处理人工付款与结算。' : 'View orders, students, mentors, and handle manual payments and payouts.'}
            </p>
          </div>
          <Link href="/" className="rounded-xl border bg-white px-4 py-2 text-sm hover:bg-gray-50">
            {zh ? '返回网站' : 'Back to site'}
          </Link>
        </div>

        <AdminOrdersPanel locale={locale} />
        <AdminStudentsPanel locale={locale} />
        <AdminAdvisersPanel locale={locale} />
      </div>
    </main>
  )
}
