import { getSession } from '@/app/lib/session'
import { getAdviserById, getAllAdvisers } from '@/app/lib/advisers'
import { redirect } from 'next/navigation'
import { getDict } from '@/app/lib/i18n'
import { getLocale } from '@/app/lib/locale'
import AdviserProfileEditor from './AdviserProfileEditor'
import AdviserCalendar from './AdviserCalendar'
import ApplicantsSearchClient from './ApplicantsSearchClient'
import EarningsPanel from './EarningsPanel'
import TodaysTasks from './TodaysTasks'
import SearchPeopleClient from '@/app/components/SearchPeopleClient'
import ProfilePhotoUpload from './ProfilePhotoUpload'
import { getPaymentMode } from '@/app/lib/payment-mode'

function computeCompletion(adviser: ReturnType<typeof getAdviserById>) {
  if (!adviser) return { pct: 0, items: [] }
  const items = [
    { label_zh: '已填写自我介绍',   label_en: 'Bio filled in',         done: !!adviser.bio?.trim() },
    { label_zh: '已提交身份验证',   label_en: 'Verification submitted', done: adviser.emailVerified || adviser.diplomaStatus === 'pending' || adviser.diplomaStatus === 'verified' || !!(adviser.verificationLinks?.personalHomepage?.trim() || adviser.verificationLinks?.projectHomepage?.trim() || adviser.verificationLinks?.linkedin?.trim() || adviser.verificationLinks?.googleScholar?.trim()) },
    { label_zh: '已上传头像',        label_en: 'Profile photo uploaded', done: !!adviser.profilePhotoUrl },
    { label_zh: '已添加写作样本',    label_en: 'Writing sample added',   done: !!(adviser.writingSampleText?.trim() || adviser.writingSampleFileUrl) },
    { label_zh: '已添加视频介绍',    label_en: 'Video intro added',      done: !!adviser.videoIntroUrl?.trim() },
    { label_zh: '已填写联系方式',    label_en: 'Contact info added',      done: !!(adviser.contactInfo?.wechat?.trim() || adviser.contactInfo?.email?.trim() || adviser.contactInfo?.phone?.trim()) },
    { label_zh: '已设置会议链接',    label_en: 'Meeting links added',    done: !!(adviser.meetingLinks?.zoom?.trim() || adviser.meetingLinks?.tencent?.trim() || adviser.meetingLinks?.lark?.trim()) },
    { label_zh: '已设置服务价格',    label_en: 'Service prices set',     done: Object.values(adviser.services ?? {}).some(s => s?.enabled) },
    { label_zh: '已设置可预约时间',  label_en: 'Availability configured', done: false /* checked via TodaysTasks */ },
    { label_zh: '已填写结算账户',    label_en: 'Payout info added',       done: !!(adviser.payoutInfo?.wechat?.trim() || adviser.payoutInfo?.alipay?.trim() || adviser.payoutInfo?.wechatQrUrl || adviser.payoutInfo?.alipayQrUrl || adviser.payoutInfo?.bankAccountNumber?.trim()) },
  ]
  const doneCount = items.filter(i => i.done).length
  return { pct: Math.round((doneCount / items.length) * 100), items }
}

