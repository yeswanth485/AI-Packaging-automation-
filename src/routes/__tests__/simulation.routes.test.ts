import request from 'supertest'
import express from 'express'
import simulationRoutes from '../simulation.routes'
import { SimulationService } from '../../services/SimulationService'
import { ReportGenerator } from '../../services/ReportGenerator'
import { ConfigurationService } from '../../services/ConfigurationService'
import { authenticate } from '../../middleware/auth'
import { errorHandler } from '../../middleware/errorHandler'
import { JobStatus } from '../../types'

// Mock dependencies
jest.mock('../../services/SimulationService')
jest.mock('../../services/ReportGenerator')
jest.mock('../../services/ConfigurationService')
jest.mock('../../middleware/auth')
jest.mock('../../config/database', () => ({
  prisma: {
    simulation: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  },
}))

const app = express()
app.use(express.json())
app.use('/api/simulation', simulationRoutes)
app.use(errorHandler)

describe('Simulation Routes', () => {
  let mockSimulationService: jest.Mocked<SimulationService>
  let mockConfigService: jest.Mocked<ConfigurationService>

  beforeEach(() => {
    jest.clearAllMocks()

    // Mock authenticate middleware to add user to request
    ;(authenticate as jest.Mock).mockImplementation((req, _res, next) => {
      req.user = { id: 'user-123', email: 'test@example.com' }
      next()
    })

    mockSimulationService = new SimulationService() as jest.Mocked<SimulationService>
    mockReportGenerator = new ReportGenerator() as jest.Mocked<ReportGenerator>
    mockConfigService = new ConfigurationService(null as any) as jest.Mocked<ConfigurationService>
  })

  describe('POST /api/simulation/upload', () => {
    it('should upload CSV file and create simulation job', async () => {
      const mockJob = {
        jobId: 'job-123',
        userId: 'user-123',
        fileName: 'test.csv',
        totalOrders: 10,
        status: JobStatus.PENDING,
        createdAt: new Date(),
      }

      mockSimulationService.uploadCSV = jest.fn().mockResolvedValue(mockJob)

      const response = await request(app)
        .post('/api/simulation/upload')
        .attach('file', Buffer.from('order_id,item_length,item_width,item_height,item_weight,quantity\n1,10,10,10,1,1'), 'test.csv')

      expect(response.status).toBe(201)
      expect(response.body.status).toBe('success')
      expect(response.body.data.job).toEqual(mockJob)
    })

    it('should return 400 if no file is uploaded', async () => {
      const response = await request(app)
        .post('/api/simulation/upload')

      expect(response.status).toBe(400)
      expect(response.body.message).toContain('CSV file is required')
    })

    it('should return 400 if file size exceeds limit', async () => {
      mockSimulationService.uploadCSV = jest.fn().mockRejectedValue(
        new Error('File size exceeds maximum limit of 50 MB')
      )

      const response = await request(app)
        .post('/api/simulation/upload')
        .attach('file', Buffer.alloc(51 * 1024 * 1024), 'large.csv')

      expect(response.status).toBe(400)
    })

    it('should return 400 if CSV has missing columns', async () => {
      mockSimulationService.uploadCSV = jest.fn().mockRejectedValue(
        new Error('Missing required columns: item_weight')
      )

      const response = await request(app)
        .post('/api/simulation/upload')
        .attach('file', Buffer.from('order_id,item_length\n1,10'), 'invalid.csv')

      expect(response.status).toBe(400)
    })
  })

  describe('POST /api/simulation/:jobId/process', () => {
    it('should process simulation job successfully', async () => {
      const mockJob = {
        jobId: 'job-123',
        userId: 'user-123',
        fileName: 'test.csv',
        totalOrders: 10,
        status: JobStatus.PENDING,
        createdAt: new Date(),
      }

      const mockResult = {
        simulationId: 'sim-123',
        jobId: 'job-123',
        optimizedResults: [],
        baselineResults: [],
        comparison: {
          totalOrdersProcessed: 10,
          optimizedTotalCost: 100,
          baselineTotalCost: 120,
          totalSavings: 20,
          savingsPercentage: 16.67,
          averageUtilizationOptimized: 75,
          averageUtilizationBaseline: 60,
          volumetricWeightReduction: 15,
        },
        savings: {
          perOrderSavings: 2,
          monthlySavings: 600,
          annualSavings: 7200,
          isRealistic: true,
          confidenceLevel: 0.8,
        },
        recommendations: [],
        anomalyWarnings: [],
      }

      mockSimulationService.getSimulationStatus = jest.fn().mockResolvedValue(mockJob)
      mockSimulationService.processSimulation = jest.fn().mockResolvedValue(mockResult)
      mockConfigService.getConfiguration = jest.fn().mockResolvedValue({
        bufferPadding: 2,
        volumetricDivisor: 5000,
        shippingRatePerKg: 0.5,
      })

      const response = await request(app)
        .post('/api/simulation/job-123/process')
        .send({
          bufferPadding: 2,
          volumetricDivisor: 5000,
          shippingRatePerKg: 0.5,
        })

      expect(response.status).toBe(200)
      expect(response.body.status).toBe('success')
      expect(response.body.data.result).toEqual(mockResult)
    })

    it('should return 404 if job not found', async () => {
      mockSimulationService.getSimulationStatus = jest.fn().mockResolvedValue(null)

      const response = await request(app)
        .post('/api/simulation/job-123/process')
        .send({})

      expect(response.status).toBe(404)
    })

    it('should return 403 if user does not own the job', async () => {
      const mockJob = {
        jobId: 'job-123',
        userId: 'other-user',
        fileName: 'test.csv',
        totalOrders: 10,
        status: JobStatus.PENDING,
        createdAt: new Date(),
      }

      mockSimulationService.getSimulationStatus = jest.fn().mockResolvedValue(mockJob)

      const response = await request(app)
        .post('/api/simulation/job-123/process')
        .send({})

      expect(response.status).toBe(403)
    })

    it('should return 400 if job is not in PENDING status', async () => {
      const mockJob = {
        jobId: 'job-123',
        userId: 'user-123',
        fileName: 'test.csv',
        totalOrders: 10,
        status: JobStatus.COMPLETED,
        createdAt: new Date(),
      }

      mockSimulationService.getSimulationStatus = jest.fn().mockResolvedValue(mockJob)
      mockSimulationService.processSimulation = jest.fn().mockRejectedValue(
        new Error('Simulation job job-123 is not in PENDING status')
      )

      const response = await request(app)
        .post('/api/simulation/job-123/process')
        .send({})

      expect(response.status).toBe(400)
    })
  })

  describe('GET /api/simulation/:jobId/status', () => {
    it('should return job status', async () => {
      const mockJob = {
        jobId: 'job-123',
        userId: 'user-123',
        fileName: 'test.csv',
        totalOrders: 10,
        status: JobStatus.PROCESSING,
        createdAt: new Date(),
      }

      mockSimulationService.getSimulationStatus = jest.fn().mockResolvedValue(mockJob)

      const response = await request(app)
        .get('/api/simulation/job-123/status')

      expect(response.status).toBe(200)
      expect(response.body.status).toBe('success')
      expect(response.body.data.job).toEqual(mockJob)
    })

    it('should return 404 if job not found', async () => {
      mockSimulationService.getSimulationStatus = jest.fn().mockResolvedValue(null)

      const response = await request(app)
        .get('/api/simulation/job-123/status')

      expect(response.status).toBe(404)
    })

    it('should return 403 if user does not own the job', async () => {
      const mockJob = {
        jobId: 'job-123',
        userId: 'other-user',
        fileName: 'test.csv',
        totalOrders: 10,
        status: JobStatus.PENDING,
        createdAt: new Date(),
      }

      mockSimulationService.getSimulationStatus = jest.fn().mockResolvedValue(mockJob)

      const response = await request(app)
        .get('/api/simulation/job-123/status')

      expect(response.status).toBe(403)
    })
  })

  describe('GET /api/simulation/history', () => {
    it('should return user simulation history', async () => {
      const mockHistory = [
        {
          simulationId: 'sim-1',
          createdAt: new Date(),
          totalOrders: 10,
          savingsPercentage: 15,
          totalSavings: 100,
        },
        {
          simulationId: 'sim-2',
          createdAt: new Date(),
          totalOrders: 20,
          savingsPercentage: 12,
          totalSavings: 200,
        },
      ]

      const { prisma } = require('../../config/database')
      prisma.simulation.findMany = jest.fn().mockResolvedValue(
        mockHistory.map((h) => ({
          id: h.simulationId,
          job: {
            createdAt: h.createdAt,
            totalOrders: h.totalOrders,
          },
          savingsPercentage: h.savingsPercentage,
          totalSavings: h.totalSavings,
        }))
      )

      const response = await request(app)
        .get('/api/simulation/history')

      expect(response.status).toBe(200)
      expect(response.body.status).toBe('success')
      expect(response.body.data.history).toHaveLength(2)
    })

    it('should return empty array if no simulations exist', async () => {
      const { prisma } = require('../../config/database')
      prisma.simulation.findMany = jest.fn().mockResolvedValue([])

      const response = await request(app)
        .get('/api/simulation/history')

      expect(response.status).toBe(200)
      expect(response.body.data.history).toHaveLength(0)
    })
  })
})
