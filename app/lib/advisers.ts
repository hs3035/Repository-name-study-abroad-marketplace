import bcrypt from 'bcryptjs'
import type { TZValue } from './timezone'
import { loadMapSync, saveMap } from './persist'

export type DiplomaStatus = 'none' | 'pending' | 'verified'

// ── Services ──────────────────────────────────────────────────────────────────

export const SERVICE_CATALOG = [
  { key: 'essayReview',       zh: '文书修改', en: 'Essay Review',       unit: { zh: '/篇',  en: '/essay'  }, min: 1000, max: 3000 },
  { key: 'resumeReview',      zh: '简历修改', en: 'Resume Review',      unit: { zh: '/份',  en: '/resume' }, min: 800,  max: 1500 },
  { key: 'interviewCoaching', zh: '面试辅导', en: 'Interview Coaching', unit: { zh: '/小时',en: '/hour'   }, min: 1000, max: 2000 },
  { key: 'researchPlanning',  zh: '科研规划', en: 'Research Planning',  unit: { zh: '/次',  en: '/session'}, min: 500,  max: 2000 },
] as const

export type ServiceKey = typeof SERVICE_CATALOG[number]['key']

export type AdviserService = {
  enabled: boolean
  price: number   // RMB, set by adviser
}

// ── Application packages (custom per adviser) ─────────────────────────────────

export type ApplicationPackage = {
  id: string
  level: 'master' | 'phd'
  schoolCount: number
  price: number
  note: string   // adviser's custom description
}

export type AdviserPayoutInfo = {
  accountName?: string
  wechat?: string
  wechatQrUrl?: string
  alipay?: string
  alipayQrUrl?: string
  bankName?: string
  bankAccountNumber?: string
  bankBranch?: string
  note?: string
}

export const LANGUAGE_OPTIONS = [
  { value: '中文',    en: 'Chinese'  },
  { value: 'English', en: 'English'  },
  { value: '日语',    en: 'Japanese' },
  { value: '韩语',    en: 'Korean'   },
  { value: '法语',    en: 'French'   },
  { value: '德语',    en: 'German'   },
  { value: '西班牙语',en: 'Spanish'  },
] as const

// ── Adviser type ──────────────────────────────────────────────────────────────

export type Adviser = {
  id: string
  email: string
  password: string
  name: string
  school: string
  major: string
  country: string
  region: string
  phdStartYear: number
  educationBackground: string
  bio: string
  languages: string[]
  services: Partial<Record<ServiceKey, AdviserService>>
  packages: ApplicationPackage[]
  chatPrice: number
  timezone: TZValue
  role: 'adviser'
  emailVerified: boolean
  diplomaStatus: DiplomaStatus
  diplomaPath?: string
  /** Stripe Connect Express account ID, set after onboarding */
  stripeAccountId?: string
  // Extended profile fields
  workExperience?: string
  specialties?: string
  writingSampleTitle?: string
  writingSampleText?: string
  writingSampleFileUrl?: string
  videoIntroUrl?: string
  profilePhotoUrl?: string
  successStories?: string
  meetingLinks?: {
    zoom?: string
    tencent?: string
    lark?: string
  }
  /** Private payout instructions visible only to platform admins */
  payoutInfo?: AdviserPayoutInfo
  updatedAt?: string
}

/** Public adviser type — strips private auth/payment fields, adds stripeReady flag */
export type PublicAdviser = Omit<Adviser, 'password' | 'stripeAccountId' | 'payoutInfo'> & {
  stripeReady: boolean
}

function toPublic(adviser: Adviser): PublicAdviser {
  const rest = { ...adviser }
  delete (rest as Partial<Adviser>).password
  delete (rest as Partial<Adviser>).stripeAccountId
  delete (rest as Partial<Adviser>).payoutInfo
  return { ...rest, stripeReady: !!adviser.stripeAccountId } as PublicAdviser
}

// Persist across hot-reloads in dev
const FILE = '.data/advisers.json'
const globalStore = global as typeof global & { _advisers?: Map<string, Adviser> }

