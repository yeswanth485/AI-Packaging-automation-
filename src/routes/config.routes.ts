import { Router, Request, Response, NextFunction } from 'express'
import { PrismaClient } from '@prisma/client'
import { authenticate } from '../middleware/auth'
import { validateRequest } from '../middleware/validation'
import { AppError } from '../middleware/errorHandler'
import { ConfigurationService } from '../services/ConfigurationService'
import Joi from 'joi'
import { logger } from '../utils/logger'

const router = Router()
const prisma = new PrismaClient()
const configurationService = new ConfigurationService(prisma)

// Validation schema
const configSchema = Joi.object({
  bufferPadding: Joi.number().min(0).max(10).required(),
  volumetricDivisor: Joi.number().positive().min(1000).max(10000).required(),
  shippingRatePerKg: Joi.number().positive().required(),
  maxWeightOverride: Joi.number().positive().optional().allow(null),
  baselineBoxSelectionStrategy: Joi.string()
    .valid('NEXT_LARGER', 'FIXED_OVERSIZED', 'RANDOM_INEFFICIENT')
    .optional(),
  enableForecast: Joi.boolean().optional(),
})

/**
 * POST /api/config
 * Create user configuration
 */
router.post(
  '/',
  authenticate,
  validateRequest(configSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id
      const configData = req.body

      // Check if configuration already exists
      try {
        const existingConfig =
          await configurationService.getConfiguration(userId)
        if (existingConfig) {
          return next(
            new AppError(
              'Configuration already exists. Use PUT to update.',
              400
            )
          )
        }
      } catch (error) {
        // Configuration doesn't exist, proceed with creation
      }

      // Create configuration
      const config = await configurationService.createConfiguration(
        userId,
        configData
      )

      logger.info('Configuration created', { userId })

      res.status(201).json({
        status: 'success',
        data: {
          config: {
            id: config.id,
            bufferPadding: config.bufferPadding,
            volumetricDivisor: config.volumetricDivisor,
            shippingRatePerKg: config.shippingRatePerKg,
            maxWeightOverride: config.maxWeightOverride,
            baselineBoxSelectionStrategy: config.baselineBoxSelectionStrategy,
            enableForecast: config.enableForecast,
            createdAt: config.createdAt,
            updatedAt: config.updatedAt,
          },
        },
        requestId: req.headers['x-request-id'] || 'unknown',
      })
    } catch (error) {
      next(error)
    }
  }
)

/**
 * PUT /api/config
 * Update user configuration
 */
router.put(
  '/',
  authenticate,
  validateRequest(configSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id
      const configData = req.body

      // Get existing configuration
      const existingConfig =
        await configurationService.getConfiguration(userId)
      if (!existingConfig) {
        return next(
          new AppError(
            'Configuration not found. Use POST to create.',
            404
          )
        )
      }

      // Update configuration
      const config = await configurationService.updateConfiguration(
        userId,
        configData
      )

      logger.info('Configuration updated', { userId })

      res.status(200).json({
        status: 'success',
        data: {
          config: {
            id: config.id,
            bufferPadding: config.bufferPadding,
            volumetricDivisor: config.volumetricDivisor,
            shippingRatePerKg: config.shippingRatePerKg,
            maxWeightOverride: config.maxWeightOverride,
            baselineBoxSelectionStrategy: config.baselineBoxSelectionStrategy,
            enableForecast: config.enableForecast,
            createdAt: config.createdAt,
            updatedAt: config.updatedAt,
          },
        },
        requestId: req.headers['x-request-id'] || 'unknown',
      })
    } catch (error) {
      next(error)
    }
  }
)

/**
 * GET /api/config
 * Get user configuration
 */
router.get(
  '/',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id

      const config = await configurationService.getConfiguration(userId)

      if (!config) {
        return next(
          new AppError('Configuration not found', 404)
        )
      }

      res.status(200).json({
        status: 'success',
        data: {
          config: {
            id: config.id,
            bufferPadding: config.bufferPadding,
            volumetricDivisor: config.volumetricDivisor,
            shippingRatePerKg: config.shippingRatePerKg,
            maxWeightOverride: config.maxWeightOverride,
            baselineBoxSelectionStrategy: config.baselineBoxSelectionStrategy,
            enableForecast: config.enableForecast,
            createdAt: config.createdAt,
            updatedAt: config.updatedAt,
          },
        },
        requestId: req.headers['x-request-id'] || 'unknown',
      })
    } catch (error) {
      next(error)
    }
  }
)

export default router
