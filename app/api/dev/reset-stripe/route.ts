/**
 * DEV-ONLY endpoint — clears the adviser's saved stripeAccountId so they
 * can restart Stripe Connect onboarding from scratch with a clean account.
 *
 * This route returns 404 in production and must never be deployed there.
 * It touches only the stripeAccountId field; all other adviser data is
 * left untouched.
 *
 * Usage:
 *   DELETE /api/dev/reset-stripe   (adviser must be logged in)
 */

import { getSession } from '@/app/lib/session'
import { getAdviserById, updateAdviser } from '@/app/lib/advisers'

export async function DELETE() {
  // Hard-stop in production — route acts as if it doesn't exist
  if (process.env.NODE_ENV === 'production') {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  const session = await getSession()
  if (!session || session.role !== 'adviser') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const adviser = getAdviserById(session.userId)
  if (!adviser) {
    return Response.json({ error: 'Adviser not found' }, { status: 404 })
  }

  const previousId = adviser.stripeAccountId ?? null

  if (previousId) {
    // Set to undefined — JSON serialisation drops undefined values, so the
    // field is completely removed from .data/advisers.json on the next save.
    updateAdviser(adviser.id, { stripeAccountId: undefined })
  }

  return Response.json({
    ok: true,
    clearedAccountId: previousId,
    message: previousId
      ? `Cleared stripeAccountId (was ${previousId}). Click "Connect Stripe" to create a fresh account.`
      : 'No stripeAccountId was set — nothing to clear.',
  })
}
