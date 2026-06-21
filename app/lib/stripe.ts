import Stripe from 'stripe'

// Singleton so we don't recreate the client on every request in dev
const g = global as typeof global & { _stripe?: Stripe }

export function getStripe(): Stripe {
  if (!g._stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set')
    }
    g._stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-03-25.dahlia',
    })
  }
  return g._stripe
}

// ── Commission constants ───────────────────────────────────────────────────────

/** Platform commission rate (10%) */
export const PLATFORM_RATE = 0.10

/**
 * Calculate fee split for a given amount.
 * @param amountFen  Total charged to student, in fen (1 CNY = 100 fen)
 */
export function calcFees(amountFen: number): {
  platformFeeFen: number
  adviserPayoutFen: number
} {
  const platformFeeFen = Math.round(amountFen * PLATFORM_RATE)
  return {
    platformFeeFen,
    adviserPayoutFen: amountFen - platformFeeFen,
  }
}
