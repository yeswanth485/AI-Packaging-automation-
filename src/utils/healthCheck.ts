import { prisma } from '../config/database'
import { redis } from '../config/redis'
import { logger } from './logger'

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded'
  timestamp: string
  uptime: number
  checks: {
    database: HealthCheckDetail
    redis: HealthCheckDetail
    memory: HealthCheckDetail
  }
}

export interface HealthCheckDetail {
  status: 'up' | 'down' | 'degraded'
  responseTime?: number
  message?: string
  details?: Record<string, unknown>
}

/**
 * Perform comprehensive health check
 */
export async function performHealthCheck(): Promise<HealthCheckResult> {
  // Check database connectivity
  const databaseCheck = await checkDatabase()
  
  // Check Redis connectivity
  const redisCheck = await checkRedis()
  
  // Check memory usage
  const memoryCheck = checkMemory()
  
  // Determine overall status
  const allChecks = [databaseCheck, redisCheck, memoryCheck]
  const hasDown = allChecks.some(check => check.status === 'down')
  const hasDegraded = allChecks.some(check => check.status === 'degraded')
  
  let overallStatus: 'healthy' | 'unhealthy' | 'degraded'
  if (hasDown) {
    overallStatus = 'unhealthy'
  } else if (hasDegraded) {
    overallStatus = 'degraded'
  } else {
    overallStatus = 'healthy'
  }
  
  return {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {
      database: databaseCheck,
      redis: redisCheck,
      memory: memoryCheck,
    },
  }
}

/**
 * Check database connectivity
 */
async function checkDatabase(): Promise<HealthCheckDetail> {
  const start = Date.now()
  
  try {
    // Simple query to check database connectivity
    await prisma.$queryRaw`SELECT 1`
    
    const responseTime = Date.now() - start
    
    return {
      status: responseTime < 100 ? 'up' : 'degraded',
      responseTime,
      message: responseTime < 100 ? 'Database is healthy' : 'Database response is slow',
    }
  } catch (error) {
    logger.error('Database health check failed', { error })
    
    return {
      status: 'down',
      responseTime: Date.now() - start,
      message: 'Database connection failed',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    }
  }
}

/**
 * Check Redis connectivity
 */
async function checkRedis(): Promise<HealthCheckDetail> {
  const start = Date.now()
  
  try {
    // Ping Redis
    const pong = await redis.ping()
    
    const responseTime = Date.now() - start
    
    if (pong !== 'PONG') {
      return {
        status: 'down',
        responseTime,
        message: 'Redis ping failed',
      }
    }
    
    return {
      status: responseTime < 50 ? 'up' : 'degraded',
      responseTime,
      message: responseTime < 50 ? 'Redis is healthy' : 'Redis response is slow',
    }
  } catch (error) {
    logger.error('Redis health check failed', { error })
    
    return {
      status: 'down',
      responseTime: Date.now() - start,
      message: 'Redis connection failed',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    }
  }
}

/**
 * Check memory usage
 */
function checkMemory(): HealthCheckDetail {
  const memoryUsage = process.memoryUsage()
  const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024)
  const heapTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024)
  const heapUsagePercent = Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100)
  
  let status: 'up' | 'degraded' | 'down'
  let message: string
  
  if (heapUsagePercent < 80) {
    status = 'up'
    message = 'Memory usage is healthy'
  } else if (heapUsagePercent < 95) {
    status = 'degraded'
    message = 'Memory usage is high'
  } else {
    status = 'down'
    message = 'Memory usage is critical'
  }
  
  return {
    status,
    message,
    details: {
      heapUsedMB,
      heapTotalMB,
      heapUsagePercent,
      rss: Math.round(memoryUsage.rss / 1024 / 1024),
      external: Math.round(memoryUsage.external / 1024 / 1024),
    },
  }
}

/**
 * Simple health check for load balancers
 */
export function simpleHealthCheck(): { status: string; timestamp: string } {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
  }
}
