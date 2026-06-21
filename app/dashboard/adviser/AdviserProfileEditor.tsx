'use client'

import { useEffect, useState, useTransition, useRef } from 'react'
import { saveAdviserProfile, uploadAdviserPayoutQr, uploadWritingSample } from '@/app/actions/adviser'
import {
  SERVICE_CATALOG,
  LANGUAGE_OPTIONS,
  type ServiceKey,
  type AdviserService,
  type ApplicationPackage,
  type AdviserPayoutInfo,
  type AdviserContactInfo,
} from '@/app/lib/advisers'

type InitialData = {
  bio: string
  workExperience: string
  specialties: string
  successStories: string
  writingSampleTitle: string
  writingSampleText: string
  writingSampleFileUrl: string
  videoIntroUrl: string
  profilePhotoUrl: string
  languages: string[]
  services: Partial<Record<ServiceKey, AdviserService>>
  packages: ApplicationPackage[]
  contactInfo: AdviserContactInfo
  meetingLinks: { zoom?: string; tencent?: string; lark?: string }
  payoutInfo: AdviserPayoutInfo
}

type Props = {
  adviserId: string
  initial: InitialData
  locale: string
}

function newPackage(): ApplicationPackage {
  return { id: crypto.randomUUID(), level: 'master', schoolCount: 5, price: 15000, note: '' }
}

type Tab = 'about' | 'sample' | 'video' | 'services' | 'contact' | 'meeting' | 'payout'

// ── Embed helpers ──────────────────────────────────────────────────────────────

function getEmbedUrl(url: string): string | null {
  if (!url) return null
  // YouTube: youtube.com/watch?v=ID or youtu.be/ID
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/)
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`
  // Bilibili: bilibili.com/video/BV...
  const bvMatch = url.match(/bilibili\.com\/video\/(BV[A-Za-z0-9]+)/)
  if (bvMatch) return `https://player.bilibili.com/player.html?bvid=${bvMatch[1]}&high_quality=1`
  return null
}

// ── FileUploadButton — shared upload row ──────────────────────────────────────

function FileUploadButton({
  label, accept, hint, currentUrl, onUpload, zh,
}: {
  label: string
  accept: string
  hint: string
  currentUrl: string
  onUpload: (fd: FormData) => Promise<{ ok: boolean; url?: string; error?: string }>
  zh: boolean
}) {
  const [uploading, startUpload] = useTransition()
  const [err, setErr] = useState('')
  const [url, setUrl] = useState(currentUrl)
  const ref = useRef<HTMLInputElement>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setErr('')
    startUpload(async () => {
      const fd = new FormData()
      // The field name is derived: "photo" for photos, "sample" for writing samples
      const fieldName = accept.startsWith('image') ? 'photo' : 'sample'
      fd.set(fieldName, file)
      const res = await onUpload(fd)
      if (res.ok && res.url) setUrl(res.url)
      else setErr(res.error ?? (zh ? '上传失败' : 'Upload failed'))
    })
  }

  return (
    <div className="space-y-2">
      <label className="block text-xs text-gray-500">{label}</label>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => ref.current?.click()}
          disabled={uploading}
          className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition"
        >
          {uploading ? (zh ? '上传中…' : 'Uploading…') : (zh ? '选择文件' : 'Choose file')}
        </button>
        {url && (
          <a href={url} target="_blank" rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:underline truncate max-w-xs">
            {zh ? '查看已上传文件 →' : 'View uploaded file →'}
          </a>
        )}
      </div>
      <p className="text-xs text-gray-400">{hint}</p>
      {err && <p className="text-xs text-red-500">{err}</p>}
      <input ref={ref} type="file" accept={accept} className="hidden" onChange={handleChange} />
    </div>
  )
}

