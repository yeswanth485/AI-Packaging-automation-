import { Router, Request, Response, NextFunction } from 'express'
import { PrismaClient } from '@prisma/client'
import { authenticate } from '../middleware/auth'
import { validateQuery } from '../middleware/validation'
import { AnalyticsService } from '../services/AnalyticsService'
import { TimeGranularity } from '../types'
import Joi from 'joi'

const router = Router()
const prisma = new PrismaClient()
const analyticsService = new AnalyticsService(prisma)

// Validation schemas
const dateRangeSchema = Joi.object({
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
})

const trendSchema = Joi.object({
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  granularity: Joi.string().valid('daily', 'weekly', 'monthly').optional(),
})

const forecastSchema = Joi.object({
  forecastMonths: Joi.number().integer().min(1).max(12).optional(),
})

/**
 * GET /api/analytics/dashboard
 * Get dashboard KPIs
 */
router.get(
  '/dashboard',
  authenticate,
  validateQuery(dateRangeSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id
      const { startDate, endDate } = req.query

      const dateRange = startDate && endDate ? {
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string),
      } : {
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        endDate: new Date(),
      }

      const kpis = await analyticsService.getDashboardKPIs(userId, dateRange)

      res.status(200).json({
        status: 'success',
        data: {
          kpis: {
            totalOrdersProcessed: kpis.totalOrdersProcessed,
            manualShippingCost: kpis.manualShippingCost,
            optimizedShippingCost: kpis.optimizedShippingCost,
            totalSavings: kpis.totalSavings,
            savingsPercentage: kpis.savingsPercentage,
            avgVolumetricWeightReduction: kpis.avgVolumetricWeightReduction,
            avgSpaceUtilization: kpis.avgSpaceUtilization,
            mostUsedBoxSize: kpis.mostUsedBoxSize,
            mostInefficientBoxSize: kpis.mostInefficientBoxSize,
            monthlySavingsProjection: kpis.monthlySavingsProjection,
            annualSavingsProjection: kpis.annualSavingsProjection,
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
 * GET /api/analytics/cost-trend
 * Get cost trend data
 */
router.get(
  '/cost-trend',
  authenticate,
  validateQuery(trendSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id
      const { startDate, endDate, granularity } = req.query

      const dateRange = startDate && endDate ? { startDate: new Date(startDate as string), endDate: new Date(endDate as string) } : {
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        endDate: new Date(),
      }

      const costTrend = await analyticsService.getCostTrend(
        userId,
        dateRange,
        (granularity as TimeGranularity) || TimeGranularity.DAILY
      )

      res.status(200).json({
        status: 'success',
        data: {
          costTrend: {
            dataPoints: costTrend.dataPoints.map((point) => ({
              timestamp: point.timestamp,
              manualCost: point.manualCost,
              optimizedCost: point.optimizedCost,
              savings: point.savings,
            })),
            trend: costTrend.trend,
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
 * GET /api/analytics/box-usage
 * Get box usage distribution
 */
router.get(
  '/box-usage',
  authenticate,
  validateQuery(dateRangeSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id
      const { startDate, endDate } = req.query

      const dateRange = startDate && endDate ? { startDate: new Date(startDate as string), endDate: new Date(endDate as string) } : {
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        endDate: new Date(),
      }

      const boxUsage = await analyticsService.getBoxUsageDistribution(
        userId,
        dateRange
      )

      res.status(200).json({
        status: 'success',
        data: {
          boxUsage: boxUsage.map((box) => ({
            boxId: box.boxId,
            boxName: box.boxName,
            usageCount: box.usageCount,
            percentage: box.percentage,
            averageUtilization: box.averageUtilization,
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
 * GET /api/analytics/space-waste
 * Get space waste heatmap
 */
router.get(
  '/space-waste',
  authenticate,
  validateQuery(dateRangeSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id
      const { startDate, endDate } = req.query

      const dateRange = startDate && endDate ? { startDate: new Date(startDate as string), endDate: new Date(endDate as string) } : {
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        endDate: new Date(),
      }

      const heatmap = await analyticsService.getSpaceWasteHeatmap(
        userId,
        dateRange
      )

      res.status(200).json({
        status: 'success',
        data: {
          heatmap: {
            matrix: heatmap.matrix,
            maxWaste: heatmap.maxWaste,
            minWaste: heatmap.minWaste,
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
 * GET /api/analytics/weight-distribution
 * Get weight distribution
 */
router.get(
  '/weight-distribution',
  authenticate,
  validateQuery(dateRangeSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id
      const { startDate, endDate } = req.query

      const dateRange = startDate && endDate ? { startDate: new Date(startDate as string), endDate: new Date(endDate as string) } : {
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        endDate: new Date(),
      }

      const weightDistribution =
        await analyticsService.getWeightDistribution(userId, dateRange)

      res.status(200).json({
        status: 'success',
        data: {
          weightDistribution: {
            actualWeightBuckets: weightDistribution.actualWeightBuckets.map(
              (bucket) => ({
                rangeStart: bucket.rangeStart,
                rangeEnd: bucket.rangeEnd,
                count: bucket.count,
                percentage: bucket.percentage,
              })
            ),
            volumetricWeightBuckets:
              weightDistribution.volumetricWeightBuckets.map((bucket) => ({
                rangeStart: bucket.rangeStart,
                rangeEnd: bucket.rangeEnd,
                count: bucket.count,
                percentage: bucket.percentage,
              })),
            billableWeightBuckets:
              weightDistribution.billableWeightBuckets.map((bucket) => ({
                rangeStart: bucket.rangeStart,
                rangeEnd: bucket.rangeEnd,
                count: bucket.count,
                percentage: bucket.percentage,
              })),
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
 * GET /api/analytics/forecast
 * Get demand forecast
 */
router.get(
  '/forecast',
  authenticate,
  validateQuery(forecastSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id
      const { forecastMonths } = req.query

      const forecast = await analyticsService.forecastPackagingDemand(
        userId,
        forecastMonths ? parseInt(forecastMonths as string, 10) : 3
      )

      res.status(200).json({
        status: 'success',
        data: {
          forecast: {
            forecastPeriods: forecast.forecastPeriods.map((period) => ({
              month: period.month,
              predictedOrders: period.predictedOrders,
              predictedCost: period.predictedCost,
              predictedSavings: period.predictedSavings,
            })),
            confidence: forecast.confidence,
            methodology: forecast.methodology,
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

