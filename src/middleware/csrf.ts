import { Request, Response, NextFunction } from 'express'
import crypto from 'crypto'
import { AppError } from './errorHandler'
import { logger } from '../utils/logger'

// Store for CSRF tokens (in production, use Redis)
const csrfTokens = new Map<string, { token: string; expiresAt: number }>()

// Token expiration time (15 minutes)
const TOKEN_EXPIRATION_MS = 15 * 60 * 1000

/**
 * Generate a CSRF token for a session
 */
export const generateCSRFToken = (sessionId: string): string => {
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = Date.now() + TOKEN_EXPIRATION_MS

  csrfTokens.set(sessionId, { token, expiresAt })

  // Clean up expired tokens
  cleanupExpiredTokens()

  return token
}

/**
 * Clean up expired CSRF tokens
 */
const cleanupExpiredTokens = (): void => {
  const now = Date.now()
  for (const [sessionId, data] of csrfTokens.entries()) {
    if (data.expiresAt < now) {
      csrfTokens.delete(sessionId)
    }
  }
}

/**
 * Middleware to validate CSRF token for state-changing operations
 * Should be applied to POST, PUT, PATCH, DELETE requests
 */
export const validateCSRFToken = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  // Skip CSRF validation for API key authenticated requests
  if (req.headers['x-api-key']) {
    return next()
  }

  // Skip for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next()
  }

  const sessionId = req.user?.id || req.headers['x-session-id'] as string
  const providedToken = req.headers['x-csrf-token'] as string

  if (!sessionId) {
    logger.warn('CSRF validation failed: No session ID', {
      path: req.path,
      method: req.method,
      ip: req.ip,
    })
    return next(new AppError('Session required for CSRF protection', 403))
  }

  if (!providedToken) {
    logger.warn('CSRF validation failed: No token provided', {
      path: req.path,
      method: req.method,
      sessionId,
      ip: req.ip,
    })
    return next(new AppError('CSRF token required', 403))
  }

  const storedData = csrfTokens.get(sessionId)

  if (!storedData) {
    logger.warn('CSRF validation failed: No token found for session', {
      path: req.path,
      method: req.method,
      sessionId,
      ip: req.ip,
    })
    return next(new AppError('Invalid or expired CSRF token', 403))
  }

  // Check if token is expired
  if (storedData.expiresAt < Date.now()) {
    csrfTokens.delete(sessionId)
    logger.warn('CSRF validation failed: Token expired', {
      path: req.path,
      method: req.method,
      sessionId,
      ip: req.ip,
    })
    return next(new AppError('CSRF token expired', 403))
  }

  // Validate token using constant-time comparison
  if (!crypto.timingSafeEqual(Buffer.from(providedToken), Buffer.from(storedData.token))) {
    logger.warn('CSRF validation failed: Token mismatch', {
      path: req.path,
      method: req.method,
      sessionId,
      ip: req.ip,
    })
    return next(new AppError('Invalid CSRF token', 403))
  }

  next()
}

/**
 * Endpoint to get a CSRF token
 */
export const getCSRFToken = (req: Request, res: Response): void => {
  const sessionId = req.user?.id || req.headers['x-session-id'] as string

  if (!sessionId) {
    res.status(400).json({
      status: 'error',
      message: 'Session ID required',
    })
    return
  }

  const token = generateCSRFToken(sessionId)

  res.json({
    status: 'success',
    csrfToken: token,
    expiresIn: TOKEN_EXPIRATION_MS / 1000, // in seconds
  })
}
