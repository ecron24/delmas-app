import { Context, Next } from 'hono'

// Simple in-memory rate limiter (for production, use Redis)
const requestCounts = new Map<string, { count: number; resetTime: number }>()

/**
 * Rate limiter middleware
 * @param maxRequests Maximum requests per window (default: 100)
 * @param windowMs Window duration in milliseconds (default: 15 minutes)
 */
export const rateLimiter = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  return async (c: Context, next: Next) => {
    // Get identifier (IP or user ID)
    const identifier = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown'

    const now = Date.now()
    const requestData = requestCounts.get(identifier)

    if (!requestData || now > requestData.resetTime) {
      // New window
      requestCounts.set(identifier, {
        count: 1,
        resetTime: now + windowMs
      })
      return await next()
    }

    if (requestData.count >= maxRequests) {
      const retryAfter = Math.ceil((requestData.resetTime - now) / 1000)

      c.header('Retry-After', retryAfter.toString())
      c.header('X-RateLimit-Limit', maxRequests.toString())
      c.header('X-RateLimit-Remaining', '0')
      c.header('X-RateLimit-Reset', requestData.resetTime.toString())

      return c.json({
        error: 'Too Many Requests',
        message: `Trop de requêtes. Veuillez réessayer dans ${retryAfter} secondes.`,
        retry_after: retryAfter
      }, 429)
    }

    // Increment counter
    requestData.count++
    requestCounts.set(identifier, requestData)

    // Set rate limit headers
    c.header('X-RateLimit-Limit', maxRequests.toString())
    c.header('X-RateLimit-Remaining', (maxRequests - requestData.count).toString())
    c.header('X-RateLimit-Reset', requestData.resetTime.toString())

    await next()
  }
}

// Cleanup old entries every hour
setInterval(() => {
  const now = Date.now()
  for (const [key, data] of requestCounts.entries()) {
    if (now > data.resetTime) {
      requestCounts.delete(key)
    }
  }
}, 60 * 60 * 1000)
