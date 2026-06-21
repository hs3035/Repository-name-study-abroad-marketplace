import { loadMapSync, saveMap } from './persist'

// ── Types ─────────────────────────────────────────────────────────────────────

export type OrderStatus =
  | 'pending'               // legacy alias — same as pending_payment
  | 'pending_payment'       // created, waiting for student to pay
  | 'paid'                  // payment received by platform (held in escrow)
  | 'in_progress'           // adviser has started the service
  | 'completed_by_adviser'  // adviser marked done; student has 24h to confirm
  | 'confirmed'             // student confirmed — ready to release
  | 'refund_requested'      // student disputed within 24h
  | 'released'              // payment transferred to adviser
  | 'failed'                // payment failed
  | 'refunded'              // money returned to student

export type Order = {
  id: string
  slotId: string
  adviserId: string
  adviserName: string
  applicantId: string
  applicantName: string
  /** Total charged to the student, in fen (1 CNY = 100 fen) */
  amountFen: number
  /** Platform commission, in fen */
  platformFeeFen: number
  /** Amount to transfer to adviser = amountFen - platformFeeFen, in fen */
  adviserPayoutFen: number
  currency: string          // 'cny'
  status: OrderStatus
  stripeSessionId?: string
  stripePaymentIntentId?: string
  /** Stripe transfer ID created when payment is released to adviser */
  stripeTransferId?: string
  /** Adviser's Stripe Connect account ID — used when releasing payment */
  adviserStripeAccountId?: string
  /** UTC ISO string of the booked consultation slot */
  utcSlotStart: string
  createdAt: string
  paidAt?: string
  /** When the adviser marked the service as complete */
  adviserCompletedAt?: string
  /** 24h after adviserCompletedAt — auto-confirms/releases if student takes no action */
  autoReleaseAt?: string
  /** When the student confirmed the service */
  studentConfirmedAt?: string
  /** When the student requested a refund */
  refundRequestedAt?: string
  /** When the payment was transferred to the adviser */
  releasedAt?: string
}

// ── Store ─────────────────────────────────────────────────────────────────────

const FILE = '.data/orders.json'
export const STUDENT_CONFIRMATION_WINDOW_HOURS = 24
const g = global as typeof global & { _orders?: Map<string, Order> }
const loaded = loadMapSync<Order>(FILE)
const orders: Map<string, Order> =
  g._orders ?? (g._orders = loaded)

// ── Queries ───────────────────────────────────────────────────────────────────

export function getOrderById(id: string): Order | undefined {
  return orders.get(id)
}

