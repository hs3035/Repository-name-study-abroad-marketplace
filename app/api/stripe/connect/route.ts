import { type NextRequest } from 'next/server'
import { getSession } from '@/app/lib/session'
import { getAdviserById, updateAdviser } from '@/app/lib/advisers'
import { getStripe } from '@/app/lib/stripe'
import { getPublicUrl } from '@/app/lib/env'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST — create (or retrieve) Stripe Express account for the adviser and
 *        return an Account Link URL to begin / continue onboarding.
 */
export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'adviser') {
    return Response.json({ error: '未登录' }, { status: 401 })
  }

  const adviser = getAdviserById(session.userId)
  if (!adviser) {
    return Response.json({ error: '导师不存在' }, { status: 400 })
  }

  let stripe: ReturnType<typeof getStripe>
  try {
    stripe = getStripe()
  } catch {
    return Response.json({ error: 'Stripe 未配置，请联系管理员设置 STRIPE_SECRET_KEY' }, { status: 503 })
  }

  const baseUrl = getPublicUrl() ?? `https://${request.headers.get('host')}`

  try {
    // Retrieve or create the Stripe Express account
    let stripeAccountId = adviser.stripeAccountId
    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: adviser.email,
        metadata: { adviserId: adviser.id },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        settings: {
          payouts: { schedule: { interval: 'manual' } },
        },
      })
      stripeAccountId = account.id
      updateAdviser(adviser.id, { stripeAccountId })
    }

    // Create an Account Link for onboarding / re-onboarding
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${baseUrl}/api/stripe/connect`,
      return_url:  `${baseUrl}/dashboard/adviser?stripe=success`,
      type: 'account_onboarding',
    })

    return Response.json({ url: accountLink.url })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Stripe 操作失败'
    return Response.json({ error: msg }, { status: 500 })
  }
}

/**
 * GET — return the adviser's Stripe account status (charges_enabled, payouts_enabled).
 */
export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'adviser') {
    return Response.json({ error: '未登录' }, { status: 401 })
  }

  const adviser = getAdviserById(session.userId)
  console.log('adviser stripeAccountId:', adviser?.stripeAccountId)
  if (!adviser?.stripeAccountId) {
    return Response.json({ connected: false })
  }

  try {
    const stripe = getStripe()
    const account = await stripe.accounts.retrieve(adviser.stripeAccountId)
    console.log('[stripe/connect] charges_enabled:', account.charges_enabled)
    console.log('[stripe/connect] payouts_enabled:', account.payouts_enabled)
    console.log('[stripe/connect] details_submitted:', account.details_submitted)
    return Response.json({
      connected: account.charges_enabled && account.payouts_enabled,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
    })
  } catch (err) {
    console.error('[stripe/connect] Failed to retrieve account:', err)
    return Response.json({ connected: false })
  }
}
