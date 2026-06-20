'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import type { ReactNode } from 'react'
import {
  adminCancelManualOrder,
  adminConfirmManualPayment,
  adminFetchOrders,
  adminMarkManualPayoutReleased,
} from '@/app/actions/admin'
import type { Locale } from '@/app/lib/i18n'
import type { Order } from '@/app/lib/orders'

type Props = { locale: Locale }

const STATUS_ZH: Record<Order['status'], string> = {
  pending: '待支付',
  pending_payment: '待人工确认付款',
  paid: '已付款',
  in_progress: '服务中',
  completed_by_adviser: '等待学生确认',
  confirmed: '学生已确认',
  refund_requested: '退款/争议',
  released: '已结算',
  failed: '已取消/失败',
  refunded: '已退款',
}

export default function AdminOrdersPanel({ locale }: Props) {
  const zh = locale === 'zh'
  const [orders, setOrders] = useState<Order[]>([])
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()

  const manualPending = useMemo(
    () => orders.filter(o => o.status === 'pending_payment' && !o.stripeSessionId),
    [orders],
  )
  const confirmed = useMemo(
    () => orders.filter(o => o.status === 'confirmed' && !o.stripeTransferId),
    [orders],
  )

  function load() {
    startTransition(async () => {
      setError('')
      setOrders(await adminFetchOrders())
    })
  }

  useEffect(() => { load() }, [])

  function run(action: (id: string) => Promise<{ ok: boolean; error?: string }>, id: string) {
    startTransition(async () => {
      setError('')
      const res = await action(id)
      if (!res.ok) {
        setError(res.error ?? (zh ? '操作失败' : 'Action failed'))
        return
      }
      setOrders(await adminFetchOrders())
    })
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-3">
        <SummaryCard label={zh ? '待确认付款' : 'Awaiting payment'} value={manualPending.length} tone="yellow" />
        <SummaryCard label={zh ? '待人工结算' : 'Awaiting payout'} value={confirmed.length} tone="blue" />
        <SummaryCard label={zh ? '全部订单' : 'All orders'} value={orders.length} tone="gray" />
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <section className="rounded-2xl border bg-white shadow-sm">
        <div className="border-b px-5 py-4 flex items-center justify-between">
          <div>
            <h2 className="font-semibold">{zh ? '人工付款确认' : 'Manual payment confirmation'}</h2>
            <p className="text-xs text-gray-500 mt-1">
              {zh ? '学生通过微信/支付宝付款后，在这里确认。' : 'Confirm after the student pays by WeChat or Alipay.'}
            </p>
          </div>
          <button onClick={load} disabled={pending} className="rounded-lg border px-3 py-1.5 text-xs hover:bg-gray-50 disabled:opacity-50">
            {zh ? '刷新' : 'Refresh'}
          </button>
        </div>
        <OrderList
          orders={manualPending}
          zh={zh}
          empty={zh ? '暂无待确认付款订单' : 'No manual payments waiting'}
          renderActions={(order) => (
            <>
              <button
                disabled={pending}
                onClick={() => run(adminConfirmManualPayment, order.id)}
                className="rounded-lg bg-black px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
              >
                {zh ? '确认已付款' : 'Confirm paid'}
              </button>
              <button
                disabled={pending}
                onClick={() => {
                  if (confirm(zh ? '确定取消订单并释放该时段吗？' : 'Cancel this order and reopen the slot?')) {
                    run(adminCancelManualOrder, order.id)
                  }
                }}
                className="rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                {zh ? '取消并释放时段' : 'Cancel'}
              </button>
            </>
          )}
        />
      </section>

      <section className="rounded-2xl border bg-white shadow-sm">
        <div className="border-b px-5 py-4">
          <h2 className="font-semibold">{zh ? '人工结算给导师' : 'Manual mentor payout'}</h2>
          <p className="text-xs text-gray-500 mt-1">
            {zh ? '学生确认服务完成后，你线下给导师结算，再在这里标记已结算。' : 'After student confirmation, pay the mentor offline and mark it released here.'}
          </p>
        </div>
        <OrderList
          orders={confirmed}
          zh={zh}
          empty={zh ? '暂无待结算订单' : 'No payouts waiting'}
          renderActions={(order) => (
            <button
              disabled={pending}
              onClick={() => run(adminMarkManualPayoutReleased, order.id)}
              className="rounded-lg bg-green-600 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
            >
              {zh ? '标记已结算' : 'Mark released'}
            </button>
          )}
        />
      </section>

      <section className="rounded-2xl border bg-white shadow-sm">
        <div className="border-b px-5 py-4">
          <h2 className="font-semibold">{zh ? '最近订单' : 'Recent orders'}</h2>
        </div>
        <OrderList
          orders={orders.slice(0, 20)}
          zh={zh}
          empty={zh ? '暂无订单' : 'No orders'}
        />
      </section>
    </div>
  )
}

function SummaryCard({ label, value, tone }: { label: string; value: number; tone: 'yellow' | 'blue' | 'gray' }) {
  const color = tone === 'yellow' ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
    : tone === 'blue' ? 'bg-blue-50 border-blue-200 text-blue-800'
      : 'bg-white border-gray-200 text-gray-800'
  return (
    <div className={`rounded-2xl border p-4 ${color}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm mt-1">{label}</p>
    </div>
  )
}

function OrderList({
  orders,
  zh,
  empty,
  renderActions,
}: {
  orders: Order[]
  zh: boolean
  empty: string
  renderActions?: (order: Order) => ReactNode
}) {
  if (orders.length === 0) {
    return <div className="px-5 py-8 text-center text-sm text-gray-400">{empty}</div>
  }

  return (
    <div className="divide-y">
      {orders.map(order => (
        <div key={order.id} className="px-5 py-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium">{order.applicantName} → {order.adviserName}</p>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                {STATUS_ZH[order.status] ?? order.status}
              </span>
            </div>
            <p className="text-xs text-gray-500">
              {zh ? '金额：' : 'Amount: '}¥{(order.amountFen / 100).toLocaleString()}
              {' · '}
              {zh ? '导师到账：' : 'Mentor payout: '}¥{(order.adviserPayoutFen / 100).toLocaleString()}
            </p>
            <p className="text-xs text-gray-400 break-all">
              {zh ? '订单号：' : 'Order: '}{order.id}
            </p>
          </div>
          {renderActions && <div className="flex flex-wrap gap-2">{renderActions(order)}</div>}
        </div>
      ))}
    </div>
  )
}
