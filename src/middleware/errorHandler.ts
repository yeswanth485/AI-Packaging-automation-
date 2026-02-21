import { Request, Response, NextFunction } from 'express'
import { logger } from '../utils/logger'
import { v4 as uuidv4 } from 'uuid'

export class AppError extends Error {
  statusCode: number
  isOperational: boolean
  details?: any

  constructor(message: string, statusCode: number, details?: any) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = true
    this.details = details
    Error.captureStackTrace(this, this.constructor)
  }
}

/**
 * Middleware to add request ID to all requests
 */
export const requestIdMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  // Use existing request ID or generate new one
  req.headers['x-request-id'] =
    (req.headers['x-request-id'] as string) || uuidv4()
  next()
}

/**
 * Check if error is a Prisma error
 */
const isPrismaError = (err: any): boolean => {
  return err.name?.includes('Prisma') || err.code?.startsWith('P')
}

/**
 * Global error handler middleware
 * Handles all types of errors with appropriate HTTP status codes
 */
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const requestId = req.headers['x-request-id'] || 'unknown'

  // Handle operational errors (AppError)
  if (err instanceof AppError) {
    logger.error(`Operational error: ${err.message}`, {
      requestId,
      statusCode: err.statusCode,
      stack: err.stack,
      details: err.details,
      userId: req.user?.id,
      path: req.path,
      method: req.method,
    })

    res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
      details: err.details,
      requestId,
    })
    return
  }

  // Handle Prisma errors
  if (isPrismaError(err)) {
    const prismaErr = err as any
    logger.error('Database error', {
      requestId,
      code: prismaErr.code,
      meta: prismaErr.meta,
      stack: err.stack,
      userId: req.user?.id,
      path: req.path,
      method: req.method,
    })

    // Handle specific Prisma error codes
    switch (prismaErr.code) {
      case 'P2002':
        // Unique constraint violation
        res.status(409).json({
          status: 'error',
          message: 'A record with this value already exists',
          requestId,
        })
        return

      case 'P2025':
        // Record not found
        res.status(404).json({
          status: 'error',
          message: 'Record not found',
          requestId,
        })
        return

      case 'P2034':
        // Transaction conflict (optimistic locking)
        res.status(409).json({
          status: 'error',
          message:
            'Concurrent modification detected. Please retry your request.',
          requestId,
        })
        return

      default:
        // Database connection or other errors
        res.status(503).json({
          status: 'error',
          message:
            'Database service temporarily unavailable. Please retry in a moment.',
          requestId,
        })
        return
    }
  }

  // Handle validation errors from Joi
  if (err.name === 'ValidationError') {
    logger.warn('Validation error', {
      requestId,
      message: err.message,
      userId: req.user?.id,
      path: req.path,
      method: req.method,
    })

    res.status(400).json({
      status: 'error',
      message: err.message,
      requestId,
    })
    return
  }

  // Handle unexpected errors
  logger.error('Unexpected error', {
    requestId,
    message: err.message,
    stack: err.stack,
    name: err.name,
    userId: req.user?.id,
    path: req.path,
    method: req.method,
  })

  res.status(500).json({
    status: 'error',
    message: 'Internal server error',
    requestId,
  })
}
