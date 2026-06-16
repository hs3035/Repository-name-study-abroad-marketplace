'use server'

import { getSession } from '@/app/lib/session'
import {
  getOrdersByAdviser,
  getOrdersByApplicant,
  getAdviserEarnings,
  getOrderById,
  getOrdersReadyForAutoRelease,
  markAdviserCompleted,
  markStudentConfirmed,
  markRefundRequested,
  markOrderReleased,
  type Order,
} from '@/app/lib/orders'
import { getStripe } from '@/app/lib/stripe'

export type AdviserEarningsSummary = {
  totalPaidFen: number
  totalPlatformFeeFen: number
  totalAdviserPayoutFen: number
  paidOrderCount: number
}

// ── Read actions ──────────────────────────────────────────────────────────────

/** Adviser: fetch own earnings summary */
export async function fetchAdviserEarnings(): Promise<AdviserEarningsSummary> {
  const session = await getSession()
  if (!session || session.role !== 'adviser') {
    return { totalPaidFen: 0, totalPlatformFeeFen: 0, totalAdviserPayoutFen: 0, paidOrderCount: 0 }
  }
  return getAdviserEarnings(session.userId)
}

/** Adviser: fetch own transaction history (also triggers auto-release check) */
export async function fetchAdviserOrders(): Promise<Order[]> {
  const session = await getSession()
  if (!session || session.role !== 'adviser') return []
  await checkAndAutoRelease()
  return getOrdersByAdviser(session.userId)
}

/** Applicant: fetch own payment history (also triggers auto-release check) */
export async function fetchApplicantOrders(): Promise<Order[]> {
  const session = await getSession()
  if (!session || session.role !== 'applicant') return []
  await checkAndAutoRelease()
  return getOrdersByApplicant(session.userId)
}

// ── Write actions ─────────────────────────────────────────────────────────────

/** Adviser marks the consultation as completed. Starts the 48h student window. */
export async function adviserMarkComplete(orderId: string): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession()
  if (!session || session.role !== 'adviser') return { ok: false, error: '未登录' }

  const order = getOrderById(orderId)
  if (!order) return { ok: false, error: '订单不存在' }
  if (order.adviserId !== session.userId) return { ok: false, error: '无权操作' }

  const ok = markAdviserCompleted(orderId)
  if (!ok) return { ok: false, error: '订单状态不允许此操作（需为 paid 或 in_progress）' }

  console.log(`[payments] Adviser ${session.userId} marked order ${orderId} as completed`)
  return { ok: true }
}

/** Student confirms the service was completed. Triggers Stripe transfer. */
export async function studentConfirmComplete(orderId: string): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession()
  if (!session || session.role !== 'applicant') return { ok: false, error: '未登录' }

  const order = getOrderById(orderId)
  if (!order) return { ok: false, error: '订单不存在' }
  if (order.applicantId !== session.userId) return { ok: false, error: '无权操作' }

  const ok = markStudentConfirmed(orderId)
  if (!ok) return { ok: false, error: '订单状态不允许此操作' }

  console.log(`[payments] Student ${session.userId} confirmed order ${orderId}`)
  await releasePayment(orderId)
  return { ok: true }
}

/** Student requests a refund within the 48h window. */
export async function studentRequestRefund(orderId: string): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession()
  if (!session || session.role !== 'applicant') return { ok: false, error: '未登录' }

  const order = getOrderById(orderId)
  if (!order) return { ok: false, error: '订单不存在' }
  if (order.applicantId !== session.userId) return { ok: false, error: '无权操作' }

  const ok = markRefundRequested(orderId)
  if (!ok) return { ok: false, error: '订单状态不允许此操作（需在 completed_by_adviser 状态）' }

  console.log(`[payments] Student ${session.userId} requested refund for order ${orderId}`)
  return { ok: true }
}

// ── Internal helpers ──────────────────────────────────────────────────────────

/**
 * Check for orders past their autoReleaseAt time and release them.
 * Called automatically when fetching orders so no separate cron job is needed.
 */
async function checkAndAutoRelease(): Promise<void> {
  const eligible = getOrdersReadyForAutoRelease()
  if (eligible.length === 0) return

  console.log(`[payments] Auto-releasing ${eligible.length} order(s)`)
  await Promise.all(eligible.map(o => releasePayment(o.id)))
}

/**
 * Create a Stripe transfer to the adviser and mark the order as released.
 * Idempotent — safe to call multiple times for the same order.
 */
async function releasePayment(orderId: string): Promise<void> {
  const order = getOrderById(orderId)
  if (!order) return
  if (order.stripeTransferId) return  // already released

  // Never mark an order as released unless Stripe actually created a transfer.
  // Otherwise the UI would say "released" while the adviser never received funds.
  if (!order.adviserStripeAccountId) {
    console.warn(`[payments] Order ${orderId}: no adviserStripeAccountId — cannot release payment`)
    return
  }

  try {
    const stripe = getStripe()
    const transfer = await stripe.transfers.create({
      amount:      order.adviserPayoutFen,
      currency:    order.currency,
      destination: order.adviserStripeAccountId,
      metadata:    { orderId },
    })
    markOrderReleased(orderId, transfer.id)
    console.log(`[payments] ✅ Released order ${orderId} — transfer ${transfer.id} (¥${order.adviserPayoutFen / 100} to ${order.adviserStripeAccountId})`)
  } catch (err) {
    console.error(`[payments] ❌ Failed to release order ${orderId}:`, err)
  }
}
