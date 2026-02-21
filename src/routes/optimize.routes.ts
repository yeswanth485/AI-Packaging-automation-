import { Router, Request, Response, NextFunction } from 'express'
import { PrismaClient } from '@prisma/client'
import { authenticateAPIKey } from '../middleware/auth'
import { rateLimit } from '../middleware/rateLimit'
import { validateRequest } from '../middleware/validation'
import { AppError } from '../middleware/errorHandler'
import { PackingEngine } from '../services/PackingEngine'
import { BoxCatalogManager } from '../services/BoxCatalogManager'
import { SubscriptionService } from '../services/SubscriptionService'
import { ConfigurationService } from '../services/ConfigurationService'
import { SubscriptionStatus } from '../types'
import Joi from 'joi'
import { logger } from '../utils/logger'

const router = Router()
const prisma = new PrismaClient()
const boxCatalogManager = new BoxCatalogManager()
const packingEngine = new PackingEngine(boxCatalogManager)
const subscriptionService = new SubscriptionService(prisma)
const configurationService = new ConfigurationService(prisma)

// Validation schemas
const itemSchema = Joi.object({
  itemId: Joi.string().required(),
  length: Joi.number().positive().required(),
  width: Joi.number().positive().required(),
  height: Joi.number().positive().required(),
  weight: Joi.number().min(0).required(),
  quantity: Joi.number().integer().positive().required(),
})

const optimizeSchema = Joi.object({
  orderId: Joi.string().required(),
  items: Joi.array().items(itemSchema).min(1).required(),
})

const batchOptimizeSchema = Joi.object({
  orders: Joi.array().items(optimizeSchema).min(1).max(100).required(),
})

/**
 * POST /api/optimize
 * Optimize single order
 */
router.post(
  '/',
  authenticateAPIKey,
  rateLimit({ maxRequests: 100, windowMs: 60000 }), // 100 requests per minute
  validateRequest(optimizeSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id
      const { orderId, items } = req.body

      // Check subscription status
      const subscription = await subscriptionService.getSubscription(userId)
      if (!subscription || subscription.status !== SubscriptionStatus.ACTIVE) {
        return next(
          new AppError('Active subscription required', 403)
        )
      }

      // Check quota
      const quotaStatus = await subscriptionService.checkQuota(userId)
      if (quotaStatus.isExceeded) {
        return next(
          new AppError(
            `Monthly quota exceeded. Used ${quotaStatus.currentUsage} of ${quotaStatus.monthlyQuota} orders`,
            429
          )
        )
      }

      // Get user configuration
      const config = await configurationService.getConfiguration(userId)

      // Process optimization
      const result = await packingEngine.optimizeOrder(
        { orderId, items, totalWeight: 0 },
        {
          bufferPadding: config.bufferPadding,
          volumetricDivisor: config.volumetricDivisor,
          shippingRatePerKg: config.shippingRatePerKg,
          maxWeightOverride: config.maxWeightOverride || undefined,
        }
      )

      if (!result.isValid) {
        return next(
          new AppError(
            result.rejectionReason || 'Unable to find suitable box',
            400
          )
        )
      }

      // Increment usage counter
      await subscriptionService.incrementUsage(userId, 1)

      // Store optimization record
      await prisma.order.create({
        data: {
          orderId: result.orderId,
          userId,
          items: {
            create: items.map((item: any) => ({
              itemId: item.itemId,
              length: item.length,
              width: item.width,
              height: item.height,
              weight: item.weight,
              quantity: item.quantity,
            })),
          },
          totalWeight: result.totalWeight,
          selectedBoxId: result.selectedBox.id,
          volumetricWeight: result.volumetricWeight,
          billableWeight: result.billableWeight,
          shippingCost: result.shippingCost,
          spaceUtilization: result.spaceUtilization,
          isOptimized: true,
        },
      })

      // Log API call
      logger.info('Optimization API call', {
        userId,
        orderId,
        boxId: result.selectedBox.id,
        cost: result.shippingCost,
      })

      res.status(200).json({
        status: 'success',
        data: {
          orderId: result.orderId,
          selectedBox: {
            id: result.selectedBox.id,
            name: result.selectedBox.name,
            dimensions: {
              length: result.selectedBox.length,
              width: result.selectedBox.width,
              height: result.selectedBox.height,
            },
            maxWeight: result.selectedBox.maxWeight,
          },
          totalWeight: result.totalWeight,
          volumetricWeight: result.volumetricWeight,
          billableWeight: result.billableWeight,
          shippingCost: result.shippingCost,
          spaceUtilization: result.spaceUtilization,
          wastedVolume: result.wastedVolume,
        },
        requestId: req.headers['x-request-id'] || 'unknown',
      })
    } catch (error) {
      next(error)
    }
  }
)

