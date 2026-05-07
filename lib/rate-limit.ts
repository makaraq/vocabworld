// In-memory rate limiter — per-serverless-instance, resets on cold start.
// Good enough to stop accidental hammering; not a guarantee across all instances.
const store = new Map<string, { count: number; resetAt: number }>()

// Purge expired entries periodically to prevent unbounded memory growth.
let lastPurge = Date.now()
function maybePurge() {
  const now = Date.now()
  if (now - lastPurge < 60_000) return
  lastPurge = now
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key)
  }
}

/**
 * Returns true if the request is within the allowed rate.
 * @param key     Identifier (IP address or user ID)
 * @param limit   Max requests per window
 * @param windowMs Window duration in milliseconds
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  maybePurge()
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (entry.count >= limit) return false
  entry.count++
  return true
}
