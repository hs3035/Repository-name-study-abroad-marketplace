import { getAdviserById } from './advisers'
import { getApplicantById } from './applicants'
import type { SessionPayload } from './session'

export type PaymentMode = 'stripe' | 'manual'

export type ManualPaymentConfig = {
  contact: string
  note: string
  qrUrl: string
  wechatQrUrl: string
  alipayQrUrl: string
  bankTransfer: ManualBankTransferConfig
}

export type ManualBankTransferConfig = {
  enabled: boolean
  bankName: string
  accountName: string
  accountNumber: string
  routingNumber: string
  swiftCode: string
  note: string
}

export function getPaymentMode(): PaymentMode {
  return process.env.PAYMENT_MODE === 'manual' ? 'manual' : 'stripe'
}

export function getManualPaymentConfig(): ManualPaymentConfig {
  const wechatQrUrl = process.env.MANUAL_WECHAT_QR_URL || process.env.MANUAL_PAYMENT_QR_URL || '/payment/wechat-pay.jpg'
  const alipayQrUrl = process.env.MANUAL_ALIPAY_QR_URL || '/payment/alipay-pay.jpg'
  const bankName = process.env.MANUAL_BANK_NAME ?? ''
  const accountName = process.env.MANUAL_BANK_ACCOUNT_NAME ?? ''
  const accountNumber = process.env.MANUAL_BANK_ACCOUNT_NUMBER ?? ''
  const routingNumber = process.env.MANUAL_BANK_ROUTING_NUMBER ?? ''
  const swiftCode = process.env.MANUAL_BANK_SWIFT_CODE ?? ''
  const bankNote = process.env.MANUAL_BANK_NOTE ?? ''
  const bankTransferEnabled =
    process.env.MANUAL_BANK_TRANSFER_ENABLED === 'true' ||
    Boolean(bankName && accountName && accountNumber)

  return {
    contact: process.env.MANUAL_PAYMENT_CONTACT ?? '',
    note: process.env.MANUAL_PAYMENT_NOTE ?? '',
    qrUrl: wechatQrUrl,
    wechatQrUrl,
    alipayQrUrl,
    bankTransfer: {
      enabled: bankTransferEnabled,
      bankName,
      accountName,
      accountNumber,
      routingNumber,
      swiftCode,
      note: bankNote,
    },
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
