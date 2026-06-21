'use client'

import { useState, useEffect, useTransition } from 'react'
import Link from 'next/link'
import { fetchApplicantOrders, studentConfirmComplete, studentRequestRefund } from '@/app/actions/payments'
import { submitReview, fetchOrderReviewStatus } from '@/app/actions/reviews'
import { fetchMeetingDetailsForAdvisers, type AdviserMeetingDetails } from '@/app/actions/meetings'
import type { Order } from '@/app/lib/orders'
import type { Locale } from '@/app/lib/i18n'

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
      <p className="text-xs font-medium text-gray-700">{zh ? '评价导师' : 'Review your mentor'}</p>
      <StarPicker value={rating} onChange={setRating} />
      <textarea
        value={comment}
        onChange={e => setComment(e.target.value)}
        rows={2}
        placeholder={zh ? '分享你的咨询体验（选填）' : 'Share your experience (optional)'}
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

const STATUS_LABEL: Record<Order['status'], { zh: string; en: string; color: string }> = {
  pending:              { zh: '待支付',     en: 'Awaiting payment',    color: 'text-gray-500 bg-gray-50 border-gray-200'       },
  pending_payment:      { zh: '待人工确认付款', en: 'Awaiting manual confirmation', color: 'text-yellow-700 bg-yellow-50 border-yellow-200' },
  paid:                 { zh: '已付款',     en: 'Paid',                color: 'text-blue-700 bg-blue-50 border-blue-200'       },
  in_progress:          { zh: '进行中',     en: 'In progress',         color: 'text-blue-700 bg-blue-50 border-blue-200'       },
  completed_by_adviser: { zh: '待你确认',   en: 'Awaiting confirmation', color: 'text-yellow-700 bg-yellow-50 border-yellow-200' },
  confirmed:            { zh: '已确认',     en: 'Confirmed',           color: 'text-green-700 bg-green-50 border-green-200'    },
  released:             { zh: '已完成',     en: 'Completed',           color: 'text-green-700 bg-green-50 border-green-200'    },
  refund_requested:     { zh: '退款申请中', en: 'Refund requested',    color: 'text-red-600 bg-red-50 border-red-200'          },
  failed:               { zh: '已失败',     en: 'Failed',              color: 'text-red-600 bg-red-50 border-red-200'          },
  refunded:             { zh: '已退款',     en: 'Refunded',            color: 'text-gray-500 bg-gray-50 border-gray-200'       },
}

const MEETING_VISIBLE_STATUSES: Order['status'][] = [
  'paid',
  'in_progress',
  'completed_by_adviser',
  'confirmed',
  'released',
]