function PayoutQrUploadButton({
  kind, currentUrl, onUploaded, zh,
}: {
  kind: 'wechat' | 'alipay'
  currentUrl: string
  onUploaded: (url: string) => void
  zh: boolean
}) {
  const [uploading, startUpload] = useTransition()
  const [err, setErr] = useState('')
  const ref = useRef<HTMLInputElement>(null)
  const label = kind === 'wechat'
    ? (zh ? '上传微信收款码' : 'Upload WeChat Pay QR')
    : (zh ? '上传支付宝收款码' : 'Upload Alipay QR')

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setErr('')
    startUpload(async () => {
      const fd = new FormData()
      fd.set('qr', file)
      const res = await uploadAdviserPayoutQr(kind, fd)
      if (res.ok && res.url) onUploaded(res.url)
      else setErr(res.error ?? (zh ? '上传失败' : 'Upload failed'))
    })
  }

  return (
    <div className="rounded-xl border bg-gray-50 p-4 space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {zh ? '支持 JPG、PNG、WEBP，最大 5MB。学生看不到，只有平台管理员结算时可见。' : 'JPG, PNG, WEBP up to 5 MB. Hidden from students and visible only to platform admins.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => ref.current?.click()}
          disabled={uploading}
          className="rounded-xl border bg-white px-4 py-2 text-sm font-medium hover:bg-gray-100 disabled:opacity-50 transition"
        >
          {uploading ? (zh ? '上传中…' : 'Uploading…') : (zh ? '选择图片' : 'Choose image')}
        </button>
      </div>
      {currentUrl && (
        <div className="flex items-center gap-3">
          <img src={currentUrl} alt={label} className="h-24 w-24 rounded-lg border bg-white object-contain" />
          <a href={currentUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
            {zh ? '查看大图 →' : 'View full size →'}
          </a>
        </div>
      )}
      {err && <p className="text-xs text-red-500">{err}</p>}
      <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleChange} />
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function AdviserProfileEditor({ initial, locale }: Props) {
  const zh = locale === 'zh'

  const [editing, setEditing]   = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('about')

  // About tab
  const [bio, setBio]                       = useState(initial.bio)
  const [workExperience, setWorkExp]        = useState(initial.workExperience)
  const [specialties, setSpecialties]       = useState(initial.specialties)
  const [successStories, setSuccessStories] = useState(initial.successStories)

  // Writing sample tab
  const [sampleMode, setSampleMode]           = useState<'text' | 'file'>(
    initial.writingSampleFileUrl ? 'file' : 'text',
  )
  const [writingSampleTitle, setSampleTitle]  = useState(initial.writingSampleTitle)
  const [writingSampleText, setSampleText]    = useState(initial.writingSampleText)
  const [writingSampleFileUrl, setSampleFile] = useState(initial.writingSampleFileUrl)

  // Video tab
  const [videoIntroUrl, setVideoUrl] = useState(initial.videoIntroUrl)

  // Contact tab
  const [contactWechat, setContactWechat] = useState(initial.contactInfo.wechat ?? '')
  const [contactEmail, setContactEmail]   = useState(initial.contactInfo.email ?? '')
  const [contactPhone, setContactPhone]   = useState(initial.contactInfo.phone ?? '')
  const [contactNote, setContactNote]     = useState(initial.contactInfo.note ?? '')

  // Meeting links tab
  const [zoomLink, setZoomLink]       = useState(initial.meetingLinks.zoom ?? '')
  const [tencentLink, setTencentLink] = useState(initial.meetingLinks.tencent ?? '')
  const [larkLink, setLarkLink]       = useState(initial.meetingLinks.lark ?? '')

  // Private payout info tab
  const [payoutAccountName, setPayoutAccountName] = useState(initial.payoutInfo.accountName ?? '')
  const [payoutWechat, setPayoutWechat]           = useState(initial.payoutInfo.wechat ?? '')
  const [payoutWechatQrUrl, setPayoutWechatQrUrl] = useState(initial.payoutInfo.wechatQrUrl ?? '')
  const [payoutAlipay, setPayoutAlipay]           = useState(initial.payoutInfo.alipay ?? '')
  const [payoutAlipayQrUrl, setPayoutAlipayQrUrl] = useState(initial.payoutInfo.alipayQrUrl ?? '')
  const [payoutBankName, setPayoutBankName]       = useState(initial.payoutInfo.bankName ?? '')
  const [payoutBankAccountNumber, setPayoutBankAccountNumber] = useState(initial.payoutInfo.bankAccountNumber ?? '')
  const [payoutBankBranch, setPayoutBankBranch]   = useState(initial.payoutInfo.bankBranch ?? '')
  const [payoutNote, setPayoutNote]               = useState(initial.payoutInfo.note ?? '')

  // Services tab
  const [languages, setLanguages]   = useState<string[]>(initial.languages ?? [])
  const [services, setServices]     = useState<Partial<Record<ServiceKey, AdviserService>>>(initial.services ?? {})
  const [packages, setPackages]     = useState<ApplicationPackage[]>(initial.packages ?? [])

  const [saved, setSaved]           = useState(false)
  const [error, setError]           = useState('')
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    function openPayoutSettings() {
      setEditing(true)
      setActiveTab('payout')
      window.setTimeout(() => {
        document.getElementById('profile-payout-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 0)
    }

    window.addEventListener('open-adviser-payout-settings', openPayoutSettings)
    return () => window.removeEventListener('open-adviser-payout-settings', openPayoutSettings)
  }, [])

  // ── services helpers ─────────────────────────────────────────────────────────
  function toggleLanguage(lang: string) {
    setLanguages(prev => prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang])
  }
  function toggleService(key: ServiceKey, checked: boolean) {
    setServices(prev => {
      if (!checked) { const next = { ...prev }; delete next[key]; return next }
      const svc = SERVICE_CATALOG.find(s => s.key === key)!
      return { ...prev, [key]: { enabled: true, price: prev[key]?.price ?? svc.min } }
    })
  }
  function setServicePrice(key: ServiceKey, price: number) {
    setServices(prev => ({ ...prev, [key]: { enabled: true, price } }))
  }
  function addPackage() { setPackages(prev => [...prev, newPackage()]) }
  function removePackage(id: string) { setPackages(prev => prev.filter(p => p.id !== id)) }
  function updatePackage(id: string, field: keyof ApplicationPackage, value: string | number) {
    setPackages(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p))
  }

  // ── save ──────────────────────────────────────────────────────────────────────
  function handleSave() {
    setError('')
    setSaved(false)
    startTransition(async () => {
      const fd = new FormData()
      fd.set('bio', bio)
      fd.set('workExperience', workExperience)
      fd.set('specialties', specialties)
      fd.set('successStories', successStories)
      fd.set('writingSampleTitle', writingSampleTitle)
      fd.set('writingSampleText', sampleMode === 'text' ? writingSampleText : '')
      fd.set('videoIntroUrl', videoIntroUrl)
      languages.forEach(l => fd.append('languages', l))
      for (const svc of SERVICE_CATALOG) {
        const s = services[svc.key]
        if (s?.enabled) {
          fd.set(`svc_enabled_${svc.key}`, 'on')
          fd.set(`svc_price_${svc.key}`, String(s.price))
        }
      }
      fd.set('packages', JSON.stringify(packages))
      fd.set('contactWechat', contactWechat)
      fd.set('contactEmail', contactEmail)
      fd.set('contactPhone', contactPhone)
      fd.set('contactNote', contactNote)
      fd.set('meetingZoom', zoomLink)
      fd.set('meetingTencent', tencentLink)
      fd.set('meetingLark', larkLink)
      fd.set('payoutAccountName', payoutAccountName)
      fd.set('payoutWechat', payoutWechat)
      fd.set('payoutWechatQrUrl', payoutWechatQrUrl)
      fd.set('payoutAlipay', payoutAlipay)
      fd.set('payoutAlipayQrUrl', payoutAlipayQrUrl)
      fd.set('payoutBankName', payoutBankName)
      fd.set('payoutBankAccountNumber', payoutBankAccountNumber)
      fd.set('payoutBankBranch', payoutBankBranch)
      fd.set('payoutNote', payoutNote)
      const res = await saveAdviserProfile(fd)
      if (res.ok) { setSaved(true); setEditing(false) }
      else setError(res.error ?? (zh ? '保存失败' : 'Save failed'))
    })
  }

  const activeServices = SERVICE_CATALOG.filter(s => services[s.key]?.enabled)

  // ── view mode ────────────────────────────────────────────────────────────────
  if (!editing) {
    return (
      <div className="space-y-5">
        {/* Services summary */}
        {activeServices.length > 0 && (
          <div>
            <p className="text-xs text-gray-500 mb-2">{zh ? '单项服务定价' : 'Individual Services'}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {activeServices.map(svc => {
                const s = services[svc.key]!
                return (
                  <div key={svc.key} className="rounded-xl border p-4 flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium">{zh ? svc.zh : svc.en}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {zh ? '建议' : 'Suggested'} ¥{svc.min.toLocaleString()}–{svc.max.toLocaleString()}{zh ? svc.unit.zh : svc.unit.en}
                      </p>
                    </div>
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
            <p className="text-xs text-gray-500 mb-2">{zh ? '申请套餐' : 'Application Packages'}</p>
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

        {(activeServices.length === 0 && packages.length === 0) && (
          <p className="text-sm text-gray-400">{zh ? '暂未设置服务项目' : 'No services set yet'}</p>
        )}

        {saved && <p className="text-xs text-green-600">✓ {zh ? '已保存' : 'Saved'}</p>}

        <button
          onClick={() => setEditing(true)}
          className="rounded-xl border px-5 py-2 text-sm font-medium hover:bg-gray-50 transition"
        >
          {zh ? '编辑完整档案 →' : 'Edit Full Profile →'}
        </button>
      </div>
    )
  }

  // ── edit mode ────────────────────────────────────────────────────────────────
  const TABS: { id: Tab; zh: string; en: string }[] = [
    { id: 'about',    zh: '关于我',      en: 'About' },
    { id: 'sample',   zh: '写作样本',    en: 'Writing Sample' },
    { id: 'video',    zh: '视频介绍',    en: 'Video Intro' },
    { id: 'services', zh: '服务 & 价格', en: 'Services' },
    { id: 'contact',  zh: '联系方式',    en: 'Contact' },
    { id: 'meeting',  zh: '会议链接',    en: 'Meeting Links' },
    { id: 'payout',   zh: '结算账户',    en: 'Payout Info' },
  ]

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {TABS.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 text-sm font-medium transition border-b-2 -mb-px
              ${activeTab === t.id ? 'border-black text-black' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            {zh ? t.zh : t.en}
          </button>
        ))}
      </div>

      {/* ── Tab: About ────────────────────────────────────────────────────── */}
      {activeTab === 'about' && (
        <div className="space-y-5">
          <div>
            <label className="block text-xs text-gray-500 mb-1">{zh ? '自我介绍' : 'About Me'}</label>
            <textarea rows={4} value={bio} onChange={e => setBio(e.target.value)}
              placeholder={zh ? '介绍你的研究方向、学术背景、可以帮助学生做什么…' : 'Describe your research, background, and how you can help students…'}
              className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black transition resize-none" />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">{zh ? '研究/工作经历' : 'Research / Work Experience'}</label>
            <textarea rows={4} value={workExperience} onChange={e => setWorkExp(e.target.value)}
              placeholder={zh ? '如：2022–至今 MIT 机器学习实验室研究助理，发表 NeurIPS 2023 论文…' : 'e.g. 2022–present: Research Assistant, MIT ML Lab. Published NeurIPS 2023 paper…'}
              className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black transition resize-none" />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">{zh ? '擅长服务领域' : 'Service Specialties'}</label>
            <textarea rows={3} value={specialties} onChange={e => setSpecialties(e.target.value)}
              placeholder={zh ? '如：CS/AI 方向博士申请、文书打磨、套磁信、科研规划…' : 'e.g. CS/AI PhD applications, statement of purpose, research emails, planning…'}
              className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black transition resize-none" />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">{zh ? '学生成功案例' : 'Student Success Stories'}</label>
            <textarea rows={4} value={successStories} onChange={e => setSuccessStories(e.target.value)}
              placeholder={zh ? '如：帮助3位学生成功录取 CMU/Stanford/MIT，其中2位获得全额奖学金…' : 'e.g. Helped 3 students get admitted to CMU/Stanford/MIT, 2 with full scholarships…'}
              className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black transition resize-none" />
          </div>
        </div>
      )}

      {/* ── Tab: Writing Sample ───────────────────────────────────────────── */}
      {activeTab === 'sample' && (
        <div className="space-y-5">
          <div>
            <label className="block text-xs text-gray-500 mb-1">{zh ? '写作样本标题' : 'Writing Sample Title'}</label>
            <input type="text" value={writingSampleTitle} onChange={e => setSampleTitle(e.target.value)}
              placeholder={zh ? '如：个人陈述（申请斯坦福大学计算机科学博士）' : 'e.g. Statement of Purpose – Stanford Computer Science PhD'}
              className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black transition" />
          </div>

          <div className="flex gap-2">
            {(['text', 'file'] as const).map(m => (
              <button key={m} type="button" onClick={() => setSampleMode(m)}
                className={`rounded-xl border px-4 py-2 text-sm font-medium transition
                  ${sampleMode === m ? 'bg-black text-white border-black' : 'text-gray-600 hover:border-gray-400'}`}>
                {m === 'text' ? (zh ? '📝 粘贴文字' : '📝 Paste text') : (zh ? '📎 上传文件' : '📎 Upload file')}
              </button>
            ))}
          </div>

          {sampleMode === 'text' ? (
            <div>
              <label className="block text-xs text-gray-500 mb-1">{zh ? '写作样本内容' : 'Writing Sample Content'}</label>
              <textarea rows={10} value={writingSampleText} onChange={e => setSampleText(e.target.value)}
                placeholder={zh ? '将你的写作样本粘贴到这里…' : 'Paste your writing sample here…'}
                className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black transition resize-none font-mono" />
            </div>
          ) : (
            <div>
              <FileUploadButton
                label={zh ? '上传写作样本文件' : 'Upload writing sample file'}
                accept="application/pdf,.doc,.docx"
                hint={zh ? '支持 PDF、DOC、DOCX，最大 5MB' : 'PDF, DOC, DOCX up to 5 MB'}
                currentUrl={writingSampleFileUrl}
                onUpload={async fd => {
                  const res = await uploadWritingSample(fd)
                  if (res.ok && res.url) setSampleFile(res.url)
                  return res
                }}
                zh={zh}
              />
            </div>
          )}

          <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 text-xs text-blue-700">
            {zh
              ? '写作样本将在你的公开档案上显示，帮助学生了解你的写作和文书风格。'
              : 'Your writing sample will be shown on your public profile to help students understand your writing style.'}
          </div>
        </div>
      )}

      {/* ── Tab: Video Intro ─────────────────────────────────────────────── */}
      {activeTab === 'video' && (
        <div className="space-y-5">
          <div>
            <label className="block text-xs text-gray-500 mb-1">{zh ? '视频介绍链接' : 'Video Introduction URL'}</label>
            <input type="url" value={videoIntroUrl} onChange={e => setVideoUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black transition" />
            <p className="text-xs text-gray-400 mt-1.5">
              {zh ? '支持 YouTube、Bilibili、Vimeo、小红书等链接' : 'Supports YouTube, Bilibili, Vimeo, and other video links'}
            </p>
          </div>

          {/* Preview embed if parseable */}
          {videoIntroUrl && (() => {
            const embed = getEmbedUrl(videoIntroUrl)
            return embed ? (
              <div className="rounded-xl overflow-hidden border aspect-video">
                <iframe src={embed} className="w-full h-full" allowFullScreen />
              </div>
            ) : (
              <div className="rounded-xl bg-gray-50 border px-4 py-3 text-sm text-gray-600">
                {zh ? '⚠️ 无法自动嵌入，将在档案页以链接形式展示。' : '⚠️ Cannot auto-embed — it will appear as a link on your profile.'}
                <br />
                <a href={videoIntroUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline mt-1 inline-block">
                  {zh ? '测试链接 →' : 'Test link →'}
                </a>
              </div>
            )
          })()}

          <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 text-xs text-blue-700">
            {zh
              ? '建议录制 1–3 分钟的自我介绍视频，上传至 YouTube 或 Bilibili 后粘贴链接。'
              : 'We recommend a 1–3 minute intro video. Upload it to YouTube or Bilibili, then paste the link here.'}
          </div>
        </div>
      )}

      {/* ── Tab: Services ────────────────────────────────────────────────── */}
      {activeTab === 'services' && (
        <div className="space-y-7">
          {/* Languages */}
          <div>
            <label className="block text-xs text-gray-500 mb-2">{zh ? '服务语言' : 'Languages'}</label>
            <div className="flex flex-wrap gap-2">
              {LANGUAGE_OPTIONS.map(lang => {
                const selected = languages.includes(lang.value)
                return (
                  <button key={lang.value} type="button" onClick={() => toggleLanguage(lang.value)}
                    className={`rounded-full border px-4 py-1.5 text-sm transition
                      ${selected ? 'bg-black text-white border-black' : 'text-gray-600 hover:border-gray-400'}`}>
                    {zh ? lang.value : lang.en}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Fixed services */}
          <div>
            <label className="block text-xs text-gray-500 mb-2">
              {zh ? '单项服务（勾选后填写报价）' : 'Individual Services'}
            </label>
            <div className="space-y-2">
              {SERVICE_CATALOG.map(svc => {
                const s = services[svc.key]
                const enabled = s?.enabled ?? false
                return (
                  <div key={svc.key} className={`rounded-xl border p-4 transition ${enabled ? 'border-black bg-gray-50' : ''}`}>
                    <div className="flex items-center justify-between gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={enabled}
                          onChange={e => toggleService(svc.key, e.target.checked)}
                          className="w-4 h-4 accent-black" />
                        <span className="text-sm font-medium">{zh ? svc.zh : svc.en}</span>
                      </label>
                      <span className="text-xs text-gray-400">
                        {zh ? '建议' : 'Suggested'} ¥{svc.min.toLocaleString()}–{svc.max.toLocaleString()}{zh ? svc.unit.zh : svc.unit.en}
                      </span>
                    </div>
                    {enabled && (
                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-sm text-gray-500">¥</span>
                        <input type="number" min={1}
                          value={s?.price ?? svc.min}
                          onChange={e => setServicePrice(svc.key, Number(e.target.value))}
                          className="w-32 rounded-xl border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-black transition" />
                        <span className="text-sm text-gray-400">{zh ? svc.unit.zh : svc.unit.en}</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Application packages */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-gray-500">{zh ? '申请套餐' : 'Application Packages'}</label>
              <span className="text-xs text-gray-400">{zh ? '建议 ¥10,000–¥50,000' : 'Suggested ¥10,000–¥50,000'}</span>
            </div>
            <div className="space-y-3">
              {packages.map((pkg, i) => (
                <div key={pkg.id} className="rounded-xl border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">
                      {zh ? `套餐 ${i + 1}` : `Package ${i + 1}`}
                    </span>
                    <button type="button" onClick={() => removePackage(pkg.id)}
                      className="text-xs text-gray-400 hover:text-red-500 transition">
                      {zh ? '删除' : 'Remove'}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">{zh ? '学位类型' : 'Degree'}</label>
                      <div className="flex gap-2">
                        {(['master', 'phd'] as const).map(lv => (
                          <button key={lv} type="button" onClick={() => updatePackage(pkg.id, 'level', lv)}
                            className={`flex-1 rounded-xl border py-2 text-sm font-medium transition
                              ${pkg.level === lv ? 'bg-black text-white border-black' : 'text-gray-600 hover:border-gray-400'}`}>
                            {lv === 'master' ? (zh ? '硕士' : "Master's") : (zh ? '博士' : 'PhD')}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">{zh ? '申请学校数量' : '# Schools'}</label>
                      <input type="number" min={1} max={30} value={pkg.schoolCount}
                        onChange={e => updatePackage(pkg.id, 'schoolCount', Number(e.target.value))}
                        className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black transition" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">{zh ? '套餐总价（¥）' : 'Price (¥)'}</label>
                    <input type="number" min={1} value={pkg.price}
                      onChange={e => updatePackage(pkg.id, 'price', Number(e.target.value))}
                      className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black transition" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">{zh ? '套餐说明' : 'Description'}</label>
                    <input type="text" value={pkg.note}
                      onChange={e => updatePackage(pkg.id, 'note', e.target.value)}
                      placeholder={zh ? '如：含文书修改+套磁信+面试辅导' : 'e.g. Essay review + interview coaching'}
                      className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black transition" />
                  </div>
                </div>
              ))}
            </div>
            <button type="button" onClick={addPackage}
              className="mt-3 w-full rounded-xl border-2 border-dashed py-3 text-sm text-gray-500 hover:border-gray-400 hover:text-gray-700 transition">
              + {zh ? '添加套餐' : 'Add Package'}
            </button>
          </div>
        </div>
      )}

      {/* ── Tab: Contact Info ────────────────────────────────────────────── */}
      {activeTab === 'contact' && (
        <div className="space-y-5">
          <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 text-xs text-blue-700">
            {zh
              ? '这些联系方式只会在学生付款被平台确认后显示，用于和学生确认具体咨询安排。建议至少填写微信或邮箱，避免学生付款后找不到你。'
              : 'These contact details are shown only after the student payment is confirmed. Add at least WeChat or email so paid students can coordinate the meeting with you.'}
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">{zh ? '微信号' : 'WeChat ID'}</label>
            <input
              type="text"
              value={contactWechat}
              onChange={e => setContactWechat(e.target.value)}
              placeholder={zh ? '如：gomentorgo_mentor' : 'e.g. gomentorgo_mentor'}
              className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black transition"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">{zh ? '联系邮箱' : 'Contact email'}</label>
            <input
              type="email"
              value={contactEmail}
              onChange={e => setContactEmail(e.target.value)}
              placeholder={zh ? '学生付款后可通过这个邮箱联系你' : 'Paid students can contact you here'}
              className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black transition"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">{zh ? '手机 / WhatsApp / 其他联系方式（可选）' : 'Phone / WhatsApp / other contact (optional)'}</label>
            <input
              type="text"
              value={contactPhone}
              onChange={e => setContactPhone(e.target.value)}
              placeholder={zh ? '如：WhatsApp、Telegram 或手机号' : 'e.g. WhatsApp, Telegram, or phone number'}
              className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black transition"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">{zh ? '联系备注（可选）' : 'Contact note (optional)'}</label>
            <textarea
              rows={3}
              value={contactNote}
              onChange={e => setContactNote(e.target.value)}
              placeholder={zh ? '如：添加微信请备注 GoMentorGo + 订单号；通常 24 小时内回复。' : 'e.g. Please mention GoMentorGo + order ID when adding me; I usually reply within 24 hours.'}
              className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black transition resize-none"
            />
          </div>
        </div>
      )}

      {/* ── Tab: Meeting Links ───────────────────────────────────────────── */}
      {activeTab === 'meeting' && (
        <div className="space-y-5">
          <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 text-xs text-blue-700">
            {zh
              ? '填写你的视频会议链接。学生付款成功后可以看到这些链接并选择适合自己的工具加入会议。推荐优先填写腾讯会议，方便中国大陆的学生使用。'
              : 'Add your meeting room links. Students can see these after payment and choose whichever tool works best for them. We recommend Tencent Meeting / VooV for students in China.'}
          </div>

          {[
            {
              key: 'zoom' as const,
              icon: '🖥️',
              label: 'Zoom',
              sublabel: zh ? '国际学生首选，中国大陆可能需要 VPN' : 'Preferred internationally; may need VPN in mainland China',
              ph: 'https://zoom.us/j/your-personal-room',
              value: zoomLink,
              set: setZoomLink,
            },
            {
              key: 'tencent' as const,
              icon: '🇨🇳',
              label: zh ? '腾讯会议 / VooV Meeting' : 'Tencent Meeting / VooV',
              sublabel: zh ? '中国大陆可用，海外用 VooV Meeting 客户端，同一链接' : 'Works in China; international users use the VooV Meeting app — same link',
              ph: 'https://meeting.tencent.com/dm/your-room',
              value: tencentLink,
              set: setTencentLink,
            },
            {
              key: 'lark' as const,
              icon: '🪶',
              label: zh ? '飞书 / Lark' : 'Feishu / Lark',
              sublabel: zh ? '中国大陆和海外均可使用' : 'Works in China and abroad',
              ph: 'https://vc.feishu.cn/j/your-room',
              value: larkLink,
              set: setLarkLink,
            },
          ].map(item => (
            <div key={item.key} className="rounded-xl border p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span>{item.icon}</span>
                <span className="text-sm font-medium">{item.label}</span>
              </div>
              <p className="text-xs text-gray-400">{item.sublabel}</p>
              <input
                type="url"
                value={item.value}
                onChange={e => item.set(e.target.value)}
                placeholder={item.ph}
                className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black transition"
              />
            </div>
          ))}
        </div>
      )}

      {/* ── Tab: Payout Info ─────────────────────────────────────────────── */}
      {activeTab === 'payout' && (
        <div className="space-y-5">
          <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800">
            {zh
              ? '这里填写的是平台给你结算时使用的收款信息。你可以同时填写微信、支付宝、银行卡三种方式；学生看不到这些信息，只有平台管理员结算订单时可以查看。'
              : 'This payout information is used by the platform to pay you after completed orders. You can add WeChat, Alipay, and bank transfer details. Students cannot see this; only platform admins can view it when processing payouts.'}
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">{zh ? '收款人姓名 / 昵称' : 'Payout account name'}</label>
            <input
              type="text"
              value={payoutAccountName}
              onChange={e => setPayoutAccountName(e.target.value)}
              placeholder={zh ? '如：GoMentorGo / 张三' : 'e.g. GoMentorGo / Jane Zhang'}
              className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black transition"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <PayoutQrUploadButton
              kind="wechat"
              currentUrl={payoutWechatQrUrl}
              onUploaded={setPayoutWechatQrUrl}
              zh={zh}
            />
            <PayoutQrUploadButton
              kind="alipay"
              currentUrl={payoutAlipayQrUrl}
              onUploaded={setPayoutAlipayQrUrl}
              zh={zh}
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">{zh ? '微信收款账号（可选）' : 'WeChat payout account (optional)'}</label>
            <input
              type="text"
              value={payoutWechat}
              onChange={e => setPayoutWechat(e.target.value)}
              placeholder={zh ? '如果已上传收款码，这里可以不填' : 'Optional if you uploaded a QR code'}
              className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black transition"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">{zh ? '支付宝收款账号（可选）' : 'Alipay payout account (optional)'}</label>
            <input
              type="text"
              value={payoutAlipay}
              onChange={e => setPayoutAlipay(e.target.value)}
              placeholder={zh ? '如果已上传收款码，这里可以不填' : 'Optional if you uploaded a QR code'}
              className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black transition"
            />
          </div>

          <div className="rounded-2xl border bg-gray-50 p-4 space-y-4">
            <div>
              <p className="text-sm font-semibold text-gray-900">{zh ? '银行卡收款（可选）' : 'Bank transfer payout (optional)'}</p>
              <p className="mt-1 text-xs text-gray-500">
                {zh
                  ? '如果你希望平台通过银行转账结算，可以填写银行卡信息。建议至少填写银行名称、收款人和银行卡号。'
                  : 'If you want the platform to pay you by bank transfer, add your bank details. Bank name, account holder, and account number are recommended.'}
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1">{zh ? '银行名称' : 'Bank name'}</label>
                <input
                  type="text"
                  value={payoutBankName}
                  onChange={e => setPayoutBankName(e.target.value)}
                  placeholder={zh ? '如：中国银行 / 招商银行' : 'e.g. Bank of China / Chase'}
                  className="w-full rounded-xl border bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black transition"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">{zh ? '银行卡号 / 银行账号' : 'Bank account number'}</label>
                <input
                  type="text"
                  value={payoutBankAccountNumber}
                  onChange={e => setPayoutBankAccountNumber(e.target.value)}
                  placeholder={zh ? '仅平台管理员可见' : 'Visible only to platform admins'}
                  className="w-full rounded-xl border bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black transition"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">{zh ? '开户行 / 支行（可选）' : 'Branch / routing note (optional)'}</label>
              <input
                type="text"
                value={payoutBankBranch}
                onChange={e => setPayoutBankBranch(e.target.value)}
                placeholder={zh ? '如：中国银行上海徐汇支行' : 'e.g. branch name, routing note, or transfer instruction'}
                className="w-full rounded-xl border bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">{zh ? '结算备注（可选）' : 'Payout note (optional)'}</label>
            <textarea
              rows={3}
              value={payoutNote}
              onChange={e => setPayoutNote(e.target.value)}
              placeholder={zh ? '如：优先支付宝；也可以银行卡；每周五统一结算；请备注 GoMentorGo 咨询费等' : 'e.g. Prefer Alipay; bank transfer also works; weekly payout preferred; include GoMentorGo consultation fee in note'}
              className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black transition resize-none"
            />
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-3 pt-2 border-t">
        <button onClick={handleSave} disabled={isPending}
          className="rounded-xl bg-black px-6 py-2.5 text-sm font-medium text-white disabled:opacity-50 transition">
          {isPending ? (zh ? '保存中…' : 'Saving…') : (zh ? '保存所有更改' : 'Save All Changes')}
        </button>
        <button onClick={() => { setEditing(false); setError('') }}
          className="rounded-xl border px-6 py-2.5 text-sm font-medium hover:bg-gray-50 transition">
          {zh ? '取消' : 'Cancel'}
        </button>
      </div>
    </div>
  )
}
