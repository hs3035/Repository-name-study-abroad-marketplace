import type { PublicAcademic } from '@/app/lib/public-academics'

const siteUrl = process.env.NEXT_PUBLIC_URL || 'https://gomentorgo.com'

export function studentInquiryEmail(person: PublicAcademic, zh: boolean) {
  const subject = zh
    ? `请教您关于 ${person.researchAreas[0]} 的研究经历`
    : `A question about your work in ${person.researchAreas[0]}`
  const body = zh
    ? `您好 ${person.name}，\n\n我叫[你的姓名]，目前是[学校/专业/年级]的学生。我通过 ${person.institution} 官网和 GoMentorGo 的公开学术目录了解到您关于[具体研究主题或论文]的研究。\n\n我的经历是：[用 1–2 句话说明与你的研究方向相关的课程、项目或研究经历。]\n\n我想请教一个具体问题：[只写一个清晰、容易回答的问题。]\n\n感谢您抽出时间阅读。若您目前不方便回复，我也完全理解。\n\n祝好，\n[你的姓名]\n[你的学校或项目，可选]`
    : `Hi ${person.name},\n\nMy name is [your name], and I am currently a [program/year] student at [institution]. I found your work on [specific topic or paper] through the ${person.institution} website and GoMentorGo's public academic directory.\n\nMy relevant background is: [In 1–2 sentences, describe a course, project, or research experience connected to their work.]\n\nI have one specific question: [Ask one clear, answerable question.]\n\nThank you for your time. I completely understand if you are unable to respond.\n\nBest,\n[Your name]\n[Your institution or program, optional]`

  return `mailto:${person.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

export function profileClaimUrl(person: PublicAcademic) {
  return `${siteUrl}/academics/${person.slug}/claim`
}

export function profileInvitationEmail(person: PublicAcademic) {
  const claimUrl = profileClaimUrl(person)
  const subject = `Invitation to review or claim your GoMentorGo academic profile`
  const body = `Hi ${person.name},

GoMentorGo maintains a public academic directory that helps prospective graduate students discover researchers by field. We created a directory page for you using professional information published on your university webpage:

${siteUrl}/academics/${person.slug}

This public listing is not an active mentor account and does not imply that you endorse GoMentorGo or offer advising services.

If you would like to control the profile, update your information, set contact preferences, or optionally offer mentoring, you can start a claim here:

${claimUrl}

You may also request a correction or removal. No action is required if you are not interested.

Best,
GoMentorGo
https://gomentorgo.com`

  return `mailto:${person.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}