function formatDatetime(iso: string, zh: boolean) {
  return new Date(iso).toLocaleString(zh ? 'zh-CN' : 'en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function Countdown({ autoReleaseAt, zh }: { autoReleaseAt: string; zh: boolean }) {
  const [remaining, setRemaining] = useState('')

  useEffect(() => {
    function calc() {
      const diff = new Date(autoReleaseAt).getTime() - Date.now()
      if (diff <= 0) { setRemaining(zh ? '即将自动确认' : 'Auto-confirming…'); return }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      setRemaining(zh ? `剩余 ${h} 小时 ${m} 分` : `${h}h ${m}m remaining`)
    }
    calc()
    const id = setInterval(calc, 30_000)
    return () => clearInterval(id)
  }, [autoReleaseAt, zh])

  return <span className="font-medium">{remaining}</span>
}

export default function PaymentHistory({ locale }: { locale: Locale }) {
  const zh = locale === 'zh'
  const [orders, setOrders]           = useState<Order[]>([])
  const [loading, setLoading]         = useState(true)
  const [acting, startAction]         = useTransition()
  const [reviewed, setReviewed]       = useState<Record<string, boolean>>({})
  const [showReview, setShowReview]   = useState<string | null>(null)
  const [meetingDetails, setMeetingDetails] = useState<Record<string, AdviserMeetingDetails>>({})

  const reload = async () => {
    const ords = await fetchApplicantOrders()
    setOrders(ords)
    const completedIds = ords
      .filter(o => o.status === 'confirmed' || o.status === 'released')
      .map(o => o.id)
    if (completedIds.length > 0) {
      const status = await fetchOrderReviewStatus(completedIds)
      const doneMap: Record<string, boolean> = {}
      for (const [id, s] of Object.entries(status)) doneMap[id] = s.studentDone
      setReviewed(doneMap)
    }
    const activeAdviserIds = [...new Set(
      ords
        .filter(o => MEETING_VISIBLE_STATUSES.includes(o.status))
        .map(o => o.adviserId)
    )]
    if (activeAdviserIds.length > 0) {
      const details = await fetchMeetingDetailsForAdvisers(activeAdviserIds)
      setMeetingDetails(details)
    }
    setLoading(false)
  }

  useEffect(() => {
    const id = window.setTimeout(() => { void reload() }, 0)
    return () => window.clearTimeout(id)
  }, [])

  function handleConfirm(orderId: string) {
    if (!confirm(zh
      ? '确认服务已完成？确认后款项将立即转给导师，不可撤销。'
      : 'Confirm the service was completed? This will release payment to the adviser immediately.')) return
    startAction(async () => {
      const res = await studentConfirmComplete(orderId)
      if (res.ok) await reload()
      else alert(res.error ?? (zh ? '操作失败' : 'Failed'))
    })
  }

  function handleRefund(orderId: string) {
    if (!confirm(zh
      ? '申请退款？平台将介入处理，款项暂时冻结，请等待平台联系。'
      : 'Request a refund? The platform will review and contact you. Payment will be paused.')) return
    startAction(async () => {
      const res = await studentRequestRefund(orderId)
      if (res.ok) await reload()
      else alert(res.error ?? (zh ? '操作失败' : 'Failed'))
    })
  }

  if (loading) {
    return (
      <div className="py-8 text-center text-sm text-gray-400">
        {zh ? '加载中…' : 'Loading…'}
      </div>
    )
  }

  return (
    <div className="space-y-4">

      {/* Escrow explanation */}
      <div className="rounded-xl border bg-blue-50 border-blue-200 p-4 text-sm text-blue-800">
        {zh
          ? '💡 付款确认后，订单会由平台托管。导师完成服务后你将收到通知，可在 24 小时内确认完成或申请退款。如无操作，订单将自动确认。'
          : '💡 After payment is confirmed, the order is held by the platform. After the adviser marks the service complete, you have 24 hours to confirm or request a refund. If no action is taken, the order is automatically confirmed.'}
      </div>

      {orders.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">
          {zh ? '暂无支付记录' : 'No payments yet'}
        </p>
      ) : (
        <div className="space-y-3">
          {orders.map(order => {
            const st = STATUS_LABEL[order.status]
            const slotDate = new Date(order.utcSlotStart).toLocaleString(
              zh ? 'zh-CN' : 'en-US',
              { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' },
            )
            const needsAction = order.status === 'completed_by_adviser'

            return (
              <div key={order.id}
                className={`rounded-xl border px-4 py-3 text-sm space-y-3
                  ${needsAction ? 'border-yellow-300 bg-yellow-50/40' : ''}`}>

                {/* Header row */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      <span>{zh ? '导师：' : 'Mentor: '}</span>
                      <Link
                        href={`/advisers/${order.adviserId}`}
                        className="text-blue-700 hover:underline"
                      >
                        {order.adviserName}
                      </Link>
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{slotDate}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs rounded-full border px-2.5 py-0.5 ${st.color}`}>
                      {zh ? st.zh : st.en}
                    </span>
                    <p className="font-medium">¥{(order.amountFen / 100).toLocaleString()}</p>
                  </div>
                </div>

                {order.status === 'pending_payment' && (
                  <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
                    {zh
                      ? '如果你已经通过微信/支付宝/银行转账付款，请等待平台人工确认。确认后订单会显示为“已付款”。'
                      : 'If you already paid by WeChat, Alipay, or bank transfer, please wait for manual platform confirmation. The order will show as paid after confirmation.'}
                  </div>
                )}

                {/* Meeting details — visible after payment is confirmed */}
                {MEETING_VISIBLE_STATUSES.includes(order.status) && (() => {
                  const details = meetingDetails[order.adviserId]
                  const links = details?.meetingLinks
                  const contact = details?.contactInfo
                  const entries = links ? [
                    { key: 'zoom',    label: 'Zoom',                            icon: '🖥️', url: links.zoom },
                    { key: 'tencent', label: zh ? '腾讯会议 / VooV' : 'Tencent / VooV', icon: '🇨🇳', url: links.tencent },
                    { key: 'lark',    label: zh ? '飞书 / Lark' : 'Feishu / Lark',      icon: '🪶', url: links.lark },
                  ].filter(e => e.url) : []
                  const hasContact = !!(contact?.wechat || contact?.email || contact?.phone || contact?.note)
                  const hasDetails = entries.length > 0 || hasContact
                  return (
                    <div className={`rounded-lg border px-3 py-3 space-y-2 ${
                      hasDetails
                        ? 'bg-green-50 border-green-200'
                        : 'bg-amber-50 border-amber-200'
                    }`}>
                      <p className={`text-xs font-semibold ${
                        hasDetails ? 'text-green-800' : 'text-amber-800'
                      }`}>
                        {zh ? '咨询方式 / 联系导师' : 'Meeting and contact details'}
                      </p>
                      {hasDetails ? (
                        <>
                          <p className="text-xs text-gray-600 leading-relaxed">
                            {zh
                              ? '付款已确认，以下信息仅对已付款学生显示。请按预约时间进入会议；如需改时间，请优先联系导师。'
                              : 'Payment is confirmed. These details are visible only to paid students. Join at the scheduled time, or contact the adviser if you need to coordinate.'}
                          </p>
                          {entries.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {entries.map(e => (
                                <a key={e.key} href={e.url} target="_blank" rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 rounded-lg border bg-white px-3 py-1.5 text-xs font-medium hover:bg-gray-50 transition">
                                  <span>{e.icon}</span>{e.label}
                                </a>
                              ))}
                            </div>
                          )}
                          {hasContact && (
                            <div className="rounded-lg border bg-white px-3 py-2 text-xs text-gray-700 space-y-1">
                              <p className="font-medium text-gray-900">{zh ? '导师联系方式' : 'Adviser contact'}</p>
                              {contact?.wechat && <p>{zh ? '微信：' : 'WeChat: '}<span className="font-medium break-all">{contact.wechat}</span></p>}
                              {contact?.email && (
                                <p>
                                  {zh ? '邮箱：' : 'Email: '}
                                  <a href={`mailto:${contact.email}`} className="font-medium text-blue-600 hover:underline break-all">
                                    {contact.email}
                                  </a>
                                </p>
                              )}
                              {contact?.phone && <p>{zh ? '电话/其他：' : 'Phone/other: '}<span className="font-medium break-all">{contact.phone}</span></p>}
                              {contact?.note && <p>{zh ? '导师备注：' : 'Note: '}<span className="break-all">{contact.note}</span></p>}
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-xs text-amber-800 leading-relaxed">
                          {zh
                            ? '导师暂未填写咨询方式。你的预约已经锁定，请联系平台客服协助安排。'
                            : 'The adviser has not added meeting/contact details yet. Your booking is locked in; contact platform support for help.'}
                        </p>
                      )}
                    </div>
                  )
                })()}

                {/* Confirmation action area */}
                {needsAction && order.autoReleaseAt && (
                  <div className="rounded-lg bg-yellow-100 border border-yellow-200 px-3 py-3 space-y-2">
                    <p className="text-xs font-medium text-yellow-800">
                      {zh ? '导师已标记服务完成，请确认：' : 'The adviser marked this service as complete:'}
                    </p>
                    <p className="text-xs text-yellow-700">
                      {zh ? '自动确认倒计时：' : 'Auto-confirm countdown: '}
                      <Countdown autoReleaseAt={order.autoReleaseAt} zh={zh} />
                    </p>
                    <p className="text-xs text-yellow-600">
                      {zh
                        ? `自动确认时间：${formatDatetime(order.autoReleaseAt, zh)}`
                        : `Auto-confirms at: ${formatDatetime(order.autoReleaseAt, zh)}`}
                    </p>
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => handleConfirm(order.id)}
                        disabled={acting}
                        className="flex-1 rounded-lg bg-black text-white text-xs font-medium py-2 disabled:opacity-50 hover:bg-gray-800 transition"
                      >
                        {acting ? '…' : (zh ? '✅ 确认服务已完成' : '✅ Confirm service completed')}
                      </button>
                      <button
                        onClick={() => handleRefund(order.id)}
                        disabled={acting}
                        className="flex-1 rounded-lg border border-red-300 text-red-600 text-xs font-medium py-2 disabled:opacity-50 hover:bg-red-50 transition"
                      >
                        {acting ? '…' : (zh ? '申请退款' : 'Request refund')}
                      </button>
                    </div>
                  </div>
                )}

                {/* Refund requested notice */}
                {order.status === 'refund_requested' && (
                  <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2">
                    <p className="text-xs text-red-700">
                      {zh
                        ? '退款申请已提交，平台正在处理，请耐心等待联系。'
                        : 'Your refund request has been submitted. The platform will contact you shortly.'}
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
                          ⭐ {zh ? '评价导师' : 'Review mentor'}
                        </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