export function getAllOrders(): Order[] {
  return Array.from(orders.values())
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function getOrderByStripeSession(stripeSessionId: string): Order | undefined {
  return Array.from(orders.values()).find(o => o.stripeSessionId === stripeSessionId)
}

export function getOrderByPaymentIntent(paymentIntentId: string): Order | undefined {
  return Array.from(orders.values()).find(o => o.stripePaymentIntentId === paymentIntentId)
}

export function getOrdersByAdviser(adviserId: string): Order[] {
  return Array.from(orders.values())
    .filter(o => o.adviserId === adviserId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function getOrdersByApplicant(applicantId: string): Order[] {
  return Array.from(orders.values())
    .filter(o => o.applicantId === applicantId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

const ACTIVE_SLOT_STATUSES = new Set<OrderStatus>([
  'pending',
  'pending_payment',
  'paid',
  'in_progress',
  'completed_by_adviser',
  'confirmed',
  'refund_requested',
  'released',
])

export function getActiveOrderBySlot(slotId: string): Order | undefined {
  return Array.from(orders.values()).find(
    o => o.slotId === slotId && ACTIVE_SLOT_STATUSES.has(o.status),
  )
}

export function getAdviserCompletedOrderCount(adviserId: string): number {
  return Array.from(orders.values()).filter(
    o => o.adviserId === adviserId && (o.status === 'confirmed' || o.status === 'released'),
  ).length
}

/** Orders where autoReleaseAt has passed and payment is still pending release */
export function getOrdersReadyForAutoRelease(): Order[] {
  const now = new Date().toISOString()
  return Array.from(orders.values()).filter(
    o => o.status === 'completed_by_adviser' && !!o.autoReleaseAt && o.autoReleaseAt <= now,
  )
}

export function getAdviserEarnings(adviserId: string): {
  totalPaidFen: number
  totalPlatformFeeFen: number
  totalAdviserPayoutFen: number
  paidOrderCount: number
} {
  // Count released orders (new flow) + legacy paid orders (old destination-charge flow)
  const earned = Array.from(orders.values()).filter(
    o => o.adviserId === adviserId && (o.status === 'released' || o.status === 'paid'),
  )
  return {
    totalPaidFen:          earned.reduce((s, o) => s + o.amountFen, 0),
    totalPlatformFeeFen:   earned.reduce((s, o) => s + o.platformFeeFen, 0),
    totalAdviserPayoutFen: earned.reduce((s, o) => s + o.adviserPayoutFen, 0),
    paidOrderCount:        earned.length,
  }
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function createOrder(data: Omit<Order, 'id' | 'createdAt'>): Order {
  const order: Order = {
    id: crypto.randomUUID(),
    ...data,
    createdAt: new Date().toISOString(),
  }
  orders.set(order.id, order)
  saveMap(FILE, orders).catch(() => {})
  return order
}

export function updateOrderStatus(
  id: string,
  status: OrderStatus,
  extra?: Partial<Order>,
): boolean {
  const order = orders.get(id)
  if (!order) return false
  orders.set(id, { ...order, status, ...extra })
  saveMap(FILE, orders).catch(() => {})
  return true
}

export function markOrderPaid(orderId: string, stripePaymentIntentId: string): boolean {
  return updateOrderStatus(orderId, 'paid', {
    stripePaymentIntentId,
    paidAt: new Date().toISOString(),
  })
}

export function markManualOrderPaid(orderId: string): boolean {
  return updateOrderStatus(orderId, 'paid', {
    paidAt: new Date().toISOString(),
  })
}

/** Adviser marks the service as completed. Starts the student confirmation window. */
export function markAdviserCompleted(orderId: string): boolean {
  const order = orders.get(orderId)
  if (!order) return false
  if (order.status !== 'paid' && order.status !== 'in_progress') return false

  const now = new Date()
  const autoReleaseAt = new Date(
    now.getTime() + STUDENT_CONFIRMATION_WINDOW_HOURS * 60 * 60 * 1000,
  ).toISOString()
  return updateOrderStatus(orderId, 'completed_by_adviser', {
    adviserCompletedAt: now.toISOString(),
    autoReleaseAt,
  })
}

/** Student confirms the service was completed. Triggers payment release. */
export function markStudentConfirmed(orderId: string): boolean {
  const order = orders.get(orderId)
  if (!order) return false
  if (order.status !== 'completed_by_adviser') return false
  return updateOrderStatus(orderId, 'confirmed', {
    studentConfirmedAt: new Date().toISOString(),
  })
}

/** Student requests a refund within the student confirmation window. */
export function markRefundRequested(orderId: string): boolean {
  const order = orders.get(orderId)
  if (!order) return false
  if (order.status !== 'completed_by_adviser') return false
  return updateOrderStatus(orderId, 'refund_requested', {
    refundRequestedAt: new Date().toISOString(),
  })
}

/** Mark payment as released to adviser. Idempotent — safe to call multiple times. */
export function markOrderReleased(orderId: string, stripeTransferId: string): boolean {
  const order = orders.get(orderId)
  if (!order) return false
  if (order.stripeTransferId) return true  // already released, idempotent
  return updateOrderStatus(orderId, 'released', {
    releasedAt: new Date().toISOString(),
    stripeTransferId,
  })
}