function initStore(): Map<string, Adviser> {
  const store = new Map<string, Adviser>()
  const seeds: Adviser[] = [
    {
      id: 'adv-1',
      email: 'zhang@mit.edu',
      password: bcrypt.hashSync('password123', 10),
      name: '张明',
      school: 'MIT',
      major: '计算机科学',
      country: '美国',
      region: '马萨诸塞州',
      phdStartYear: 2022,
      educationBackground: '本科：清华大学计算机系，硕士：MIT EECS',
      bio: '专注机器学习和自然语言处理研究，有三篇顶会论文，乐于帮助学弟学妹规划CS申请。',
      languages: ['中文', 'English'],
      services: {
        essayReview:       { enabled: true, price: 1500 },
        interviewCoaching: { enabled: true, price: 1200 },
      },
      packages: [
        { id: 'p1-1', level: 'master', schoolCount: 5,  price: 15000, note: '含选校+文书+套磁' },
        { id: 'p1-2', level: 'phd',    schoolCount: 8,  price: 30000, note: '含套磁信+推荐信指导' },
      ],
      chatPrice: 300, timezone: 'America/New_York',
      role: 'adviser',
      emailVerified: true,
      diplomaStatus: 'none',
    },
    {
      id: 'adv-2',
      email: 'li@stanford.edu',
      password: bcrypt.hashSync('password123', 10),
      name: '李雪',
      school: 'Stanford University',
      major: '生物工程',
      country: '美国',
      region: '加利福尼亚州',
      phdStartYear: 2021,
      educationBackground: '本科：北京大学生命科学，硕士：斯坦福生物工程',
      bio: '斯坦福生物工程在读博士，研究方向合成生物学，可提供科研规划和文书修改建议。',
      languages: ['中文', 'English'],
      services: {
        essayReview:      { enabled: true, price: 2000 },
        researchPlanning: { enabled: true, price: 1500 },
      },
      packages: [
        { id: 'p2-1', level: 'master', schoolCount: 6,  price: 20000, note: '含文书+选校+套磁' },
        { id: 'p2-2', level: 'phd',    schoolCount: 10, price: 40000, note: '全程陪跑，含科研规划' },
      ],
      chatPrice: 400, timezone: 'America/Los_Angeles',
      role: 'adviser',
      emailVerified: true,
      diplomaStatus: 'none',
    },
    {
      id: 'adv-3',
      email: 'wang@columbia.edu',
      password: bcrypt.hashSync('password123', 10),
      name: '王芳',
      school: 'Columbia University',
      major: '金融工程',
      country: '美国',
      region: '纽约州',
      phdStartYear: 2023,
      educationBackground: '本科：复旦大学数学系，硕士：哥伦比亚大学金融工程',
      bio: '哥大金融工程博士，擅长量化方向，熟悉纽约金融圈招聘，可提供选校和面试辅导。',
      languages: ['中文', 'English'],
      services: {
        interviewCoaching: { enabled: true, price: 1500 },
        resumeReview:      { enabled: true, price: 1000 },
      },
      packages: [
        { id: 'p3-1', level: 'master', schoolCount: 8, price: 25000, note: '金融/量化方向专属' },
      ],
      chatPrice: 500, timezone: 'America/New_York',
      role: 'adviser',
      emailVerified: true,
      diplomaStatus: 'none',
    },
    {
      id: 'adv-4',
      email: 'chen@ox.ac.uk',
      password: bcrypt.hashSync('password123', 10),
      name: '陈思远',
      school: 'University of Oxford',
      major: '经济学',
      country: '英国',
      region: '牛津',
      phdStartYear: 2022,
      educationBackground: '本科：上海交通大学，硕士：伦敦经济学院',
      bio: '牛津经济学博士，专注发展经济学，有丰富英国申请经验，可提供全程陪跑服务。',
      languages: ['中文', 'English'],
      services: {
        essayReview: { enabled: true, price: 1800 },
      },
      packages: [
        { id: 'p4-1', level: 'master', schoolCount: 5,  price: 18000, note: '英国方向专属，含牛剑' },
        { id: 'p4-2', level: 'phd',    schoolCount: 6,  price: 35000, note: '英国博士全程' },
      ],
      chatPrice: 350, timezone: 'Europe/London',
      role: 'adviser',
      emailVerified: true,
      diplomaStatus: 'none',
    },
    {
      id: 'adv-5',
      email: 'liu@utoronto.ca',
      password: bcrypt.hashSync('password123', 10),
      name: '刘浩',
      school: 'University of Toronto',
      major: '电子工程',
      country: '加拿大',
      region: '安大略省',
      phdStartYear: 2021,
      educationBackground: '本科：浙江大学电气工程，硕士：多伦多大学ECE',
      bio: '多伦多大学电子工程博士，研究无线通信，熟悉加拿大PR申请流程。',
      languages: ['中文', 'English'],
      services: {
        essayReview:      { enabled: true, price: 1200 },
        resumeReview:     { enabled: true, price: 1000 },
        researchPlanning: { enabled: true, price: 1000 },
      },
      packages: [
        { id: 'p5-1', level: 'master', schoolCount: 6, price: 15000, note: '加拿大方向' },
        { id: 'p5-2', level: 'phd',    schoolCount: 8, price: 28000, note: '含科研背景提升规划' },
      ],
      chatPrice: 280, timezone: 'America/Toronto',
      role: 'adviser',
      emailVerified: true,
      diplomaStatus: 'none',
    },
    {
      id: 'adv-6',
      email: 'zhao@ucla.edu',
      password: bcrypt.hashSync('password123', 10),
      name: '赵琳',
      school: 'UCLA',
      major: '心理学',
      country: '美国',
      region: '加利福尼亚州',
      phdStartYear: 2023,
      educationBackground: '本科：武汉大学心理学，硕士：UCLA心理学',
      bio: 'UCLA临床心理学在读博士，擅长帮助文科背景同学规划心理/社会科学申请。',
      languages: ['中文', 'English'],
      services: {
        essayReview:       { enabled: true, price: 1500 },
        interviewCoaching: { enabled: true, price: 1200 },
      },
      packages: [
        { id: 'p6-1', level: 'master', schoolCount: 5, price: 12000, note: '心理/社科方向' },
        { id: 'p6-2', level: 'phd',    schoolCount: 6, price: 25000, note: '含套磁+面试准备' },
      ],
      chatPrice: 320, timezone: 'America/Los_Angeles',
      role: 'adviser',
      emailVerified: true,
      diplomaStatus: 'none',
    },
  ]
  for (const a of seeds) store.set(a.id, a)
  return store
}
// load persisted advisers if available, otherwise use seeded store
const loaded = loadMapSync<Adviser>(FILE)
const advisers: Map<string, Adviser> =
  globalStore._advisers ?? (globalStore._advisers = (loaded.size ? loaded : initStore()))

