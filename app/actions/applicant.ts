'use server'

import { getSession } from '@/app/lib/session'
import { updateApplicant, type ApplicationLevel } from '@/app/lib/applicants'

export type SaveApplicantResult = { ok: boolean; error?: string }

export async function saveApplicantProfile(formData: FormData): Promise<SaveApplicantResult> {
  const session = await getSession()
  if (!session || session.role !== 'applicant') return { ok: false, error: '未登录' }

  const bio = (formData.get('bio') as string ?? '').trim()
  const intendedMajor = (formData.get('intendedMajor') as string ?? '').trim()
  const applicationLevel = formData.get('applicationLevel') as ApplicationLevel
  const currentSchool = (formData.get('currentSchool') as string ?? '').trim()
  const applicationYear = (formData.get('applicationYear') as string ?? '').trim()
  const backgroundNotes = (formData.get('backgroundNotes') as string ?? '').trim()
  const targetCountries = formData.getAll('targetCountries') as string[]

  if (!['undergraduate', 'master', 'phd'].includes(applicationLevel)) {
    return { ok: false, error: '请选择申请学位' }
  }

  const ok = updateApplicant(session.userId, {
    bio, intendedMajor, applicationLevel,
    currentSchool, applicationYear, backgroundNotes,
    targetCountries,
  })
  return ok ? { ok: true } : { ok: false, error: '保存失败，请重试' }
}