/**
 * POST /api/optimize/batch
 * Optimize multiple orders
 */
router.post(
  '/batch',
  authenticateAPIKey,
  rateLimit({ maxRequests: 100, windowMs: 60000 }), // 100 requests per minute
  validateRequest(batchOptimizeSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id
      const { orders } = req.body

      // Check subscription status
      const subscription = await subscriptionService.getSubscription(userId)
      if (!subscription || subscription.status !== SubscriptionStatus.ACTIVE) {
        return next(
          new AppError('Active subscription required', 403)
        )
      }

      // Check quota for batch
      const quotaStatus = await subscriptionService.checkQuota(userId)
      if (quotaStatus.remainingQuota < orders.length) {
        return next(
          new AppError(
            `Insufficient quota. Requested ${orders.length} orders, but only ${quotaStatus.remainingQuota} remaining`,
            429
          )
        )
      }

      // Get user configuration
      const config = await configurationService.getConfiguration(userId)

      // Process batch optimization
      const batchResult = await packingEngine.optimizeBatch(
        orders,
        {
          bufferPadding: config.bufferPadding,
          volumetricDivisor: config.volumetricDivisor,
          shippingRatePerKg: config.shippingRatePerKg,
          maxWeightOverride: config.maxWeightOverride || undefined,
        }
      )

      // Increment usage counter for successful packs
      await subscriptionService.incrementUsage(
        userId,
        batchResult.successfulPacks
      )

      // Store optimization records for successful packs
      for (const result of batchResult.results) {
        if (result.isValid) {
          const order = orders.find((o: any) => o.orderId === result.orderId)
          await prisma.order.create({
            data: {
              orderId: result.orderId,
              userId,
              items: {
                create: order.items.map((item: any) => ({
                  itemId: item.itemId,
                  length: item.length,
                  width: item.width,
                  height: item.height,
                  weight: item.weight,
                  quantity: item.quantity,
                })),
              },
              totalWeight: result.totalWeight,
              selectedBoxId: result.selectedBox.id,
              volumetricWeight: result.volumetricWeight,
              billableWeight: result.billableWeight,
              shippingCost: result.shippingCost,
              spaceUtilization: result.spaceUtilization,
              isOptimized: true,
            },
          })
        }
      }

      // Log API call
      logger.info('Batch optimization API call', {
        userId,
        totalOrders: batchResult.totalOrders,
        successfulPacks: batchResult.successfulPacks,
        failedPacks: batchResult.failedPacks,
      })

      res.status(200).json({
        status: 'success',
        data: {
          totalOrders: batchResult.totalOrders,
          successfulPacks: batchResult.successfulPacks,
          failedPacks: batchResult.failedPacks,
          totalCost: batchResult.totalCost,
          averageUtilization: batchResult.averageUtilization,
          results: batchResult.results.map((result) => ({
            orderId: result.orderId,
            isValid: result.isValid,
            selectedBox: result.isValid
              ? {
                  id: result.selectedBox.id,
                  name: result.selectedBox.name,
                  dimensions: {
                    length: result.selectedBox.length,
                    width: result.selectedBox.width,
                    height: result.selectedBox.height,
                  },
                }
              : undefined,
            billableWeight: result.isValid ? result.billableWeight : undefined,
            shippingCost: result.isValid ? result.shippingCost : undefined,
            spaceUtilization: result.isValid
              ? result.spaceUtilization
              : undefined,
            rejectionReason: !result.isValid
              ? result.rejectionReason
              : undefined,
          })),
        },
        requestId: req.headers['x-request-id'] || 'unknown',
      })
    } catch (error) {
      next(error)
    }
  }
)

export default router
