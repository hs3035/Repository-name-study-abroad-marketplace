'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState, useTransition } from 'react'
import { adminFetchAdvisers, type AdminAdviser } from '@/app/actions/admin'
import type { Locale } from '@/app/lib/i18n'

type Props = { locale: Locale }

function formatDate(value: string | undefined, zh: boolean): string {
  if (!value) return zh ? '旧数据 / 未记录' : 'Legacy / unknown'
  return new Date(value).toLocaleString(zh ? 'zh-CN' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function statusPill(label: string, ok: boolean) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
      ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
    }`}>
      {ok ? '✓ ' : '• '}{label}
    </span>
  )
}

export default function AdminAdvisersPanel({ locale }: Props) {
  const zh = locale === 'zh'
  const [advisers, setAdvisers] = useState<AdminAdviser[]>([])
  const [pending, startTransition] = useTransition()

  function load() {
    startTransition(async () => {
      setAdvisers(await adminFetchAdvisers())
    })
  }

  useEffect(() => { load() }, [])

  const stats = useMemo(() => ({
    total: advisers.length,
    verified: advisers.filter(a => a.identityVerified).length,
    bookable: advisers.filter(a => a.bookingReady).length,
    paid: advisers.filter(a => a.paidOrderCount > 0).length,
  }), [advisers])

  return (
    <section className="rounded-2xl border bg-white shadow-sm">
      <div className="border-b px-5 py-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="font-semibold">{zh ? '导师数据' : 'Mentor data'}</h2>
          <p className="text-xs text-gray-500 mt-1">
            {zh ? '查看导师注册、身份验证、预约准备状态、结算信息和订单表现。' : 'See mentor signup, verification, booking readiness, payout setup, and order performance.'}
          </p>
        </div>
        <button onClick={load} disabled={pending} className="rounded-lg border px-3 py-1.5 text-xs hover:bg-gray-50 disabled:opacity-50">
          {zh ? '刷新' : 'Refresh'}
        </button>
      </div>

      <div className="grid gap-3 p-5 md:grid-cols-4">
        <MentorStat label={zh ? '导师总数' : 'Total mentors'} value={stats.total} />
        <MentorStat label={zh ? '身份已验证' : 'Verified'} value={stats.verified} />
        <MentorStat label={zh ? '可被预约' : 'Bookable'} value={stats.bookable} />
        <MentorStat label={zh ? '有付款订单' : 'With paid orders'} value={stats.paid} />
      </div>

      {advisers.length === 0 ? (
        <div className="px-5 pb-8 text-center text-sm text-gray-400">
          {zh ? '暂无导师注册' : 'No mentors registered yet'}
        </div>
      ) : (
        <div className="overflow-x-auto border-t">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="px-5 py-3 text-left font-medium">{zh ? '导师' : 'Mentor'}</th>
                <th className="px-5 py-3 text-left font-medium">{zh ? '联系方式' : 'Contact'}</th>
                <th className="px-5 py-3 text-left font-medium">{zh ? '状态' : 'Status'}</th>
                <th className="px-5 py-3 text-left font-medium">{zh ? '注册时间' : 'Registered'}</th>
                <th className="px-5 py-3 text-left font-medium">{zh ? '订单表现' : 'Orders'}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {advisers.map(adviser => (
                <tr key={adviser.id} className="align-top">
                  <td className="px-5 py-4">
                    <Link href={`/advisers/${adviser.id}`} className="font-medium text-gray-900 hover:underline">
                      {adviser.name}
                    </Link>
                    <p className="text-xs text-gray-500 mt-0.5">{adviser.school}</p>
                    <p className="text-xs text-gray-400">{adviser.major} · {adviser.country}</p>
                  </td>
                  <td className="px-5 py-4 text-xs text-gray-600">
                    <p className="break-all">{adviser.email}</p>
                    <p className="mt-1">{zh ? '微信：' : 'WeChat: '}{adviser.contactInfo?.wechat || '-'}</p>
                    <p>{zh ? '收款人：' : 'Payout name: '}{adviser.payoutInfo?.accountName || '-'}</p>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex max-w-xs flex-wrap gap-1.5">
                      {statusPill(zh ? '身份验证' : 'Identity', adviser.identityVerified)}
                      {statusPill(zh ? '联系方式' : 'Contact', adviser.hasContactInfo)}
                      {statusPill(zh ? '会议链接' : 'Meeting', adviser.hasMeetingLinks)}
                      {statusPill(zh ? '结算账户' : 'Payout', adviser.hasPayoutInfo)}
                      {statusPill(zh ? '可预约' : 'Bookable', adviser.bookingReady)}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-xs text-gray-600 whitespace-nowrap">
                    {formatDate(adviser.createdAt, zh)}
                  </td>
                  <td className="px-5 py-4 text-xs text-gray-600">
                    <p>{zh ? '全部订单：' : 'All orders: '}{adviser.orderCount}</p>
                    <p>{zh ? '已付款：' : 'Paid: '}{adviser.paidOrderCount}</p>
                    <p>{zh ? '已完成：' : 'Completed: '}{adviser.completedOrderCount}</p>
                    {adviser.adviserPayoutFen > 0 && (
                      <p className="font-medium text-green-700">
                        {zh ? '导师应结算：' : 'Mentor payout: '}¥{(adviser.adviserPayoutFen / 100).toLocaleString()}
                      </p>
                    )}
                    {adviser.totalPaidFen > 0 && (
                      <p className="text-gray-400">
                        {zh ? '学生支付：' : 'Student paid: '}¥{(adviser.totalPaidFen / 100).toLocaleString()}
                      </p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function MentorStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border bg-gray-50 p-4">
      <p className="text-2xl font-bold">{value}</p>
      <p className="mt-1 text-sm text-gray-500">{label}</p>
    </div>
  )
}
