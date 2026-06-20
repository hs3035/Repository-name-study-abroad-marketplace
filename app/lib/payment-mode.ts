import { getAdviserById } from './advisers'
import { getApplicantById } from './applicants'
import type { SessionPayload } from './session'

export type PaymentMode = 'stripe' | 'manual'

export type ManualPaymentConfig = {
  contact: string
  note: string
  qrUrl: string
}

export function getPaymentMode(): PaymentMode {
  return process.env.PAYMENT_MODE === 'manual' ? 'manual' : 'stripe'
}

export function getManualPaymentConfig(): ManualPaymentConfig {
  return {
    contact: process.env.MANUAL_PAYMENT_CONTACT ?? '',
    note: process.env.MANUAL_PAYMENT_NOTE ?? '',
    qrUrl: process.env.MANUAL_PAYMENT_QR_URL ?? '',
  }
}

export function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map(email => email.trim().toLowerCase())
    .filter(Boolean)
}

export function getSessionEmail(session: SessionPayload | null): string | undefined {
  if (!session) return undefined
  if (session.role === 'adviser') return getAdviserById(session.userId)?.email
  return getApplicantById(session.userId)?.email
}

export function isAdminSession(session: SessionPayload | null): boolean {
  const email = getSessionEmail(session)
  return !!email && getAdminEmails().includes(email.toLowerCase())
}
