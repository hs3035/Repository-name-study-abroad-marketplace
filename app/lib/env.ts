function isPlaceholder(value: string | undefined): boolean {
  if (!value) return true
  const lower = value.toLowerCase()
  return lower.includes('replace_') || lower.includes('your-') || lower.includes('...')
}

export function requireEnv(name: string): string {
  const value = process.env[name]
  if (isPlaceholder(value)) {
    throw new Error(`${name} environment variable is not configured`)
  }
  return value as string
}

export function getSessionSecret(): string {
  const secret = requireEnv('SESSION_SECRET')
  if (process.env.NODE_ENV === 'production' && secret.length < 64) {
    throw new Error('SESSION_SECRET must be at least 64 characters in production')
  }
  return secret
}

export function getPublicUrl(): string | undefined {
  const value = process.env.NEXT_PUBLIC_URL
  if (isPlaceholder(value)) return undefined
  return value?.replace(/\/$/, '')
}

export function getSupportEmail(): string {
  return process.env.SUPPORT_EMAIL || process.env.SMTP_FROM || process.env.SMTP_USER || 'support@example.com'
}
