'use client'

import { useState, useMemo } from 'react'
import type { PublicAdviser } from '@/app/lib/advisers'
import { SERVICE_CATALOG } from '@/app/lib/advisers'
import type { Locale } from '@/app/lib/i18n'
import { COUNTRY_OPTIONS, getDict } from '@/app/lib/i18n'
import type { ReviewSummary, Review } from '@/app/lib/reviews'
import type { PaymentMode } from '@/app/lib/payment-mode'
import BookSlotModal from './BookSlotModal'

function StarDisplay({ average, count, zh }: { average: number; count: number; zh: boolean }) {
  if (count === 0) return null
  const full = Math.round(average)
  return (
    <div className="flex items-center gap-1">
      <span className="text-yellow-400 text-sm leading-none">
        {'★'.repeat(full)}{'☆'.repeat(5 - full)}
      </span>
      <span className="text-xs text-gray-500">{average.toFixed(1)}</span>
      <span className="text-xs text-gray-400">({count}{zh ? ' 条评价' : ' reviews'})</span>
    </div>
  )
}

function AdviserCard({ adviser, summary, reviews, completedCount, locale, onBook }: { adviser: PublicAdviser; summary: ReviewSummary; reviews: Review[]; completedCount: number; locale: Locale; onBook: () => void }) {
  const d = getDict(locale)
  const ad = d.applicantDash
  const zh = locale === 'zh'
  const countryLabel = COUNTRY_OPTIONS.find(c => c.value === adviser.country)?.[locale] ?? adviser.country
  const [showReviews, setShowReviews] = useState(false)

  const activeServices = SERVICE_CATALOG.filter(s => adviser.services?.[s.key]?.enabled)
  const packages = adviser.packages ?? []

  return (
    <div className="bg-white rounded-2xl border flex flex-col hover:shadow-md transition">
      {/* Header */}
      <div className="p-5 flex flex-col gap-3 flex-1">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-base">{adviser.name}</h3>
            <p className="text-sm text-gray-500 mt-0.5">{adviser.school}</p>
            <StarDisplay average={summary.average} count={summary.count} zh={zh} />
            {completedCount > 0 && (
              <p className="text-xs text-gray-400 mt-0.5">
                ✅ {zh
                  ? `${completedCount}+ 位学生已完成咨询`
                  : `${completedCount}+ students consulted`}
              </p>
            )}
          </div>
          <span className="text-xs bg-gray-100 rounded-full px-3 py-1 whitespace-nowrap">{countryLabel}</span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <span className="text-xs border rounded-full px-3 py-1">{adviser.major}</span>
          <span className="text-xs border rounded-full px-3 py-1">{adviser.region}</span>
          <span className="text-xs border rounded-full px-3 py-1">PhD {adviser.phdStartYear}</span>
          {(adviser.languages ?? []).map(l => (
            <span key={l} className="text-xs bg-blue-50 text-blue-700 border border-blue-100 rounded-full px-3 py-1">{l}</span>
          ))}
        </div>

        <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">{adviser.bio}</p>

        {/* Services */}
        {(activeServices.length > 0 || packages.length > 0) && (
          <div className="border-t pt-3 space-y-2">
            {activeServices.length > 0 && (
              <div>
                <p className="text-xs text-gray-400 mb-1.5">{ad.services}</p>
                <div className="flex flex-wrap gap-2">
                  {activeServices.map(svc => {
                    const s = adviser.services![svc.key]!
                    return (
                      <span key={svc.key} className="text-xs border rounded-lg px-2.5 py-1 flex items-center gap-1">
                        <span>{zh ? svc.zh : svc.en}</span>
                        <span className="font-semibold text-black">¥{s.price.toLocaleString()}</span>
                        <span className="text-gray-400">{zh ? svc.unit.zh : svc.unit.en}</span>
                      </span>
                    )
                  })}
                </div>
              </div>
            )}

            {packages.length > 0 && (
              <div>
                <p className="text-xs text-gray-400 mb-1.5">{ad.packages}</p>
                <div className="flex flex-wrap gap-2">
                  {packages.map(pkg => (
                    <span key={pkg.id} className={`text-xs rounded-lg px-2.5 py-1 flex items-center gap-1
                      ${pkg.level === 'phd' ? 'bg-purple-50 border border-purple-100 text-purple-700' : 'bg-blue-50 border border-blue-100 text-blue-700'}`}>
                      <span>{pkg.level === 'phd' ? ad.levelPhd : ad.levelMaster}</span>
                      <span>{pkg.schoolCount}{zh ? ad.packageSchools : ` ${ad.packageSchools}`}</span>
                      <span className="font-semibold text-black">¥{pkg.price.toLocaleString()}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Reviews section */}
      {reviews.length > 0 && (
        <div className="px-5 pb-3 border-t">
          <button
            onClick={() => setShowReviews(v => !v)}
            className="text-xs text-gray-500 hover:text-black mt-3 flex items-center gap-1 transition"
          >
            {showReviews
              ? (zh ? '▲ 收起评价' : '▲ Hide reviews')
              : (zh ? `▼ 查看全部 ${reviews.length} 条评价` : `▼ See all ${reviews.length} review${reviews.length > 1 ? 's' : ''}`)}
          </button>
          {showReviews && (
            <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
              {reviews.map(r => (
                <div key={r.id} className="rounded-lg bg-gray-50 border px-3 py-2 text-xs space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-yellow-400">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                    <span className="text-gray-400">{new Date(r.createdAt).toLocaleDateString(zh ? 'zh-CN' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                  </div>
                  {r.comment && <p className="text-gray-600 leading-relaxed">{r.comment}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!adviser.bookingReady && (
        <div className="px-5 pb-3">
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {zh
              ? '导师还在完善联系方式、会议链接或结算账户，暂时不能预约。'
              : 'This mentor is still completing contact, meeting, or payout setup and cannot be booked yet.'}
          </div>
        </div>
      )}

      <div className="px-5 pb-5 flex gap-2">
        <button className="flex-1 rounded-xl border py-2 text-sm font-medium hover:bg-gray-50 transition">
          {ad.contact}
        </button>
        <button
          onClick={adviser.bookingReady ? onBook : undefined}
          disabled={!adviser.bookingReady}
          className="flex-1 rounded-xl bg-black py-2 text-sm font-medium text-white hover:bg-gray-800 transition disabled:cursor-not-allowed disabled:opacity-40"
        >
          📅 {adviser.bookingReady ? d.calendar.bookChat : (zh ? '暂不可预约' : 'Not bookable')}
          {adviser.bookingReady && adviser.chatPrice > 0 && (
            <span className="ml-1 opacity-70">¥{adviser.chatPrice}</span>
          )}
        </button>
      </div>
    </div>
  )
}

export default function AdviserSearch({
  advisers,
  reviewSummaries,
  reviewsByAdviser,
  completedCounts,
  paymentMode,
  locale,
}: {
  advisers: PublicAdviser[]
  reviewSummaries: Record<string, ReviewSummary>
  reviewsByAdviser: Record<string, Review[]>
  completedCounts: Record<string, number>
  paymentMode: PaymentMode
  locale: Locale
}) {
  const d = getDict(locale).applicantDash

  const [country, setCountry] = useState('全部')
  const [region, setRegion] = useState('')
  const [school, setSchool] = useState('')
  const [major, setMajor] = useState('')
  const [bookingAdviser, setBookingAdviser] = useState<PublicAdviser | null>(null)

  const filtered = useMemo(() => {
    return advisers.filter(a => {
      if (country !== '全部' && a.country !== country) return false
      if (region && !a.region.toLowerCase().includes(region.toLowerCase())) return false
      if (school && !a.school.toLowerCase().includes(school.toLowerCase())) return false
      if (major && !a.major.includes(major)) return false
      return true
    })
  }, [advisers, country, region, school, major])

  const allOption = { value: '全部', zh: d.countryAll, en: d.countryAll } as const

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-2xl border p-5">
        <p className="text-sm font-medium mb-3 text-gray-500">{d.filterTitle}</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">{d.country}</label>
            <select value={country} onChange={e => setCountry(e.target.value)}
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black transition bg-white">
              <option value="全部">{allOption[locale]}</option>
              {COUNTRY_OPTIONS.map(c => (
                <option key={c.value} value={c.value}>{c[locale]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">{d.region}</label>
            <input type="text" placeholder={d.regionPh} value={region}
              onChange={e => setRegion(e.target.value)}
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black transition" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">{d.school}</label>
            <input type="text" placeholder={d.schoolPh} value={school}
              onChange={e => setSchool(e.target.value)}
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black transition" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">{d.major}</label>
            <input type="text" placeholder={d.majorPh} value={major}
              onChange={e => setMajor(e.target.value)}
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black transition" />
          </div>
        </div>
      </div>

      <p className="text-sm text-gray-500">
        {d.found}{' '}
        <span className="font-semibold text-black">{filtered.length}</span>{' '}
        {d.mentors}
      </p>

      {bookingAdviser && (
        <BookSlotModal
          adviserId={bookingAdviser.id}
          adviserName={bookingAdviser.name}
          adviserTimezone={bookingAdviser.timezone}
          adviserStripeReady={bookingAdviser.stripeReady}
          bookingReady={bookingAdviser.bookingReady}
          paymentMode={paymentMode}
          locale={locale}
          onClose={() => setBookingAdviser(null)}
        />
      )}

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(a => (
            <AdviserCard key={a.id} adviser={a} summary={reviewSummaries[a.id] ?? { average: 0, count: 0 }} reviews={reviewsByAdviser[a.id] ?? []} completedCount={completedCounts[a.id] ?? 0} locale={locale} onBook={() => setBookingAdviser(a)} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <span className="text-4xl mb-3">🔍</span>
          <p className="text-gray-500 text-sm">{d.noResults}</p>
          <button onClick={() => { setCountry('全部'); setRegion(''); setSchool(''); setMajor('') }}
            className="mt-3 text-sm text-black underline">
            {d.clearFilters}
          </button>
        </div>
      )}
    </div>
  )
}
