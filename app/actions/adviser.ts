'use server'

import fs from 'fs/promises'
import { getSession } from '@/app/lib/session'
import {
  updateAdviser,
  SERVICE_CATALOG,
  type ServiceKey,
  type AdviserService,
  type ApplicationPackage,
} from '@/app/lib/advisers'
import { getUploadPath, getUploadPublicUrl } from '@/app/lib/storage'

export type SaveProfileResult = { ok: boolean; error?: string }

const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const ALLOWED_SAMPLE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

export async function saveAdviserProfile(formData: FormData): Promise<SaveProfileResult> {
  const session = await getSession()
  if (!session || session.role !== 'adviser') return { ok: false, error: '未登录' }

  const str = (key: string) => (formData.get(key) as string ?? '').trim()

  const bio            = str('bio')
  const workExperience = str('workExperience')
  const specialties    = str('specialties')
  const successStories = str('successStories')
  const videoIntroUrl  = str('videoIntroUrl')
  const writingSampleTitle = str('writingSampleTitle')
  const writingSampleText  = str('writingSampleText')

  const zoomLink    = str('meetingZoom')
  const tencentLink = str('meetingTencent')
  const larkLink    = str('meetingLark')

  // Validate video URL: only allow http/https
  if (videoIntroUrl && !videoIntroUrl.startsWith('http')) {
    return { ok: false, error: '视频链接必须以 http 或 https 开头' }
  }
  for (const [label, link] of [['Zoom', zoomLink], ['腾讯会议', tencentLink], ['飞书', larkLink]] as const) {
    if (link && !link.startsWith('http')) {
      return { ok: false, error: `${label} 链接必须以 http 或 https 开头` }
    }
  }

  // languages
  const languages = formData.getAll('languages').map(v => String(v)).filter(Boolean)

  // fixed services
  const services: Partial<Record<ServiceKey, AdviserService>> = {}
  for (const svc of SERVICE_CATALOG) {
    const enabled = formData.get(`svc_enabled_${svc.key}`) === 'on'
    if (enabled) {
      const priceRaw = Number(formData.get(`svc_price_${svc.key}`))
      const price = Number.isFinite(priceRaw) && priceRaw > 0 ? priceRaw : svc.min
      services[svc.key] = { enabled: true, price }
    }
  }

  // application packages — sent as JSON array
  let packages: ApplicationPackage[] = []
  try {
    const raw = formData.get('packages') as string
    if (raw) packages = JSON.parse(raw)
  } catch {}

  const meetingLinks = {
    zoom: zoomLink || undefined,
    tencent: tencentLink || undefined,
    lark: larkLink || undefined,
  }

  const ok = updateAdviser(session.userId, {
    bio,
    workExperience,
    specialties,
    successStories,
    videoIntroUrl,
    writingSampleTitle,
    writingSampleText,
    languages,
    services,
    packages,
    meetingLinks,
    updatedAt: new Date().toISOString(),
  })
  return ok ? { ok: true } : { ok: false, error: '保存失败，请重试' }
}

/** Upload a profile photo. Saves to the persistent upload store. Returns the public URL. */
export async function uploadAdviserPhoto(formData: FormData): Promise<SaveProfileResult & { url?: string }> {
  const session = await getSession()
  if (!session || session.role !== 'adviser') return { ok: false, error: '未登录' }

  const file = formData.get('photo') as File | null
  if (!file || file.size === 0) return { ok: false, error: '请选择图片文件' }
  if (!ALLOWED_PHOTO_TYPES.includes(file.type))
    return { ok: false, error: '仅支持 JPG、PNG、WEBP 格式' }
  if (file.size > 2 * 1024 * 1024)
    return { ok: false, error: '图片大小不能超过 2MB' }

  const uploadDir = getUploadPath('profiles')
  await fs.mkdir(uploadDir, { recursive: true })

  const ext      = file.type === 'image/webp' ? 'webp' : file.type === 'image/png' ? 'png' : 'jpg'
  const filename = `${session.userId}-photo-${Date.now()}.${ext}`
  const bytes    = Buffer.from(await file.arrayBuffer())
  await fs.writeFile(getUploadPath('profiles', filename), bytes)

  const url = getUploadPublicUrl('profiles', filename)
  updateAdviser(session.userId, { profilePhotoUrl: url, updatedAt: new Date().toISOString() })
  return { ok: true, url }
}

/** Upload a writing sample (PDF/DOC/DOCX). Saves to the persistent upload store. Returns the public URL. */
export async function uploadWritingSample(formData: FormData): Promise<SaveProfileResult & { url?: string }> {
  const session = await getSession()
  if (!session || session.role !== 'adviser') return { ok: false, error: '未登录' }

  const file = formData.get('sample') as File | null
  if (!file || file.size === 0) return { ok: false, error: '请选择文件' }
  if (!ALLOWED_SAMPLE_TYPES.includes(file.type))
    return { ok: false, error: '仅支持 PDF、DOC、DOCX 格式' }
  if (file.size > 5 * 1024 * 1024)
    return { ok: false, error: '文件大小不能超过 5MB' }

  const uploadDir = getUploadPath('profiles')
  await fs.mkdir(uploadDir, { recursive: true })

  const extMap: Record<string, string> = {
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  }
  const ext      = extMap[file.type] ?? 'pdf'
  const filename = `${session.userId}-sample-${Date.now()}.${ext}`
  const bytes    = Buffer.from(await file.arrayBuffer())

  await fs.writeFile(getUploadPath('profiles', filename), bytes)

  const url = getUploadPublicUrl('profiles', filename)
  updateAdviser(session.userId, { writingSampleFileUrl: url, updatedAt: new Date().toISOString() })
  return { ok: true, url }
}
