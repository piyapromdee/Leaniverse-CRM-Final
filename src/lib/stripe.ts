import Stripe from 'stripe'

// Lazy initialization to prevent build-time errors when STRIPE_SECRET_KEY is not set
let _stripeClient: Stripe | null = null

export function getStripe(): Stripe {
  if (_stripeClient) return _stripeClient

  const secretKey = process.env.STRIPE_SECRET_KEY

  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not set. Make sure this environment variable is configured.')
  }

  _stripeClient = new Stripe(secretKey, {
    apiVersion: '2025-07-30.basil',
  })

  return _stripeClient
}
