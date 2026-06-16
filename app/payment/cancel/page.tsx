import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/app/lib/session'
import { getLocale } from '@/app/lib/locale'

export default async function PaymentCancelPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const locale = await getLocale()
  const zh = locale === 'zh'
  const dashboardHref =
    session.role === 'adviser' ? '/dashboard/adviser' : '/dashboard/applicant'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-2xl shadow-sm border w-full max-w-md p-8 text-center space-y-4">
        <div className="text-5xl">❌</div>
        <h1 className="text-xl font-bold">
          {zh ? '支付已取消' : 'Payment cancelled'}
        </h1>
        <p className="text-sm text-gray-500">
          {zh
            ? '你已取消本次支付，时间段仍然可以重新预约。'
            : 'You cancelled the payment. The time slot is still available for booking.'}
        </p>
        <Link
          href={dashboardHref}
          className="inline-block mt-2 w-full rounded-xl bg-black py-2.5 text-sm font-medium text-white hover:bg-gray-800 transition"
        >
          {zh ? '返回控制台' : 'Back to Dashboard'}
        </Link>
      </div>
    </div>
  )
}
