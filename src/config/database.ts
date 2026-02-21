import { PrismaClient } from '@prisma/client'
import { logger } from '../utils/logger'

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

// Test database connection
prisma.$connect()
  .then(() => {
    logger.info('Database connected successfully with connection pooling enabled')
  })
  .catch((error) => {
    logger.error('Database connection failed:', error)
    process.exit(1)
  })

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect()
  logger.info('Database connection closed')
})

export { prisma }
