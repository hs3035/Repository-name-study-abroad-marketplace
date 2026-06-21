import { type NextRequest } from 'next/server'
import type Stripe from 'stripe'
import { getSession } from '@/app/lib/session'
import { getAdviserById, getAllAdvisers } from '@/app/lib/advisers'
import { getAvailableSlots } from '@/app/lib/slots'
import { createOrder } from '@/app/lib/orders'
import { getStripe, calcFees } from '@/app/lib/stripe'
import { getPublicUrl } from '@/app/lib/env'
import { getCheckoutPaymentMethodOptions, getCheckoutPaymentMethods } from '@/app/lib/payment-methods'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  console.log('[stripe/checkout] POST request received')

  // ── Auth ─────────────────────────────────────────────────────────────────────
  const session = await getSession()
  if (!session || session.role !== 'applicant') {
    console.warn('[stripe/checkout] Rejected: not logged in as applicant')
    return Response.json({ error: '请先登录学生账号' }, { status: 401 })
  }
  console.log(`[stripe/checkout] Applicant: ${session.name} (${session.userId})`)

  // ── Parse body ────────────────────────────────────────────────────────────────
  let slotId: string
  try {
    const body = await request.json()
    slotId = body.slotId
    if (!slotId || typeof slotId !== 'string') throw new Error('missing slotId')
  } catch (e) {
    console.warn('[stripe/checkout] Bad request body:', e)
    return Response.json({ error: '参数错误' }, { status: 400 })
  }
  console.log(`[stripe/checkout] Slot requested: ${slotId}`)

  // ── Find the slot (must be available) ────────────────────────────────────────
  let targetSlot: Awaited<ReturnType<typeof getAvailableSlots>>[number] | undefined
  let targetAdviserId: string | undefined

  for (const adviser of getAllAdvisers()) {
    const found = getAvailableSlots(adviser.id).find(s => s.id === slotId)
    if (found) { targetSlot = found; targetAdviserId = adviser.id; break }
  }

  if (!targetSlot || !targetAdviserId) {
    console.warn('[stripe/checkout] Slot not available:', slotId)
    return Response.json({ error: '该时段不可预约，请重新选择' }, { status: 400 })
  }
  console.log(`[stripe/checkout] Slot found: ¥${targetSlot.price} at ${targetSlot.utcStart}`)

  // ── Load adviser ──────────────────────────────────────────────────────────────
  const adviser = getAdviserById(targetAdviserId)
  if (!adviser) {
    return Response.json({ error: '导师不存在' }, { status: 400 })
  }

  // ── Stripe client ─────────────────────────────────────────────────────────────
  let stripe: ReturnType<typeof getStripe>
  try {
    stripe = getStripe()
  } catch {
    console.error('[stripe/checkout] STRIPE_SECRET_KEY missing')
    return Response.json({ error: 'Stripe 未配置，请联系管理员' }, { status: 503 })
  }

  // ── Connected account readiness ───────────────────────────────────────────────
  // Students should not be charged unless the adviser can receive the later payout.
  if (!adviser.stripeAccountId) {
    console.warn(`[stripe/checkout] Rejected: adviser "${adviser.name}" has not connected Stripe`)
    return Response.json({ error: '该导师还没有完成收款账户设置，暂时不能预约付款' }, { status: 400 })
  }

  try {
    const account = await stripe.accounts.retrieve(adviser.stripeAccountId)
    if (!account.charges_enabled || !account.payouts_enabled || !account.details_submitted) {
      console.warn(
        `[stripe/checkout] Rejected: adviser "${adviser.name}" Stripe account is not ready`,
        {
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          details_submitted: account.details_submitted,
        },
      )
      return Response.json({ error: '该导师的收款账户还未完成审核，暂时不能预约付款' }, { status: 400 })
    }
  } catch (err) {
    console.error('[stripe/checkout] Failed to verify adviser Stripe account:', err)
    return Response.json({ error: '暂时无法确认导师收款账户状态，请稍后重试' }, { status: 503 })
  }

  // ── Fee calculation ───────────────────────────────────────────────────────────
  const amountFen = targetSlot.price * 100   // CNY → fen (1 CNY = 100 fen)
  const { platformFeeFen, adviserPayoutFen } = calcFees(amountFen)
  console.log(`[stripe/checkout] Fees — total: ¥${targetSlot.price}, platform: ¥${platformFeeFen / 100}, adviser: ¥${adviserPayoutFen / 100}`)

  const baseUrl = getPublicUrl() ?? `https://${request.headers.get('host')}`

  // ── Escrow mode: charge platform first, transfer to adviser after confirmation ──
  // We do NOT use transfer_data. The full payment goes to the platform.
  // A Stripe transfer is created only after the student confirms service completion
  // (or after the auto-release window expires).
  const paymentIntentData: Stripe.Checkout.SessionCreateParams['payment_intent_data'] = {}
  console.log(`[stripe/checkout] Escrow mode — adviser: ${adviser.stripeAccountId} (transfer deferred until confirmation)`)

  // ── Build payment methods ─────────────────────────────────────────────────────
  // Alipay and WeChat Pay must also be enabled in Stripe Dashboard.
  const paymentMethodTypes = getCheckoutPaymentMethods()
  const paymentMethodOptions = getCheckoutPaymentMethodOptions(paymentMethodTypes)
  console.log('[stripe/checkout] Payment methods:', paymentMethodTypes)

  // ── Create Stripe Checkout Session ───────────────────────────────────────────
  let checkoutSession: Awaited<ReturnType<typeof stripe.checkout.sessions.create>>
  try {
    checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: paymentMethodTypes,
      line_items: [
        {
          price_data: {
            currency: 'cny',
            product_data: {
              name: `30 分钟咨询 — ${adviser.name} (${adviser.school})`,
              description:
                `预约时间：${new Date(targetSlot.utcStart).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })} (北京时间)`,
            },
            unit_amount: amountFen,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      payment_intent_data: paymentIntentData,
      ...(paymentMethodOptions ? { payment_method_options: paymentMethodOptions } : {}),
      success_url: `${baseUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${baseUrl}/payment/cancel`,
      metadata: {
        slotId,
        adviserId: targetAdviserId,
        applicantId: session.userId,
        applicantName: session.name,
      },
    })
    console.log(`[stripe/checkout] Session created: ${checkoutSession.id}`)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '支付初始化失败'
    console.error('[stripe/checkout] Stripe API error:', msg)
    return Response.json({ error: msg }, { status: 500 })
  }

  // ── Persist pending order ─────────────────────────────────────────────────────
  const order = createOrder({
    slotId,
    adviserId: targetAdviserId,
    adviserName: adviser.name,
    applicantId: session.userId,
    applicantName: session.name,
    amountFen,
    platformFeeFen,
    adviserPayoutFen,
    currency: 'cny',
    status: 'pending_payment',
    stripeSessionId: checkoutSession.id,
    adviserStripeAccountId: adviser.stripeAccountId ?? undefined,
    utcSlotStart: targetSlot.utcStart,
  })
  console.log(`[stripe/checkout] Order created: ${order.id} (pending_payment)`)
  console.log(`[stripe/checkout] Redirecting to: ${checkoutSession.url}`)

  return Response.json({ url: checkoutSession.url })
}
