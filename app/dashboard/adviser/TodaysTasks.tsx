'use client'

import { useEffect, useState } from 'react'
import { fetchAdviserOrders } from '@/app/actions/payments'
import { fetchMySlots } from '@/app/actions/slots'
import type { Order } from '@/app/lib/orders'
import type { Locale } from '@/app/lib/i18n'

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export default function TodaysTasks({ locale }: { locale: Locale }) {
  const zh = locale === 'zh'
  const [orders, setOrders]         = useState<Order[]>([])
  const [slotsCount, setSlotsCount] = useState(0)
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    Promise.all([fetchAdviserOrders(), fetchMySlots()]).then(([ords, slots]) => {
      setOrders(ords)
      const now     = Date.now()
      const weekOut = now + 7 * 24 * 60 * 60 * 1000
      setSlotsCount(slots.filter(s =>
        s.status === 'available' &&
        new Date(s.utcStart).getTime() > now &&
        new Date(s.utcStart).getTime() <= weekOut
      ).length)
      setLoading(false)
    })
  }, [])

  const awaitingConfirmation = orders.filter(o => o.status === 'completed_by_adviser')
  const servicesToComplete   = orders.filter(o => o.status === 'paid' || o.status === 'in_progress')
  const refundDisputes       = orders.filter(o => o.status === 'refund_requested')

  // Revenue pending release from orders awaiting student confirmation
  const pendingRevenueFen = awaitingConfirmation.reduce((s, o) => s + o.adviserPayoutFen, 0)

  const actionCount = awaitingConfirmation.length + servicesToComplete.length + refundDisputes.length

  if (loading) {
    return (
      <section className="bg-white rounded-2xl border p-6">
        <div className="h-4 w-32 bg-gray-100 rounded animate-pulse mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map(i => <div key={i} className="h-28 rounded-xl bg-gray-50 animate-pulse" />)}
        </div>
      </section>
    )
  }

  return (
    <section className="bg-white rounded-2xl border p-6">

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">{zh ? '今日待办' : "Today's Tasks"}</h2>
        {actionCount > 0
          ? <span className="text-xs font-medium bg-amber-50 border border-amber-200 text-amber-700 rounded-full px-2.5 py-0.5">
              {zh ? `你有 ${actionCount} 个订单待处理` : `${actionCount} order${actionCount > 1 ? 's' : ''} need attention`}
            </span>
          : <span className="text-xs font-medium bg-green-50 border border-green-200 text-green-700 rounded-full px-2.5 py-0.5">
              {zh ? '暂无待处理事项 ✓' : 'All clear ✓'}
            </span>
        }
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">

        {/* ── 待学生确认 ─────────────────────────────────── */}
        <button
          onClick={() => scrollTo('orders-section')}
          className="text-left rounded-xl border bg-yellow-50 border-yellow-200 px-4 py-3 flex flex-col gap-1 hover:bg-yellow-100 transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-lg">⏳</span>
            <span className={`text-2xl font-bold ${awaitingConfirmation.length > 0 ? 'text-yellow-700' : 'text-gray-300'}`}>
              {awaitingConfirmation.length}
            </span>
          </div>
          <p className={`text-xs font-semibold leading-tight ${awaitingConfirmation.length > 0 ? 'text-yellow-700' : 'text-gray-400'}`}>
            {zh ? '待学生确认' : 'Awaiting confirmation'}
          </p>
          {awaitingConfirmation.length > 0 ? (
            <>
              <p className="text-xs text-yellow-600 leading-tight">
                {zh
                  ? `预计到账：¥${(pendingRevenueFen / 100).toLocaleString()}`
                  : `Pending payout: ¥${(pendingRevenueFen / 100).toLocaleString()}`}
              </p>
              <p className="text-xs text-yellow-500 mt-1 group-hover:underline">
                {zh ? '查看订单 →' : 'View orders →'}
              </p>
            </>
          ) : (
            <p className="text-xs text-gray-400 leading-tight">
              {zh ? '暂无等待确认的订单' : 'No orders awaiting confirmation'}
            </p>
          )}
        </button>

        {/* ── 待完成服务 ─────────────────────────────────── */}
        <button
          onClick={() => scrollTo('orders-section')}
          className="text-left rounded-xl border bg-blue-50 border-blue-200 px-4 py-3 flex flex-col gap-1 hover:bg-blue-100 transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-lg">📋</span>
            <span className={`text-2xl font-bold ${servicesToComplete.length > 0 ? 'text-blue-700' : 'text-gray-300'}`}>
              {servicesToComplete.length}
            </span>
          </div>
          <p className={`text-xs font-semibold leading-tight ${servicesToComplete.length > 0 ? 'text-blue-700' : 'text-gray-400'}`}>
            {zh ? '待完成服务' : 'Services to complete'}
          </p>
          {servicesToComplete.length > 0 ? (
            <>
              <p className="text-xs text-blue-600 leading-tight">
                {zh ? '学生已付款，请尽快完成服务' : 'Student has paid — complete the service'}
              </p>
              <p className="text-xs text-blue-500 mt-1 group-hover:underline">
                {zh ? '去完成服务 →' : 'Complete service →'}
              </p>
            </>
          ) : (
            <p className="text-xs text-gray-400 leading-tight">
              {zh ? '暂无待完成服务 👍' : 'No pending services 👍'}
            </p>
          )}
        </button>

        {/* ── 本周可预约时间 ──────────────────────────────── */}
        <button
          onClick={() => scrollTo('availability-section')}
          className="text-left rounded-xl border bg-green-50 border-green-200 px-4 py-3 flex flex-col gap-1 hover:bg-green-100 transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-lg">📅</span>
            <span className={`text-2xl font-bold ${slotsCount > 0 ? 'text-green-700' : 'text-gray-300'}`}>
              {slotsCount}
            </span>
          </div>
          <p className={`text-xs font-semibold leading-tight ${slotsCount > 0 ? 'text-green-700' : 'text-gray-400'}`}>
            {zh ? '本周可预约时间' : 'Open slots this week'}
          </p>
          {slotsCount > 0 ? (
            <>
              <p className="text-xs text-green-600 leading-tight">
                {zh ? '学生可预约的空闲时间段' : 'Slots available for students'}
              </p>
              <p className="text-xs text-green-500 mt-1 group-hover:underline">
                {zh ? '查看 / 修改时间 →' : 'Manage availability →'}
              </p>
            </>
          ) : (
            <>
              <p className="text-xs text-amber-600 leading-tight font-medium">
                {zh ? '⚠ 本周还没有开放时间' : '⚠ No open slots this week'}
              </p>
              <p className="text-xs text-gray-400 leading-tight">
                {zh ? '点击去设置时间，学生才能预约你' : 'Set availability so students can book you'}
              </p>
              <p className="text-xs text-green-600 mt-1 group-hover:underline">
                {zh ? '去设置时间 →' : 'Set availability →'}
              </p>
            </>
          )}
        </button>

        {/* ── 退款 / 争议 ────────────────────────────────── */}
        <button
          onClick={() => scrollTo('orders-section')}
          className="text-left rounded-xl border bg-red-50 border-red-200 px-4 py-3 flex flex-col gap-1 hover:bg-red-100 transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-lg">⚠️</span>
            <span className={`text-2xl font-bold ${refundDisputes.length > 0 ? 'text-red-600' : 'text-gray-300'}`}>
              {refundDisputes.length}
            </span>
          </div>
          <p className={`text-xs font-semibold leading-tight ${refundDisputes.length > 0 ? 'text-red-600' : 'text-gray-400'}`}>
            {zh ? '退款 / 争议' : 'Refunds / disputes'}
          </p>
          {refundDisputes.length > 0 ? (
            <>
              <p className="text-xs text-red-500 leading-tight">
                {zh ? '放款已暂停，请联系平台处理' : 'Payout paused — contact support'}
              </p>
              <p className="text-xs text-red-500 mt-1 group-hover:underline">
                {zh ? '查看退款 →' : 'View refunds →'}
              </p>
            </>
          ) : (
            <p className="text-xs text-gray-400 leading-tight">
              {zh ? '暂无退款争议' : 'No refund requests'}
            </p>
          )}
        </button>

      </div>
    </section>
  )
}
