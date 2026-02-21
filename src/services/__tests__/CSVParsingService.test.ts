import { CSVParsingService } from '../CSVParsingService'
import { PrismaClient } from '@prisma/client'
import { JobStatus } from '../../types'

const prisma = new PrismaClient()

describe('CSVParsingService', () => {
  let service: CSVParsingService
  const testUserId = 'test-user-123'

  beforeAll(async () => {
    // Clean up test data
    await prisma.item.deleteMany({})
    await prisma.order.deleteMany({})
    await prisma.simulationJob.deleteMany({})
    await prisma.user.deleteMany({})

    // Create test user
    await prisma.user.create({
      data: {
        id: testUserId,
        email: 'test@example.com',
        passwordHash: 'hash',
        role: 'CUSTOMER',
        subscriptionTier: 'FREE',
      },
    })
  })

  beforeEach(() => {
    service = new CSVParsingService()
  })

  afterEach(async () => {
    // Clean up orders and jobs after each test
    await prisma.item.deleteMany({})
    await prisma.order.deleteMany({})
    await prisma.simulationJob.deleteMany({})
  })

  afterAll(async () => {
    // Clean up test user
    await prisma.user.delete({ where: { id: testUserId } })
    await prisma.$disconnect()
  })

  describe('uploadCSV', () => {
    test('should successfully parse valid CSV file', async () => {
      const csv = Buffer.from(
        'order_id,item_length,item_width,item_height,item_weight,quantity\n' +
          'ORDER-1,10,20,30,5,2\n' +
          'ORDER-1,15,25,35,3,1\n' +
          'ORDER-2,12,22,32,4,3'
      )

      const job = await service.uploadCSV(csv, 'test.csv', testUserId)

      expect(job).toBeDefined()
      expect(job.jobId).toBeDefined()
      expect(job.userId).toBe(testUserId)
      expect(job.fileName).toBe('test.csv')
      expect(job.totalOrders).toBe(2) // ORDER-1 and ORDER-2
      expect(job.status).toBe(JobStatus.PENDING)
    })

    test('should reject CSV file exceeding 50MB', async () => {
      const largeBuffer = Buffer.alloc(51 * 1024 * 1024) // 51 MB

      await expect(
        service.uploadCSV(largeBuffer, 'large.csv', testUserId)
      ).rejects.toThrow('File size exceeds maximum limit')
    })

    test('should reject CSV with missing required columns', async () => {
      const csv = Buffer.from(
        'order_id,item_length,item_width\n' + 'ORDER-1,10,20'
      )

      await expect(
        service.uploadCSV(csv, 'invalid.csv', testUserId)
      ).rejects.toThrow('Missing required columns')
    })

    test('should skip rows with invalid dimensions', async () => {
      const csv = Buffer.from(
        'order_id,item_length,item_width,item_height,item_weight,quantity\n' +
          'ORDER-1,10,20,30,5,2\n' +
          'ORDER-2,-5,20,30,5,2\n' + // Invalid: negative length
          'ORDER-3,10,20,30,5,2'
      )

      const job = await service.uploadCSV(csv, 'test.csv', testUserId)
      const orders = await service.getOrdersForJob(job.jobId)

      expect(orders.length).toBe(2) // ORDER-1 and ORDER-3
      expect(orders.find((o) => o.orderId === 'ORDER-2')).toBeUndefined()
    })

    test('should skip rows with negative weight', async () => {
      const csv = Buffer.from(
        'order_id,item_length,item_width,item_height,item_weight,quantity\n' +
          'ORDER-1,10,20,30,5,2\n' +
          'ORDER-2,10,20,30,-5,2\n' + // Invalid: negative weight
          'ORDER-3,10,20,30,5,2'
      )

      const job = await service.uploadCSV(csv, 'test.csv', testUserId)
      const orders = await service.getOrdersForJob(job.jobId)

      expect(orders.length).toBe(2) // ORDER-1 and ORDER-3
    })

    test('should skip rows with invalid quantity', async () => {
      const csv = Buffer.from(
        'order_id,item_length,item_width,item_height,item_weight,quantity\n' +
          'ORDER-1,10,20,30,5,2\n' +
          'ORDER-2,10,20,30,5,0\n' + // Invalid: zero quantity
          'ORDER-3,10,20,30,5,-1\n' + // Invalid: negative quantity
          'ORDER-4,10,20,30,5,2.5\n' + // Invalid: non-integer
          'ORDER-5,10,20,30,5,3'
      )

      const job = await service.uploadCSV(csv, 'test.csv', testUserId)
      const orders = await service.getOrdersForJob(job.jobId)

      expect(orders.length).toBe(2) // ORDER-1 and ORDER-5
    })

    test('should accept zero weight', async () => {
      const csv = Buffer.from(
        'order_id,item_length,item_width,item_height,item_weight,quantity\n' +
          'ORDER-1,10,20,30,0,2'
      )

      const job = await service.uploadCSV(csv, 'test.csv', testUserId)
      const orders = await service.getOrdersForJob(job.jobId)

      expect(orders.length).toBe(1)
      expect(orders[0].items[0].weight).toBe(0)
    })

    test('should group items by order_id', async () => {
      const csv = Buffer.from(
        'order_id,item_length,item_width,item_height,item_weight,quantity\n' +
          'ORDER-1,10,20,30,5,2\n' +
          'ORDER-1,15,25,35,3,1\n' +
          'ORDER-1,12,22,32,4,3\n' +
          'ORDER-2,10,20,30,5,1'
      )

      const job = await service.uploadCSV(csv, 'test.csv', testUserId)
      const orders = await service.getOrdersForJob(job.jobId)

      expect(orders.length).toBe(2)

      const order1 = orders.find((o) => o.orderId === 'ORDER-1')
      expect(order1).toBeDefined()
      expect(order1!.items.length).toBe(3)

      const order2 = orders.find((o) => o.orderId === 'ORDER-2')
      expect(order2).toBeDefined()
      expect(order2!.items.length).toBe(1)
    })

    test('should calculate total weight correctly', async () => {
      const csv = Buffer.from(
        'order_id,item_length,item_width,item_height,item_weight,quantity\n' +
          'ORDER-1,10,20,30,5,2\n' + // 5 * 2 = 10
          'ORDER-1,15,25,35,3,3' // 3 * 3 = 9
        // Total: 19
      )

      const job = await service.uploadCSV(csv, 'test.csv', testUserId)
      const orders = await service.getOrdersForJob(job.jobId)

      expect(orders.length).toBe(1)
      expect(orders[0].totalWeight).toBe(19)
    })

    test('should handle empty order_id gracefully', async () => {
      const csv = Buffer.from(
        'order_id,item_length,item_width,item_height,item_weight,quantity\n' +
          ',10,20,30,5,2\n' + // Empty order_id
          'ORDER-1,10,20,30,5,2'
      )

      const job = await service.uploadCSV(csv, 'test.csv', testUserId)
      const orders = await service.getOrdersForJob(job.jobId)

      expect(orders.length).toBe(1) // Only ORDER-1
      expect(orders[0].orderId).toBe('ORDER-1')
    })

    test('should trim whitespace from order_id', async () => {
      const csv = Buffer.from(
        'order_id,item_length,item_width,item_height,item_weight,quantity\n' +
          '  ORDER-1  ,10,20,30,5,2'
      )

      const job = await service.uploadCSV(csv, 'test.csv', testUserId)
      const orders = await service.getOrdersForJob(job.jobId)

      expect(orders.length).toBe(1)
      expect(orders[0].orderId).toBe('ORDER-1')
    })
  })

  describe('getSimulationJob', () => {
    test('should retrieve simulation job by ID', async () => {
      const csv = Buffer.from(
        'order_id,item_length,item_width,item_height,item_weight,quantity\n' +
          'ORDER-1,10,20,30,5,2'
      )

      const createdJob = await service.uploadCSV(csv, 'test.csv', testUserId)
      const retrievedJob = await service.getSimulationJob(createdJob.jobId)

      expect(retrievedJob).toBeDefined()
      expect(retrievedJob!.jobId).toBe(createdJob.jobId)
      expect(retrievedJob!.userId).toBe(testUserId)
      expect(retrievedJob!.fileName).toBe('test.csv')
      expect(retrievedJob!.totalOrders).toBe(1)
      expect(retrievedJob!.status).toBe(JobStatus.PENDING)
    })

    test('should return null for non-existent job', async () => {
      const job = await service.getSimulationJob('non-existent-id')
      expect(job).toBeNull()
    })
  })

  describe('getOrdersForJob', () => {
    test('should retrieve all orders for a job', async () => {
      const csv = Buffer.from(
        'order_id,item_length,item_width,item_height,item_weight,quantity\n' +
          'ORDER-1,10,20,30,5,2\n' +
          'ORDER-2,15,25,35,3,1'
      )

      const job = await service.uploadCSV(csv, 'test.csv', testUserId)
      const orders = await service.getOrdersForJob(job.jobId)

      expect(orders.length).toBe(2)
      expect(orders[0].orderId).toBeDefined()
      expect(orders[0].items.length).toBeGreaterThan(0)
      expect(orders[0].totalWeight).toBeGreaterThan(0)
    })

    test('should return empty array for job with no orders', async () => {
      // Create a job manually without orders
      const job = await prisma.simulationJob.create({
        data: {
          userId: testUserId,
          fileName: 'empty.csv',
          totalOrders: 0,
          status: 'PENDING',
        },
      })

      const orders = await service.getOrdersForJob(job.id)
      expect(orders).toEqual([])
    })

    test('should include all item properties', async () => {
      const csv = Buffer.from(
        'order_id,item_length,item_width,item_height,item_weight,quantity\n' +
          'ORDER-1,10.5,20.3,30.7,5.2,2'
      )

      const job = await service.uploadCSV(csv, 'test.csv', testUserId)
      const orders = await service.getOrdersForJob(job.jobId)

      expect(orders.length).toBe(1)
      const item = orders[0].items[0]
      expect(item.itemId).toBeDefined()
      expect(item.length).toBeCloseTo(10.5, 1)
      expect(item.width).toBeCloseTo(20.3, 1)
      expect(item.height).toBeCloseTo(30.7, 1)
      expect(item.weight).toBeCloseTo(5.2, 1)
      expect(item.quantity).toBe(2)
    })
  })

  describe('CSV format validation', () => {
    test('should validate all required columns are present', async () => {
      const missingColumns = [
        'item_length,item_width,item_height,item_weight,quantity\n10,20,30,5,2',
        'order_id,item_width,item_height,item_weight,quantity\nORDER-1,20,30,5,2',
        'order_id,item_length,item_height,item_weight,quantity\nORDER-1,10,30,5,2',
        'order_id,item_length,item_width,item_weight,quantity\nORDER-1,10,20,5,2',
        'order_id,item_length,item_width,item_height,quantity\nORDER-1,10,20,30,2',
        'order_id,item_length,item_width,item_height,item_weight\nORDER-1,10,20,30,5',
      ]

      for (const csvContent of missingColumns) {
        const csv = Buffer.from(csvContent)
        await expect(
          service.uploadCSV(csv, 'invalid.csv', testUserId)
        ).rejects.toThrow('Missing required columns')
      }
    })
  })

  describe('Edge cases', () => {
    test('should handle very small dimensions', async () => {
      const csv = Buffer.from(
        'order_id,item_length,item_width,item_height,item_weight,quantity\n' +
          'ORDER-1,0.1,0.1,0.1,0.1,1'
      )

      const job = await service.uploadCSV(csv, 'test.csv', testUserId)
      const orders = await service.getOrdersForJob(job.jobId)

      expect(orders.length).toBe(1)
      expect(orders[0].items[0].length).toBeCloseTo(0.1, 1)
    })

    test('should handle large dimensions', async () => {
      const csv = Buffer.from(
        'order_id,item_length,item_width,item_height,item_weight,quantity\n' +
          'ORDER-1,1000,2000,3000,5000,1'
      )

      const job = await service.uploadCSV(csv, 'test.csv', testUserId)
      const orders = await service.getOrdersForJob(job.jobId)

      expect(orders.length).toBe(1)
      expect(orders[0].items[0].length).toBe(1000)
      expect(orders[0].items[0].weight).toBe(5000)
    })

    test('should handle large quantity', async () => {
      const csv = Buffer.from(
        'order_id,item_length,item_width,item_height,item_weight,quantity\n' +
          'ORDER-1,10,20,30,5,1000'
      )

      const job = await service.uploadCSV(csv, 'test.csv', testUserId)
      const orders = await service.getOrdersForJob(job.jobId)

      expect(orders.length).toBe(1)
      expect(orders[0].items[0].quantity).toBe(1000)
      expect(orders[0].totalWeight).toBe(5000) // 5 * 1000
    })

    test('should handle decimal values correctly', async () => {
      const csv = Buffer.from(
        'order_id,item_length,item_width,item_height,item_weight,quantity\n' +
          'ORDER-1,10.123,20.456,30.789,5.555,2'
      )

      const job = await service.uploadCSV(csv, 'test.csv', testUserId)
      const orders = await service.getOrdersForJob(job.jobId)

      expect(orders.length).toBe(1)
      const item = orders[0].items[0]
      expect(item.length).toBeCloseTo(10.123, 3)
      expect(item.width).toBeCloseTo(20.456, 3)
      expect(item.height).toBeCloseTo(30.789, 3)
      expect(item.weight).toBeCloseTo(5.555, 3)
    })
  })
})
