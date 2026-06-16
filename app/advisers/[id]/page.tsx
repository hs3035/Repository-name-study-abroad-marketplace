import { notFound } from 'next/navigation'
import { getAdviserById, SERVICE_CATALOG } from '@/app/lib/advisers'
import { getMentorPublicReviews, getMentorReviewSummary } from '@/app/lib/reviews'
import { getLocale } from '@/app/lib/locale'

// ── Video embed helper ────────────────────────────────────────────────────────

function getEmbedUrl(url: string): string | null {
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/)
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`
  const bvMatch = url.match(/bilibili\.com\/video\/(BV[A-Za-z0-9]+)/)
  if (bvMatch) return `https://player.bilibili.com/player.html?bvid=${bvMatch[1]}&high_quality=1`
  return null
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl border p-6">
      <h2 className="text-base font-semibold text-gray-800 mb-4 pb-2 border-b">{title}</h2>
      {children}
    </section>
  )
}

export default async function AdviserPublicProfile({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const locale  = await getLocale()
  const zh      = locale === 'zh'

  const adviser = getAdviserById(id)
  if (!adviser) notFound()

  const reviews = getMentorPublicReviews(adviser.id)
  const summary = getMentorReviewSummary(adviser.id)

  const activeServices = SERVICE_CATALOG.filter(s => adviser.services?.[s.key]?.enabled)
  const packages       = adviser.packages ?? []
  const embedUrl       = adviser.videoIntroUrl ? getEmbedUrl(adviser.videoIntroUrl) : null

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border p-6 flex gap-5 items-start">
        <div className="w-20 h-20 rounded-full border-2 border-gray-200 overflow-hidden bg-gray-100 flex items-center justify-center shrink-0">
          {adviser.profilePhotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={adviser.profilePhotoUrl} alt={adviser.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-3xl text-gray-300">👤</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-xl font-bold">{adviser.name}</h1>
              <p className="text-sm text-gray-500 mt-0.5">{adviser.school} · {adviser.major}</p>
              <p className="text-xs text-gray-400 mt-0.5">{adviser.country} · {adviser.region}</p>
            </div>
            {summary.count > 0 && (
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-yellow-400 text-lg">{'★'.repeat(Math.round(summary.average))}{'☆'.repeat(5 - Math.round(summary.average))}</span>
                <span className="text-sm font-semibold">{summary.average.toFixed(1)}</span>
                <span className="text-xs text-gray-400">({summary.count} {zh ? '条评价' : 'reviews'})</span>
              </div>
            )}
          </div>

          {/* Language tags */}
          {(adviser.languages ?? []).length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {adviser.languages.map(l => (
                <span key={l} className="text-xs bg-blue-50 text-blue-700 border border-blue-100 rounded-full px-3 py-0.5">{l}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── 自我介绍 ──────────────────────────────────────────────────────── */}
      {adviser.bio && (
        <Section title={zh ? '自我介绍' : 'About Me'}>
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{adviser.bio}</p>
        </Section>
      )}

      {/* ── 教育背景 ──────────────────────────────────────────────────────── */}
      {adviser.educationBackground && (
        <Section title={zh ? '教育背景' : 'Education Background'}>
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{adviser.educationBackground}</p>
        </Section>
      )}

      {/* ── 研究/工作经历 ─────────────────────────────────────────────────── */}
      {adviser.workExperience && (
        <Section title={zh ? '研究 / 工作经历' : 'Research / Work Experience'}>
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{adviser.workExperience}</p>
        </Section>
      )}

      {/* ── 擅长服务 ──────────────────────────────────────────────────────── */}
      {adviser.specialties && (
        <Section title={zh ? '擅长服务' : 'Service Specialties'}>
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{adviser.specialties}</p>
        </Section>
      )}

      {/* ── 服务 & 价格 ───────────────────────────────────────────────────── */}
      {(activeServices.length > 0 || packages.length > 0) && (
        <Section title={zh ? '服务 & 价格' : 'Services & Pricing'}>
          {activeServices.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-gray-400 mb-2">{zh ? '单项服务' : 'Individual Services'}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activeServices.map(svc => {
                  const s = adviser.services![svc.key]!
                  return (
                    <div key={svc.key} className="rounded-xl border p-4 flex justify-between items-center">
                      <p className="text-sm font-medium">{zh ? svc.zh : svc.en}</p>
                      <div className="text-right">
                        <p className="text-lg font-bold">¥{s.price.toLocaleString()}</p>
                        <p className="text-xs text-gray-400">{zh ? svc.unit.zh : svc.unit.en}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {packages.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 mb-2">{zh ? '申请套餐' : 'Application Packages'}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {packages.map(pkg => (
                  <div key={pkg.id} className="rounded-xl border p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium
                        ${pkg.level === 'phd' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                        {pkg.level === 'phd' ? (zh ? '博士' : 'PhD') : (zh ? '硕士' : "Master's")}
                      </span>
                      <span className="text-sm font-medium">{pkg.schoolCount} {zh ? '所学校' : 'schools'}</span>
                    </div>
                    {pkg.note && <p className="text-xs text-gray-500 mb-2">{pkg.note}</p>}
                    <p className="text-xl font-bold">¥{pkg.price.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {adviser.chatPrice > 0 && (
            <div className="mt-4 rounded-xl border border-black/10 bg-gray-50 px-4 py-3 flex items-center justify-between">
              <p className="text-sm font-medium">{zh ? '预约咨询（30 分钟）' : 'Book a consultation (30 min)'}</p>
              <p className="text-lg font-bold">¥{adviser.chatPrice}</p>
            </div>
          )}
        </Section>
      )}

      {/* ── 导师写作样本 ──────────────────────────────────────────────────── */}
      {(adviser.writingSampleTitle || adviser.writingSampleText || adviser.writingSampleFileUrl) && (
        <Section title={zh ? '导师写作样本 / Writing Sample' : 'Writing Sample / 导师写作样本'}>
          {adviser.writingSampleTitle && (
            <p className="text-sm font-semibold text-gray-800 mb-3">{adviser.writingSampleTitle}</p>
          )}
          {adviser.writingSampleText && (
            <div className="rounded-xl bg-gray-50 border px-4 py-4 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap max-h-72 overflow-y-auto font-mono">
              {adviser.writingSampleText}
            </div>
          )}
          {adviser.writingSampleFileUrl && (
            <a
              href={adviser.writingSampleFileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-3 rounded-xl border px-4 py-2 text-sm font-medium hover:bg-gray-50 transition"
            >
              📄 {zh ? '查看完整写作样本文件 →' : 'View full writing sample file →'}
            </a>
          )}
        </Section>
      )}

      {/* ── 视频介绍 ──────────────────────────────────────────────────────── */}
      {adviser.videoIntroUrl && (
        <Section title={zh ? '视频介绍' : 'Video Introduction'}>
          {embedUrl ? (
            <div className="rounded-xl overflow-hidden border aspect-video">
              <iframe src={embedUrl} className="w-full h-full" allowFullScreen title="video intro" />
            </div>
          ) : (
            <a
              href={adviser.videoIntroUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium hover:bg-gray-50 transition"
            >
              🎬 {zh ? '观看视频介绍 →' : 'Watch video introduction →'}
            </a>
          )}
        </Section>
      )}

      {/* ── 学生成功案例 ──────────────────────────────────────────────────── */}
      {adviser.successStories && (
        <Section title={zh ? '学生成功案例' : 'Student Success Stories'}>
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{adviser.successStories}</p>
        </Section>
      )}

      {/* ── 学生评价 ──────────────────────────────────────────────────────── */}
      {reviews.length > 0 && (
        <Section title={zh ? `学生评价（${reviews.length} 条）` : `Student Reviews (${reviews.length})`}>
          <div className="space-y-3">
            {reviews.map(r => (
              <div key={r.id} className="rounded-xl bg-gray-50 border px-4 py-3 space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-yellow-400">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                  <span className="text-xs text-gray-400">
                    {new Date(r.createdAt).toLocaleDateString(zh ? 'zh-CN' : 'en-US', {
                      year: 'numeric', month: 'short', day: 'numeric',
                    })}
                  </span>
                </div>
                {r.comment && <p className="text-sm text-gray-600 leading-relaxed">{r.comment}</p>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ── 预约咨询 CTA ─────────────────────────────────────────────────── */}
      <div className="bg-black rounded-2xl p-6 text-center text-white space-y-3">
        <p className="text-lg font-semibold">{zh ? `预约 ${adviser.name} 的咨询` : `Book a consultation with ${adviser.name}`}</p>
        <p className="text-sm text-gray-300">
          {zh ? '登录后即可预约时间段，开始你的申请之旅。' : 'Log in to book an available time slot and start your application journey.'}
        </p>
        <a
          href="/login"
          className="inline-block rounded-xl bg-white text-black px-6 py-2.5 text-sm font-medium hover:bg-gray-100 transition"
        >
          {zh ? '立即登录预约 →' : 'Log in to book →'}
        </a>
      </div>

    </div>
  )
}