// persist initial seeds if we just created them
if (!loaded.size) saveMap(FILE, advisers).catch(() => {})

export function getAdviserByEmail(email: string): Adviser | undefined {
  return Array.from(advisers.values()).find(a => a.email === email)
}

export function getAdviserById(id: string): Adviser | undefined {
  return advisers.get(id)
}

export function getAllAdvisers(): PublicAdviser[] {
  return Array.from(advisers.values()).map(toPublic)
}

export function searchAdvisers(filter: {
  name?: string
  country?: string
  major?: string
}): PublicAdviser[] {
  const fName = filter.name?.toLowerCase() ?? ''
  const fCountry = filter.country?.toLowerCase() ?? ''
  const fMajor = filter.major?.toLowerCase() ?? ''

  return Array.from(advisers.values())
    .filter(a => {
      if (fName && !a.name.toLowerCase().includes(fName)) return false
      if (fCountry && !(a.country ?? '').toLowerCase().includes(fCountry)) return false
      if (fMajor && !a.major.toLowerCase().includes(fMajor) && !(a.services && Object.keys(a.services).join(' ').toLowerCase().includes(fMajor))) return false
      return true
    })
    .map(toPublic)
}

export async function createAdviser(data: {
  email: string
  password: string
  name: string
  school: string
  major: string
  country: string
  region: string
  phdStartYear: number
  educationBackground: string
  bio: string
  emailVerified: boolean
  diplomaStatus: DiplomaStatus
  diplomaPath?: string
}): Promise<Adviser | null> {
  if (getAdviserByEmail(data.email)) return null
  const adviser: Adviser = {
    id: crypto.randomUUID(),
    ...data,
    languages: ['中文'],
    services: {},
    packages: [],
    chatPrice: 200, timezone: 'America/New_York',
    password: await bcrypt.hash(data.password, 10),
    role: 'adviser',
  }
  advisers.set(adviser.id, adviser)
  saveMap(FILE, advisers).catch(() => {})
  return adviser
}

export function updateAdviser(
  id: string,
  patch: Partial<Omit<Adviser, 'id' | 'email' | 'password' | 'role'>>,
): boolean {
  const adviser = advisers.get(id)
  if (!adviser) return false
  advisers.set(id, { ...adviser, ...patch })
  saveMap(FILE, advisers).catch(() => {})
  return true
}

export async function verifyAdviser(
  email: string,
  password: string,
): Promise<Adviser | null> {
  const adviser = getAdviserByEmail(email)
  if (!adviser) return null
  return (await bcrypt.compare(password, adviser.password)) ? adviser : null
}
