// Pricing configuration
// Price IDs are loaded server-side only for security

// Pricing configuration
export const PRICING = {
  monthly: {
    priceId: process.env.STRIPE_MONTHLY_PRICE_ID || '',
    price: 4.99,
    interval: 'month' as const,
    name: 'Monthly',
  },
  yearly: {
    priceId: process.env.STRIPE_YEARLY_PRICE_ID || '',
    price: 29.99,
    interval: 'year' as const,
    name: 'Yearly',
    savings: '50%',
  },
}

// Free topic IDs (accessible without subscription)
export const FREE_TOPIC_IDS = [1, 2, 3] // Greetings, Numbers, Time

export function isFreeTopic(topicId: number): boolean {
  return FREE_TOPIC_IDS.includes(topicId)
}

export function formatPrice(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}
