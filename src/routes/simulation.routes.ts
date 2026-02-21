import { Router, Request, Response, NextFunction } from 'express'
import multer from 'multer'
import { SimulationService } from '../services/SimulationService'
import { ReportGenerator } from '../services/ReportGenerator'
import { ConfigurationService } from '../services/ConfigurationService'
import { PrismaClient } from '@prisma/client'
import { AppError } from '../middleware/errorHandler'
import { authenticate } from '../middleware/auth'
import { validateRequest } from '../middleware/validation'
import Joi from 'joi'
import fs from 'fs'

const router = Router()
const prisma = new PrismaClient()
const simulationService = new SimulationService()
const reportGenerator = new ReportGenerator()
const configService = new ConfigurationService(prisma)

// Configure multer for file uploads
const storage = multer.memoryStorage()
const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB max file size
  },
  fileFilter: (_req, file, cb) => {
    // Only accept CSV files
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true)
    } else {
      cb(new Error('Only CSV files are allowed'))
    }
  },
})

// Validation schemas
const processSimulationSchema = Joi.object({
  bufferPadding: Joi.number().min(0).optional().default(2),
  volumetricDivisor: Joi.number().positive().optional().default(5000),
  shippingRatePerKg: Joi.number().positive().optional().default(0.5),
  maxWeightOverride: Joi.number().positive().optional(),
})

/**
 * POST /api/simulation/upload
 * Upload CSV file for simulation
 * Requirements: 6.1, 6.2, 6.14, 21.5, 21.6
 */
router.post(
  '/upload',
  authenticate,
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id

      if (!userId) {
        return next(new AppError('Authentication required', 401))
      }

      // Check if file was uploaded
      if (!req.file) {
        return next(new AppError('CSV file is required', 400))
      }

      const fileBuffer = req.file.buffer
      const fileName = req.file.originalname

      // Upload and parse CSV
      const job = await simulationService.uploadCSV(fileBuffer, fileName, userId)

      res.status(201).json({
        status: 'success',
        data: {
          job,
        },
      })
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('File size exceeds')) {
          return next(new AppError(error.message, 400))
        }
        if (error.message.includes('Missing required columns')) {
          return next(new AppError(error.message, 400))
        }
        if (error.message.includes('CSV parsing')) {
          return next(new AppError(error.message, 400))
        }
      }
      next(error)
    }
  }
)

/**
 * POST /api/simulation/:jobId/process
 * Process simulation job
 * Requirements: 7.1-7.17
 */
router.post(
  '/:jobId/process',
  authenticate,
  validateRequest(processSimulationSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id
      const { jobId } = req.params

      if (!userId) {
        return next(new AppError('Authentication required', 401))
      }

      // Get job to verify ownership
      const job = await simulationService.getSimulationStatus(jobId)

      if (!job) {
        return next(new AppError('Simulation job not found', 404))
      }

      if (job.userId !== userId) {
        return next(new AppError('Unauthorized access to simulation job', 403))
      }

      // Get user configuration or use defaults from request
      let config
      try {
        config = await configService.getConfiguration(userId)
      } catch {
        // Use defaults from request body if no configuration exists
        config = {
          bufferPadding: req.body.bufferPadding || 2,
          volumetricDivisor: req.body.volumetricDivisor || 5000,
          shippingRatePerKg: req.body.shippingRatePerKg || 0.5,
          maxWeightOverride: req.body.maxWeightOverride,
        }
      }

      // Process simulation
      const result = await simulationService.processSimulation(jobId, config)

      res.status(200).json({
        status: 'success',
        data: {
          result,
        },
      })
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return next(new AppError(error.message, 404))
        }
        if (error.message.includes('not in PENDING status')) {
          return next(new AppError(error.message, 400))
        }
      }
      next(error)
    }
  }
)

/**
 * GET /api/simulation/:jobId/status
 * Get simulation job status
 * Requirements: 6.11, 7.15, 7.16
 */