export default async function AdviserDashboard() {
  const [session, locale] = await Promise.all([getSession(), getLocale()])
  if (!session || session.role !== 'adviser') redirect('/login')

  const adviser = getAdviserById(session.userId)
  if (!adviser) redirect('/login')

  const d = getDict(locale)
  const ad = d.adviserDash
  const zh = locale === 'zh'
  const allAdvisers = getAllAdvisers().filter(a => a.id !== adviser.id)
  const { pct, items } = computeCompletion(adviser)
  const paymentMode = getPaymentMode()

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">{d.dashboard.welcome}，{adviser.name} 👋</h1>

      <TodaysTasks locale={locale} />

      {/* Profile completion checklist */}
      <section className="bg-white rounded-2xl border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{zh ? '档案完成度' : 'Profile Completion'}</h2>
          <span className={`text-sm font-bold ${pct >= 80 ? 'text-green-600' : pct >= 50 ? 'text-yellow-600' : 'text-red-500'}`}>
            {pct}%
          </span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2 mb-4">
          <div
            className={`h-2 rounded-full transition-all ${pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-400' : 'bg-red-400'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {items.map(item => (
            <div key={item.label_zh} className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2
              ${item.done ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-400'}`}>
              <span>{item.done ? '✓' : '○'}</span>
              <span>{zh ? item.label_zh : item.label_en}</span>
            </div>
          ))}
        </div>
        {pct < 100 && (
          <p className="text-xs text-gray-400 mt-3">
            {zh
              ? '完善档案有助于吸引更多学生，建议尽快填写所有内容。'
              : 'A complete profile attracts more students. Fill in the missing sections below.'}
          </p>
        )}
      </section>

      {/* Profile card */}
      <section id="profile-payout-section" className="bg-white rounded-2xl border p-6">
        <h2 className="text-lg font-semibold mb-4">{ad.profileTitle}</h2>

        <div className="flex items-start gap-5 mb-6">
          {/* Photo */}
          <ProfilePhotoUpload
            currentUrl={adviser.profilePhotoUrl ?? ''}
            locale={locale}
          />

          {/* Info grid */}
          <div className="flex-1 grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <div>
              <span className="text-gray-500">{ad.school}</span>
              <p className="font-medium mt-0.5">{adviser.school}</p>
            </div>
            <div>
              <span className="text-gray-500">{ad.major}</span>
              <p className="font-medium mt-0.5">{adviser.major}</p>
            </div>
            <div>
              <span className="text-gray-500">{ad.location}</span>
              <p className="font-medium mt-0.5">{adviser.country} · {adviser.region}</p>
            </div>
            <div>
              <span className="text-gray-500">{ad.phdYear}</span>
              <p className="font-medium mt-0.5">{adviser.phdStartYear}{ad.yearSuffix}</p>
            </div>
            <div className="col-span-2">
              <span className="text-gray-500">{ad.education}</span>
              <p className="font-medium mt-0.5">{adviser.educationBackground}</p>
            </div>
            {adviser.bio && (
              <div className="col-span-2">
                <span className="text-gray-500">{zh ? '自我介绍' : 'Bio'}</span>
                <p className="font-medium mt-0.5 leading-relaxed whitespace-pre-wrap line-clamp-3">{adviser.bio}</p>
              </div>
            )}
          </div>
        </div>

        <div className="border-t pt-5">
          <AdviserProfileEditor
            adviserId={adviser.id}
            locale={locale}
            initial={{
              email:                adviser.email,
              bio:                  adviser.bio ?? '',
              workExperience:       adviser.workExperience ?? '',
              specialties:          adviser.specialties ?? '',
              successStories:       adviser.successStories ?? '',
              writingSampleTitle:   adviser.writingSampleTitle ?? '',
              writingSampleText:    adviser.writingSampleText ?? '',
              writingSampleFileUrl: adviser.writingSampleFileUrl ?? '',
              videoIntroUrl:        adviser.videoIntroUrl ?? '',
              profilePhotoUrl:      adviser.profilePhotoUrl ?? '',
              languages:            adviser.languages ?? [],
              services:             adviser.services ?? {},
              packages:             adviser.packages ?? [],
              contactInfo:          adviser.contactInfo ?? {},
              meetingLinks:         adviser.meetingLinks ?? {},
              payoutInfo:           adviser.payoutInfo ?? {},
              diplomaStatus:        adviser.diplomaStatus,
              diplomaPath:          adviser.diplomaPath ?? '',
              verificationLinks:    adviser.verificationLinks ?? {},
            }}
          />
        </div>
      </section>

      {/* Earnings & Stripe Connect */}
      <section id="orders-section" className="bg-white rounded-2xl border p-6">
        <h2 className="text-lg font-semibold mb-5">{zh ? '收款 & 收益' : 'Payments & Earnings'}</h2>
        <EarningsPanel locale={locale} paymentMode={paymentMode} />
      </section>

      {/* Browse other advisers */}
      <section className="bg-white rounded-2xl border p-6">
        <h2 className="text-lg font-semibold mb-4">{zh ? '浏览导师' : 'Browse Mentors'}</h2>
        <div className="grid grid-cols-3 gap-4">
          {allAdvisers.map(a => (
            <div key={a.id} className="p-4 border rounded-xl">
              <div className="font-medium">{a.name}</div>
              <div className="text-xs text-gray-500">{a.school} · {a.major}</div>
              <div className="mt-2 text-sm text-gray-700">
                {a.educationBackground?.slice(0, 80) ?? ''}
                {a.educationBackground && a.educationBackground.length > 80 ? '…' : ''}
              </div>
              <div className="mt-3 text-sm text-gray-700">{zh ? '面谈价' : 'Chat price'}: ¥{a.chatPrice}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Global people search */}
      <section className="bg-white rounded-2xl border p-6">
        <h2 className="text-lg font-semibold mb-4">{zh ? '全站用户搜索' : 'Search All Users'}</h2>
        <SearchPeopleClient />
      </section>

      {/* Calendar */}
      <section id="availability-section" className="bg-white rounded-2xl border p-6">
        <h2 className="text-lg font-semibold mb-5">{d.calendar.title}</h2>
        <AdviserCalendar locale={locale} initialChatPrice={adviser.chatPrice} initialTimezone={adviser.timezone} />
      </section>

      {/* Students section */}
      <section className="bg-white rounded-2xl border p-6">
        <h2 className="text-lg font-semibold mb-4">{ad.studentsTitle}</h2>
        <ApplicantsSearchClient />
      </section>
    </div>
  )
}
