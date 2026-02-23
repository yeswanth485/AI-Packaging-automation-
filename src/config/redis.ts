import Redis from 'ioredis'
import { logger } from '../utils/logger'

// Support both REDIS_URL (Railway/Upstash format) and individual host/port/password
const redisUrl = process.env.REDIS_URL

let redis: Redis

if (redisUrl) {
  // Use connection string (Railway/Upstash format: rediss://default:password@host:port)
  redis = new Redis(redisUrl, {
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000)
      return delay
    },
    maxRetriesPerRequest: 3,
    connectTimeout: 10000,
    lazyConnect: true,
    tls: redisUrl.startsWith('rediss://') ? {} : undefined, // Enable TLS for rediss://
  })
} else {
  // Use individual environment variables (local development)
  redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000)
      return delay
    },
    maxRetriesPerRequest: 3,
    connectTimeout: 10000,
    lazyConnect: true,
  })
}

redis.on('connect', () => {
  logger.info('Redis connected successfully')
})

redis.on('error', (error) => {
  logger.error('Redis connection error:', error)
  // Don't exit process on Redis errors in production
  if (process.env.NODE_ENV !== 'production') {
    logger.warn('Redis is optional in development mode')
  }
})

redis.on('close', () => {
  logger.warn('Redis connection closed')
})

// Test Redis connection with graceful fallback
redis.ping().catch((error) => {
  logger.warn('Redis ping failed, continuing without Redis:', error)
})

export { redis }
