import { Request, Response, NextFunction } from 'express'
import Redis from 'ioredis'
import { AppError } from './errorHandler'
import { logger } from '../utils/logger'

// Create Redis client for rate limiting
const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
})

redisClient.on('error', (err: Error) => logger.error('Redis Client Error', err))

redisClient.on('connect', () => {
  logger.info('Redis connected successfully')
})

interface RateLimitOptions {
  maxRequests: number
  windowMs: number
  keyPrefix?: string
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
}

/**
 * Rate limiting middleware using Redis with per-user tracking
 * @param options - Rate limit configuration
 */
export const rateLimit = (options: RateLimitOptions) => {
  const {
    maxRequests,
    windowMs,
    keyPrefix = 'rate_limit',
  } = options

  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Get user ID from authenticated request
      const userId = req.user?.id

      if (!userId) {
        return next(new AppError('Authentication required', 401))
      }

      // Create rate limit key with prefix
      const windowKey = `${keyPrefix}:${userId}:${Math.floor(Date.now() / windowMs)}`

      // Get current count
      const current = await redisClient.get(windowKey)
      const count = current ? parseInt(current, 10) : 0

      if (count >= maxRequests) {
        logger.warn('Rate limit exceeded', {
          userId,
          path: req.path,
          method: req.method,
          count,
          limit: maxRequests,
        })

        return next(
          new AppError(
            `Rate limit exceeded. Maximum ${maxRequests} requests per ${windowMs / 1000} seconds`,
            429
          )
        )
      }

      // Increment counter
      if (count === 0) {
        // First request in window, set with expiration
        await redisClient.set(windowKey, '1', {
          PX: windowMs,
        })
      } else {
        // Increment existing counter
        await redisClient.incr(windowKey)
      }

      // Add rate limit headers
      res.setHeader('X-RateLimit-Limit', maxRequests.toString())
      res.setHeader('X-RateLimit-Remaining', (maxRequests - count - 1).toString())
      res.setHeader('X-RateLimit-Reset', (Date.now() + windowMs).toString())

      next()
    } catch (error) {
      logger.error('Rate limit error', error)
      // On Redis error, allow request to proceed
      next()
    }
  }
}

/**
 * IP-based rate limiting for unauthenticated endpoints
 * @param options - Rate limit configuration
 */
export const rateLimitByIP = (options: RateLimitOptions) => {
  const {
    maxRequests,
    windowMs,
    keyPrefix = 'rate_limit_ip',
  } = options

  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Get IP address
      const ip = req.ip || req.socket.remoteAddress || 'unknown'

      // Create rate limit key with IP
      const windowKey = `${keyPrefix}:${ip}:${Math.floor(Date.now() / windowMs)}`

      // Get current count
      const current = await redisClient.get(windowKey)
      const count = current ? parseInt(current, 10) : 0

      if (count >= maxRequests) {
        logger.warn('IP rate limit exceeded', {
          ip,
          path: req.path,
          method: req.method,
          count,
          limit: maxRequests,
        })

        return next(
          new AppError(
            `Too many requests from this IP. Please try again later.`,
            429
          )
        )
      }

      // Increment counter
      if (count === 0) {
        await redisClient.set(windowKey, '1', {
          PX: windowMs,
        })
      } else {
        await redisClient.incr(windowKey)
      }

      // Add rate limit headers
      res.setHeader('X-RateLimit-Limit', maxRequests.toString())
      res.setHeader('X-RateLimit-Remaining', (maxRequests - count - 1).toString())
      res.setHeader('X-RateLimit-Reset', (Date.now() + windowMs).toString())

      next()
    } catch (error) {
      logger.error('IP rate limit error', error)
      // On Redis error, allow request to proceed
      next()
    }
  }
}

/**
 * Get remaining rate limit for a user
 */
export const getRateLimitStatus = async (
  userId: string,
  maxRequests: number,
  windowMs: number,
  keyPrefix: string = 'rate_limit'
): Promise<{ remaining: number; limit: number; resetAt: number }> => {
  try {
    const windowKey = `${keyPrefix}:${userId}:${Math.floor(Date.now() / windowMs)}`
    const current = await redisClient.get(windowKey)
    const count = current ? parseInt(current, 10) : 0

    return {
      remaining: Math.max(0, maxRequests - count),
      limit: maxRequests,
      resetAt: Date.now() + windowMs,
    }
  } catch (error) {
    logger.error('Error getting rate limit status', error)
    return {
      remaining: maxRequests,
      limit: maxRequests,
      resetAt: Date.now() + windowMs,
    }
  }
}
