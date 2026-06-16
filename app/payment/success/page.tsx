import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/app/lib/session'
import { getOrderByStripeSession } from '@/app/lib/orders'
import { getLocale } from '@/app/lib/locale'

type Props = { searchParams: Promise<{ session_id?: string }> }

export default async function PaymentSuccessPage({ searchParams }: Props) {
  const session = await getSession()
  if (!session) redirect('/login')

  const { session_id } = await searchParams
  const locale = await getLocale()
  const zh = locale === 'zh'

  const order = session_id ? getOrderByStripeSession(session_id) : undefined

  const dashboardHref =
    session.role === 'adviser' ? '/dashboard/adviser' : '/dashboard/applicant'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-2xl shadow-sm border w-full max-w-md p-8 text-center space-y-4">

        {order?.status === 'paid' ? (
          <>
            <div className="text-5xl">✅</div>
            <h1 className="text-xl font-bold">
              {zh ? '支付成功！预约已确认' : 'Payment successful! Booking confirmed'}
            </h1>
            <div className="text-sm text-gray-500 space-y-1 text-left bg-gray-50 rounded-xl p-4">
              <div className="flex justify-between">
                <span>{zh ? '导师' : 'Mentor'}</span>
                <span className="font-medium">{order.adviserName}</span>
              </div>
              <div className="flex justify-between">
                <span>{zh ? '金额' : 'Amount'}</span>
                <span className="font-medium">¥{(order.amountFen / 100).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>{zh ? '预约时间（UTC）' : 'Slot time (UTC)'}</span>
                <span className="font-medium text-xs">
                  {new Date(order.utcSlotStart).toLocaleString(zh ? 'zh-CN' : 'en-US')}
                </span>
              </div>
            </div>
          </>
        ) : order?.status === 'pending' || order?.status === 'pending_payment' ? (
          <>
            <div className="text-5xl">⏳</div>
            <h1 className="text-xl font-bold">
              {zh ? '支付处理中…' : 'Processing payment…'}
            </h1>
            <p className="text-sm text-gray-500">
              {zh
                ? '系统正在确认你的预约，请稍候片刻后刷新页面。'
                : 'Your booking is being confirmed. Refresh in a moment.'}
            </p>
          </>
        ) : (
          <>
            <div className="text-5xl">⚠️</div>
            <h1 className="text-xl font-bold">
              {zh ? '未找到订单' : 'Order not found'}
            </h1>
            <p className="text-sm text-gray-500">
              {zh
                ? '如已付款，预约将在几分钟内确认。如有疑问请联系客服。'
                : 'If payment was made, your booking will be confirmed shortly. Contact support if the issue persists.'}
            </p>
          </>
        )}

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
