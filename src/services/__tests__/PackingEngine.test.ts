import { PackingEngine } from '../PackingEngine'
import { BoxCatalogManager } from '../BoxCatalogManager'
import { prisma } from '../../config/database'
import { Order, PackingConfig } from '../../types'

describe('PackingEngine', () => {
  let packingEngine: PackingEngine
  let boxCatalogManager: BoxCatalogManager

  beforeAll(async () => {
    boxCatalogManager = new BoxCatalogManager()
    packingEngine = new PackingEngine(boxCatalogManager)

    // Create standard box catalog
    await boxCatalogManager.addBox({
      name: 'Small',
      length: 20,
      width: 15,
      height: 10,
      maxWeight: 5,
      isActive: true,
    })

    await boxCatalogManager.addBox({
      name: 'Medium',
      length: 40,
      width: 30,
      height: 25,
      maxWeight: 15,
      isActive: true,
    })

    await boxCatalogManager.addBox({
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

  describe('calculateTotalDimensions', () => {
    it('should calculate dimensions for single item', () => {
      const items = [
        {
          itemId: 'ITEM-1',
          length: 10,
          width: 8,
          height: 5,
          weight: 1,
          quantity: 1,
        },
      ]

      const dimensions = packingEngine.calculateTotalDimensions(items, 2)

      expect(dimensions.length).toBe(14) // 10 + 2*2
      expect(dimensions.width).toBe(12) // 8 + 2*2
      expect(dimensions.height).toBe(9) // 5 + 2*2
    })

    it('should calculate dimensions for multiple items with vertical stacking', () => {
      const items = [
        {
          itemId: 'ITEM-1',
          length: 10,
          width: 8,
          height: 5,
          weight: 1,
          quantity: 2,
        },
        {
          itemId: 'ITEM-2',
          length: 12,
          width: 6,
          height: 3,
          weight: 0.5,
          quantity: 1,
        },
      ]

      const dimensions = packingEngine.calculateTotalDimensions(items, 2)

      expect(dimensions.length).toBe(16) // max(10, 12) + 2*2 = 16
      expect(dimensions.width).toBe(12) // max(8, 6) + 2*2 = 12
      expect(dimensions.height).toBe(17) // (5+5+3) + 2*2 = 17
    })

    it('should sort items by volume descending', () => {
      const items = [
        {
          itemId: 'ITEM-1',
          length: 5,
          width: 5,
          height: 5,
          weight: 1,
          quantity: 1,
        }, // volume 125
        {
          itemId: 'ITEM-2',
          length: 10,
          width: 10,
          height: 10,
          weight: 2,
          quantity: 1,
        }, // volume 1000
      ]

      const dimensions = packingEngine.calculateTotalDimensions(items, 0)

      // Should use max dimensions from larger item
      expect(dimensions.length).toBe(10)
      expect(dimensions.width).toBe(10)
      expect(dimensions.height).toBe(15) // 10 + 5
    })

    it('should throw error for empty items array', () => {
      expect(() => packingEngine.calculateTotalDimensions([], 2)).toThrow(
        'Items array cannot be empty'
      )
    })

    it('should throw error for negative buffer padding', () => {
      const items = [
        {
          itemId: 'ITEM-1',
          length: 10,
          width: 8,
          height: 5,
          weight: 1,
          quantity: 1,
        },
      ]

      expect(() => packingEngine.calculateTotalDimensions(items, -1)).toThrow(
        'Buffer padding must be non-negative'
      )
    })
  })

  describe('calculateVolumetricWeight', () => {
    it('should calculate volumetric weight correctly', () => {
      const box = {
        id: '1',
        name: 'Test Box',
        length: 40,
        width: 30,
        height: 25,
        volume: 30000,
        maxWeight: 15,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const volumetricWeight = packingEngine.calculateVolumetricWeight(box, 5000)

      expect(volumetricWeight).toBe(6) // (40*30*25) / 5000 = 6
    })

    it('should throw error for non-positive divisor', () => {
      const box = {
        id: '1',
        name: 'Test Box',
        length: 40,
        width: 30,
        height: 25,
        volume: 30000,
        maxWeight: 15,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      expect(() => packingEngine.calculateVolumetricWeight(box, 0)).toThrow(
        'Volumetric divisor must be positive'
      )
    })
  })

  describe('calculateBillableWeight', () => {
    it('should return actual weight when greater than volumetric', () => {
      const billableWeight = packingEngine.calculateBillableWeight(10, 5)
      expect(billableWeight).toBe(10)
    })

    it('should return volumetric weight when greater than actual', () => {
      const billableWeight = packingEngine.calculateBillableWeight(3, 8)
      expect(billableWeight).toBe(8)
    })

    it('should return same value when weights are equal', () => {
      const billableWeight = packingEngine.calculateBillableWeight(7, 7)
      expect(billableWeight).toBe(7)
    })

    it('should throw error for negative actual weight', () => {
      expect(() => packingEngine.calculateBillableWeight(-1, 5)).toThrow(
        'Actual weight must be non-negative'
      )
    })
  })

  describe('optimizeOrder', () => {
    it('should optimize single-item order successfully', async () => {
      const order: Order = {
        orderId: 'ORD-001',
        items: [
          {
            itemId: 'ITEM-1',
            length: 15,
            width: 10,
            height: 8,
            weight: 3,
            quantity: 1,
          },
        ],
        totalWeight: 3,
      }

      const result = await packingEngine.optimizeOrder(order, defaultConfig)

      expect(result.isValid).toBe(true)
      expect(result.selectedBox.name).toBe('Small')
      expect(result.totalWeight).toBe(3)
      expect(result.billableWeight).toBeGreaterThanOrEqual(3)
      expect(result.spaceUtilization).toBeGreaterThan(0)
      expect(result.spaceUtilization).toBeLessThanOrEqual(100)
    })

    it('should optimize multi-item order successfully', async () => {
      const order: Order = {
        orderId: 'ORD-002',
        items: [
          {
            itemId: 'ITEM-1',
            length: 10,
            width: 8,
            height: 5,
            weight: 2,
            quantity: 2,
          },
          {
            itemId: 'ITEM-2',
            length: 8,
            width: 6,
            height: 4,
            weight: 1,
            quantity: 1,
          },
        ],
        totalWeight: 5,
      }

      const result = await packingEngine.optimizeOrder(order, defaultConfig)

      expect(result.isValid).toBe(true)
      expect(result.totalWeight).toBe(5)
    })

    it('should select smallest suitable box', async () => {
      const order: Order = {
        orderId: 'ORD-003',
        items: [
          {
            itemId: 'ITEM-1',
            length: 10,
            width: 8,
            height: 5,
            weight: 2,
            quantity: 1,
          },
        ],
        totalWeight: 2,
      }

      const result = await packingEngine.optimizeOrder(order, defaultConfig)

      expect(result.isValid).toBe(true)
      expect(result.selectedBox.name).toBe('Small') // Should select smallest box
    })

    it('should return invalid result when no suitable box exists', async () => {
      const order: Order = {
        orderId: 'ORD-004',
        items: [
          {
            itemId: 'ITEM-1',
            length: 100,
            width: 80,
            height: 60,
            weight: 50,
            quantity: 1,
          },
        ],
        totalWeight: 50,
      }

      const result = await packingEngine.optimizeOrder(order, defaultConfig)

      expect(result.isValid).toBe(false)
      expect(result.rejectionReason).toBeDefined()
      expect(result.rejectionReason).toContain('No suitable box found')
    })

    it('should calculate shipping cost correctly', async () => {
      const order: Order = {
        orderId: 'ORD-005',
        items: [
          {
            itemId: 'ITEM-1',
            length: 10,
            width: 8,
            height: 5,
            weight: 4,
            quantity: 1,
          },
        ],
        totalWeight: 4,
      }

      const result = await packingEngine.optimizeOrder(order, defaultConfig)

      expect(result.isValid).toBe(true)
      expect(result.shippingCost).toBe(result.billableWeight * defaultConfig.shippingRatePerKg)
    })

    it('should handle edge case with very small items', async () => {
      const order: Order = {
        orderId: 'ORD-006',
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

      const result = await packingEngine.optimizeOrder(order, defaultConfig)

      expect(result.isValid).toBe(true)
    })
  })

  describe('optimizeBatch', () => {
    it('should process multiple orders successfully', async () => {
      const orders: Order[] = [
        {
          orderId: 'ORD-001',
          items: [
            {
              itemId: 'ITEM-1',
              length: 10,
              width: 8,
              height: 5,
              weight: 2,
              quantity: 1,
            },
          ],
          totalWeight: 2,
        },
        {
          orderId: 'ORD-002',
          items: [
            {
              itemId: 'ITEM-2',
              length: 12,
              width: 10,
              height: 6,
              weight: 3,
              quantity: 1,
            },
          ],
          totalWeight: 3,
        },
      ]

      const result = await packingEngine.optimizeBatch(orders, defaultConfig)

      expect(result.totalOrders).toBe(2)
      expect(result.successfulPacks).toBe(2)
      expect(result.failedPacks).toBe(0)
      expect(result.totalCost).toBeGreaterThan(0)
      expect(result.averageUtilization).toBeGreaterThan(0)
    })

    it('should continue processing on individual failures', async () => {
      const orders: Order[] = [
        {
          orderId: 'ORD-001',
          items: [
            {
              itemId: 'ITEM-1',
              length: 10,
              width: 8,
              height: 5,
              weight: 2,
              quantity: 1,
            },
          ],
          totalWeight: 2,
        },
        {
          orderId: 'ORD-002',
          items: [
            {
              itemId: 'ITEM-2',
              length: 200,
              width: 150,
              height: 100,
              weight: 100,
              quantity: 1,
            },
          ],
          totalWeight: 100,
        },
        {
          orderId: 'ORD-003',
          items: [
            {
              itemId: 'ITEM-3',
              length: 12,
              width: 10,
              height: 6,
              weight: 3,
              quantity: 1,
            },
          ],
          totalWeight: 3,
        },
      ]

      const result = await packingEngine.optimizeBatch(orders, defaultConfig)

      expect(result.totalOrders).toBe(3)
      expect(result.successfulPacks).toBe(2)
      expect(result.failedPacks).toBe(1)
    })

    it('should calculate aggregate metrics correctly', async () => {
      const orders: Order[] = [
        {
          orderId: 'ORD-001',
          items: [
            {
              itemId: 'ITEM-1',
              length: 10,
              width: 8,
              height: 5,
              weight: 2,
              quantity: 1,
            },
          ],
          totalWeight: 2,
        },
        {
          orderId: 'ORD-002',
          items: [
            {
              itemId: 'ITEM-2',
              length: 12,
              width: 10,
              height: 6,
              weight: 3,
              quantity: 1,
            },
          ],
          totalWeight: 3,
        },
      ]

      const result = await packingEngine.optimizeBatch(orders, defaultConfig)

      expect(result.results.length).toBe(2)
      expect(result.totalCost).toBeGreaterThan(0)
      expect(result.averageUtilization).toBeGreaterThan(0)
      expect(result.averageUtilization).toBeLessThanOrEqual(100)
    })
  })

  describe('validatePacking', () => {
    it('should validate successful packing', async () => {
      const items = [
        {
          itemId: 'ITEM-1',
          length: 10,
          width: 8,
          height: 5,
          weight: 2,
          quantity: 1,
        },
      ]

      const box = {
        id: '1',
        name: 'Test Box',
        length: 20,
        width: 15,
        height: 10,
        volume: 3000,
        maxWeight: 5,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const isValid = packingEngine.validatePacking(items, box, 2)
      expect(isValid).toBe(true)
    })

    it('should invalidate packing when dimensions exceed box', async () => {
      const items = [
        {
          itemId: 'ITEM-1',
          length: 30,
          width: 25,
          height: 20,
          weight: 2,
          quantity: 1,
        },
      ]

      const box = {
        id: '1',
        name: 'Small Box',
        length: 20,
        width: 15,
        height: 10,
        volume: 3000,
        maxWeight: 10,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const isValid = packingEngine.validatePacking(items, box, 2)
      expect(isValid).toBe(false)
    })

    it('should invalidate packing when weight exceeds box capacity', async () => {
      const items = [
        {
          itemId: 'ITEM-1',
          length: 10,
          width: 8,
          height: 5,
          weight: 15,
          quantity: 1,
        },
      ]

      const box = {
        id: '1',
        name: 'Test Box',
        length: 20,
        width: 15,
        height: 10,
        volume: 3000,
        maxWeight: 10,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const isValid = packingEngine.validatePacking(items, box, 2)
      expect(isValid).toBe(false)
    })
  })
})
