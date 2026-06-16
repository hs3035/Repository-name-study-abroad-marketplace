'use client'

import { useState, useEffect } from 'react'
import { fetchAdviserAvailableSlots } from '@/app/actions/slots'
import type { SlotPublic } from '@/app/lib/slots'
import { utcToZoned } from '@/app/lib/timezone'
import { getDict } from '@/app/lib/i18n'
import type { Locale } from '@/app/lib/i18n'

type Props = {
  adviserId: string
  adviserName: string
  adviserTimezone: string
  adviserStripeReady: boolean
  locale: Locale
  onClose: () => void
}

type LocalSlot = SlotPublic & {
  localDate: string
  localTime: string
  localTzLabel: string
  adviserDate: string
  adviserTime: string
  adviserTzLabel: string
}

function getStudentTimezone(): string {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone } catch { return 'Asia/Shanghai' }
}

function formatDateHeader(localDate: string, locale: Locale): string {
  const d = new Date(localDate + 'T00:00:00Z')
  const weekdays = locale === 'zh'
    ? ['周日','周一','周二','周三','周四','周五','周六']
    : ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
  return `${weekdays[d.getUTCDay()]} ${d.getUTCMonth() + 1}/${d.getUTCDate()}`
}

export default function BookSlotModal({ adviserId, adviserName, adviserTimezone, adviserStripeReady, locale, onClose }: Props) {
  const t = getDict(locale).calendar
  const zh = locale === 'zh'

  const [allSlots, setAllSlots]         = useState<LocalSlot[]>([])
  const [loading, setLoading]           = useState(true)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<LocalSlot | null>(null)

  const studentTz = getStudentTimezone()

  useEffect(() => {
    fetchAdviserAvailableSlots(adviserId).then(slots => {
      const converted: LocalSlot[] = slots.map(s => {
        const utc = new Date(s.utcStart)
        const { date: localDate, time: localTime, tzLabel: localTzLabel } = utcToZoned(utc, studentTz)
        const { date: adviserDate, time: adviserTime, tzLabel: adviserTzLabel } = utcToZoned(utc, adviserTimezone)
        return { ...s, localDate, localTime, localTzLabel, adviserDate, adviserTime, adviserTzLabel }
      })
      setAllSlots(converted)
      setLoading(false)
    })
  }, [adviserId, studentTz, adviserTimezone])

  // Group by student's local date
  const byDate: Record<string, LocalSlot[]> = {}
  for (const slot of allSlots) {
    if (!byDate[slot.localDate]) byDate[slot.localDate] = []
    byDate[slot.localDate].push(slot)
  }
  const dates = Object.keys(byDate).sort()

  function handlePay() {
    if (!selectedSlot) return
    // Navigate to the dedicated checkout page where the student can review
    // the booking details and choose a payment method before paying.
    window.location.href = `/checkout?slotId=${selectedSlot.id}`
  }

  const sameTimezone = studentTz === adviserTimezone

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h2 className="font-semibold">{t.bookTitle}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{adviserName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl">×</button>
        </div>

        {/* Timezone notice */}
        {!loading && allSlots.length > 0 && (
          <div className="px-5 pt-4">
            <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-2.5 text-xs text-blue-700 space-y-0.5">
              {sameTimezone ? (
                <p>🕐 {zh
                  ? `时间以你的本地时区显示：${studentTz}`
                  : `Times shown in your local timezone: ${studentTz}`}
                </p>
              ) : (
                <>
                  <p>🕐 {zh
                    ? `以下时间已自动转换为你的本地时间：${studentTz}`
                    : `Times converted to your local timezone: ${studentTz}`}
                  </p>
                  <p className="opacity-75">{zh
                    ? `导师时区：${adviserTimezone}`
                    : `Mentor's timezone: ${adviserTimezone}`}
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {loading && (
            <div className="flex items-center justify-center py-12 text-gray-400 text-sm">
              {zh ? '加载中…' : 'Loading…'}
            </div>
          )}

          {!loading && dates.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <span className="text-4xl mb-3">📅</span>
              <p className="text-gray-500 text-sm">{t.noAvailable}</p>
            </div>
          )}

          {!loading && dates.length > 0 && (
            <>
              {/* Date selection */}
              <div>
                <p className="text-xs text-gray-500 mb-2">{t.selectDate}</p>
                <div className="flex flex-wrap gap-2">
                  {dates.map(date => (
                    <button key={date}
                      onClick={() => { setSelectedDate(date); setSelectedSlot(null) }}
                      className={`rounded-xl border px-4 py-2 text-sm transition
                        ${selectedDate === date ? 'bg-black text-white border-black' : 'hover:border-gray-400'}`}>
                      {formatDateHeader(date, locale)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time slots */}
              {selectedDate && (
                <div>
                  <p className="text-xs text-gray-500 mb-2">{t.selectTime}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {byDate[selectedDate].map(slot => (
                      <button key={slot.id}
                        onClick={() => setSelectedSlot(slot)}
                        className={`rounded-xl border py-3 text-sm font-medium transition
                          ${selectedSlot?.id === slot.id ? 'bg-black text-white border-black' : 'hover:border-gray-400'}`}>
                        <div>{slot.localTime}</div>
                        {!sameTimezone && (
                          <div className="text-xs opacity-60 mt-0.5">{slot.adviserTime} {slot.adviserTzLabel}</div>
                        )}
                        <div className="text-xs opacity-70 mt-0.5">¥{slot.price}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Confirm */}
              {selectedSlot && (
                <div className="rounded-xl bg-gray-50 border p-4 space-y-2">
                  <p className="text-sm font-medium">
                    {formatDateHeader(selectedSlot.localDate, locale)} {selectedSlot.localTime}
                    <span className="text-xs font-normal text-gray-400 ml-1">({selectedSlot.localTzLabel})</span>
                  </p>
                  {!sameTimezone && (
                    <p className="text-xs text-gray-500">
                      {zh ? '导师时间：' : "Mentor's time: "}
                      {formatDateHeader(selectedSlot.adviserDate, locale)} {selectedSlot.adviserTime}
                      <span className="ml-1">({selectedSlot.adviserTzLabel})</span>
                    </p>
                  )}
                  <p className="text-sm text-gray-500">30 {zh ? '分钟' : 'min'} · ¥{selectedSlot.price}</p>
                  {!adviserStripeReady && (
                    <p className="text-xs text-amber-600">{t.noStripe}</p>
                  )}
                  <button onClick={handlePay} disabled={!adviserStripeReady}
                    className="w-full rounded-xl bg-black py-2.5 text-sm font-medium text-white disabled:opacity-50 transition mt-1">
                    {`${t.bookConfirm} ¥${selectedSlot.price}`}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
