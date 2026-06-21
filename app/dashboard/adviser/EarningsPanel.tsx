'use client'

import { useCallback, useState, useEffect, useTransition } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  fetchAdviserEarnings,
  fetchAdviserOrders,
  adviserMarkComplete,
} from '@/app/actions/payments'
import { submitReview, fetchOrderReviewStatus } from '@/app/actions/reviews'
import type { Order } from '@/app/lib/orders'
import type { Locale } from '@/app/lib/i18n'
import type { PaymentMode } from '@/app/lib/payment-mode'

function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button" onClick={() => onChange(n)}
          className={`text-xl transition ${n <= value ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-300'}`}>
          ★
        </button>
      ))}
    </div>
  )
}

function ReviewForm({
  orderId, zh, onDone,
}: { orderId: string; zh: boolean; onDone: () => void }) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, startSubmit] = useTransition()
  const [err, setErr] = useState('')

  function handleSubmit() {
    if (rating === 0) { setErr(zh ? '请先选择星级' : 'Please select a rating'); return }
    startSubmit(async () => {
      const res = await submitReview(orderId, rating, comment)
      if (res.ok) onDone()
      else setErr(res.error ?? (zh ? '提交失败' : 'Failed'))
    })
  }

  return (
    <div className="rounded-lg bg-gray-50 border px-4 py-3 space-y-3">
      <p className="text-xs font-medium text-gray-700">{zh ? '评价学生' : 'Review this student'}</p>
      <StarPicker value={rating} onChange={setRating} />
      <textarea
        value={comment}
        onChange={e => setComment(e.target.value)}
        rows={2}
        placeholder={zh ? '留下你对学生的印象（选填）' : 'Leave a note about the student (optional)'}
        className="w-full rounded-lg border px-3 py-2 text-xs resize-none outline-none focus:ring-1 focus:ring-black"
      />
      {err && <p className="text-xs text-red-500">{err}</p>}
      <div className="flex gap-2">
        <button onClick={handleSubmit} disabled={submitting}
          className="flex-1 rounded-lg bg-black text-white text-xs font-medium py-2 disabled:opacity-50 hover:bg-gray-800 transition">
          {submitting ? '…' : (zh ? '提交评价' : 'Submit review')}
        </button>
        <button onClick={onDone}
          className="rounded-lg border text-xs px-3 py-2 hover:bg-gray-100 transition">
          {zh ? '跳过' : 'Skip'}
        </button>
      </div>
    </div>
  )
}

type EarningsSummary = {
  totalPaidFen: number
  totalPlatformFeeFen: number
  totalAdviserPayoutFen: number
  paidOrderCount: number
}

type StripeStatus = {
  connected: boolean
  chargesEnabled?: boolean
  payoutsEnabled?: boolean
  detailsSubmitted?: boolean
}

// ── Progress steps ─────────────────────────────────────────────────────────────

type Step = 'paid' | 'in_progress' | 'completed_by_adviser' | 'released'

const STEPS_ZH: Record<Step, string> = {
  paid:                 '已付款',
  in_progress:          '服务中',
  completed_by_adviser: '等待确认',
  released:             '已放款',
}
const STEPS_EN: Record<Step, string> = {
  paid:                 'Paid',
  in_progress:          'In Progress',
  completed_by_adviser: 'Confirming',
  released:             'Released',
}
const STEP_ORDER: Step[] = ['paid', 'in_progress', 'completed_by_adviser', 'released']

function currentStep(status: Order['status']): number {
  const map: Partial<Record<Order['status'], number>> = {
    paid: 0, in_progress: 1, completed_by_adviser: 2, confirmed: 2, released: 3,
  }
  return map[status] ?? -1
}

