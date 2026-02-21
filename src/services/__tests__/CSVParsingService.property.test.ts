import * as fc from 'fast-check'
import { CSVParsingService } from '../CSVParsingService'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * **Validates: Requirements 6.5, 6.6, 6.7, 6.8, 6.9, 6.10**
 *
 * Property 9: CSV Parsing Robustness
 *
 * Universal Quantification:
 * ∀ csvFile ∈ ValidCSVFiles, ∀ userId ∈ Users:
 *   let job = parseAndValidateCSV(csvFile, userId)
 *   in job.totalOrders > 0 ∧
 *      ∀ order ∈ job.orders:
 *        order.items.length > 0 ∧
 *        ∀ item ∈ order.items:
 *          item.length > 0 ∧ item.width > 0 ∧ item.height > 0 ∧
 *          item.weight ≥ 0 ∧ item.quantity > 0
 *
 * Property Description: For all valid CSV files, the parsing process must
 * produce at least one order, and all orders must contain valid items with
 * positive dimensions and quantities.
 */

// Generators
const validDimensionArb = fc.double({ min: 0.1, max: 200, noNaN: true })
const validWeightArb = fc.double({ min: 0, max: 100, noNaN: true })
const validQuantityArb = fc.integer({ min: 1, max: 100 })
const orderIdArb = fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0)
const userIdArb = fc.uuid()

const validCSVItemArb = fc.record({
  order_id: orderIdArb,
  item_length: validDimensionArb,
  item_width: validDimensionArb,
  item_height: validDimensionArb,
  item_weight: validWeightArb,
  quantity: validQuantityArb,
})

const validCSVFileArb = fc
  .array(validCSVItemArb, { minLength: 1, maxLength: 50 })
  .map((items) => {
    // Create CSV content
    const header =
      'order_id,item_length,item_width,item_height,item_weight,quantity\n'
    const rows = items
      .map(
        (item) =>
          `${item.order_id},${item.item_length},${item.item_width},${item.item_height},${item.item_weight},${item.quantity}`
      )
      .join('\n')
    return Buffer.from(header + rows)
  })

