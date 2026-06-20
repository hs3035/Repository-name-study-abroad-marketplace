'use server'

import {
  getAllOrders,
  getOrderById,
  markManualOrderPaid,
  markOrderReleased,
  updateOrderStatus,
  type Order,
} from '@/app/lib/orders'
import { isAdminSession } from '@/app/lib/payment-mode'
import { getSession } from '@/app/lib/session'
import { reopenSlot } from '@/app/lib/slots'

async function requireAdmin(): Promise<boolean> {
  const session = await getSession()
  return isAdminSession(session)
}

export async function adminFetchOrders(): Promise<Order[]> {
  if (!(await requireAdmin())) return []
  return getAllOrders()
}

export async function adminConfirmManualPayment(orderId: string): Promise<{ ok: boolean; error?: string }> {
  if (!(await requireAdmin())) return { ok: false, error: '无权操作' }

  const order = getOrderById(orderId)
  if (!order) return { ok: false, error: '订单不存在' }
  if (order.status !== 'pending_payment') return { ok: false, error: '只有待付款订单可以确认收款' }
  if (order.stripeSessionId) return { ok: false, error: '这是 Stripe 订单，不能人工确认' }

  const ok = markManualOrderPaid(orderId)
  if (!ok) return { ok: false, error: '确认失败，请重试' }
  console.log(`[admin] Manual payment confirmed for order ${orderId}`)
  return { ok: true }
}

export async function adminCancelManualOrder(orderId: string): Promise<{ ok: boolean; error?: string }> {
  if (!(await requireAdmin())) return { ok: false, error: '无权操作' }

  const order = getOrderById(orderId)
  if (!order) return { ok: false, error: '订单不存在' }
  if (order.status !== 'pending_payment') return { ok: false, error: '只能取消待付款订单' }
  if (order.stripeSessionId) return { ok: false, error: '这是 Stripe 订单，不能人工取消' }

  updateOrderStatus(orderId, 'failed')
  reopenSlot(order.slotId)
  console.log(`[admin] Manual order ${orderId} cancelled and slot ${order.slotId} reopened`)
  return { ok: true }
}

export async function adminMarkManualPayoutReleased(orderId: string): Promise<{ ok: boolean; error?: string }> {
  if (!(await requireAdmin())) return { ok: false, error: '无权操作' }

  const order = getOrderById(orderId)
  if (!order) return { ok: false, error: '订单不存在' }
  if (order.status !== 'confirmed') return { ok: false, error: '只有学生已确认的订单可以标记结算' }

  const ok = markOrderReleased(orderId, `manual_${orderId}`)
  if (!ok) return { ok: false, error: '标记失败，请重试' }
  console.log(`[admin] Manual payout marked released for order ${orderId}`)
  return { ok: true }
}
