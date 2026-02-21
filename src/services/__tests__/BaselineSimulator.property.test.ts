import fc from 'fast-check'
import { BaselineSimulator } from '../BaselineSimulator'
import { BoxCatalogManager } from '../BoxCatalogManager'
import { PackingEngine } from '../PackingEngine'
import { prisma } from '../../config/database'
import { Order, PackingResult } from '../../types'

/**
 * Property 6: Baseline simulation realism
 * **Validates: Requirements 5.1, 5.2, 5.6, 5.7**
 */

describe('BaselineSimulator - Property-Based Tests', () => {
  let baselineSimulator: BaselineSimulator
  let boxCatalogManager: BoxCatalogManager
  let packingEngine: PackingEngine

  beforeAll(() => {
    boxCatalogManager = new BoxCatalogManager()
    packingEngine = new PackingEngine(boxCatalogManager)
    baselineSimulator = new BaselineSimulator(boxCatalogManager, packingEngine)
  })

  afterEach(async () => {
    // Clean up test data
    await prisma.order.deleteMany()
    await prisma.box.deleteMany()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  describe('Property 6: Baseline simulation realism', () => {
    it('should always select box with volume >= optimized box volume', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate a set of boxes
          fc.array(
            fc.record({
              name: fc.string({ minLength: 1, maxLength: 20 }),
              length: fc.float({ min: 20, max: 100, noNaN: true }),
              width: fc.float({ min: 20, max: 100, noNaN: true }),
              height: fc.float({ min: 20, max: 100, noNaN: true }),
              maxWeight: fc.float({ min: 10, max: 50, noNaN: true }),
            }),
            { minLength: 3, maxLength: 8 }
          ),
          // Generate order with items
          fc.record({
            orderId: fc.string({ minLength: 1, maxLength: 20 }),
            items: fc.array(
              fc.record({
                itemId: fc.string({ minLength: 1, maxLength: 20 }),
                length: fc.float({ min: 5, max: 30, noNaN: true }),
                width: fc.float({ min: 5, max: 30, noNaN: true }),
                height: fc.float({ min: 5, max: 30, noNaN: true }),
                weight: fc.float({ min: 0.1, max: 5, noNaN: true }),
                quantity: fc.integer({ min: 1, max: 3 }),
              }),
              { minLength: 1, maxLength: 5 }
            ),
          }),
          // Generate packing config
          fc.record({
            bufferPadding: fc.float({ min: 0, max: 3, noNaN: true }),
            volumetricDivisor: fc.integer({ min: 4000, max: 6000 }),
            shippingRatePerKg: fc.float({ min: 0.5, max: 2, noNaN: true }),
          }),
          async (boxDefs, orderData, config) => {
            // Create boxes in database
            const createdBoxes = []
            for (const boxDef of boxDefs) {
              try {
                const box = await boxCatalogManager.addBox({
                  ...boxDef,
                  isActive: true,
                })
                createdBoxes.push(box)
              } catch (error) {
                continue
              }
            }

            // Skip if not enough boxes created
            if (createdBoxes.length < 2) {
              return true
            }

            // Calculate total weight for order
            const totalWeight = orderData.items.reduce(
              (sum, item) => sum + item.weight * item.quantity,
              0
            )

            const order: Order = {
              ...orderData,
              totalWeight,
            }

            // Try to optimize the order
            let optimizedResult: PackingResult
            try {
              optimizedResult = await packingEngine.optimizeOrder(order, config)
            } catch (error) {
              // Skip if optimization fails
              return true
            }

            // Skip if optimization was invalid
            if (!optimizedResult.isValid) {
              return true
            }

            // Simulate baseline packing
            const baselineResult = await baselineSimulator.simulateBaselinePacking(
              order,
              optimizedResult,
              config
            )

            // Property 1: Baseline box volume must be >= optimized box volume
            expect(baselineResult.selectedBox.volume).toBeGreaterThanOrEqual(
              optimizedResult.selectedBox.volume
            )

            // Property 2: Baseline shipping cost must be >= optimized shipping cost
            // (or equal if using the same box - largest box case)
            expect(baselineResult.shippingCost).toBeGreaterThanOrEqual(
              optimizedResult.shippingCost
            )

            // Property 3: Baseline billable weight must be >= optimized billable weight
            // (or equal if using the same box)
            expect(baselineResult.billableWeight).toBeGreaterThanOrEqual(
              optimizedResult.billableWeight
            )

            // Property 4: Order ID must match
            expect(baselineResult.orderId).toBe(order.orderId)

            // Property 5: If boxes are different, baseline should be strictly more expensive
            if (baselineResult.selectedBox.id !== optimizedResult.selectedBox.id) {
              expect(baselineResult.shippingCost).toBeGreaterThan(optimizedResult.shippingCost)
            }

            return true
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should use same box when optimized box is already the largest', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate order with items
          fc.record({
            orderId: fc.string({ minLength: 1, maxLength: 20 }),
            items: fc.array(
              fc.record({
                itemId: fc.string({ minLength: 1, maxLength: 20 }),
                length: fc.float({ min: 5, max: 20, noNaN: true }),
                width: fc.float({ min: 5, max: 20, noNaN: true }),
                height: fc.float({ min: 5, max: 20, noNaN: true }),
                weight: fc.float({ min: 0.1, max: 3, noNaN: true }),
                quantity: fc.integer({ min: 1, max: 2 }),
              }),
              { minLength: 1, maxLength: 3 }
            ),
          }),
          // Generate packing config
          fc.record({
            bufferPadding: fc.float({ min: 0, max: 2, noNaN: true }),
            volumetricDivisor: fc.integer({ min: 4000, max: 6000 }),
            shippingRatePerKg: fc.float({ min: 0.5, max: 2, noNaN: true }),
          }),
          async (orderData, config) => {
            // Create only one box (will be both smallest and largest)
            await boxCatalogManager.addBox({
              name: 'Only Box',
              length: 50,
              width: 40,
              height: 30,
              maxWeight: 20,
              isActive: true,
            })

            // Calculate total weight for order
            const totalWeight = orderData.items.reduce(
              (sum, item) => sum + item.weight * item.quantity,
              0
            )

            const order: Order = {
              ...orderData,
              totalWeight,
            }

            // Try to optimize the order
            let optimizedResult: PackingResult
            try {
              optimizedResult = await packingEngine.optimizeOrder(order, config)
            } catch (error) {
              return true
            }

            // Skip if optimization was invalid
            if (!optimizedResult.isValid) {
              return true
            }

            // Simulate baseline packing
            const baselineResult = await baselineSimulator.simulateBaselinePacking(
              order,
              optimizedResult,
              config
            )

            // Property: When only one box exists, baseline should use the same box
            expect(baselineResult.selectedBox.id).toBe(optimizedResult.selectedBox.id)

            // Property: Costs should be equal when using the same box
            expect(baselineResult.shippingCost).toBe(optimizedResult.shippingCost)
            expect(baselineResult.billableWeight).toBe(optimizedResult.billableWeight)

            return true
          }
        ),
        { numRuns: 30 }
      )
    })

    it('should select next larger box when multiple boxes exist', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate order with items
          fc.record({
            orderId: fc.string({ minLength: 1, maxLength: 20 }),
            items: fc.array(
              fc.record({
                itemId: fc.string({ minLength: 1, maxLength: 20 }),
                length: fc.float({ min: 5, max: 15, noNaN: true }),
                width: fc.float({ min: 5, max: 15, noNaN: true }),
                height: fc.float({ min: 5, max: 15, noNaN: true }),
                weight: fc.float({ min: 0.1, max: 2, noNaN: true }),
                quantity: fc.integer({ min: 1, max: 2 }),
              }),
              { minLength: 1, maxLength: 3 }
            ),
          }),
          // Generate packing config
          fc.record({
            bufferPadding: fc.float({ min: 0, max: 2, noNaN: true }),
            volumetricDivisor: fc.integer({ min: 4000, max: 6000 }),
            shippingRatePerKg: fc.float({ min: 0.5, max: 2, noNaN: true }),
          }),
          async (orderData, config) => {
            // Create multiple boxes with clearly different sizes
            const boxes = [
              {
                name: 'Small',
                length: 30,
                width: 25,
                height: 20,
                maxWeight: 10,
                isActive: true,
              },
              {
                name: 'Medium',
                length: 50,
                width: 40,
                height: 35,
                maxWeight: 20,
                isActive: true,
              },
              {
                name: 'Large',
                length: 70,
                width: 60,
                height: 50,
                maxWeight: 30,
                isActive: true,
              },
            ]

            const createdBoxes = []
            for (const boxDef of boxes) {
              const box = await boxCatalogManager.addBox(boxDef)
              createdBoxes.push(box)
            }

            // Calculate total weight for order
            const totalWeight = orderData.items.reduce(
              (sum, item) => sum + item.weight * item.quantity,
              0
            )

            const order: Order = {
              ...orderData,
              totalWeight,
            }

            // Try to optimize the order
            let optimizedResult: PackingResult
            try {
              optimizedResult = await packingEngine.optimizeOrder(order, config)
            } catch (error) {
              return true
            }

            // Skip if optimization was invalid
            if (!optimizedResult.isValid) {
              return true
            }

            // Get all boxes sorted by volume
            const allBoxes = await boxCatalogManager.getAllBoxes(true)
            const optimizedIndex = allBoxes.findIndex(
              (box) => box.id === optimizedResult.selectedBox.id
            )

            // Simulate baseline packing
            const baselineResult = await baselineSimulator.simulateBaselinePacking(
              order,
              optimizedResult,
              config
            )

            // Property: If not using the largest box, baseline should use next larger box
            if (optimizedIndex < allBoxes.length - 1) {
              const expectedBaselineBox = allBoxes[optimizedIndex + 1]
              expect(baselineResult.selectedBox.id).toBe(expectedBaselineBox.id)
            } else {
              // If using largest box, baseline should use same box
              expect(baselineResult.selectedBox.id).toBe(optimizedResult.selectedBox.id)
            }

            return true
          }
        ),
        { numRuns: 40 }
      )
    })

    it('should calculate costs correctly using baseline box dimensions', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate order with items
          fc.record({
            orderId: fc.string({ minLength: 1, maxLength: 20 }),
            items: fc.array(
              fc.record({
                itemId: fc.string({ minLength: 1, maxLength: 20 }),
                length: fc.float({ min: 5, max: 20, noNaN: true }),
                width: fc.float({ min: 5, max: 20, noNaN: true }),
                height: fc.float({ min: 5, max: 20, noNaN: true }),
                weight: fc.float({ min: 0.1, max: 3, noNaN: true }),
                quantity: fc.integer({ min: 1, max: 2 }),
              }),
              { minLength: 1, maxLength: 3 }
            ),
          }),
          // Generate packing config
          fc.record({
            bufferPadding: fc.float({ min: 0, max: 2, noNaN: true }),
            volumetricDivisor: fc.integer({ min: 4000, max: 6000 }),
            shippingRatePerKg: fc.float({ min: 0.5, max: 2, noNaN: true }),
          }),
          async (orderData, config) => {
            // Create multiple boxes
            const boxes = [
              {
                name: 'Box1',
                length: 30,
                width: 25,
                height: 20,
                maxWeight: 10,
                isActive: true,
              },
              {
                name: 'Box2',
                length: 50,
                width: 40,
                height: 35,
                maxWeight: 20,
                isActive: true,
              },
            ]

            for (const boxDef of boxes) {
              await boxCatalogManager.addBox(boxDef)
            }

            // Calculate total weight for order
            const totalWeight = orderData.items.reduce(
              (sum, item) => sum + item.weight * item.quantity,
              0
            )

            const order: Order = {
              ...orderData,
              totalWeight,
            }

            // Try to optimize the order
            let optimizedResult: PackingResult
            try {
              optimizedResult = await packingEngine.optimizeOrder(order, config)
            } catch (error) {
              return true
            }

            // Skip if optimization was invalid
            if (!optimizedResult.isValid) {
              return true
            }

            // Simulate baseline packing
            const baselineResult = await baselineSimulator.simulateBaselinePacking(
              order,
              optimizedResult,
              config
            )

            // Property: Manually verify cost calculation
            const expectedVolumetricWeight =
              (baselineResult.selectedBox.length *
                baselineResult.selectedBox.width *
                baselineResult.selectedBox.height) /
              config.volumetricDivisor

            const expectedBillableWeight = Math.max(totalWeight, expectedVolumetricWeight)
            const expectedShippingCost = expectedBillableWeight * config.shippingRatePerKg

            // Allow small floating point differences
            expect(Math.abs(baselineResult.billableWeight - expectedBillableWeight)).toBeLessThan(
              0.01
            )
            expect(Math.abs(baselineResult.shippingCost - expectedShippingCost)).toBeLessThan(0.01)

            return true
          }
        ),
        { numRuns: 40 }
      )
    })
  })
})
