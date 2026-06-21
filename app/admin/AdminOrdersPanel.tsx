'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import type { ReactNode } from 'react'
import {
  adminCancelManualOrder,
  adminConfirmManualPayment,
  adminFetchOrders,
  adminMarkManualPayoutReleased,
  type AdminOrder,
} from '@/app/actions/admin'
import type { Locale } from '@/app/lib/i18n'

type Props = { locale: Locale }

const STATUS_ZH: Record<AdminOrder['status'], string> = {
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
  const [orders, setOrders] = useState<AdminOrder[]>([])
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
              {zh ? '学生通过微信/支付宝/银行转账付款后，在这里确认。' : 'Confirm after the student pays by WeChat, Alipay, or bank transfer.'}
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
  orders: AdminOrder[]
  zh: boolean
  empty: string
  renderActions?: (order: AdminOrder) => ReactNode
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
            <PayoutInfo order={order} zh={zh} />
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

function PayoutInfo({ order, zh }: { order: AdminOrder; zh: boolean }) {
  const info = order.adviserPayoutInfo
  if (
    !info?.accountName &&
    !info?.wechat &&
    !info?.wechatQrUrl &&
    !info?.alipay &&
    !info?.alipayQrUrl &&
    !info?.bankName &&
    !info?.bankAccountNumber &&
    !info?.bankBranch &&
    !info?.note
  ) {
    return (
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-2 text-xs text-yellow-800">
        {zh ? '导师尚未填写结算账户，请联系导师补充后再打款。' : 'The mentor has not added payout info yet. Ask them to add it before paying out.'}
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-gray-50 px-3 py-2 text-xs text-gray-600 space-y-1">
      <p className="font-medium text-gray-800">{zh ? '导师结算账户' : 'Mentor payout info'}</p>
      {info.accountName && <p>{zh ? '收款人：' : 'Name: '}<span className="font-medium">{info.accountName}</span></p>}
      {info.wechat && <p>{zh ? '微信：' : 'WeChat: '}<span className="font-medium break-all">{info.wechat}</span></p>}
      {info.alipay && <p>{zh ? '支付宝：' : 'Alipay: '}<span className="font-medium break-all">{info.alipay}</span></p>}
      {(info.bankName || info.bankAccountNumber || info.bankBranch) && (
        <div className="rounded-md border bg-white px-2 py-1.5 space-y-0.5">
          <p className="font-medium text-gray-800">{zh ? '银行卡 / 银行转账' : 'Bank transfer'}</p>
          {info.bankName && <p>{zh ? '银行：' : 'Bank: '}<span className="font-medium break-all">{info.bankName}</span></p>}
          {info.bankAccountNumber && <p>{zh ? '账号：' : 'Account: '}<span className="font-medium break-all">{info.bankAccountNumber}</span></p>}
          {info.bankBranch && <p>{zh ? '开户行：' : 'Branch: '}<span className="break-all">{info.bankBranch}</span></p>}
        </div>
      )}
      {(info.wechatQrUrl || info.alipayQrUrl) && (
        <div className="flex flex-wrap gap-3 pt-1">
          {info.wechatQrUrl && (
            <PayoutQrPreview
              label={zh ? '微信收款码' : 'WeChat QR'}
              url={info.wechatQrUrl}
            />
          )}
          {info.alipayQrUrl && (
            <PayoutQrPreview
              label={zh ? '支付宝收款码' : 'Alipay QR'}
              url={info.alipayQrUrl}
            />
          )}
        </div>
      )}
      {info.note && <p>{zh ? '备注：' : 'Note: '}<span className="break-all">{info.note}</span></p>}
    </div>
  )
}

function PayoutQrPreview({ label, url }: { label: string; url: string }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="block rounded-lg border bg-white p-2 hover:border-gray-400 transition">
      <img src={url} alt={label} className="h-28 w-28 rounded object-contain" />
      <p className="mt-1 text-center text-[11px] font-medium text-gray-600">{label}</p>
    </a>
  )
}
