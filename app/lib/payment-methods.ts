import type Stripe from 'stripe'

export type CheckoutPaymentMethod = 'card' | 'alipay' | 'wechat_pay'

const DEFAULT_PAYMENT_METHODS: CheckoutPaymentMethod[] = ['card']
const SUPPORTED_PAYMENT_METHODS: CheckoutPaymentMethod[] = ['card', 'alipay', 'wechat_pay']

export function getCheckoutPaymentMethods(): CheckoutPaymentMethod[] {
  const raw = process.env.STRIPE_PAYMENT_METHODS
  if (!raw) return DEFAULT_PAYMENT_METHODS

  const supported = new Set<string>(SUPPORTED_PAYMENT_METHODS)
  const parsed = raw
    .split(',')
    .map(method => method.trim())
    .filter((method): method is CheckoutPaymentMethod => supported.has(method))

  const unique = Array.from(new Set(parsed))
  if (!unique.includes('card')) unique.unshift('card')

  return unique.length > 0 ? unique : DEFAULT_PAYMENT_METHODS
}

export function getCheckoutPaymentMethodOptions(
  paymentMethods: CheckoutPaymentMethod[],
): Stripe.Checkout.SessionCreateParams['payment_method_options'] | undefined {
  if (!paymentMethods.includes('wechat_pay')) return undefined

  return {
    wechat_pay: {
      client: 'web',
    },
  }
}
