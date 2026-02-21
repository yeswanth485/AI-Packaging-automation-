import { Request, Response, NextFunction } from 'express'
import { logger } from '../utils/logger'

// Note: Prisma audit log storage is commented out for now
// Uncomment when audit log table is added to schema
// import { PrismaClient } from '@prisma/client'
// const prisma = new PrismaClient()

interface AuditLogEntry {
  userId?: string
  action: string
  resource: string
  method: string
  path: string
  statusCode?: number
  ip: string
  userAgent: string
  requestId: string
  duration?: number
  error?: string
  metadata?: Record<string, any>
}

/**
 * Middleware to log all API requests for audit purposes
 */
export const auditLogMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const startTime = Date.now()
  const requestId = req.headers['x-request-id'] as string

  // Capture original end function
  const originalEnd = res.end

  // Override end function to log after response
  res.end = function (chunk?: any, encoding?: any, callback?: any): any {
    // Restore original end
    res.end = originalEnd

    // Calculate duration
    const duration = Date.now() - startTime

    // Create audit log entry
    const auditEntry: AuditLogEntry = {
      userId: req.user?.id,
      action: determineAction(req.method, req.path),
      resource: determineResource(req.path),
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      ip: req.ip || req.socket.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      requestId,
      duration,
    }

    // Add metadata for specific actions
    if (req.body && Object.keys(req.body).length > 0) {
      auditEntry.metadata = sanitizeMetadata(req.body)
    }

    // Log to Winston
    logger.info('API Request', auditEntry)

    // For critical actions, also store in database
    if (isCriticalAction(req.method, req.path)) {
      storeAuditLog(auditEntry).catch((error) => {
        logger.error('Failed to store audit log', error)
      })
    }

    // Call original end
    return originalEnd.call(this, chunk, encoding, callback)
  }

  next()
}

/**
 * Log authentication attempts
 */
export const logAuthAttempt = (
  email: string,
  success: boolean,
  ip: string,
  reason?: string
): void => {
  logger.info('Authentication attempt', {
    email,
    success,
    ip,
    reason,
    timestamp: new Date().toISOString(),
  })

  // Store in database for security monitoring
  storeAuditLog({
    action: success ? 'LOGIN_SUCCESS' : 'LOGIN_FAILED',
    resource: 'auth',
    method: 'POST',
    path: '/api/auth/login',
    statusCode: success ? 200 : 401,
    ip,
    userAgent: 'unknown',
    requestId: 'auth-' + Date.now(),
    metadata: { email, reason },
  }).catch((error) => {
    logger.error('Failed to store auth audit log', error)
  })
}

/**
 * Log quota violations
 */
export const logQuotaViolation = (
  userId: string,
  requestedAmount: number,
  currentUsage: number,
  quota: number,
  path: string
): void => {
  logger.warn('Quota violation', {
    userId,
    requestedAmount,
    currentUsage,
    quota,
    path,
    timestamp: new Date().toISOString(),
  })

  storeAuditLog({
    userId,
    action: 'QUOTA_EXCEEDED',
    resource: 'subscription',
    method: 'POST',
    path,
    statusCode: 429,
    ip: 'system',
    userAgent: 'system',
    requestId: 'quota-' + Date.now(),
    metadata: { requestedAmount, currentUsage, quota },
  }).catch((error) => {
    logger.error('Failed to store quota violation log', error)
  })
}

/**
 * Log API key usage
 */
export const logAPIKeyUsage = (
  userId: string,
  apiKey: string,
  path: string,
  success: boolean
): void => {
  logger.info('API key usage', {
    userId,
    apiKeyPrefix: apiKey.substring(0, 8) + '...',
    path,
    success,
    timestamp: new Date().toISOString(),
  })
}

/**
 * Determine action from method and path
 */
const determineAction = (method: string, path: string): string => {
  const actions: Record<string, string> = {
    GET: 'READ',
    POST: 'CREATE',
    PUT: 'UPDATE',
    PATCH: 'UPDATE',
    DELETE: 'DELETE',
  }

  const action = actions[method] || 'UNKNOWN'

  // Special cases
  if (path.includes('/login')) return 'LOGIN'
  if (path.includes('/logout')) return 'LOGOUT'
  if (path.includes('/register')) return 'REGISTER'
  if (path.includes('/optimize')) return 'OPTIMIZE'
  if (path.includes('/simulation')) return 'SIMULATE'

  return action
}

/**
 * Determine resource from path
 */
const determineResource = (path: string): string => {
  const parts = path.split('/').filter(Boolean)
  if (parts.length >= 2) {
    return parts[1] // e.g., /api/boxes -> boxes
  }
  return 'unknown'
}

/**
 * Check if action is critical and should be stored in database
 */
const isCriticalAction = (method: string, path: string): boolean => {
  // Store all authentication, authorization, and state-changing operations
  const criticalPaths = [
    '/auth/login',
    '/auth/register',
    '/auth/logout',
    '/subscriptions',
    '/api-key',
  ]

  const criticalMethods = ['POST', 'PUT', 'DELETE', 'PATCH']

  return (
    criticalPaths.some((p) => path.includes(p)) ||
    criticalMethods.includes(method)
  )
}

/**
 * Sanitize metadata to remove sensitive information
 */
const sanitizeMetadata = (data: any): Record<string, any> => {
  const sanitized = { ...data }

  // Remove sensitive fields
  const sensitiveFields = ['password', 'token', 'apiKey', 'secret']
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]'
    }
  }

  return sanitized
}

/**
 * Store audit log in database
 */
const storeAuditLog = async (_entry: AuditLogEntry): Promise<void> => {
  try {
    // Note: This requires an AuditLog model in Prisma schema
    // For now, we'll just log to Winston
    // In production, uncomment and add AuditLog model to schema
    
    /*
    await prisma.auditLog.create({
      data: {
        userId: entry.userId,
        action: entry.action,
        resource: entry.resource,
        method: entry.method,
        path: entry.path,
        statusCode: entry.statusCode,
        ip: entry.ip,
        userAgent: entry.userAgent,
        requestId: entry.requestId,
        duration: entry.duration,
        error: entry.error,
        metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
      },
    })
    */
  } catch (error) {
    logger.error('Failed to store audit log in database', error)
  }
}
