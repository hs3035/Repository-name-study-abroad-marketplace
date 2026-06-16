import { loadMapSync, saveMap } from './persist'

export type ReviewerRole = 'student' | 'mentor'

export type Review = {
  id: string
  orderId: string
  reviewerId: string
  revieweeId: string
  reviewerRole: ReviewerRole
  rating: number       // 1–5
  comment?: string
  createdAt: string
  updatedAt: string
}

export type ReviewSummary = {
  average: number
  count: number
}

// ── Store ─────────────────────────────────────────────────────────────────────

const FILE = '.data/reviews.json'
const g = global as typeof global & { _reviews?: Map<string, Review> }
if (!g._reviews) {
  const loaded = loadMapSync<Review>(FILE)
  g._reviews = loaded.size ? loaded : new Map()
}
const reviews: Map<string, Review> = g._reviews

// ── Mutations ─────────────────────────────────────────────────────────────────

export function createReview(
  orderId: string,
  reviewerId: string,
  revieweeId: string,
  reviewerRole: ReviewerRole,
  rating: number,
  comment?: string,
): Review | null {
  const exists = Array.from(reviews.values()).some(
    r => r.orderId === orderId && r.reviewerRole === reviewerRole,
  )
  if (exists) return null

  const now = new Date().toISOString()
  const review: Review = {
    id: crypto.randomUUID(),
    orderId,
    reviewerId,
    revieweeId,
    reviewerRole,
    rating,
    comment,
    createdAt: now,
    updatedAt: now,
  }
  reviews.set(review.id, review)
  saveMap(FILE, reviews).catch(() => {})
  return review
}

// ── Queries ───────────────────────────────────────────────────────────────────

export function getReviewByOrderAndRole(orderId: string, role: ReviewerRole): Review | undefined {
  return Array.from(reviews.values()).find(
    r => r.orderId === orderId && r.reviewerRole === role,
  )
}

export function getMentorPublicReviews(adviserId: string): Review[] {
  return Array.from(reviews.values())
    .filter(r => r.revieweeId === adviserId && r.reviewerRole === 'student')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function getMentorReviewSummary(adviserId: string): ReviewSummary {
  const all = Array.from(reviews.values()).filter(
    r => r.revieweeId === adviserId && r.reviewerRole === 'student',
  )
  if (all.length === 0) return { average: 0, count: 0 }
  const sum = all.reduce((s, r) => s + r.rating, 0)
  return { average: Math.round((sum / all.length) * 10) / 10, count: all.length }
}
