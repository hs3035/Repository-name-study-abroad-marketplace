export type PublicAcademic = {
  slug: string
  name: string
  institution: string
  department: string
  role: 'PhD Student' | 'Postdoctoral Fellow'
  location: string
  email: string
  researchAreas: string[]
  summaryZh: string
  summaryEn: string
  sourceUrl: string
  sourceLabel: string
  checkedAt: string
}

/**
 * Public professional information copied from the linked university pages.
 * These records are not platform accounts and must never be treated as
 * verified mentors, bookable providers, or evidence of endorsement.
 */
export const PUBLIC_ACADEMICS: PublicAcademic[] = [
  {
    slug: 'joan-orpella-nyu',
    name: 'Joan Orpella',
    institution: 'New York University',
    department: 'Poeppel Lab',
    role: 'Postdoctoral Fellow',
    location: 'New York, USA',
    email: 'jo1358@nyu.edu',
    researchAreas: ['Speech production', 'Auditory-motor synchronization', 'Statistical learning', 'BCI'],
    summaryZh: '研究语音产生、听觉—运动同步、语言统计学习、脑机接口与听觉感知。',
    summaryEn: 'Studies speech production, auditory-motor synchronization, statistical learning, BCI, and auditory perception.',
    sourceUrl: 'https://wp.nyu.edu/poeppellab/the-lab/current/',
    sourceLabel: 'NYU Poeppel Lab — Current Members',
    checkedAt: '2026-07-30',
  },
  {
    slug: 'arianna-zuanazzi-nyu',
    name: 'Arianna Zuanazzi',
    institution: 'New York University',
    department: 'Poeppel Lab',
    role: 'Postdoctoral Fellow',
    location: 'New York, USA',
    email: 'az1864@nyu.edu',
    researchAreas: ['Semantics', 'Syntax', 'Morphology', 'Music cognition', 'Multisensory processing'],
    summaryZh: '研究语言的语义、句法与形态，以及音乐认知、注意、预期和多感官加工。',
    summaryEn: 'Studies semantics, syntax, morphology, music cognition, attention, expectation, and multisensory processing.',
    sourceUrl: 'https://wp.nyu.edu/poeppellab/the-lab/current/',
    sourceLabel: 'NYU Poeppel Lab — Current Members',
    checkedAt: '2026-07-30',
  },
  {
    slug: 'andrew-chang-nyu',
    name: 'Andrew Chang',
    institution: 'New York University',
    department: 'Poeppel Lab',
    role: 'Postdoctoral Fellow',
    location: 'New York, USA',
    email: 'ac8888@nyu.edu',
    researchAreas: ['Speech perception', 'Music perception', 'Neural oscillations', 'Auditory rhythm'],
    summaryZh: '研究言语与音乐感知、神经振荡、人际互动和听觉节律。',
    summaryEn: 'Studies speech and music perception, neural oscillations, interpersonal interaction, and auditory rhythm.',
    sourceUrl: 'https://wp.nyu.edu/poeppellab/the-lab/current/',
    sourceLabel: 'NYU Poeppel Lab — Current Members',
    checkedAt: '2026-07-30',
  },
  {
    slug: 'omri-raccah-nyu',
    name: 'Omri Raccah',
    institution: 'New York University',
    department: 'Poeppel Lab',
    role: 'PhD Student',
    location: 'New York, USA',
    email: 'or409@nyu.edu',
    researchAreas: ['Auditory sequences', 'Memory and learning', 'Large-scale brain networks', 'Intracranial EEG'],
    summaryZh: '研究听觉序列表征、记忆与学习、大规模脑网络和颅内脑电。',
    summaryEn: 'Studies auditory sequence representation, memory and learning, large-scale brain networks, and intracranial EEG.',
    sourceUrl: 'https://wp.nyu.edu/poeppellab/the-lab/current/',
    sourceLabel: 'NYU Poeppel Lab — Current Members',
    checkedAt: '2026-07-30',
  },
  {
    slug: 'francesco-mantegna-nyu',
    name: 'Francesco Mantegna',
    institution: 'New York University',
    department: 'Poeppel Lab',
    role: 'PhD Student',
    location: 'New York, USA',
    email: 'fm1672@nyu.edu',
    researchAreas: ['Speech motor control', 'Speech imagery', 'Sensorimotor transformation'],
    summaryZh: '研究言语运动控制、言语意象和感觉运动转换。',
    summaryEn: 'Studies speech motor control, speech imagery, and sensorimotor transformation.',
    sourceUrl: 'https://wp.nyu.edu/poeppellab/the-lab/current/',
    sourceLabel: 'NYU Poeppel Lab — Current Members',
    checkedAt: '2026-07-30',
  },
  {
    slug: 'phoebe-chen-nyu',
    name: 'Phoebe Chen',
    institution: 'New York University',
    department: 'Poeppel Lab',
    role: 'PhD Student',
    location: 'New York, USA',
    email: 'hc2896@nyu.edu',
    researchAreas: ['Semantic composition', 'Computational linguistics', 'Interbrain synchrony'],
    summaryZh: '研究语义组合、计算语言学和脑间同步。',
    summaryEn: 'Studies semantic composition, computational linguistics, and interbrain synchrony.',
    sourceUrl: 'https://wp.nyu.edu/poeppellab/the-lab/current/',
    sourceLabel: 'NYU Poeppel Lab — Current Members',
    checkedAt: '2026-07-30',
  },
  {
    slug: 'ellie-abrams-nyu',
    name: 'Ellie Abrams',
    institution: 'New York University',
    department: 'Poeppel Lab',
    role: 'PhD Student',
    location: 'New York, USA',
    email: 'ellie.abrams@nyu.edu',
    researchAreas: ['Speech-music interface', 'Word learning', 'Language development', 'Music and memory'],
    summaryZh: '研究言语—音乐接口、词汇学习、语言发展以及音乐与记忆。',
    summaryEn: 'Studies the speech-music interface, word learning, language development, and music and memory.',
    sourceUrl: 'https://wp.nyu.edu/poeppellab/the-lab/current/',
    sourceLabel: 'NYU Poeppel Lab — Current Members',
    checkedAt: '2026-07-30',
  },
  {
    slug: 'huanhuan-shi-nyu',
    name: 'Huanhuan Shi',
    institution: 'New York University',
    department: 'Communicative Sciences and Disorders',
    role: 'PhD Student',
    location: 'New York, USA',
    email: 'hs3035@nyu.edu',
    researchAreas: ['Child language development', 'Language learning', 'Developmental language disorders'],
    summaryZh: '研究儿童语言学习与发展，以及支持典型和非典型语言发展的因素。',
    summaryEn: 'Studies child language learning and development in children with and without language disorders.',
    sourceUrl: 'https://wp.nyu.edu/huanhuanshi/',
    sourceLabel: 'NYU personal academic webpage',
    checkedAt: '2026-07-30',
  },
]

export function getPublicAcademic(slug: string): PublicAcademic | undefined {
  return PUBLIC_ACADEMICS.find(person => person.slug === slug)
}

