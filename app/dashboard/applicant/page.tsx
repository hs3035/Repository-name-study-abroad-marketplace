import { getSession } from '@/app/lib/session'
import { getAllAdvisers } from '@/app/lib/advisers'
import { getApplicantById } from '@/app/lib/applicants'
import { getMentorReviewSummary, getMentorPublicReviews } from '@/app/lib/reviews'
import { getAdviserCompletedOrderCount } from '@/app/lib/orders'
import { redirect } from 'next/navigation'
import { getDict } from '@/app/lib/i18n'
import { getLocale } from '@/app/lib/locale'
import { getPaymentMode } from '@/app/lib/payment-mode'
import AdviserSearch from './AdviserSearch'
import ApplicantProfile from './ApplicantProfile'
import PaymentHistory from './PaymentHistory'
import SearchPeopleClient from '@/app/components/SearchPeopleClient'
import type { ReviewSummary, Review } from '@/app/lib/reviews'

export default async function ApplicantDashboard() {
  const [session, locale] = await Promise.all([getSession(), getLocale()])
  if (!session || session.role !== 'applicant') redirect('/login')

  const applicant = getApplicantById(session.userId)
  if (!applicant) redirect('/login')

  const advisers = getAllAdvisers()
  const paymentMode = getPaymentMode()
  const reviewSummaries: Record<string, ReviewSummary> = {}
  const reviewsByAdviser: Record<string, Review[]> = {}
  const completedCounts: Record<string, number> = {}
  for (const a of advisers) {
    reviewSummaries[a.id] = getMentorReviewSummary(a.id)
    reviewsByAdviser[a.id] = getMentorPublicReviews(a.id)
    completedCounts[a.id] = getAdviserCompletedOrderCount(a.id)
  }
  const d = getDict(locale)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{d.dashboard.welcome}，{session.name} 👋</h1>
        <p className="mt-1 text-gray-500 text-sm">{d.applicantDash.subtitle}</p>
      </div>

      {/* Profile card */}
      <section className="bg-white rounded-2xl border p-6">
        <h2 className="text-lg font-semibold mb-4">{d.applicantProfile.title}</h2>
        <ApplicantProfile
          locale={locale}
          initial={{
            bio: applicant.bio ?? '',
            intendedMajor: applicant.intendedMajor,
            applicationLevel: applicant.applicationLevel,
            currentSchool: applicant.currentSchool ?? '',
            targetCountries: applicant.targetCountries ?? [],
            applicationYear: applicant.applicationYear ?? '',
            backgroundNotes: applicant.backgroundNotes ?? '',
          }}
        />
      </section>

      {/* Payment history */}
      <section className="bg-white rounded-2xl border p-6">
        <h2 className="text-lg font-semibold mb-4">{locale === 'zh' ? '我的支付记录' : 'My Payments'}</h2>
        <PaymentHistory locale={locale} />
      </section>

      {/* Adviser search */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">{locale === 'zh' ? '寻找更多导师' : 'Find More Mentors'}</h2>
          <p className="mt-1 text-sm text-gray-500">
            {locale === 'zh'
              ? '可以继续筛选其他导师，查看主页、评价和可预约时间。'
              : 'Search other mentors, view profiles, reviews, and availability.'}
          </p>
        </div>
        <AdviserSearch advisers={advisers} reviewSummaries={reviewSummaries} reviewsByAdviser={reviewsByAdviser} completedCounts={completedCounts} paymentMode={paymentMode} locale={locale} />
      </section>

      <section className="bg-white rounded-2xl border p-6">
        <h2 className="text-lg font-semibold mb-4">全站用户搜索</h2>
        <SearchPeopleClient />
      </section>
    </div>
  )
}
