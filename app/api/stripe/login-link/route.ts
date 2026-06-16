import { getSession } from '@/app/lib/session'
import { getAdviserById } from '@/app/lib/advisers'
import { getStripe } from '@/app/lib/stripe'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET — generate a one-time login link to the adviser's Stripe Express dashboard.
 * Advisers use this to see their balance, view payouts, and initiate withdrawals.
 */
export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'adviser') {
    return Response.json({ error: '未登录' }, { status: 401 })
  }

  const adviser = getAdviserById(session.userId)
  if (!adviser?.stripeAccountId) {
    return Response.json({ error: '尚未连接 Stripe 账户' }, { status: 400 })
  }

  try {
    const stripe = getStripe()
    const loginLink = await stripe.accounts.createLoginLink(adviser.stripeAccountId)
    return Response.json({ url: loginLink.url })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '无法生成 Stripe 登录链接'
    return Response.json({ error: msg }, { status: 500 })
  }
}
