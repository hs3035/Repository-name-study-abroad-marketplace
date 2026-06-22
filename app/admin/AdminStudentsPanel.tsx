'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { adminFetchApplicants, type AdminApplicant } from '@/app/actions/admin'
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

function levelLabel(level: AdminApplicant['applicationLevel'], zh: boolean): string {
  if (level === 'undergraduate') return zh ? '本科' : 'Undergraduate'
  if (level === 'master') return zh ? '硕士' : "Master's"
  return zh ? '博士' : 'PhD'
}

export default function AdminStudentsPanel({ locale }: Props) {
  const zh = locale === 'zh'
  const [students, setStudents] = useState<AdminApplicant[]>([])
  const [pending, startTransition] = useTransition()

  function load() {
    startTransition(async () => {
      setStudents(await adminFetchApplicants())
    })
  }

  useEffect(() => { load() }, [])

  const stats = useMemo(() => {
    const now = Date.now()
    const oneDay = 24 * 60 * 60 * 1000
    const sevenDays = 7 * oneDay
    return {
      total: students.length,
      today: students.filter(s => s.createdAt && now - new Date(s.createdAt).getTime() <= oneDay).length,
      week: students.filter(s => s.createdAt && now - new Date(s.createdAt).getTime() <= sevenDays).length,
      paid: students.filter(s => s.paidOrderCount > 0).length,
    }
  }, [students])

  return (
    <section className="rounded-2xl border bg-white shadow-sm">
      <div className="border-b px-5 py-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="font-semibold">{zh ? '学生注册数据' : 'Student registrations'}</h2>
          <p className="text-xs text-gray-500 mt-1">
            {zh ? '查看有多少学生注册、注册时间、申请方向和付款情况。' : 'See student signups, registration time, goals, and payment activity.'}
          </p>
        </div>
        <button onClick={load} disabled={pending} className="rounded-lg border px-3 py-1.5 text-xs hover:bg-gray-50 disabled:opacity-50">
          {zh ? '刷新' : 'Refresh'}
        </button>
      </div>

      <div className="grid gap-3 p-5 md:grid-cols-4">
        <StudentStat label={zh ? '学生总数' : 'Total students'} value={stats.total} />
        <StudentStat label={zh ? '24小时新增' : 'New in 24h'} value={stats.today} />
        <StudentStat label={zh ? '7天新增' : 'New in 7d'} value={stats.week} />
        <StudentStat label={zh ? '已付款学生' : 'Paid students'} value={stats.paid} />
      </div>

      {students.length === 0 ? (
        <div className="px-5 pb-8 text-center text-sm text-gray-400">
          {zh ? '暂无学生注册' : 'No students registered yet'}
        </div>
      ) : (
        <div className="overflow-x-auto border-t">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="px-5 py-3 text-left font-medium">{zh ? '学生' : 'Student'}</th>
                <th className="px-5 py-3 text-left font-medium">{zh ? '联系方式' : 'Contact'}</th>
                <th className="px-5 py-3 text-left font-medium">{zh ? '申请方向' : 'Goal'}</th>
                <th className="px-5 py-3 text-left font-medium">{zh ? '注册时间' : 'Registered'}</th>
                <th className="px-5 py-3 text-left font-medium">{zh ? '订单' : 'Orders'}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {students.map(student => (
                <tr key={student.id} className="align-top">
                  <td className="px-5 py-4">
                    <p className="font-medium text-gray-900">{student.name}</p>
                    {student.country && <p className="text-xs text-gray-500 mt-0.5">{student.country}</p>}
                  </td>
                  <td className="px-5 py-4 text-xs text-gray-600">
                    {student.email && <p className="break-all">{student.email}</p>}
                    {student.phone && <p className="break-all">{student.phone}</p>}
                    {!student.email && !student.phone && <p className="text-gray-400">-</p>}
                  </td>
                  <td className="px-5 py-4 text-xs text-gray-600">
                    <p>{levelLabel(student.applicationLevel, zh)} · {student.intendedMajor}</p>
                    {(student.targetCountries ?? []).length > 0 && (
                      <p className="mt-0.5 text-gray-400">{student.targetCountries?.join(', ')}</p>
                    )}
                  </td>
                  <td className="px-5 py-4 text-xs text-gray-600 whitespace-nowrap">
                    {formatDate(student.createdAt, zh)}
                  </td>
                  <td className="px-5 py-4 text-xs text-gray-600">
                    <p>{zh ? '全部：' : 'All: '}{student.orderCount}</p>
                    <p>{zh ? '已付款：' : 'Paid: '}{student.paidOrderCount}</p>
                    {student.totalPaidFen > 0 && (
                      <p className="font-medium text-green-700">¥{(student.totalPaidFen / 100).toLocaleString()}</p>
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

function StudentStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border bg-gray-50 p-4">
      <p className="text-2xl font-bold">{value}</p>
      <p className="mt-1 text-sm text-gray-500">{label}</p>
    </div>
  )
}
