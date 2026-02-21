import { BaselineSimulator } from '../BaselineSimulator'
import { BoxCatalogManager } from '../BoxCatalogManager'
import { PackingEngine } from '../PackingEngine'
import { prisma } from '../../config/database'
import { Order, PackingConfig, PackingResult, Box } from '../../types'

describe('BaselineSimulator', () => {
  let baselineSimulator: BaselineSimulator
  let boxCatalogManager: BoxCatalogManager
  let packingEngine: PackingEngine
  let smallBox: Box
  let mediumBox: Box
  let largeBox: Box

  beforeAll(async () => {
    boxCatalogManager = new BoxCatalogManager()
    packingEngine = new PackingEngine(boxCatalogManager)
    baselineSimulator = new BaselineSimulator(boxCatalogManager, packingEngine)

    // Create standard box catalog
    smallBox = await boxCatalogManager.addBox({
      name: 'Small',
      length: 20,
      width: 15,
      height: 10,
      maxWeight: 5,
      isActive: true,
    })

    mediumBox = await boxCatalogManager.addBox({
      name: 'Medium',
      length: 40,
      width: 30,
      height: 25,
      maxWeight: 15,
      isActive: true,
    })

    largeBox = await boxCatalogManager.addBox({
      name: 'Large',
      length: 60,
      width: 50,
      height: 40,
      maxWeight: 30,
      isActive: true,
    })
  })

  afterEach(async () => {
    await prisma.order.deleteMany()
  })

  afterAll(async () => {
    await prisma.box.deleteMany()
    await prisma.$disconnect()
  })

  const defaultConfig: PackingConfig = {
    bufferPadding: 2,
    volumetricDivisor: 5000,
    shippingRatePerKg: 0.5,
  }

  describe('simulateBaselinePacking', () => {
    it('should select next larger box when optimized box is smallest', async () => {
      const order: Order = {
        orderId: 'ORDER-001',
        items: [
          {
            itemId: 'ITEM-1',
            length: 5,
            width: 5,
            height: 3,
            weight: 1,
            quantity: 1,
          },
        ],
        totalWeight: 1,
      }

      // Optimize order (should select small box)
      const optimizedResult = await packingEngine.optimizeOrder(order, defaultConfig)
      expect(optimizedResult.isValid).toBe(true)
      expect(optimizedResult.selectedBox.id).toBe(smallBox.id)

      // Simulate baseline
      const baselineResult = await baselineSimulator.simulateBaselinePacking(
        order,
        optimizedResult,
        defaultConfig
      )

      // Should select medium box (next larger)
      expect(baselineResult.selectedBox.id).toBe(mediumBox.id)
      expect(baselineResult.selectedBox.volume).toBeGreaterThan(optimizedResult.selectedBox.volume)
      expect(baselineResult.shippingCost).toBeGreaterThan(optimizedResult.shippingCost)
    })

    it('should select next larger box when optimized box is middle size', async () => {
      const order: Order = {
        orderId: 'ORDER-002',
        items: [
          {
            itemId: 'ITEM-1',
            length: 15,
            width: 12,
            height: 8,
            weight: 3,
            quantity: 1,
          },
        ],
        totalWeight: 3,
      }

      // Optimize order (should select medium box)
      const optimizedResult = await packingEngine.optimizeOrder(order, defaultConfig)
      expect(optimizedResult.isValid).toBe(true)
      expect(optimizedResult.selectedBox.id).toBe(mediumBox.id)

      // Simulate baseline
      const baselineResult = await baselineSimulator.simulateBaselinePacking(
        order,
        optimizedResult,
        defaultConfig
      )

      // Should select large box (next larger)
      expect(baselineResult.selectedBox.id).toBe(largeBox.id)
      expect(baselineResult.selectedBox.volume).toBeGreaterThan(optimizedResult.selectedBox.volume)
      expect(baselineResult.shippingCost).toBeGreaterThan(optimizedResult.shippingCost)
    })

    it('should use same box when optimized box is already the largest', async () => {
      const order: Order = {
        orderId: 'ORDER-003',
        items: [
          {
            itemId: 'ITEM-1',
            length: 25,
            width: 20,
            height: 15,
            weight: 8,
            quantity: 1,
          },
        ],
        totalWeight: 8,
      }

      // Optimize order (should select large box)
      const optimizedResult = await packingEngine.optimizeOrder(order, defaultConfig)
      expect(optimizedResult.isValid).toBe(true)
      expect(optimizedResult.selectedBox.id).toBe(largeBox.id)

      // Simulate baseline
      const baselineResult = await baselineSimulator.simulateBaselinePacking(
        order,
        optimizedResult,
        defaultConfig
      )

      // Should use same box (already largest)
      expect(baselineResult.selectedBox.id).toBe(largeBox.id)
      expect(baselineResult.selectedBox.volume).toBe(optimizedResult.selectedBox.volume)
      expect(baselineResult.shippingCost).toBe(optimizedResult.shippingCost)
      expect(baselineResult.billableWeight).toBe(optimizedResult.billableWeight)
    })

    it('should calculate baseline costs correctly', async () => {
      const order: Order = {
        orderId: 'ORDER-004',
        items: [
          {
            itemId: 'ITEM-1',
            length: 5,
            width: 5,
            height: 3,
            weight: 2,
            quantity: 1,
          },
        ],
        totalWeight: 2,
      }

      const optimizedResult = await packingEngine.optimizeOrder(order, defaultConfig)
      const baselineResult = await baselineSimulator.simulateBaselinePacking(
        order,
        optimizedResult,
        defaultConfig
      )

      // Manually calculate expected values
      const expectedVolumetricWeight =
        (baselineResult.selectedBox.length *
          baselineResult.selectedBox.width *
          baselineResult.selectedBox.height) /
        defaultConfig.volumetricDivisor

      const expectedBillableWeight = Math.max(order.totalWeight, expectedVolumetricWeight)
      const expectedShippingCost = expectedBillableWeight * defaultConfig.shippingRatePerKg

      expect(baselineResult.billableWeight).toBeCloseTo(expectedBillableWeight, 2)
      expect(baselineResult.shippingCost).toBeCloseTo(expectedShippingCost, 2)
    })

    it('should ensure baseline cost is always >= optimized cost', async () => {
      const orders: Order[] = [
        {
          orderId: 'ORDER-005',
          items: [
            {
              itemId: 'ITEM-1',
              length: 5,
              width: 5,
              height: 3,
              weight: 1,
              quantity: 1,
            },
          ],
          totalWeight: 1,
        },
        {
          orderId: 'ORDER-006',
          items: [
            {
              itemId: 'ITEM-2',
              length: 15,
              width: 12,
              height: 8,
              weight: 5,
              quantity: 1,
            },
          ],
          totalWeight: 5,
        },
        {
          orderId: 'ORDER-007',
          items: [
            {
              itemId: 'ITEM-3',
              length: 25,
              width: 20,
              height: 15,
              weight: 10,
              quantity: 1,
            },
          ],
          totalWeight: 10,
        },
      ]

      for (const order of orders) {
        const optimizedResult = await packingEngine.optimizeOrder(order, defaultConfig)
        if (!optimizedResult.isValid) continue

        const baselineResult = await baselineSimulator.simulateBaselinePacking(
          order,
          optimizedResult,
          defaultConfig
        )

        expect(baselineResult.shippingCost).toBeGreaterThanOrEqual(optimizedResult.shippingCost)
        expect(baselineResult.billableWeight).toBeGreaterThanOrEqual(
          optimizedResult.billableWeight
        )
        expect(baselineResult.selectedBox.volume).toBeGreaterThanOrEqual(
          optimizedResult.selectedBox.volume
        )
      }
    })

    it('should preserve order ID in baseline result', async () => {
      const order: Order = {
        orderId: 'ORDER-UNIQUE-123',
        items: [
          {
            itemId: 'ITEM-1',
            length: 5,
            width: 5,
            height: 3,
            weight: 1,
            quantity: 1,
          },
        ],
        totalWeight: 1,
      }

      const optimizedResult = await packingEngine.optimizeOrder(order, defaultConfig)
      const baselineResult = await baselineSimulator.simulateBaselinePacking(
        order,
        optimizedResult,
        defaultConfig
      )

      expect(baselineResult.orderId).toBe(order.orderId)
    })

    it('should throw error when optimized result is invalid', async () => {
      const order: Order = {
        orderId: 'ORDER-008',
        items: [
          {
            itemId: 'ITEM-1',
            length: 5,
            width: 5,
            height: 3,
            weight: 1,
            quantity: 1,
          },
        ],
        totalWeight: 1,
      }

      const invalidOptimizedResult: PackingResult = {
        orderId: order.orderId,
        selectedBox: smallBox,
        totalDimensions: { length: 10, width: 10, height: 10 },
        totalWeight: 1,
        volumetricWeight: 0.4,
        billableWeight: 1,
        shippingCost: 0.5,
        spaceUtilization: 50,
        wastedVolume: 1500,
        isValid: false,
        rejectionReason: 'Test invalid result',
      }

      await expect(
        baselineSimulator.simulateBaselinePacking(order, invalidOptimizedResult, defaultConfig)
      ).rejects.toThrow('Cannot simulate baseline for invalid optimized result')
    })

    it('should handle different volumetric divisors correctly', async () => {
      const order: Order = {
        orderId: 'ORDER-009',
        items: [
          {
            itemId: 'ITEM-1',
            length: 5,
            width: 5,
            height: 3,
            weight: 1,
            quantity: 1,
          },
        ],
        totalWeight: 1,
      }

      const configs = [
        { ...defaultConfig, volumetricDivisor: 4000 },
        { ...defaultConfig, volumetricDivisor: 5000 },
        { ...defaultConfig, volumetricDivisor: 6000 },
      ]

      for (const config of configs) {
        const optimizedResult = await packingEngine.optimizeOrder(order, config)
        const baselineResult = await baselineSimulator.simulateBaselinePacking(
          order,
          optimizedResult,
          config
        )

        // Verify volumetric weight calculation uses correct divisor
        const expectedVolumetricWeight =
          (baselineResult.selectedBox.length *
            baselineResult.selectedBox.width *
            baselineResult.selectedBox.height) /
          config.volumetricDivisor

        expect(
          Math.abs(
            baselineResult.billableWeight - Math.max(order.totalWeight, expectedVolumetricWeight)
          )
        ).toBeLessThan(0.01)
      }
    })

    it('should handle different shipping rates correctly', async () => {
      const order: Order = {
        orderId: 'ORDER-010',
        items: [
          {
            itemId: 'ITEM-1',
            length: 5,
            width: 5,
            height: 3,
            weight: 1,
            quantity: 1,
          },
        ],
        totalWeight: 1,
      }

      const configs = [
        { ...defaultConfig, shippingRatePerKg: 0.3 },
        { ...defaultConfig, shippingRatePerKg: 0.5 },
        { ...defaultConfig, shippingRatePerKg: 1.0 },
      ]

      for (const config of configs) {
        const optimizedResult = await packingEngine.optimizeOrder(order, config)
        const baselineResult = await baselineSimulator.simulateBaselinePacking(
          order,
          optimizedResult,
          config
        )

        // Verify shipping cost calculation uses correct rate
        const expectedShippingCost = baselineResult.billableWeight * config.shippingRatePerKg

        expect(Math.abs(baselineResult.shippingCost - expectedShippingCost)).toBeLessThan(0.01)
      }
    })

    it('should handle multiple items with different quantities', async () => {
      const order: Order = {
        orderId: 'ORDER-011',
        items: [
          {
            itemId: 'ITEM-1',
            length: 5,
            width: 5,
            height: 2,
            weight: 0.5,
            quantity: 2,
          },
          {
            itemId: 'ITEM-2',
            length: 6,
            width: 4,
            height: 3,
            weight: 0.8,
            quantity: 1,
          },
        ],
        totalWeight: 1.8,
      }

      const optimizedResult = await packingEngine.optimizeOrder(order, defaultConfig)
      expect(optimizedResult.isValid).toBe(true)

      const baselineResult = await baselineSimulator.simulateBaselinePacking(
        order,
        optimizedResult,
        defaultConfig
      )

      expect(baselineResult.selectedBox.volume).toBeGreaterThanOrEqual(
        optimizedResult.selectedBox.volume
      )
      expect(baselineResult.shippingCost).toBeGreaterThanOrEqual(optimizedResult.shippingCost)
      expect(baselineResult.orderId).toBe(order.orderId)
    })

    it('should work with edge case: very small items', async () => {
      const order: Order = {
        orderId: 'ORDER-012',
        items: [
          {
            itemId: 'ITEM-1',
            length: 1,
            width: 1,
            height: 1,
            weight: 0.1,
            quantity: 1,
          },
        ],
        totalWeight: 0.1,
      }

      const optimizedResult = await packingEngine.optimizeOrder(order, defaultConfig)
      expect(optimizedResult.isValid).toBe(true)

      const baselineResult = await baselineSimulator.simulateBaselinePacking(
        order,
        optimizedResult,
        defaultConfig
      )

      expect(baselineResult.selectedBox.volume).toBeGreaterThanOrEqual(
        optimizedResult.selectedBox.volume
      )
      expect(baselineResult.shippingCost).toBeGreaterThanOrEqual(optimizedResult.shippingCost)
    })

    it('should represent realistic manual oversized packing behavior', async () => {
      // This test verifies that baseline simulation represents realistic manual packing
      // where operators tend to select larger boxes than optimal
      const order: Order = {
        orderId: 'ORDER-013',
        items: [
          {
            itemId: 'ITEM-1',
            length: 8,
            width: 6,
            height: 4,
            weight: 2,
            quantity: 1,
          },
        ],
        totalWeight: 2,
      }

      const optimizedResult = await packingEngine.optimizeOrder(order, defaultConfig)
      const baselineResult = await baselineSimulator.simulateBaselinePacking(
        order,
        optimizedResult,
        defaultConfig
      )

      // Baseline should use a larger box (unless already using largest)
      const allBoxes = await boxCatalogManager.getAllBoxes(true)
      const optimizedIndex = allBoxes.findIndex(
        (box) => box.id === optimizedResult.selectedBox.id
      )

      if (optimizedIndex < allBoxes.length - 1) {
        // Not using largest box, so baseline should be larger
        expect(baselineResult.selectedBox.volume).toBeGreaterThan(
          optimizedResult.selectedBox.volume
        )
        expect(baselineResult.shippingCost).toBeGreaterThan(optimizedResult.shippingCost)
      } else {
        // Using largest box, so baseline should be same
        expect(baselineResult.selectedBox.id).toBe(optimizedResult.selectedBox.id)
      }
    })
  })
})
