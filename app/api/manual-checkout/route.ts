import { type NextRequest } from 'next/server'
import { getSession } from '@/app/lib/session'
import { getAdviserById, isAdviserBookingReady } from '@/app/lib/advisers'
import { bookSlot, getSlotById } from '@/app/lib/slots'
import { createOrder, getActiveOrderBySlot } from '@/app/lib/orders'
import { calcFees } from '@/app/lib/stripe'
import { getPaymentMode } from '@/app/lib/payment-mode'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  console.log('[manual-checkout] POST request received')

  if (getPaymentMode() !== 'manual') {
    return Response.json({ error: '当前未开启人工付款模式' }, { status: 400 })
  }

  const session = await getSession()
  if (!session || session.role !== 'applicant') {
    return Response.json({ error: '请先登录学生账号' }, { status: 401 })
  }

  let slotId: string
  try {
    const body = await request.json()
    slotId = body.slotId
    if (!slotId || typeof slotId !== 'string') throw new Error('missing slotId')
  } catch {
    return Response.json({ error: '参数错误' }, { status: 400 })
  }

  const existing = getActiveOrderBySlot(slotId)
  if (existing) {
    if (existing.applicantId === session.userId) {
      return Response.json({ url: `/payment/manual?orderId=${existing.id}` })
    }
    return Response.json({ error: '该时段已被预约，请重新选择' }, { status: 400 })
  }

  const slot = getSlotById(slotId)
  if (!slot || slot.status !== 'available') {
    return Response.json({ error: '该时段不可预约，请重新选择' }, { status: 400 })
  }

  const adviser = getAdviserById(slot.adviserId)
  if (!adviser) {
    return Response.json({ error: '导师不存在' }, { status: 400 })
  }
  if (!isAdviserBookingReady(adviser)) {
    return Response.json({ error: '该导师还没有完成联系方式、会议链接和结算账户设置，暂时不能预约' }, { status: 400 })
  }

  const locked = bookSlot(slot.id, session.userId, session.name)
  if (!locked) {
    return Response.json({ error: '该时段刚刚被预约，请重新选择' }, { status: 409 })
  }

  const amountFen = slot.price * 100
  const { platformFeeFen, adviserPayoutFen } = calcFees(amountFen)
  const order = createOrder({
    slotId: slot.id,
    adviserId: adviser.id,
    adviserName: adviser.name,
    applicantId: session.userId,
    applicantName: session.name,
    amountFen,
    platformFeeFen,
    adviserPayoutFen,
    currency: 'cny',
    status: 'pending_payment',
    utcSlotStart: slot.utcStart,
  })

  console.log(`[manual-checkout] Order ${order.id} created and slot ${slot.id} locked`)
  return Response.json({ url: `/payment/manual?orderId=${order.id}` })
}
