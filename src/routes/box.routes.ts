import { Router, Request, Response, NextFunction } from 'express'
import { BoxCatalogManager } from '../services/BoxCatalogManager'
import { AppError } from '../middleware/errorHandler'
import { validateRequest, validateParams, validateQuery } from '../middleware/validation'
import { authenticate, requireRole } from '../middleware/auth'
import Joi from 'joi'

const router = Router()
const boxCatalogManager = new BoxCatalogManager()

// Validation schemas
const addBoxSchema = Joi.object({
  name: Joi.string().required().messages({
    'any.required': 'Box name is required',
    'string.empty': 'Box name cannot be empty',
  }),
  length: Joi.number().positive().required().messages({
    'number.positive': 'Length must be a positive number',
    'any.required': 'Length is required',
  }),
  width: Joi.number().positive().required().messages({
    'number.positive': 'Width must be a positive number',
    'any.required': 'Width is required',
  }),
  height: Joi.number().positive().required().messages({
    'number.positive': 'Height must be a positive number',
    'any.required': 'Height is required',
  }),
  maxWeight: Joi.number().positive().required().messages({
    'number.positive': 'Max weight must be a positive number',
    'any.required': 'Max weight is required',
  }),
  isActive: Joi.boolean().optional().default(true),
})

const updateBoxSchema = Joi.object({
  name: Joi.string().optional(),
  length: Joi.number().positive().optional().messages({
    'number.positive': 'Length must be a positive number',
  }),
  width: Joi.number().positive().optional().messages({
    'number.positive': 'Width must be a positive number',
  }),
  height: Joi.number().positive().optional().messages({
    'number.positive': 'Height must be a positive number',
  }),
  maxWeight: Joi.number().positive().optional().messages({
    'number.positive': 'Max weight must be a positive number',
  }),
  isActive: Joi.boolean().optional(),
})

const boxIdSchema = Joi.object({
  id: Joi.string().uuid().required().messages({
    'string.guid': 'Invalid box ID format',
    'any.required': 'Box ID is required',
  }),
})

const getAllBoxesQuerySchema = Joi.object({
  activeOnly: Joi.boolean().optional().default(false),
})

const suitableBoxesQuerySchema = Joi.object({
  length: Joi.number().positive().required().messages({
    'number.positive': 'Length must be a positive number',
    'any.required': 'Length is required',
  }),
  width: Joi.number().positive().required().messages({
    'number.positive': 'Width must be a positive number',
    'any.required': 'Width is required',
  }),
  height: Joi.number().positive().required().messages({
    'number.positive': 'Height must be a positive number',
    'any.required': 'Height is required',
  }),
  weight: Joi.number().min(0).required().messages({
    'number.min': 'Weight must be non-negative',
    'any.required': 'Weight is required',
  }),
})

const boxStatsQuerySchema = Joi.object({
  startDate: Joi.date().iso().required().messages({
    'date.format': 'Start date must be in ISO format',
    'any.required': 'Start date is required',
  }),
  endDate: Joi.date().iso().min(Joi.ref('startDate')).required().messages({
    'date.format': 'End date must be in ISO format',
    'date.min': 'End date must be after start date',
    'any.required': 'End date is required',
  }),
})

/**
 * POST /api/boxes
 * Add new box (admin only)
 */
router.post(
  '/',
  authenticate,
  requireRole('ADMIN'),
  validateRequest(addBoxSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const boxDefinition = req.body

      const box = await boxCatalogManager.addBox(boxDefinition)

      res.status(201).json({
        status: 'success',
        data: {
          box,
        },
      })
    } catch (error) {
      if (error instanceof Error) {
        if (
          error.message.includes('dimensions must be positive') ||
          error.message.includes('Max weight must be a positive')
        ) {
          return next(new AppError(error.message, 400))
        }
      }
      next(error)
    }
  }
)

/**
 * PUT /api/boxes/:id
 * Update box (admin only)
 */
router.put(
  '/:id',
  authenticate,
  requireRole('ADMIN'),
  validateParams(boxIdSchema),
  validateRequest(updateBoxSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params
      const updates = req.body

      const box = await boxCatalogManager.updateBox(id, updates)

      res.status(200).json({
        status: 'success',
        data: {
          box,
        },
      })
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return next(new AppError(error.message, 404))
        }
        if (
          error.message.includes('must be a positive number') ||
          error.message.includes('must be positive')
        ) {
          return next(new AppError(error.message, 400))
        }
      }
      next(error)
    }
  }
)

/**
 * DELETE /api/boxes/:id
 * Deactivate box (admin only)
 */
router.delete(
  '/:id',
  authenticate,
  requireRole('ADMIN'),
  validateParams(boxIdSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params

      await boxCatalogManager.deleteBox(id)

      res.status(200).json({
        status: 'success',
        message: 'Box deactivated successfully',
      })
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return next(new AppError('Box not found', 404))
      }
      next(error)
    }
  }
)

/**
 * GET /api/boxes
 * Get all boxes with filters
 */
router.get(
  '/',
  authenticate,
  validateQuery(getAllBoxesQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const activeOnly = req.query.activeOnly === 'true'

      const boxes = await boxCatalogManager.getAllBoxes(activeOnly)

      res.status(200).json({
        status: 'success',
        data: {
          boxes,
          count: boxes.length,
        },
      })
    } catch (error) {
      next(error)
    }
  }
)

/**
 * GET /api/boxes/suitable
 * Query suitable boxes for given dimensions and weight
 */
router.get(
  '/suitable',
  authenticate,
  validateQuery(suitableBoxesQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const length = Number(req.query.length)
      const width = Number(req.query.width)
      const height = Number(req.query.height)
      const weight = Number(req.query.weight)

      const dimensions = {
        length,
        width,
        height,
      }
      const itemWeight = weight

      const suitableBoxes = await boxCatalogManager.findSuitableBoxes(dimensions, itemWeight)

      res.status(200).json({
        status: 'success',
        data: {
          boxes: suitableBoxes,
          count: suitableBoxes.length,
        },
      })
    } catch (error) {
      if (error instanceof Error) {
        if (
          error.message.includes('must be positive') ||
          error.message.includes('must be non-negative')
        ) {
          return next(new AppError(error.message, 400))
        }
      }
      next(error)
    }
  }
)

/**
 * GET /api/boxes/stats
 * Get usage statistics for boxes
 */
router.get(
  '/stats',
  authenticate,
  validateQuery(boxStatsQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { startDate, endDate } = req.query as {
        startDate: string
        endDate: string
      }

      const dateRange = {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      }

      const stats = await boxCatalogManager.getBoxUsageStats(dateRange)

      res.status(200).json({
        status: 'success',
        data: {
          stats,
          count: stats.length,
        },
      })
    } catch (error) {
      next(error)
    }
  }
)

/**
 * GET /api/boxes/:id
 * Get single box
 */
router.get(
  '/:id',
  authenticate,
  validateParams(boxIdSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params

      const box = await boxCatalogManager.getBox(id)

      res.status(200).json({
        status: 'success',
        data: {
          box,
        },
      })
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return next(new AppError('Box not found', 404))
      }
      next(error)
    }
  }
)

export default router
