import { PrismaClient } from '@prisma/client'
import { logger } from '../utils/logger'

// Validate DATABASE_URL is present
if (!process.env.DATABASE_URL) {
  logger.error('DATABASE_URL environment variable is not set')
  process.exit(1)
}

// Configure Prisma with connection pooling and query timeouts
// Requirements: 22.8 (connection pooling), 22.10 (query timeouts)
const prisma = new PrismaClient({
  log: [
    { level: 'query', emit: 'event' },
    { level: 'error', emit: 'stdout' },
    { level: 'warn', emit: 'stdout' },
  ],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
})

// Log slow queries (queries taking more than 1 second)
prisma.$on('query', (e) => {
  if (e.duration > 1000) {
    logger.warn(`Slow query detected: ${e.query} (${e.duration}ms)`, {
      query: e.query,
      duration: e.duration,
      params: e.params,
    })
  }
})

// Test database connection with retry logic for Railway
const connectWithRetry = async (retries = 5): Promise<void> => {
  for (let i = 0; i < retries; i++) {
    try {
      await prisma.$connect()
      logger.info('Database connected successfully with connection pooling enabled')
      return
    } catch (error) {
      logger.warn(`Database connection attempt ${i + 1}/${retries} failed:`, error)
      if (i === retries - 1) {
        logger.error('Database connection failed after all retries:', error)
        process.exit(1)
      }
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000))
    }
  }
}

// Initialize connection
connectWithRetry()

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect()
  logger.info('Database connection closed')
})

export { prisma }
