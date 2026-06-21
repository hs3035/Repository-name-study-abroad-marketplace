import { redirect } from 'next/navigation'
import { getSession } from '@/app/lib/session'
import { getSlotById } from '@/app/lib/slots'
import { getAdviserById, isAdviserBookingReady } from '@/app/lib/advisers'
import { getLocale } from '@/app/lib/locale'
import { calcFees } from '@/app/lib/stripe'
import { getCheckoutPaymentMethods } from '@/app/lib/payment-methods'
import { getManualPaymentConfig, getPaymentMode } from '@/app/lib/payment-mode'
import CheckoutClient from './CheckoutClient'
import Link from 'next/link'

type Props = { searchParams: Promise<{ slotId?: string }> }

export default async function CheckoutPage({ searchParams }: Props) {
  const [session, locale] = await Promise.all([getSession(), getLocale()])
  if (!session || session.role !== 'applicant') redirect('/login')

  const { slotId } = await searchParams
  if (!slotId) redirect('/dashboard/applicant')

  const slot = getSlotById(slotId)
  const zh = locale === 'zh'

  if (!slot) {
    return <CheckoutError zh={zh} message={zh ? '找不到该时段，可能已被删除' : 'Slot not found'} />
  }
  if (slot.status !== 'available') {
    return <CheckoutError zh={zh} message={zh ? '该时段已被预约，请返回重新选择' : 'This slot has already been booked'} />
  }

  const adviser = getAdviserById(slot.adviserId)
  if (!adviser) redirect('/dashboard/applicant')
  if (!isAdviserBookingReady(adviser)) {
    return (
      <CheckoutError
        zh={zh}
        message={zh
          ? '该导师还没有完成联系方式、会议链接和结算账户设置，暂时不能预约。'
          : 'This mentor has not completed contact, meeting, and payout setup yet.'}
      />
    )
  }

  const amountFen = slot.price * 100
  const { platformFeeFen, adviserPayoutFen } = calcFees(amountFen)
  const paymentMode = getPaymentMode()

  return (
    <CheckoutClient
      slotId={slot.id}
      utcStart={slot.utcStart}
      price={slot.price}
      amountFen={amountFen}
      platformFeeFen={platformFeeFen}
      adviserPayoutFen={adviserPayoutFen}
      adviserId={adviser.id}
      adviserName={adviser.name}
      adviserSchool={adviser.school}
      adviserTimezone={adviser.timezone}
      stripeReady={paymentMode === 'manual' || !!adviser.stripeAccountId}
      paymentMode={paymentMode}
      manualPayment={getManualPaymentConfig()}
      paymentMethods={getCheckoutPaymentMethods()}
      locale={locale}
    />
  )
}

function CheckoutError({ zh, message }: { zh: boolean; message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-2xl border shadow-sm w-full max-w-sm p-8 text-center space-y-4">
        <div className="text-4xl">⚠️</div>
        <p className="text-sm text-gray-600">{message}</p>
        <Link href="/dashboard/applicant"
          className="inline-block w-full rounded-xl bg-black py-2.5 text-sm font-medium text-white hover:bg-gray-800 transition">
          {zh ? '返回导师列表' : 'Back to mentors'}
        </Link>
      </div>
    </div>
  )
}
