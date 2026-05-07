// Centralized API response cache to prevent duplicate requests
// Helps reduce API calls and improve performance

interface CacheEntry<T> {
  data: T
  timestamp: number
  expiry: number
}

class ApiCache {
  private cache = new Map<string, CacheEntry<any>>()
  private pendingRequests = new Map<string, Promise<any>>()

  // Default cache duration: 5 minutes
  private defaultCacheDuration = 5 * 60 * 1000 

  /**
   * Get cached data or fetch if not available/expired
   */
  async getCachedData<T>(
    cacheKey: string, 
    fetchFn: () => Promise<T>, 
    cacheDurationMs: number = this.defaultCacheDuration
  ): Promise<T> {
    const now = Date.now()
    
    // Check if we have valid cached data
    const cached = this.cache.get(cacheKey)
    if (cached && now < cached.expiry) {
      return cached.data
    }

    // Check if there's already a pending request for this key
    const pendingRequest = this.pendingRequests.get(cacheKey)
    if (pendingRequest) {
      return pendingRequest
    }

    // Create new request
    const request = fetchFn().then(data => {
      // Cache the result
      this.cache.set(cacheKey, {
        data,
        timestamp: now,
        expiry: now + cacheDurationMs
      })
      
      // Remove from pending requests
      this.pendingRequests.delete(cacheKey)
      
      return data
    }).catch(error => {
      // Remove from pending requests on error
      this.pendingRequests.delete(cacheKey)
      throw error
    })

    // Store pending request
    this.pendingRequests.set(cacheKey, request)
    
    return request
  }

  /**
   * Clear expired cache entries
   */
  cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now >= entry.expiry) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear()
    this.pendingRequests.clear()
  }

  /**
   * Get cache stats for debugging
   */
  getStats() {
    return {
      cacheSize: this.cache.size,
      pendingRequests: this.pendingRequests.size,
      entries: Array.from(this.cache.keys())
    }
  }
}

// Singleton instance
export const apiCache = new ApiCache()

// Cleanup expired entries every 10 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    apiCache.cleanup()
  }, 10 * 60 * 1000)
}