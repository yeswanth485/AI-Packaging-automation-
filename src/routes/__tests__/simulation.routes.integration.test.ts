import request from 'supertest'
import { app } from '../../index'
import { PrismaClient } from '@prisma/client'
import { AuthenticationService } from '../../services/AuthenticationService'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()
const authService = new AuthenticationService(prisma)

describe('Simulation Routes Integration Tests', () => {
  let authToken: string
  let userId: string
  let testJobId: string

  beforeAll(async () => {
    // Create test user
    const testEmail = `test-sim-${Date.now()}@example.com`
    const testPassword = 'TestPassword123!'

    const user = await authService.register(testEmail, testPassword, 'CUSTOMER')
    userId = user.id

    // Login to get token
    const authResult = await authService.login(testEmail, testPassword)
    authToken = authResult.accessToken

    // Create test boxes if they don't exist
    const boxCount = await prisma.box.count()
    if (boxCount === 0) {
      await prisma.box.createMany({
        data: [
          {
            name: 'Small Box',
            length: 20,
            width: 15,
            height: 10,
            volume: 3000,
            maxWeight: 5,
            isActive: true,
          },
          {
            name: 'Medium Box',
            length: 30,
            width: 25,
            height: 20,
            volume: 15000,
            maxWeight: 10,
            isActive: true,
          },
          {
            name: 'Large Box',
            length: 40,
            width: 35,
            height: 30,
            volume: 42000,
            maxWeight: 20,
            isActive: true,
          },
        ],
      })
    }
  })

  afterAll(async () => {
    // Cleanup test data
    if (userId) {
      await prisma.order.deleteMany({ where: { userId } })
      await prisma.simulationJob.deleteMany({ where: { userId } })
      await prisma.user.delete({ where: { id: userId } })
    }
    await prisma.$disconnect()
  })

  describe('POST /api/simulation/upload', () => {
    it('should upload CSV file and create simulation job', async () => {
      const csvContent = `order_id,item_length,item_width,item_height,item_weight,quantity
order-1,10,8,5,1.5,2
order-1,12,10,6,2.0,1
order-2,15,12,8,3.0,1`

      const csvBuffer = Buffer.from(csvContent)
      const csvPath = path.join(__dirname, 'test-upload.csv')
      fs.writeFileSync(csvPath, csvBuffer)

      const response = await request(app)
        .post('/api/simulation/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', csvPath)

      fs.unlinkSync(csvPath)

      expect(response.status).toBe(201)
      expect(response.body.status).toBe('success')
      expect(response.body.data.job).toHaveProperty('jobId')
      expect(response.body.data.job.totalOrders).toBe(2)
      expect(response.body.data.job.status).toBe('PENDING')

      testJobId = response.body.data.job.jobId
    })

    it('should reject upload without authentication', async () => {
      const csvContent = `order_id,item_length,item_width,item_height,item_weight,quantity
order-1,10,8,5,1.5,2`

      const csvBuffer = Buffer.from(csvContent)
      const csvPath = path.join(__dirname, 'test-upload-2.csv')
      fs.writeFileSync(csvPath, csvBuffer)

      const response = await request(app)
        .post('/api/simulation/upload')
        .attach('file', csvPath)

      fs.unlinkSync(csvPath)

      expect(response.status).toBe(401)
    })

    it('should reject upload without file', async () => {
      const response = await request(app)
        .post('/api/simulation/upload')
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(400)
      expect(response.body.message).toContain('CSV file is required')
    })
  })

  describe('GET /api/simulation/:jobId/status', () => {
    it('should return job status', async () => {
      if (!testJobId) {
        // Create a test job first
        const csvContent = `order_id,item_length,item_width,item_height,item_weight,quantity
order-1,10,8,5,1.5,2`

        const csvBuffer = Buffer.from(csvContent)
        const csvPath = path.join(__dirname, 'test-status.csv')
        fs.writeFileSync(csvPath, csvBuffer)

        const uploadResponse = await request(app)
          .post('/api/simulation/upload')
          .set('Authorization', `Bearer ${authToken}`)
          .attach('file', csvPath)

        fs.unlinkSync(csvPath)
        testJobId = uploadResponse.body.data.job.jobId
      }

      const response = await request(app)
        .get(`/api/simulation/${testJobId}/status`)
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body.status).toBe('success')
      expect(response.body.data.job.jobId).toBe(testJobId)
    })

    it('should return 404 for non-existent job', async () => {
      const response = await request(app)
        .get('/api/simulation/non-existent-job/status')
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(404)
    })

    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get(`/api/simulation/${testJobId}/status`)

      expect(response.status).toBe(401)
    })
  })

  describe('GET /api/simulation/history', () => {
    it('should return user simulation history', async () => {
      const response = await request(app)
        .get('/api/simulation/history')
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body.status).toBe('success')
      expect(response.body.data.history).toBeDefined()
      expect(Array.isArray(response.body.data.history)).toBe(true)
    })

    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/simulation/history')

      expect(response.status).toBe(401)
    })
  })

  describe('POST /api/simulation/:jobId/process', () => {
    it('should process simulation job', async () => {
      // First create a job
      const csvContent = `order_id,item_length,item_width,item_height,item_weight,quantity
order-1,10,8,5,1.5,2
order-2,15,12,8,3.0,1`

      const csvBuffer = Buffer.from(csvContent)
      const csvPath = path.join(__dirname, 'test-process.csv')
      fs.writeFileSync(csvPath, csvBuffer)

      const uploadResponse = await request(app)
        .post('/api/simulation/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', csvPath)

      fs.unlinkSync(csvPath)

      const jobId = uploadResponse.body.data.job.jobId

      // Process the job
      const response = await request(app)
        .post(`/api/simulation/${jobId}/process`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          bufferPadding: 2,
          volumetricDivisor: 5000,
          shippingRatePerKg: 0.5,
        })

      expect(response.status).toBe(200)
      expect(response.body.status).toBe('success')
      expect(response.body.data.result).toHaveProperty('simulationId')
      expect(response.body.data.result.comparison).toHaveProperty('totalSavings')
    }, 30000) // Increase timeout for processing

    it('should reject processing without authentication', async () => {
      const response = await request(app)
        .post(`/api/simulation/${testJobId}/process`)
        .send({})

      expect(response.status).toBe(401)
    })
  })
})
