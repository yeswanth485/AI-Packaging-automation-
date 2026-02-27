import { Router, Request, Response, NextFunction } from 'express'
import { AuthenticationService } from '../services/AuthenticationService'
import { PrismaClient, UserRole } from '@prisma/client'
import { AppError } from '../middleware/errorHandler'
import { validateRequest } from '../middleware/validation'
import { authenticate } from '../middleware/auth'
import Joi from 'joi'

const router = Router()
const prisma = new PrismaClient()
const authService = new AuthenticationService(prisma)

// Validation schemas
const registerSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Invalid email format',
    'any.required': 'Email is required',
  }),
  password: Joi.string().min(8).required().messages({
    'string.min': 'Password must be at least 8 characters long',
    'any.required': 'Password is required',
  }),
  role: Joi.string()
    .valid(...Object.values(UserRole))
    .optional()
    .default(UserRole.CUSTOMER),
})

const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Invalid email format',
    'any.required': 'Email is required',
  }),
  password: Joi.string().required().messages({
    'any.required': 'Password is required',
  }),
})

const refreshSchema = Joi.object({
  refreshToken: Joi.string().required().messages({
    'any.required': 'Refresh token is required',
  }),
})

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post(
  '/register',
  validateRequest(registerSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password, role } = req.body

      const user = await authService.register(email, password, role)

      res.status(201).json({
        status: 'success',
        data: {
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            subscriptionTier: user.subscriptionTier,
            createdAt: user.createdAt,
          },
        },
      })
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Email already registered') {
          return next(new AppError('Email already registered', 409))
        }
        if (
          error.message === 'Invalid email format' ||
          error.message === 'Password must be at least 8 characters long'
        ) {
          return next(new AppError(error.message, 400))
        }
      }
      next(error)
    }
  }
)

/**
 * POST /api/auth/login
 * User login
 */
router.post(
  '/login',
  validateRequest(loginSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body

      const authToken = await authService.login(email, password)

      res.status(200).json({
        status: 'success',
        data: {
          ...authToken,
        },
      })
    } catch (error) {
      if (error instanceof Error && error.message === 'Invalid credentials') {
        return next(new AppError('Invalid credentials', 401))
      }
      next(error)
    }
  }
)

/**
 * POST /api/auth/refresh
 * Refresh access token
 */
router.post(
  '/refresh',
  validateRequest(refreshSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { refreshToken } = req.body

      const authToken = await authService.refreshToken(refreshToken)

      res.status(200).json({
        status: 'success',
        data: {
          ...authToken,
        },
      })
    } catch (error) {
      if (error instanceof Error) {
        if (
          error.message === 'Refresh token expired' ||
          error.message === 'Invalid refresh token' ||
          error.message === 'User not found or inactive'
        ) {
          return next(new AppError(error.message, 401))
        }
      }
      next(error)
    }
  }
)

/**
 * POST /api/auth/logout
 * User logout
 */
router.post(
  '/logout',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Extract user ID from authenticated request
      const userId = req.user?.id

      if (!userId) {
        return next(new AppError('Authentication required', 401))
      }

      await authService.logout(userId)

      res.status(200).json({
        status: 'success',
        message: 'Logged out successfully',
      })
    } catch (error) {
      if (error instanceof Error && error.message === 'User not found') {
        return next(new AppError('User not found', 404))
      }
      next(error)
    }
  }
)

/**
 * POST /api/auth/api-key
 * Generate API key for authenticated user
 */
router.post(
  '/api-key',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Extract user ID from authenticated request
      const userId = req.user?.id

      if (!userId) {
        return next(new AppError('Authentication required', 401))
      }

      const apiKey = await authService.generateAPIKey(userId)

      res.status(201).json({
        status: 'success',
        data: {
          apiKey: {
            key: apiKey.key,
            createdAt: apiKey.createdAt,
          },
        },
      })
    } catch (error) {
      if (error instanceof Error && error.message === 'User not found') {
        return next(new AppError('User not found', 404))
      }
      next(error)
    }
  }
)

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
router.get(
  '/me',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id

      if (!userId) {
        return next(new AppError('Authentication required', 401))
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          role: true,
          subscriptionTier: true,
          isActive: true,
          createdAt: true,
          lastLogin: true,
        },
      })

      if (!user) {
        return next(new AppError('User not found', 404))
      }

      res.status(200).json({
        status: 'success',
        data: user,
      })
    } catch (error) {
      next(error)
    }
  }
)

export default router
