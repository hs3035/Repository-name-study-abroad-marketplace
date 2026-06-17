'use server'

import { z } from 'zod'
import { redirect } from 'next/navigation'
import path from 'path'
import fs from 'fs/promises'
import { createSession, deleteSession } from '@/app/lib/session'
import { createAdviser, verifyAdviser, getAdviserByEmail } from '@/app/lib/advisers'
import { createApplicant, verifyApplicant } from '@/app/lib/applicants'
import { generateOtp, verifyOtp, consumeOtp } from '@/app/lib/otp'
import { sendOtpEmail, sendOtpSms } from '@/app/lib/email'
import { getUploadPath, getUploadPublicUrl } from '@/app/lib/storage'

// ── Schemas ──────────────────────────────────────────────────────────────────

const PHONE_RE = /^1[3-9]\d{9}$/

const AdviserSchema = z.object({
  email: z.string().email('请输入有效邮箱').trim(),
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
  credential: z
    .string()
    .min(1, '请输入邮箱或手机号')
    .refine(
      v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || PHONE_RE.test(v),
      '请输入有效邮箱地址或中国手机号',
    )
    .trim(),
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

// ── Helpers ───────────────────────────────────────────────────────────────────

async function saveDiplomaFile(file: File): Promise<string> {
  const ext = path.extname(file.name).toLowerCase() || '.pdf'
  const filename = `${Date.now()}-${crypto.randomUUID()}${ext}`
  const uploadDir = getUploadPath('diplomas')
  await fs.mkdir(uploadDir, { recursive: true })
  await fs.writeFile(
    path.join(uploadDir, filename),
    Buffer.from(await file.arrayBuffer()),
  )
  return getUploadPublicUrl('diplomas', filename)
}

// ── Actions ───────────────────────────────────────────────────────────────────

export type OtpResult = { sent?: boolean; error?: string; devCode?: string }

/** Send a 6-digit OTP to a Chinese mobile number. */
export async function sendPhoneVerification(phone: string): Promise<OtpResult> {
  if (!PHONE_RE.test(phone)) {
    return { error: '请输入有效的中国手机号' }
  }
  const code = generateOtp(phone)
  try {
    await sendOtpSms(phone, code)
  } catch {
    return { error: '短信验证码暂未配置，请先使用邮箱注册' }
  }
  return {
    sent: true,
    devCode: process.env.NODE_ENV !== 'production' ? code : undefined,
  }
}

/** Send a 6-digit OTP to a .edu email address (adviser registration). */
export async function sendVerificationEmail(email: string): Promise<OtpResult> {
  if (!z.string().email().safeParse(email).success) {
    return { error: '请输入有效的邮箱地址' }
  }
  if (!email.toLowerCase().includes('.edu')) {
    return { error: '只有 .edu 邮箱才能通过验证码验证' }
  }
  const code = generateOtp(email)
  try {
    await sendOtpEmail(email, code)
  } catch (error) {
    console.error('[auth/sendVerificationEmail] Failed to send OTP email:', error)
    return { error: '邮件发送失败，请联系平台管理员检查邮箱配置' }
  }
  return {
    sent: true,
    devCode: process.env.NODE_ENV !== 'production' ? code : undefined,
  }
}

/** Send a 6-digit OTP to any email address (applicant registration). */
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
  const email = (formData.get('email') as string ?? '').trim()
  const isEdu = email.toLowerCase().includes('.edu')

  // ── Validate form fields ──────────────────────────────────────────────────
  const result = AdviserSchema.safeParse({
    email,
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

  // ── Check duplicate email ─────────────────────────────────────────────────
  if (getAdviserByEmail(email)) return { message: '该邮箱已被注册，请直接登录' }

  // ── Email verification ────────────────────────────────────────────────────
  let emailVerified = false
  let diplomaPath: string | undefined
  let diplomaStatus: 'none' | 'pending' = 'none'

  if (isEdu) {
    const otpCode = (formData.get('otpCode') as string ?? '').trim()
    if (!otpCode) return { errors: { otpCode: ['请输入验证码'] } }
    if (!verifyOtp(email, otpCode)) {
      return { errors: { otpCode: ['验证码错误或已过期，请重新发送'] } }
    }
    emailVerified = true
  } else {
    // Non-.edu: require diploma upload
    const diploma = formData.get('diploma') as File | null
    if (!diploma || diploma.size === 0) {
      return { errors: { diploma: ['请上传博士毕业证'] } }
    }
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(diploma.type)) {
      return { errors: { diploma: ['仅支持 PDF、JPG、PNG 格式'] } }
    }
    if (diploma.size > 10 * 1024 * 1024) {
      return { errors: { diploma: ['文件大小不能超过 10MB'] } }
    }
    diplomaPath = await saveDiplomaFile(diploma)
    diplomaStatus = 'pending'
  }

  // ── Create account ────────────────────────────────────────────────────────
  const adviser = await createAdviser({
    ...result.data,
    emailVerified,
    diplomaStatus,
    diplomaPath,
  })
  if (!adviser) return { message: '该邮箱已被注册，请直接登录' }

  if (isEdu) consumeOtp(email)

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
  const isPhone = PHONE_RE.test(credential)
  const isEmail = !isPhone

  // ── Phone OTP verification ────────────────────────────────────────────────
  if (isPhone) {
    const smsCode = (formData.get('smsCode') as string ?? '').trim()
    if (!smsCode) return { errors: { smsCode: ['请输入短信验证码'] } }
    if (!verifyOtp(credential, smsCode)) {
      return { errors: { smsCode: ['验证码错误或已过期，请重新发送'] } }
    }
  }

  // ── Email OTP verification ────────────────────────────────────────────────
  if (isEmail) {
    const emailCode = (formData.get('emailCode') as string ?? '').trim()
    if (!emailCode) return { errors: { emailCode: ['请输入邮箱验证码'] } }
    if (!verifyOtp(credential, emailCode)) {
      return { errors: { emailCode: ['验证码错误或已过期，请重新发送'] } }
    }
  }

  const applicant = await createApplicant({
    email: isPhone ? undefined : credential,
    phone: isPhone ? credential : undefined,
    password,
    name,
    intendedMajor,
    applicationLevel,
  })
  if (!applicant) return { message: '该邮箱或手机号已被注册，请直接登录' }

  if (isPhone) consumeOtp(credential)
  if (isEmail) consumeOtp(credential)

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

  return { message: '邮箱/手机号或密码错误' }
}

export async function logout(): Promise<void> {
  await deleteSession()
  redirect('/')
}
