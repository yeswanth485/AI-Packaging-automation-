import { Router, Request, Response, NextFunction } from 'express'
import { PrismaClient } from '@prisma/client'
import { authenticate } from '../middleware/auth'
import { validateRequest, validateQuery } from '../middleware/validation'
import { AppError } from '../middleware/errorHandler'
import { SubscriptionService } from '../services/SubscriptionService'
import Joi from 'joi'
import { logger } from '../utils/logger'

const router = Router()
const prisma = new PrismaClient()
const subscriptionService = new SubscriptionService(prisma)

// Validation schemas
const createSubscriptionSchema = Joi.object({
  tier: Joi.string()
    .valid('FREE', 'BASIC', 'PRO', 'ENTERPRISE')
    .required(),
})

const updateSubscriptionSchema = Joi.object({
  tier: Joi.string()
    .valid('FREE', 'BASIC', 'PRO', 'ENTERPRISE')
    .required(),
})

const dateRangeSchema = Joi.object({
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
})

const billingPeriodSchema = Joi.object({
  startDate: Joi.date().iso().required(),
  endDate: Joi.date().iso().required(),
})

/**
 * POST /api/subscriptions
 * Create subscription
 */
router.post(
  '/',
  authenticate,
  validateRequest(createSubscriptionSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id
      const { tier } = req.body

      // Check if user already has a subscription
      const existingSubscription =
        await subscriptionService.getSubscription(userId)
      if (existingSubscription) {
        return next(
          new AppError('User already has a subscription', 400)
        )
      }

      // Create subscription
      const subscription = await subscriptionService.createSubscription(
        userId,
        tier
      )

      logger.info('Subscription created', { userId, tier })

      res.status(201).json({
        status: 'success',
        data: {
          subscription: {
            id: subscription.subscriptionId,
            tier: subscription.tier,
            monthlyQuota: subscription.monthlyQuota,
            currentUsage: subscription.currentUsage,
            status: subscription.status,
            startDate: subscription.startDate,
            renewalDate: subscription.renewalDate,
            price: subscription.price,
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
 * PUT /api/subscriptions/:id
 * Update subscription tier
 */
router.put(
  '/:id',
  authenticate,
  validateRequest(updateSubscriptionSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id
      const { id } = req.params
      const { tier } = req.body

      // Verify subscription belongs to user
      const existingSubscription =
        await subscriptionService.getSubscription(userId)
      if (!existingSubscription || existingSubscription.subscriptionId !== id) {
        return next(
          new AppError('Subscription not found', 404)
        )
      }

      // Update subscription
      const subscription = await subscriptionService.updateSubscription(id, tier)

      logger.info('Subscription updated', { userId, subscriptionId: id, tier })

      res.status(200).json({
        status: 'success',
        data: {
          subscription: {
            id: subscription.subscriptionId,
            tier: subscription.tier,
            monthlyQuota: subscription.monthlyQuota,
            currentUsage: subscription.currentUsage,
            status: subscription.status,
            startDate: subscription.startDate,
            renewalDate: subscription.renewalDate,
            price: subscription.price,
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
 * DELETE /api/subscriptions/:id
 * Cancel subscription
 */
router.delete(
  '/:id',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id
      const { id } = req.params

      // Verify subscription belongs to user
      const existingSubscription =
        await subscriptionService.getSubscription(userId)
      if (!existingSubscription || existingSubscription.subscriptionId !== id) {
        return next(
          new AppError('Subscription not found', 404)
        )
      }

      // Cancel subscription
      await subscriptionService.cancelSubscription(id)

      logger.info('Subscription cancelled', { userId, subscriptionId: id })

      res.status(200).json({
        status: 'success',
        message: 'Subscription cancelled. Access will remain until renewal date.',
        requestId: req.headers['x-request-id'] || 'unknown',
      })
    } catch (error) {
      next(error)
    }
  }
)

/**
 * GET /api/subscriptions/me
 * Get current subscription
 */
router.get(
  '/me',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id

      const subscription = await subscriptionService.getSubscription(userId)

      if (!subscription) {
        return next(
          new AppError('No subscription found', 404)
        )
      }

      res.status(200).json({
        status: 'success',
        data: {
          subscription: {
            id: subscription.subscriptionId,
            tier: subscription.tier,
            monthlyQuota: subscription.monthlyQuota,
            currentUsage: subscription.currentUsage,
            status: subscription.status,
            startDate: subscription.startDate,
            renewalDate: subscription.renewalDate,
            price: subscription.price,
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
 * GET /api/subscriptions/quota
 * Check quota status
 */
router.get(
  '/quota',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id

      const quotaStatus = await subscriptionService.checkQuota(userId)

      res.status(200).json({
        status: 'success',
        data: {
          quota: {
            monthlyQuota: quotaStatus.monthlyQuota,
            currentUsage: quotaStatus.currentUsage,
            remainingQuota: quotaStatus.remainingQuota,
            percentageUsed: quotaStatus.percentageUsed,
            isExceeded: quotaStatus.isExceeded,
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
 * GET /api/subscriptions/usage
 * Get usage history
 */
router.get(
  '/usage',
  authenticate,
  validateQuery(dateRangeSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id
      const { startDate, endDate } = req.query

      const usageHistory = await subscriptionService.getUsageHistory(
        userId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      )

            res.status(200).json({
        status: 'success',
        data: {
          usage: usageHistory.map((record) => ({
            id: record.recordId,
            timestamp: record.timestamp,
            orderCount: record.orderCount,
            cumulativeUsage: record.cumulativeUsage,
          })),
        },
        requestId: req.headers['x-request-id'] || 'unknown',
      })
    } catch (error) {
      next(error)
    }
  }
)


/**
 * POST /api/subscriptions/invoices
 * Generate invoice
 */
router.post(
  '/invoices',
  authenticate,
  validateRequest(billingPeriodSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id
      const { startDate, endDate } = req.body

      // Get user's subscription
      const subscription = await subscriptionService.getSubscription(userId)
      if (!subscription) {
        return next(
          new AppError('No subscription found', 404)
        )
      }

      // Generate invoice
      const invoice = await subscriptionService.generateInvoice(
        subscription.subscriptionId,
        {
          startDate: new Date(startDate),
          endDate: new Date(endDate),
        }
      )

      logger.info('Invoice generated', {
        userId,
        invoiceId: invoice.invoiceId,
        amount: invoice.totalAmount,
      })

      res.status(201).json({
        status: 'success',
        data: {
          invoice: {
            id: invoice.invoiceId,
            subscriptionId: invoice.subscriptionId,
            billingPeriod: {
              startDate: invoice.billingPeriod.startDate,
              endDate: invoice.billingPeriod.endDate,
            },
            totalOrders: invoice.totalOrders,
            basePrice: invoice.basePrice,
            overageCharges: invoice.overageCharges,
            totalAmount: invoice.totalAmount,
            status: invoice.status,
            dueDate: invoice.dueDate,
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
