import { type NextRequest } from 'next/server'
import { getStripe } from '@/app/lib/stripe'
import {
  getOrderByStripeSession,
  getOrderByPaymentIntent,
  markOrderPaid,
  updateOrderStatus,
} from '@/app/lib/orders'
import { bookSlot } from '@/app/lib/slots'

// Raw body must be read before any parsing — required for Stripe signature verification
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  console.log('[stripe/webhook] Incoming webhook request')

  // ── Guard: webhook secret must be configured ──────────────────────────────────
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret || webhookSecret.startsWith('whsec_REPLACE')) {
    console.error('[stripe/webhook] STRIPE_WEBHOOK_SECRET is not configured')
    return new Response('Webhook secret not configured', { status: 500 })
  }

  // ── Stripe client ─────────────────────────────────────────────────────────────
  let stripe: ReturnType<typeof getStripe>
  try {
    stripe = getStripe()
  } catch {
    console.error('[stripe/webhook] STRIPE_SECRET_KEY missing')
    return new Response('Stripe not configured', { status: 500 })
  }

  // ── Read raw body (must come before any .json() call) ────────────────────────
  const rawBody = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    console.warn('[stripe/webhook] Missing stripe-signature header')
    return new Response('Missing stripe-signature header', { status: 400 })
  }

  // ── Verify signature ──────────────────────────────────────────────────────────
  let event: Awaited<ReturnType<typeof stripe.webhooks.constructEventAsync>>
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Signature verification failed'
    console.error('[stripe/webhook] Signature verification FAILED:', msg)
    // Return 400 so Stripe knows not to retry
    return new Response(`Webhook error: ${msg}`, { status: 400 })
  }

  console.log(`[stripe/webhook] ✅ Verified event: ${event.type} (id: ${event.id})`)

  // ── Route events ──────────────────────────────────────────────────────────────
  try {
    switch (event.type) {

      // ── Payment received — held in escrow until service confirmed ─────────
      case 'checkout.session.completed': {
        const session = event.data.object
        console.log(`[stripe/webhook] checkout.session.completed — session: ${session.id}`)
        console.log(`[stripe/webhook]   payment_status: ${session.payment_status}`)
        console.log(`[stripe/webhook]   amount_total:   ${session.amount_total} fen`)

        const { slotId, applicantId, applicantName } = session.metadata ?? {}

        if (!slotId || !applicantId || !applicantName) {
          console.error('[stripe/webhook] Missing metadata on session:', session.id, session.metadata)
          break
        }

        // Book the slot
        const booked = bookSlot(slotId, applicantId, applicantName)
        if (booked) {
          console.log(`[stripe/webhook] ✅ Slot booked: ${slotId} for ${applicantName}`)
        } else {
          console.warn(`[stripe/webhook] ⚠️  Slot ${slotId} already booked or not found`)
        }

        // Mark order as paid (held in escrow — payout deferred until student confirms)
        const order = getOrderByStripeSession(session.id)
        if (order) {
          const paymentIntentId =
            typeof session.payment_intent === 'string'
              ? session.payment_intent
              : (session.payment_intent?.id ?? '')
          markOrderPaid(order.id, paymentIntentId)
          console.log(`[stripe/webhook] ✅ Order ${order.id} marked PAID / in escrow (PI: ${paymentIntentId})`)
        } else {
          console.warn(`[stripe/webhook] No order found for session ${session.id}`)
        }
        break
      }

      // ── Checkout session expired without payment ────────────────────────────
      case 'checkout.session.expired': {
        const session = event.data.object
        console.log(`[stripe/webhook] checkout.session.expired — session: ${session.id}`)
        const order = getOrderByStripeSession(session.id)
        if (order) {
          updateOrderStatus(order.id, 'failed')
          console.log(`[stripe/webhook] Order ${order.id} marked as FAILED (expired)`)
        }
        break
      }

      // ── Payment intent succeeded (also fires for Checkout payments) ─────────
      case 'payment_intent.succeeded': {
        const pi = event.data.object
        console.log(`[stripe/webhook] payment_intent.succeeded — PI: ${pi.id}, amount: ${pi.amount} fen`)
        // checkout.session.completed is the primary handler; this is informational
        break
      }

      // ── Payment failed ──────────────────────────────────────────────────────
      case 'payment_intent.payment_failed': {
        const pi = event.data.object
        const reason = pi.last_payment_error?.message ?? 'unknown'
        console.log(`[stripe/webhook] payment_intent.payment_failed — PI: ${pi.id}, reason: ${reason}`)

        const order = getOrderByPaymentIntent(pi.id)
        if (order) {
          updateOrderStatus(order.id, 'failed')
          console.log(`[stripe/webhook] Order ${order.id} marked as FAILED`)
        } else {
          console.warn(`[stripe/webhook] No order found for payment intent ${pi.id}`)
        }
        break
      }

      default:
        console.log(`[stripe/webhook] Unhandled event type: ${event.type} — ignoring`)
        break
    }
  } catch (err) {
    // Never return 5xx to Stripe — it would keep retrying.
    // Log the error and return 200 so Stripe doesn't retry an event we already partially handled.
    console.error(`[stripe/webhook] Error processing event ${event.type}:`, err)
  }

  return new Response('OK', { status: 200 })
}
