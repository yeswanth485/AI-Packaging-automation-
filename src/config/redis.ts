import Redis from 'ioredis'
import { logger } from '../utils/logger'

// Support both REDIS_URL (Upstash format) and individual host/port/password
const redisUrl = process.env.REDIS_URL

let redis: Redis

if (redisUrl) {
  // Use connection string (Upstash format: rediss://default:password@host:port)
  redis = new Redis(redisUrl, {
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000)
      return delay
    },
    maxRetriesPerRequest: 3,
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
  })
}

redis.on('connect', () => {
  logger.info('Redis connected successfully')
})

redis.on('error', (error) => {
  logger.error('Redis connection error:', error)
})

redis.on('close', () => {
  logger.warn('Redis connection closed')
})

export { redis }
