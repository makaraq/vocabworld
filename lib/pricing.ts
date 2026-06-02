// Pricing configuration
export const PRICING = {
  monthly: {
    price: 5.99,
    interval: 'month' as const,
    name: 'Monthly',
    // RevenueCat package identifier (set in RC Dashboard)
    rcPackageId: '$rc_monthly',
  },
  yearly: {
    price: 49.99,
    interval: 'year' as const,
    name: 'Yearly',
    savings: '50%',
    // RevenueCat package identifier (set in RC Dashboard)
    rcPackageId: '$rc_annual',
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