function ProgressBar({ status, zh }: { status: Order['status']; zh: boolean }) {
  const active = currentStep(status)
  if (active < 0) return null
  const labels = zh ? STEPS_ZH : STEPS_EN
  return (
    <div className="flex items-center gap-0 mb-3">
      {STEP_ORDER.map((step, i) => {
        const done    = i < active
        const current = i === active
        const isLast  = i === STEP_ORDER.length - 1
        return (
          <div key={step} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center flex-1 min-w-0">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0
                ${done    ? 'bg-green-500 text-white'
                : current ? 'bg-yellow-400 text-white ring-2 ring-yellow-200'
                :           'bg-gray-200 text-gray-400'}`}>
                {done ? '✓' : i + 1}
              </div>
              <span className={`text-[10px] mt-0.5 text-center leading-tight
                ${done ? 'text-green-600' : current ? 'text-yellow-700 font-medium' : 'text-gray-400'}`}>
                {labels[step]}
              </span>
            </div>
            {!isLast && (
              <div className={`h-0.5 flex-1 mx-1 mb-3 ${i < active ? 'bg-green-400' : 'bg-gray-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Countdown ──────────────────────────────────────────────────────────────────

function Countdown({ autoReleaseAt, zh }: { autoReleaseAt: string; zh: boolean }) {
  const [hhmm, setHhmm] = useState('')

  useEffect(() => {
    function calc() {
      const diff = new Date(autoReleaseAt).getTime() - Date.now()
      if (diff <= 0) { setHhmm(zh ? '即将自动放款' : 'Releasing soon…'); return }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      setHhmm(zh ? `${h} 小时 ${m} 分` : `${h}h ${m}m`)
    }
    calc()
    const id = setInterval(calc, 30_000)
    return () => clearInterval(id)
  }, [autoReleaseAt, zh])

  return <span className="font-semibold text-yellow-800">{hhmm}</span>
}

function formatFull(iso: string, zh: boolean) {
  return new Date(iso).toLocaleString(zh ? 'zh-CN' : 'en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ── Status tag config ──────────────────────────────────────────────────────────

const STATUS_TAG: Record<Order['status'], { zh: string; en: string; color: string }> = {
  pending:              { zh: '待支付',       en: 'Awaiting payment',  color: 'text-gray-500 bg-gray-100 border-gray-200'       },
  pending_payment:      { zh: '待支付',       en: 'Awaiting payment',  color: 'text-gray-500 bg-gray-100 border-gray-200'       },
  paid:                 { zh: '🔵 待服务',    en: '🔵 Ready',          color: 'text-blue-700 bg-blue-50 border-blue-200'        },
  in_progress:          { zh: '🔵 服务中',    en: '🔵 In progress',    color: 'text-blue-700 bg-blue-50 border-blue-200'        },
  completed_by_adviser: { zh: '🟡 等待确认',  en: '🟡 Confirming',     color: 'text-yellow-700 bg-yellow-50 border-yellow-200'  },
  confirmed:            { zh: '✅ 已确认',    en: '✅ Confirmed',       color: 'text-green-700 bg-green-50 border-green-200'     },
  released:             { zh: '✅ 已放款',    en: '✅ Released',        color: 'text-green-700 bg-green-50 border-green-200'     },
  refund_requested:     { zh: '🔴 退款申请',  en: '🔴 Refund req.',    color: 'text-red-600 bg-red-50 border-red-200'           },
  failed:               { zh: '已失败',       en: 'Failed',            color: 'text-red-600 bg-red-50 border-red-200'           },
  refunded:             { zh: '已退款',       en: 'Refunded',          color: 'text-gray-500 bg-gray-100 border-gray-200'       },
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function EarningsPanel({ locale, paymentMode }: { locale: Locale; paymentMode: PaymentMode }) {
  const zh = locale === 'zh'
  const isManualPayment = paymentMode === 'manual'
  const searchParams = useSearchParams()
  const [summary, setSummary]         = useState<EarningsSummary | null>(null)
  const [orders, setOrders]           = useState<Order[]>([])
  const [stripeStatus, setStripeSt]   = useState<StripeStatus | null>(null)
  const [loading, setLoading]         = useState(true)
  const [completing, startComplete]   = useTransition()
  const [connecting, startConnect]    = useTransition()
  const [reviewed, setReviewed]       = useState<Record<string, boolean>>({})
  const [showReview, setShowReview]   = useState<string | null>(null)

  const fetchStripeStatus = useCallback(() =>
    fetch('/api/stripe/connect')
      .then(r => r.ok ? r.json() : { connected: false })
      .then(data => { console.log('Stripe status:', data); return data as StripeStatus })
      .catch(err  => { console.error('Stripe status fetch error:', err); return { connected: false } as StripeStatus }), [])

  const reload = useCallback(async () => {
    const [sum, ords, status] = await Promise.all([
      fetchAdviserEarnings(),
      fetchAdviserOrders(),
      isManualPayment ? Promise.resolve(null) : fetchStripeStatus(),
    ])
    setSummary(sum); setOrders(ords); setStripeSt(status)
    const completedIds = ords
      .filter(o => o.status === 'confirmed' || o.status === 'released')
      .map(o => o.id)
    if (completedIds.length > 0) {
      const reviewStatus = await fetchOrderReviewStatus(completedIds)
      const doneMap: Record<string, boolean> = {}
      for (const [id, s] of Object.entries(reviewStatus)) doneMap[id] = s.mentorDone
      setReviewed(doneMap)
    }
    setLoading(false)
  }, [fetchStripeStatus, isManualPayment])

  useEffect(() => {
    const id = window.setTimeout(() => { void reload() }, 0)
    return () => window.clearTimeout(id)
  }, [reload])

  useEffect(() => {
    if (isManualPayment) return
    if (searchParams.get('stripe') !== 'success') return
    fetchStripeStatus().then(s => setStripeSt(s))
  }, [fetchStripeStatus, isManualPayment, searchParams])

  function handleMarkComplete(orderId: string) {
    startComplete(async () => {
      const res = await adviserMarkComplete(orderId)
      if (res.ok) await reload()
      else alert(res.error ?? (zh ? '操作失败' : 'Failed'))
    })
  }

  function handleOpenStripeDashboard() {
    startConnect(async () => {
      try {
        const res  = await fetch('/api/stripe/login-link')
        const data = await res.json().catch(() => ({}))
        if (data.url) window.open(data.url, '_blank')
        else alert(data.error ?? (zh ? '无法打开 Stripe 控制台' : 'Could not open Stripe dashboard'))
      } catch { alert(zh ? '网络错误，请重试' : 'Network error, please try again') }
    })
  }

  function handleConnectStripe() {
    startConnect(async () => {
      try {
        const res  = await fetch('/api/stripe/connect', { method: 'POST' })
        const data = await res.json().catch(() => ({}))
        if (data.url) window.location.href = data.url
        else alert(data.error ?? 'Stripe 连接失败，请确认已配置 STRIPE_SECRET_KEY')
      } catch { alert('网络错误，请重试') }
    })
  }

  if (loading) {
    return <div className="py-8 text-center text-sm text-gray-400">{zh ? '加载中…' : 'Loading…'}</div>
  }

  const isConnected = !isManualPayment && stripeStatus?.chargesEnabled === true && stripeStatus?.payoutsEnabled === true
  const isPending   = !isManualPayment && !isConnected && stripeStatus?.detailsSubmitted === true

  return (
    <div className="space-y-6">

      {/* ── How payouts work ─────────────────────────────────────── */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 leading-relaxed">
        <p className="font-medium mb-1">{zh ? '💡 收款流程说明' : '💡 How payouts work'}</p>
        <p>
          {isManualPayment
            ? (zh
                ? '学生通过 GoMentorGo 微信/支付宝付款后，资金由平台统一代收。完成服务后请点击「标记服务已完成」，学生有 48 小时确认。确认后平台按订单金额的 90% 手动结算给你。'
                : 'Students pay GoMentorGo by WeChat Pay or Alipay. The platform collects funds first. After completing the service, click "Mark Complete". The student has 48 hours to confirm, then the platform manually settles 90% to you.')
            : (zh
                ? '学生付款后，资金由平台安全托管。完成服务后请点击「标记服务已完成」，学生有 48 小时确认。若学生无操作，系统自动放款到你的账户。'
                : 'Student payments are held securely by the platform. After completing the service, click "Mark Complete". The student has 48 hours to confirm. If no action is taken, funds are automatically released to your account.')}
        </p>
      </div>

      {/* ── Payout setup banner ───────────────────────────────────── */}
      {isManualPayment ? (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-green-700">
              {zh ? '✅ 平台统一代收，人工结算给导师' : '✅ Platform collects payments and settles manually'}
            </p>
            <p className="text-xs mt-0.5 text-green-600">
              {zh
                ? '请在「档案」里的「结算账户」填写你的微信/支付宝账号。平台确认学生付款和服务完成后，会按系统算好的金额结算给你。'
                : 'Add your WeChat Pay or Alipay payout details in Profile → Payout Account. After payment and service confirmation, the platform settles the calculated amount to you.'}
            </p>
          </div>
          <a
            href="#profile-payout-section"
            className="shrink-0 rounded-xl border border-green-300 bg-white px-4 py-2 text-xs font-medium text-green-700 hover:bg-green-100 transition"
          >
            {zh ? '去设置结算账户' : 'Set payout account'}
          </a>
        </div>
      ) : (
        <div className={`rounded-xl border p-4 flex items-start justify-between gap-4
          ${isConnected ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
          <div>
            <p className={`text-sm font-medium ${isConnected ? 'text-green-700' : 'text-amber-700'}`}>
              {isConnected
                ? (zh ? '✅ Stripe 收款已连接' : '✅ Stripe payouts connected')
                : isPending
                  ? (zh ? '⏳ Stripe 开户审核中…' : '⏳ Stripe onboarding in progress…')
                  : (zh ? '⚠️ 尚未连接 Stripe 收款' : '⚠️ Stripe payouts not connected')}
            </p>
            <p className={`text-xs mt-0.5 ${isConnected ? 'text-green-600' : 'text-amber-600'}`}>
              {isConnected
                ? (zh ? '学生确认或 48 小时后，款项自动转入你的账户' : 'Funds transfer automatically after confirmation or 48 hours')
                : (zh ? '连接 Stripe 才能接收付款' : 'Connect Stripe to receive payments')}
            </p>
          </div>
          <div className="shrink-0">
            {!isConnected && (
              <button onClick={handleConnectStripe} disabled={connecting}
                className="rounded-xl bg-black px-4 py-2 text-xs font-medium text-white disabled:opacity-50 hover:bg-gray-800 transition">
                {connecting ? (zh ? '跳转中…' : 'Redirecting…')
                  : isPending ? (zh ? '继续开户' : 'Continue setup')
                  : (zh ? '连接 Stripe' : 'Connect Stripe')}
              </button>
            )}
            {isConnected && (
              <button onClick={handleOpenStripeDashboard}
                className="rounded-xl border px-4 py-2 text-xs font-medium hover:bg-gray-50 transition">
                {zh ? '提现 / 查看账户' : 'Withdraw / Dashboard'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Summary cards ─────────────────────────────────────────── */}
      {summary && (
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl border bg-gray-50 p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">{zh ? '已完成咨询' : 'Completed sessions'}</p>
            <p className="text-2xl font-bold">{summary.paidOrderCount}</p>
          </div>
          <div className="rounded-xl border bg-gray-50 p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">{zh ? '学生支付总额' : 'Total billed'}</p>
            <p className="text-2xl font-bold">¥{(summary.totalPaidFen / 100).toLocaleString()}</p>
          </div>
          <div className="rounded-xl border bg-green-50 border-green-200 p-4 text-center">
            <p className="text-xs text-green-600 mb-1">{zh ? '你的实际到账' : 'Your net payout'}</p>
            <p className="text-2xl font-bold text-green-700">
              ¥{(summary.totalAdviserPayoutFen / 100).toLocaleString()}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {zh
                ? `（扣除平台佣金 ¥${(summary.totalPlatformFeeFen / 100).toLocaleString()}）`
                : `(after ¥${(summary.totalPlatformFeeFen / 100).toLocaleString()} platform fee)`}
            </p>
          </div>
        </div>
      )}

      {/* ── Order list ────────────────────────────────────────────── */}
      <div>
        <h3 className="text-sm font-medium text-gray-500 mb-3">
          {zh ? '订单记录' : 'Order history'}
        </h3>

        {orders.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">
            {zh ? '暂无订单' : 'No orders yet'}
          </p>
        ) : (
          <div className="space-y-4">
            {orders.map(order => {
              const tag    = STATUS_TAG[order.status]
              const slotDate = new Date(order.utcSlotStart).toLocaleDateString(
                zh ? 'zh-CN' : 'en-US',
                { year: 'numeric', month: 'long', day: 'numeric' },
              )
              const canMarkComplete = order.status === 'paid' || order.status === 'in_progress'
              const awaitingStudent = order.status === 'completed_by_adviser'

              return (
                <div key={order.id} className="rounded-xl border bg-white shadow-sm overflow-hidden">

                  {/* Card header */}
                  <div className="px-4 pt-4 pb-3 border-b border-gray-100">
                    <ProgressBar status={order.status} zh={zh} />
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-sm">{order.applicantName}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{slotDate}</p>
                      </div>
                      <span className={`text-xs rounded-full border px-2.5 py-0.5 font-medium whitespace-nowrap ${tag.color}`}>
                        {zh ? tag.zh : tag.en}
                      </span>
                    </div>
                  </div>

                  {/* Money section */}
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                    <p className="text-base font-bold text-green-700">
                      {zh ? `到账金额：¥${(order.adviserPayoutFen / 100).toLocaleString()}`
                           : `Your payout: ¥${(order.adviserPayoutFen / 100).toLocaleString()}`}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {zh
                        ? `（学生支付 ¥${(order.amountFen / 100).toLocaleString()}，平台佣金 ¥${(order.platformFeeFen / 100).toLocaleString()}）`
                        : `(student paid ¥${(order.amountFen / 100).toLocaleString()}, platform fee ¥${(order.platformFeeFen / 100).toLocaleString()})`}
                    </p>
                  </div>

                  {/* Action / status detail */}
                  <div className="px-4 py-3 space-y-2">

                    {/* Mark complete */}
                    {canMarkComplete && (
                      <div className="space-y-2">
                        <p className="text-xs text-gray-500">
                          {isManualPayment
                            ? (zh
                                ? '服务完成后，点击下方按钮通知学生确认。学生确认后，平台会按系统金额人工结算给你。'
                                : 'Once the service is done, click below to notify the student. After confirmation, the platform manually settles the calculated amount to you.')
                            : (zh
                                ? '服务完成后，点击下方按钮通知学生确认，确认后款项将转入你的账户。'
                                : 'Once the service is done, click below to notify the student. Payment releases after their confirmation.')}
                        </p>
                        <button
                          onClick={() => handleMarkComplete(order.id)}
                          disabled={completing}
                          className="w-full rounded-lg bg-black text-white text-sm font-medium py-2.5 disabled:opacity-50 hover:bg-gray-800 transition"
                        >
                          {completing
                            ? (zh ? '提交中…' : 'Submitting…')
                            : (zh ? '✅ 标记服务已完成' : '✅ Mark service as completed')}
                        </button>
                      </div>
                    )}

                    {/* Awaiting student confirmation */}
                    {awaitingStudent && order.autoReleaseAt && (
                      <div className="rounded-lg bg-yellow-50 border border-yellow-200 px-3 py-3 space-y-1.5">
                        <p className="text-sm font-semibold text-yellow-800">
                          {zh ? '✅ 服务已完成，等待学生确认' : '✅ Service marked complete — awaiting student'}
                        </p>
                        <p className="text-xs text-yellow-700">
                          {zh
                            ? (isManualPayment ? '学生有 48 小时确认服务完成。若未操作，系统会自动确认，平台随后人工结算。' : '学生有 48 小时确认服务完成，若未操作系统将自动放款。')
                            : (isManualPayment ? 'The student has 48 hours to confirm. If no action is taken, the system auto-confirms and the platform settles manually.' : 'The student has 48 hours to confirm. If no action is taken, funds are released automatically.')}
                        </p>
                        <div className="mt-2 rounded-md bg-yellow-100 border border-yellow-300 px-3 py-2 space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-yellow-700">{zh ? '自动放款倒计时' : 'Auto-release in'}</span>
                            <Countdown autoReleaseAt={order.autoReleaseAt} zh={zh} />
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-yellow-700">
                              {zh ? (isManualPayment ? '自动确认时间' : '自动放款时间') : (isManualPayment ? 'Auto-confirms at' : 'Auto-releases at')}
                            </span>
                            <span className="font-medium text-yellow-800">{formatFull(order.autoReleaseAt, zh)}</span>
                          </div>
                        </div>
                        <p className="text-xs text-yellow-600 mt-1">
                          {zh
                            ? '⚠ 若学生在 48 小时内申请退款，结算将暂停，平台将介入处理。'
                            : '⚠ If the student requests a refund within 48 hours, settlement will be paused for review.'}
                        </p>
                      </div>
                    )}

                    {/* Confirmed — released soon */}
                    {order.status === 'confirmed' && (
                      <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-2">
                        <p className="text-xs text-green-700 font-medium">
                          {zh
                            ? (isManualPayment ? '✅ 学生已确认，等待平台人工结算' : '✅ 学生已确认，款项正在转入你的账户')
                            : (isManualPayment ? '✅ Student confirmed — awaiting manual platform settlement' : '✅ Student confirmed — payout is being processed')}
                        </p>
                      </div>
                    )}

                    {/* Released */}
                    {order.status === 'released' && order.releasedAt && (
                      <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-2">
                        <p className="text-xs text-green-700 font-medium">
                          {zh
                            ? (isManualPayment ? `✅ 平台已于 ${formatFull(order.releasedAt, zh)} 标记结算完成` : `✅ 款项已于 ${formatFull(order.releasedAt, zh)} 转入你的账户`)
                            : (isManualPayment ? `✅ Settlement marked complete on ${formatFull(order.releasedAt, zh)}` : `✅ Payment released on ${formatFull(order.releasedAt, zh)}`)}
                        </p>
                      </div>
                    )}

                    {/* Refund requested */}
                    {order.status === 'refund_requested' && (
                      <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2">
                        <p className="text-xs text-red-700 font-medium">
                          {zh ? '⚠️ 学生已申请退款' : '⚠️ Student requested a refund'}
                        </p>
                        <p className="text-xs text-red-600 mt-0.5">
                          {zh
                            ? '放款已暂停，平台将介入处理，请留意邮件通知。'
                            : 'Payout is paused. The platform will review and contact both parties by email.'}
                        </p>
                      </div>
                    )}

                    {/* Review prompt for completed orders */}
                    {(order.status === 'confirmed' || order.status === 'released') && (
                      reviewed[order.id]
                        ? <p className="text-xs text-green-600">✅ {zh ? '已评价' : 'Reviewed'}</p>
                        : showReview === order.id
                          ? <ReviewForm orderId={order.id} zh={zh} onDone={() => {
                              setReviewed(prev => ({ ...prev, [order.id]: true }))
                              setShowReview(null)
                            }} />
                          : <button
                              onClick={() => setShowReview(order.id)}
                              className="text-xs text-blue-600 hover:underline"
                            >
                              ⭐ {zh ? '评价学生' : 'Review student'}
                            </button>
                    )}

                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
