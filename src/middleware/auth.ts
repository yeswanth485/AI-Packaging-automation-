import { Request, Response, NextFunction } from 'express'
import { AuthenticationService } from '../services/AuthenticationService'
import { PrismaClient, User } from '@prisma/client'
import { AppError } from './errorHandler'

const prisma = new PrismaClient()
const authService = new AuthenticationService(prisma)

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: User
    }
  }
}

/**
 * Middleware to authenticate requests using JWT token
 */
export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new AppError('Authentication required', 401))
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix

    // Validate token and get user
    const user = await authService.validateToken(token)

    // Attach user to request
    req.user = user

    next()
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Token expired') {
        return next(new AppError('Token expired', 401))
      }
      if (error.message === 'Invalid token') {
        return next(new AppError('Invalid token', 401))
      }
      if (error.message === 'User not found or inactive') {
        return next(new AppError('User not found or inactive', 401))
      }
    }
    next(error)
  }
}

/**
 * Middleware to authenticate requests using API key
 */
export const authenticateAPIKey = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract API key from header
    const apiKey = req.headers['x-api-key'] as string

    if (!apiKey) {
      return next(new AppError('API key required', 401))
    }

    // Validate API key and get user
    const user = await authService.validateAPIKey(apiKey)

    // Attach user to request
    req.user = user

    next()
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid API key') {
      return next(new AppError('Invalid API key', 401))
    }
    next(error)
  }
}

/**
 * Middleware to check if user has required role
 */
export const requireRole = (...roles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401))
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('Insufficient permissions', 403)
      )
    }

    next()
  }
}
