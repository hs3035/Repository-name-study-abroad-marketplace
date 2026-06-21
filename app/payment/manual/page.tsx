import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getLocale } from '@/app/lib/locale'
import { getOrderById } from '@/app/lib/orders'
import { getManualPaymentConfig } from '@/app/lib/payment-mode'
import { getSession } from '@/app/lib/session'
import ManualPaymentSelector from './ManualPaymentSelector'

type Props = { searchParams: Promise<{ orderId?: string }> }

export default async function ManualPaymentPage({ searchParams }: Props) {
  const [session, locale] = await Promise.all([getSession(), getLocale()])
  if (!session || session.role !== 'applicant') redirect('/login')

  const { orderId } = await searchParams
  if (!orderId) redirect('/dashboard/applicant')

  const order = getOrderById(orderId)
  if (!order || order.applicantId !== session.userId) redirect('/dashboard/applicant')

  const zh = locale === 'zh'
  const manual = getManualPaymentConfig()

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl border shadow-sm p-6 space-y-5">
        <div className="text-center space-y-2">
          <div className="text-4xl">✅</div>
          <h1 className="text-xl font-bold">
            {zh ? '预约已提交，等待人工确认付款' : 'Booking submitted, awaiting manual payment confirmation'}
          </h1>
          <p className="text-sm text-gray-500">
            {zh
              ? '请使用微信或支付宝完成付款。平台确认后，导师会看到已付款订单。'
              : 'Please pay with WeChat or Alipay. After confirmation, the mentor will see the paid order.'}
          </p>
        </div>

        <div className="rounded-xl bg-gray-50 border p-4 space-y-2 text-sm">
          <Row label={zh ? '导师' : 'Mentor'} value={order.adviserName} />
          <Row label={zh ? '金额' : 'Amount'} value={`¥${(order.amountFen / 100).toLocaleString()}`} />
          <Row label={zh ? '订单号' : 'Order ID'} value={order.id} />
          <Row
            label={zh ? '预约时间（UTC）' : 'Time (UTC)'}
            value={new Date(order.utcSlotStart).toLocaleString(zh ? 'zh-CN' : 'en-US', { timeZone: 'UTC' })}
          />
        </div>

        <ManualPaymentSelector
          locale={locale}
          orderId={order.id}
          contact={manual.contact}
          note={manual.note}
          wechatQrUrl={manual.wechatQrUrl}
          alipayQrUrl={manual.alipayQrUrl}
        />

        <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 text-xs text-blue-700">
          {zh
            ? '如果你已经付款，请稍等平台人工确认。确认后订单状态会变成“已付款”，导师即可开始服务。'
            : 'If you have already paid, please wait for manual platform confirmation. The order will become paid once confirmed.'}
        </div>

        <Link
          href="/dashboard/applicant"
          className="block w-full rounded-xl bg-black text-white text-center py-3 text-sm font-semibold hover:bg-gray-800 transition"
        >
          {zh ? '返回我的订单' : 'Back to my orders'}
        </Link>
      </div>
    </main>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-gray-500">{label}</span>
      <span className="text-right font-medium text-gray-900 break-all">{value}</span>
    </div>
  )
}