router.get(
  '/:jobId/status',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id
      const { jobId } = req.params

      if (!userId) {
        return next(new AppError('Authentication required', 401))
      }

      const job = await simulationService.getSimulationStatus(jobId)

      if (!job) {
        return next(new AppError('Simulation job not found', 404))
      }

      if (job.userId !== userId) {
        return next(new AppError('Unauthorized access to simulation job', 403))
      }

      res.status(200).json({
        status: 'success',
        data: {
          job,
        },
      })
    } catch (error) {
      next(error)
    }
  }
)

/**
 * GET /api/simulation/:simulationId/report
 * Generate and download PDF report
 * Requirements: 8.1-8.12
 */
router.get(
  '/:simulationId/report',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id
      const { simulationId } = req.params

      if (!userId) {
        return next(new AppError('Authentication required', 401))
      }

      // Get simulation result from database
      const simulation = await prisma.simulation.findUnique({
        where: { id: simulationId },
        include: {
          job: {
            include: {
              orders: {
                where: {
                  isOptimized: true,
                },
                include: {
                  items: true,
                  box: true,
                },
              },
            },
          },
        },
      })

      if (!simulation) {
        return next(new AppError('Simulation not found', 404))
      }

      if (simulation.job.userId !== userId) {
        return next(new AppError('Unauthorized access to simulation', 403))
      }

      // Build simulation result for report generation
      const simulationResult = {
        simulationId: simulation.id,
        jobId: simulation.jobId,
        optimizedResults: simulation.job.orders.map((order) => ({
          orderId: order.orderId,
          selectedBox: order.box || {
            id: '',
            name: 'Unknown',
            length: 0,
            width: 0,
            height: 0,
            volume: 0,
            maxWeight: 0,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          totalDimensions: {
            length: 0,
            width: 0,
            height: 0,
          },
          totalWeight: order.totalWeight,
          volumetricWeight: order.volumetricWeight || 0,
          billableWeight: order.billableWeight || 0,
          shippingCost: order.shippingCost || 0,
          spaceUtilization: order.spaceUtilization || 0,
          wastedVolume: order.wastedVolume || 0,
          isValid: true,
        })),
        baselineResults: [], // Would need to be stored separately
        comparison: {
          totalOrdersProcessed: simulation.job.totalOrders,
          optimizedTotalCost: simulation.optimizedTotalCost,
          baselineTotalCost: simulation.baselineTotalCost,
          totalSavings: simulation.totalSavings,
          savingsPercentage: simulation.savingsPercentage,
          averageUtilizationOptimized: simulation.averageUtilization,
          averageUtilizationBaseline: 0,
          volumetricWeightReduction: 0,
        },
        savings: {
          perOrderSavings: simulation.totalSavings / simulation.job.totalOrders,
          monthlySavings: simulation.monthlySavings,
          annualSavings: simulation.annualSavings,
          isRealistic: simulation.savingsPercentage >= 5 && simulation.savingsPercentage <= 25,
          confidenceLevel: 0.8,
        },
        recommendations: [],
        anomalyWarnings: [],
      }

      // Generate PDF report
      const report = await reportGenerator.generateReport(simulationResult)

      // Check if report file exists
      if (!reportGenerator.reportExists(report.reportId)) {
        return next(new AppError('Report generation failed', 500))
      }

      // Send PDF file
      const reportPath = reportGenerator.getReportPath(report.reportId)
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="simulation-report-${simulationId}.pdf"`
      )

      const fileStream = fs.createReadStream(reportPath)
      fileStream.pipe(res)
    } catch (error) {
      next(error)
    }
  }
)

/**
 * GET /api/simulation/history
 * Get user's simulation history
 * Requirements: 6.12, 6.13
 */
router.get(
  '/history',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id

      if (!userId) {
        return next(new AppError('Authentication required', 401))
      }

      // Get all simulations for user
      const simulations = await prisma.simulation.findMany({
        where: {
          job: {
            userId,
          },
        },
        include: {
          job: {
            select: {
              createdAt: true,
              totalOrders: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      })

      const history = simulations.map((sim) => ({
        simulationId: sim.id,
        createdAt: sim.job.createdAt,
        totalOrders: sim.job.totalOrders,
        savingsPercentage: sim.savingsPercentage,
        totalSavings: sim.totalSavings,
      }))

      res.status(200).json({
        status: 'success',
        data: {
          history,
        },
      })
    } catch (error) {
      next(error)
    }
  }
)

export default router
