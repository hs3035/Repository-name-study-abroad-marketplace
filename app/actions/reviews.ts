'use server'

import { getSession } from '@/app/lib/session'
import { getOrderById } from '@/app/lib/orders'
import {
  createReview,
  getMentorPublicReviews,
  getMentorReviewSummary,
  getReviewByOrderAndRole,
  type Review,
  type ReviewSummary,
} from '@/app/lib/reviews'

export type ReviewActionResult = { ok: boolean; error?: string }

const REVIEWABLE: string[] = ['confirmed', 'released']

export async function submitReview(
  orderId: string,
  rating: number,
  comment: string,
): Promise<ReviewActionResult> {
  const session = await getSession()
  if (!session) return { ok: false, error: '请先登录' }
  if (rating < 1 || rating > 5) return { ok: false, error: '评分必须在 1–5 之间' }

  const order = getOrderById(orderId)
  if (!order) return { ok: false, error: '订单不存在' }
  if (!REVIEWABLE.includes(order.status)) return { ok: false, error: '只有已完成的订单才能评价' }

  if (session.role === 'applicant') {
    if (order.applicantId !== session.userId) return { ok: false, error: '无权操作' }
    const r = createReview(orderId, session.userId, order.adviserId, 'student', rating, comment || undefined)
    if (!r) return { ok: false, error: '你已经评价过这个订单了' }
  } else if (session.role === 'adviser') {
    if (order.adviserId !== session.userId) return { ok: false, error: '无权操作' }
    const r = createReview(orderId, session.userId, order.applicantId, 'mentor', rating, comment || undefined)
    if (!r) return { ok: false, error: '你已经评价过这个订单了' }
  } else {
    return { ok: false, error: '无权操作' }
  }

  return { ok: true }
}

export async function fetchMentorReviews(adviserId: string): Promise<Review[]> {
  return getMentorPublicReviews(adviserId)
}

export async function fetchMentorReviewSummary(adviserId: string): Promise<ReviewSummary> {
  return getMentorReviewSummary(adviserId)
}

/** Returns which orders already have a student / mentor review written. */
export async function fetchOrderReviewStatus(
  orderIds: string[],
): Promise<Record<string, { studentDone: boolean; mentorDone: boolean }>> {
  const result: Record<string, { studentDone: boolean; mentorDone: boolean }> = {}
  for (const id of orderIds) {
    result[id] = {
      studentDone: !!getReviewByOrderAndRole(id, 'student'),
      mentorDone:  !!getReviewByOrderAndRole(id, 'mentor'),
    }
  }
  return result
}