describe('CSVParsingService Property Tests', () => {
  let service: CSVParsingService

  beforeAll(async () => {
    // Clean up test data
    await prisma.item.deleteMany({})
    await prisma.order.deleteMany({})
    await prisma.simulationJob.deleteMany({})
    await prisma.user.deleteMany({})
  })

  beforeEach(() => {
    service = new CSVParsingService()
  })

  afterEach(async () => {
    // Clean up after each test
    await prisma.item.deleteMany({})
    await prisma.order.deleteMany({})
    await prisma.simulationJob.deleteMany({})
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  /**
   * Property 9: CSV Parsing Robustness
   */
  test('Property 9: All valid CSV files produce jobs with valid orders and items', async () => {
    await fc.assert(
      fc.asyncProperty(validCSVFileArb, userIdArb, async (csvBuffer, userId) => {
        // Create test user
        await prisma.user.create({
          data: {
            id: userId,
            email: `test-${userId}@example.com`,
            passwordHash: 'hash',
            role: 'CUSTOMER',
            subscriptionTier: 'FREE',
          },
        })

        // Upload CSV
        const job = await service.uploadCSV(csvBuffer, 'test.csv', userId)

        // Verify job was created
        expect(job).toBeDefined()
        expect(job.jobId).toBeDefined()
        expect(job.totalOrders).toBeGreaterThan(0)

        // Get orders for job
        const orders = await service.getOrdersForJob(job.jobId)

        // Property: job.totalOrders > 0
        expect(orders.length).toBeGreaterThan(0)

        // Property: ∀ order ∈ job.orders: order.items.length > 0
        for (const order of orders) {
          expect(order.items.length).toBeGreaterThan(0)

          // Property: ∀ item ∈ order.items
          for (const item of order.items) {
            // item.length > 0
            expect(item.length).toBeGreaterThan(0)

            // item.width > 0
            expect(item.width).toBeGreaterThan(0)

            // item.height > 0
            expect(item.height).toBeGreaterThan(0)

            // item.weight ≥ 0
            expect(item.weight).toBeGreaterThanOrEqual(0)

            // item.quantity > 0
            expect(item.quantity).toBeGreaterThan(0)
            expect(Number.isInteger(item.quantity)).toBe(true)
          }
        }

        // Clean up test user
        await prisma.user.delete({ where: { id: userId } })
      }),
      { numRuns: 50 }
    )
  })

  test('Property 9: CSV parsing validates positive dimensions', async () => {
    await fc.assert(
      fc.asyncProperty(
        orderIdArb,
        fc.double({ min: -100, max: 0, noNaN: true }), // Invalid dimension
        validDimensionArb,
        validDimensionArb,
        validWeightArb,
        validQuantityArb,
        userIdArb,
        async (orderId, invalidLength, width, height, weight, quantity, userId) => {
          // Create CSV with invalid length
          const csv = Buffer.from(
            `order_id,item_length,item_width,item_height,item_weight,quantity\n` +
              `${orderId},${invalidLength},${width},${height},${weight},${quantity}`
          )

          // Create test user
          await prisma.user.create({
            data: {
              id: userId,
              email: `test-${userId}@example.com`,
              passwordHash: 'hash',
              role: 'CUSTOMER',
              subscriptionTier: 'FREE',
            },
          })

          // Upload CSV - should skip invalid row
          const job = await service.uploadCSV(csv, 'test.csv', userId)

          // Get orders - should be empty since row was invalid
          const orders = await service.getOrdersForJob(job.jobId)
          expect(orders.length).toBe(0)

          // Clean up
          await prisma.user.delete({ where: { id: userId } })
        }
      ),
      { numRuns: 20 }
    )
  })

  test('Property 9: CSV parsing validates non-negative weight', async () => {
    await fc.assert(
      fc.asyncProperty(
        orderIdArb,
        validDimensionArb,
        validDimensionArb,
        validDimensionArb,
        fc.double({ min: -100, max: -0.1, noNaN: true }), // Invalid weight
        validQuantityArb,
        userIdArb,
        async (orderId, length, width, height, invalidWeight, quantity, userId) => {
          // Create CSV with invalid weight
          const csv = Buffer.from(
            `order_id,item_length,item_width,item_height,item_weight,quantity\n` +
              `${orderId},${length},${width},${height},${invalidWeight},${quantity}`
          )

          // Create test user
          await prisma.user.create({
            data: {
              id: userId,
              email: `test-${userId}@example.com`,
              passwordHash: 'hash',
              role: 'CUSTOMER',
              subscriptionTier: 'FREE',
            },
          })

          // Upload CSV - should skip invalid row
          const job = await service.uploadCSV(csv, 'test.csv', userId)

          // Get orders - should be empty since row was invalid
          const orders = await service.getOrdersForJob(job.jobId)
          expect(orders.length).toBe(0)

          // Clean up
          await prisma.user.delete({ where: { id: userId } })
        }
      ),
      { numRuns: 20 }
    )
  })

  test('Property 9: CSV parsing validates positive integer quantity', async () => {
    await fc.assert(
      fc.asyncProperty(
        orderIdArb,
        validDimensionArb,
        validDimensionArb,
        validDimensionArb,
        validWeightArb,
        fc.oneof(
          fc.integer({ min: -100, max: 0 }), // Invalid: non-positive
          fc.double({ min: 0.1, max: 10, noNaN: true }) // Invalid: non-integer
        ),
        userIdArb,
        async (orderId, length, width, height, weight, invalidQuantity, userId) => {
          // Create CSV with invalid quantity
          const csv = Buffer.from(
            `order_id,item_length,item_width,item_height,item_weight,quantity\n` +
              `${orderId},${length},${width},${height},${weight},${invalidQuantity}`
          )

          // Create test user
          await prisma.user.create({
            data: {
              id: userId,
              email: `test-${userId}@example.com`,
              passwordHash: 'hash',
              role: 'CUSTOMER',
              subscriptionTier: 'FREE',
            },
          })

          // Upload CSV - should skip invalid row
          const job = await service.uploadCSV(csv, 'test.csv', userId)

          // Get orders - should be empty since row was invalid
          const orders = await service.getOrdersForJob(job.jobId)
          expect(orders.length).toBe(0)

          // Clean up
          await prisma.user.delete({ where: { id: userId } })
        }
      ),
      { numRuns: 20 }
    )
  })

  test('Property 9: CSV parsing groups items by order_id correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(validCSVItemArb, { minLength: 2, maxLength: 20 }),
        userIdArb,
        async (items, userId) => {
          // Use same order_id for all items
          const orderId = 'ORDER-123'
          const itemsWithSameOrder = items.map((item) => ({
            ...item,
            order_id: orderId,
          }))

          // Create CSV
          const header =
            'order_id,item_length,item_width,item_height,item_weight,quantity\n'
          const rows = itemsWithSameOrder
            .map(
              (item) =>
                `${item.order_id},${item.item_length},${item.item_width},${item.item_height},${item.item_weight},${item.quantity}`
            )
            .join('\n')
          const csv = Buffer.from(header + rows)

          // Create test user
          await prisma.user.create({
            data: {
              id: userId,
              email: `test-${userId}@example.com`,
              passwordHash: 'hash',
              role: 'CUSTOMER',
              subscriptionTier: 'FREE',
            },
          })

          // Upload CSV
          const job = await service.uploadCSV(csv, 'test.csv', userId)

          // Get orders
          const orders = await service.getOrdersForJob(job.jobId)

          // Should have exactly one order with all items
          expect(orders.length).toBe(1)
          expect(orders[0].orderId).toBe(orderId)
          expect(orders[0].items.length).toBe(itemsWithSameOrder.length)

          // Verify total weight calculation
          const expectedTotalWeight = itemsWithSameOrder.reduce(
            (sum, item) => sum + item.item_weight * item.quantity,
            0
          )
          expect(orders[0].totalWeight).toBeCloseTo(expectedTotalWeight, 2)

          // Clean up
          await prisma.user.delete({ where: { id: userId } })
        }
      ),
      { numRuns: 20 }
    )
  })
})
