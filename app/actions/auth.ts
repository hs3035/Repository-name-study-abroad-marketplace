'use server'

import { z } from 'zod'
import { redirect } from 'next/navigation'
import { createSession, deleteSession } from '@/app/lib/session'
import { createAdviser, verifyAdviser, getAdviserByEmail } from '@/app/lib/advisers'
import { createApplicant, verifyApplicant } from '@/app/lib/applicants'
import { generateOtp, verifyOtp, consumeOtp } from '@/app/lib/otp'
import { sendOtpEmail } from '@/app/lib/email'

// ── Schemas ──────────────────────────────────────────────────────────────────

const AdviserSchema = z.object({
  credential: z.string().email('请输入有效邮箱地址').trim(),
  password: z.string().min(8, '密码至少 8 位').trim(),
  name: z.string().min(2, '姓名至少 2 个字符').trim(),
  school: z.string().min(2, '请填写学校名称').trim(),
  major: z.string().min(2, '请填写专业方向').trim(),
  country: z.string().min(1, '请选择所在国家').trim(),
  region: z.string().min(1, '请填写所在地区').trim(),
  phdStartYear: z.coerce
    .number({ error: '请输入有效年份' })
    .min(2000, '年份不合法')
    .max(new Date().getFullYear(), '年份不合法'),
  educationBackground: z.string().min(10, '教育背景至少 10 个字符').trim(),
  bio: z.string().trim(),
})

const ApplicantSchema = z.object({
  credential: z.string().email('请输入有效邮箱地址').trim(),
  password: z.string().min(8, '密码至少 8 位').trim(),
  name: z.string().min(2, '姓名至少 2 个字符').trim(),
  intendedMajor: z.string().min(1, '请填写申请专业方向').trim(),
  applicationLevel: z.enum(['undergraduate', 'master', 'phd'], {
    error: '请选择申请学位',
  }),
})

const LoginSchema = z.object({
  credential: z.string().min(1, '请输入邮箱或手机号').trim(),
  password: z.string().min(1, '请输入密码').trim(),
})

// ── Types ─────────────────────────────────────────────────────────────────────

export type FieldErrors = Record<string, string[] | undefined>
export type ActionState = { errors?: FieldErrors; message?: string } | undefined

// ── Actions ───────────────────────────────────────────────────────────────────

export type OtpResult = { sent?: boolean; error?: string; devCode?: string }

/** Send a 6-digit OTP to any valid email address. */
export async function sendApplicantEmailVerification(email: string): Promise<OtpResult> {
  if (!z.string().email().safeParse(email).success) {
    return { error: '请输入有效的邮箱地址' }
  }
  const code = generateOtp(email)
  try {
    await sendOtpEmail(email, code)
  } catch (error) {
    console.error('[auth/sendApplicantEmailVerification] Failed to send OTP email:', error)
    return { error: '邮件发送失败，请联系平台管理员检查邮箱配置' }
  }
  return {
    sent: true,
    devCode: process.env.NODE_ENV !== 'production' ? code : undefined,
  }
}

export async function registerAdviser(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const credential = (formData.get('credential') as string ?? '').trim()

  // ── Validate form fields ──────────────────────────────────────────────────
  const result = AdviserSchema.safeParse({
    credential,
    password: formData.get('password'),
    name: formData.get('name'),
    school: formData.get('school'),
    major: formData.get('major'),
    country: formData.get('country'),
    region: formData.get('region'),
    phdStartYear: formData.get('phdStartYear'),
    educationBackground: formData.get('educationBackground'),
    bio: formData.get('bio'),
  })
  if (!result.success) return { errors: result.error.flatten().fieldErrors }

  if (getAdviserByEmail(credential)) return { message: '该账号已被注册，请直接登录' }

  const emailCode = (formData.get('emailCode') as string ?? '').trim()
  if (!emailCode) return { errors: { emailCode: ['请输入邮箱验证码'] } }
  if (!verifyOtp(credential, emailCode)) {
    return { errors: { emailCode: ['验证码错误或已过期，请重新发送'] } }
  }

  // ── Create account ────────────────────────────────────────────────────────
  const { credential: validatedCredential, ...profile } = result.data
  const adviser = await createAdviser({
    ...profile,
    loginCredential: validatedCredential,
    email: validatedCredential,
    emailVerified: true,
    diplomaStatus: 'none',
  })
  if (!adviser) return { message: '该账号已被注册，请直接登录' }

  consumeOtp(validatedCredential)
  await createSession(adviser.id, adviser.name, 'adviser')
  redirect('/dashboard/adviser')
}

export async function registerApplicant(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const result = ApplicantSchema.safeParse({
    credential: formData.get('credential'),
    password: formData.get('password'),
    name: formData.get('name'),
    intendedMajor: formData.get('intendedMajor'),
    applicationLevel: formData.get('applicationLevel'),
  })
  if (!result.success) return { errors: result.error.flatten().fieldErrors }

  const { credential, password, name, intendedMajor, applicationLevel } = result.data

  // ── Email OTP verification ────────────────────────────────────────────────
  const emailCode = (formData.get('emailCode') as string ?? '').trim()
  if (!emailCode) return { errors: { emailCode: ['请输入邮箱验证码'] } }
  if (!verifyOtp(credential, emailCode)) {
    return { errors: { emailCode: ['验证码错误或已过期，请重新发送'] } }
  }

  const applicant = await createApplicant({
    email: credential,
    password,
    name,
    intendedMajor,
    applicationLevel,
  })
  if (!applicant) return { message: '该邮箱已被注册，请直接登录' }

  consumeOtp(credential)

  await createSession(applicant.id, applicant.name, 'applicant')
  redirect('/dashboard/applicant')
}

export async function login(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const result = LoginSchema.safeParse(Object.fromEntries(formData))
  if (!result.success) return { errors: result.error.flatten().fieldErrors }

  const { credential, password } = result.data
  const rememberMe = formData.get('rememberMe') === 'on'
  const sessionDays = rememberMe ? 30 : 7

  const adviser = await verifyAdviser(credential, password)
  if (adviser) {
    await createSession(adviser.id, adviser.name, 'adviser', sessionDays)
    redirect('/dashboard/adviser')
  }

  const applicant = await verifyApplicant(credential, password)
  if (applicant) {
    await createSession(applicant.id, applicant.name, 'applicant', sessionDays)
    redirect('/dashboard/applicant')
  }

  return { message: '邮箱、手机号、微信号或密码错误' }
}

export async function logout(): Promise<void> {
  await deleteSession()
  redirect('/')
}
