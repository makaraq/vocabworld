// Server-only Stripe client
// DO NOT import this file on the client side!
import Stripe from 'stripe'

// Re-export client-safe exports from pricing.ts
export { PRICING, FREE_TOPIC_IDS, isFreeTopic, formatPrice } from './pricing'

// Only initialize Stripe on the server
let stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not set')
    }
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-12-15.clover',
      typescript: true,
    })
  }
  return stripe
}

// For backwards compatibility in API routes
export { stripe }

