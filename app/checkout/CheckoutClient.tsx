'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { Locale } from '@/app/lib/i18n'

type PaymentMethod = 'card' | 'alipay' | 'wechat_pay'
type PaymentMode = 'stripe' | 'manual'

type Props = {
  slotId: string
  utcStart: string
  price: number
  amountFen: number
  platformFeeFen: number
  adviserPayoutFen: number
  adviserId: string
  adviserName: string
  adviserSchool: string
  adviserTimezone: string
  stripeReady: boolean
  paymentMode: PaymentMode
  manualPayment: { contact: string; note: string; qrUrl: string }
  paymentMethods: PaymentMethod[]
  locale: Locale
}

function formatLocalTime(utcStart: string, tz: string): { date: string; time: string; tzLabel: string } {
  const d = new Date(utcStart)
  const date = d.toLocaleDateString(undefined, { timeZone: tz, weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
  const time = d.toLocaleTimeString(undefined, { timeZone: tz, hour: '2-digit', minute: '2-digit' })
  const tzLabel = Intl.DateTimeFormat(undefined, { timeZone: tz, timeZoneName: 'short' })
    .formatToParts(d).find(p => p.type === 'timeZoneName')?.value ?? tz
  return { date, time, tzLabel }
}

const PAYMENT_METHODS = [
  {
    key: 'card',
    icon: '💳',
    label: { zh: '信用卡 / 借记卡', en: 'Credit / Debit Card' },
    sub: { zh: 'Visa, Mastercard, Amex', en: 'Visa, Mastercard, Amex' },
  },
  {
    key: 'alipay',
    icon: '支',
    label: { zh: '支付宝', en: 'Alipay' },
    sub: { zh: '适合中国学生使用', en: 'Popular with Chinese students' },
  },
  {
    key: 'wechat_pay',
    icon: '微',
    label: { zh: '微信支付', en: 'WeChat Pay' },
    sub: { zh: '可使用微信扫码或跳转支付', en: 'Pay with WeChat on web' },
  },
] satisfies Array<{
  key: PaymentMethod
  icon: string
  label: { zh: string; en: string }
  sub: { zh: string; en: string }
}>

export default function CheckoutClient({
  slotId, utcStart, price, amountFen, platformFeeFen, adviserPayoutFen,
  adviserName, adviserSchool, adviserTimezone, stripeReady, paymentMode, manualPayment, paymentMethods, locale,
}: Props) {
  const zh = locale === 'zh'
  const [studentTz, setStudentTz]   = useState<string>('UTC')
  const [isPaying, setIsPaying]     = useState(false)
  const [error, setError]           = useState('')

  useEffect(() => {
    try { setStudentTz(Intl.DateTimeFormat().resolvedOptions().timeZone) } catch {}
  }, [])

  const adviser = formatLocalTime(utcStart, adviserTimezone)
  const student = formatLocalTime(utcStart, studentTz)
  const sameZone = studentTz === adviserTimezone
  const visiblePaymentMethods = PAYMENT_METHODS.filter(method => paymentMethods.includes(method.key))
  const isManualPayment = paymentMode === 'manual'

  async function handlePay() {
    setError('')
    setIsPaying(true)
    try {
      const res  = await fetch(isManualPayment ? '/api/manual-checkout' : '/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slotId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setError(data.error ?? (zh ? '支付初始化失败' : 'Payment failed to initialize')); return }
      window.location.href = data.url
    } catch {
      setError(zh ? '网络错误，请重试' : 'Network error, please try again')
    } finally {
      setIsPaying(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">

        {/* Header */}
        <div className="text-center">
          <h1 className="text-xl font-bold">{zh ? '预约结算' : 'Checkout'}</h1>
          <p className="text-sm text-gray-400 mt-1">{zh ? '请确认预约信息后付款' : 'Review your booking before payment'}</p>
        </div>

        {/* Booking summary */}
        <div className="bg-white rounded-2xl border shadow-sm p-5 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold">{adviserName}</p>
              <p className="text-sm text-gray-500">{adviserSchool}</p>
            </div>
            <span className="text-xs bg-gray-100 rounded-full px-3 py-1">30 {zh ? '分钟' : 'min'}</span>
          </div>

          {/* Time */}
          <div className="rounded-xl bg-blue-50 border border-blue-100 p-3 space-y-1.5">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-base">📅</span>
              <div>
                <p className="font-medium text-blue-900">{student.date} · {student.time}</p>
                <p className="text-xs text-blue-500">{student.tzLabel} {zh ? '（你的本地时间）' : '(your local time)'}</p>
              </div>
            </div>
            {!sameZone && (
              <div className="flex items-center gap-2 text-xs text-blue-400 pl-7">
                <span>{zh ? `导师时间：${adviser.date} ${adviser.time} (${adviser.tzLabel})` : `Mentor's time: ${adviser.date} ${adviser.time} (${adviser.tzLabel})`}</span>
              </div>
            )}
          </div>

          {/* Price breakdown */}
          <div className="border-t pt-3 space-y-1.5 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>{zh ? '咨询费' : 'Consultation fee'}</span>
              <span>¥{price.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-gray-400 text-xs">
              <span>{zh ? '平台服务费（已包含）' : 'Platform fee (included)'}</span>
              <span>¥{(platformFeeFen / 100).toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-semibold text-base border-t pt-2 mt-2">
              <span>{zh ? '合计' : 'Total'}</span>
              <span>¥{(amountFen / 100).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Payment methods */}
        <div className="bg-white rounded-2xl border shadow-sm p-5">
          <p className="text-xs text-gray-400 font-medium mb-3 uppercase tracking-wide">
            {zh ? '支持的支付方式' : 'Accepted payment methods'}
          </p>
          {isManualPayment ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 text-sm font-semibold text-gray-700">
                  收
                </span>
                <div>
                  <p className="font-medium">{zh ? '微信 / 支付宝人工付款' : 'Manual WeChat / Alipay payment'}</p>
                  <p className="text-xs text-gray-400">
                    {zh ? '提交预约后，平台人工确认付款' : 'Submit the booking, then the platform confirms payment manually'}
                  </p>
                </div>
              </div>
              {manualPayment.contact && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
                  {zh ? '收款联系：' : 'Payment contact: '}
                  <span className="font-semibold">{manualPayment.contact}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {visiblePaymentMethods.map(m => (
                <div key={m.label.en} className="flex items-center gap-3 text-sm">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 text-sm font-semibold text-gray-700">
                    {m.icon}
                  </span>
                  <div>
                    <p className="font-medium">{zh ? m.label.zh : m.label.en}</p>
                    <p className="text-xs text-gray-400">{zh ? m.sub.zh : m.sub.en}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-gray-400 mt-3 border-t pt-3">
            {isManualPayment
              ? (zh ? '平台确认收款后，预约订单会进入已付款状态' : 'After payment is confirmed, the booking becomes paid.')
              : (zh ? '付款通过 Stripe 安全处理，平台不储存你的支付信息' : 'Payments are securely processed by Stripe. We never store your payment details.')}
          </p>
        </div>

        {/* Commission info */}
        <div className="rounded-xl bg-gray-50 border px-4 py-2.5 text-xs text-gray-500 space-y-0.5">
          <p>
            {zh
              ? `· 导师到账：¥${(adviserPayoutFen / 100).toLocaleString()}（平台收取 10% 服务费）`
              : `· Mentor receives: ¥${(adviserPayoutFen / 100).toLocaleString()} (platform keeps 10% service fee)`}
          </p>
          {isManualPayment ? (
            <p>{zh ? '· 当前为人工确认付款模式' : '· Current mode: manual payment confirmation'}</p>
          ) : (
            <p>{zh ? '· Stripe 处理费由平台承担' : '· Stripe processing fees are covered by the platform'}</p>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Not Stripe-ready warning */}
        {!stripeReady && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
            {zh ? '该导师尚未设置 Stripe 收款账户，暂时无法支付。' : "This mentor hasn't connected a Stripe payout account yet."}
          </div>
        )}

        {/* Pay button */}
        <button
          onClick={handlePay}
          disabled={isPaying || !stripeReady}
          className="w-full rounded-xl bg-black py-3.5 text-sm font-semibold text-white disabled:opacity-40 hover:bg-gray-800 transition"
        >
          {isPaying
            ? (isManualPayment
                ? (zh ? '正在提交预约…' : 'Submitting booking…')
                : (zh ? '正在跳转至 Stripe 支付…' : 'Redirecting to Stripe…'))
            : (isManualPayment
                ? (zh ? `提交预约并查看付款方式 ¥${price.toLocaleString()}` : `Submit booking ¥${price.toLocaleString()}`)
                : (zh ? `确认支付 ¥${price.toLocaleString()}` : `Pay ¥${price.toLocaleString()}`))}
        </button>

        <Link href="/dashboard/applicant"
          className="block text-center text-sm text-gray-400 hover:text-gray-700 transition">
          {zh ? '取消，返回导师列表' : 'Cancel, back to mentors'}
        </Link>
      </div>
    </div>
  )
}
