import fs from 'fs/promises'
import path from 'path'
import { getPublicUrl } from '@/app/lib/env'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function configured(name: string): boolean {
  const value = process.env[name]
  if (!value) return false
  const lower = value.toLowerCase()
  return !lower.includes('replace_')
    && !lower.includes('your-')
    && !lower.includes('...')
    && !lower.includes('you@gmail.com')
    && !lower.includes('your_gmail_app_password')
}

async function checkWritableDataDir(): Promise<boolean> {
  const dataDir = process.env.DATA_DIR || '.data'
  const root = path.isAbsolute(dataDir) ? dataDir : path.join(process.cwd(), dataDir)
  const probe = path.join(root, '.healthcheck')

  try {
    await fs.mkdir(root, { recursive: true })
    await fs.writeFile(probe, new Date().toISOString(), 'utf8')
    await fs.unlink(probe)
    return true
  } catch {
    return false
  }
}

export async function GET() {
  const dataWritable = await checkWritableDataDir()
  const env = {
    nextPublicUrl: !!getPublicUrl(),
    sessionSecret: configured('SESSION_SECRET'),
    stripeSecretKey: configured('STRIPE_SECRET_KEY'),
    stripePublishableKey: configured('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'),
    stripeWebhookSecret: configured('STRIPE_WEBHOOK_SECRET'),
    email: configured('RESEND_API_KEY')
      ? configured('EMAIL_FROM') || configured('SMTP_FROM') || configured('SMTP_USER')
      : configured('SMTP_USER') && configured('SMTP_PASS'),
    supportEmail: configured('SUPPORT_EMAIL'),
  }

  const ready = dataWritable && Object.values(env).every(Boolean)

  return Response.json(
    {
      ok: ready,
      dataWritable,
      env,
      timestamp: new Date().toISOString(),
    },
    { status: ready ? 200 : 503 },
  )
}
