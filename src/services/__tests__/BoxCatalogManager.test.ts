import { BoxCatalogManager } from '../BoxCatalogManager'
import { prisma } from '../../config/database'
import { BoxDefinition } from '../../types'

describe('BoxCatalogManager', () => {
  let boxCatalogManager: BoxCatalogManager

  beforeAll(() => {
    boxCatalogManager = new BoxCatalogManager()
  })

  afterEach(async () => {
    // Clean up test data
    await prisma.order.deleteMany()
    await prisma.box.deleteMany()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  describe('addBox', () => {
    it('should create a new box with valid data', async () => {
      const boxDef: BoxDefinition = {
        name: 'Test Box',
        length: 30,
        width: 20,
        height: 15,
        maxWeight: 10,
        isActive: true,
      }

      const box = await boxCatalogManager.addBox(boxDef)

      expect(box.id).toBeDefined()
      expect(box.name).toBe(boxDef.name)
      expect(box.length).toBe(boxDef.length)
      expect(box.width).toBe(boxDef.width)
      expect(box.height).toBe(boxDef.height)
      expect(box.maxWeight).toBe(boxDef.maxWeight)
      expect(box.volume).toBe(30 * 20 * 15)
      expect(box.isActive).toBe(true)
    })

    it('should reject box with negative dimensions', async () => {
      const boxDef: BoxDefinition = {
        name: 'Invalid Box',
        length: -10,
        width: 20,
        height: 15,
        maxWeight: 10,
      }

      await expect(boxCatalogManager.addBox(boxDef)).rejects.toThrow(
        'Box dimensions must be positive numbers'
      )
    })

    it('should reject box with zero dimensions', async () => {
      const boxDef: BoxDefinition = {
        name: 'Invalid Box',
        length: 30,
        width: 0,
        height: 15,
        maxWeight: 10,
      }

      await expect(boxCatalogManager.addBox(boxDef)).rejects.toThrow(
        'Box dimensions must be positive numbers'
      )
    })

    it('should reject box with negative max weight', async () => {
      const boxDef: BoxDefinition = {
        name: 'Invalid Box',
        length: 30,
        width: 20,
        height: 15,
        maxWeight: -5,
      }

      await expect(boxCatalogManager.addBox(boxDef)).rejects.toThrow(
        'Max weight must be a positive number'
      )
    })
  })

  describe('updateBox', () => {
    it('should update box properties', async () => {
      const box = await boxCatalogManager.addBox({
        name: 'Original Box',
        length: 30,
        width: 20,
        height: 15,
        maxWeight: 10,
      })

      const updated = await boxCatalogManager.updateBox(box.id, {
        name: 'Updated Box',
        maxWeight: 15,
      })

      expect(updated.name).toBe('Updated Box')
      expect(updated.maxWeight).toBe(15)
      expect(updated.length).toBe(30) // Unchanged
    })

    it('should recalculate volume when dimensions change', async () => {
      const box = await boxCatalogManager.addBox({
        name: 'Test Box',
        length: 30,
        width: 20,
        height: 15,
        maxWeight: 10,
      })

      const updated = await boxCatalogManager.updateBox(box.id, {
        length: 40,
      })

      expect(updated.volume).toBe(40 * 20 * 15)
    })

    it('should reject invalid dimension updates', async () => {
      const box = await boxCatalogManager.addBox({
        name: 'Test Box',
        length: 30,
        width: 20,
        height: 15,
        maxWeight: 10,
      })

      await expect(
        boxCatalogManager.updateBox(box.id, {
          length: -10,
        })
      ).rejects.toThrow('Length must be a positive number')
    })
  })

  describe('deleteBox', () => {
    it('should soft delete a box by marking it inactive', async () => {
      const box = await boxCatalogManager.addBox({
        name: 'Test Box',
        length: 30,
        width: 20,
        height: 15,
        maxWeight: 10,
      })

      await boxCatalogManager.deleteBox(box.id)

      const deletedBox = await boxCatalogManager.getBox(box.id)
      expect(deletedBox.isActive).toBe(false)
    })
  })

  describe('getAllBoxes', () => {
    it('should return all boxes when activeOnly is false', async () => {
      await boxCatalogManager.addBox({
        name: 'Active Box',
        length: 30,
        width: 20,
        height: 15,
        maxWeight: 10,
        isActive: true,
      })

      await boxCatalogManager.addBox({
        name: 'Inactive Box',
        length: 40,
        width: 30,
        height: 25,
        maxWeight: 15,
        isActive: false,
      })

      const boxes = await boxCatalogManager.getAllBoxes(false)
      expect(boxes.length).toBe(2)
    })

    it('should return only active boxes when activeOnly is true', async () => {
      await boxCatalogManager.addBox({
        name: 'Active Box',
        length: 30,
        width: 20,
        height: 15,
        maxWeight: 10,
        isActive: true,
      })

      await boxCatalogManager.addBox({
        name: 'Inactive Box',
        length: 40,
        width: 30,
        height: 25,
        maxWeight: 15,
        isActive: false,
      })

      const boxes = await boxCatalogManager.getAllBoxes(true)
      expect(boxes.length).toBe(1)
      expect(boxes[0].name).toBe('Active Box')
    })

    it('should return boxes sorted by volume ascending', async () => {
      await boxCatalogManager.addBox({
        name: 'Large Box',
        length: 60,
        width: 50,
        height: 40,
        maxWeight: 30,
      })

      await boxCatalogManager.addBox({
        name: 'Small Box',
        length: 20,
        width: 15,
        height: 10,
        maxWeight: 5,
      })

      await boxCatalogManager.addBox({
        name: 'Medium Box',
        length: 40,
        width: 30,
        height: 25,
        maxWeight: 15,
      })

      const boxes = await boxCatalogManager.getAllBoxes(true)
      expect(boxes[0].name).toBe('Small Box')
      expect(boxes[1].name).toBe('Medium Box')
      expect(boxes[2].name).toBe('Large Box')
    })
  })

  describe('findSuitableBoxes', () => {
    beforeEach(async () => {
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

    it('should find boxes that fit dimensions and weight', async () => {
      const suitableBoxes = await boxCatalogManager.findSuitableBoxes(
        { length: 35, width: 25, height: 20 },
        12
      )

      expect(suitableBoxes.length).toBeGreaterThan(0)
      expect(suitableBoxes[0].name).toBe('Medium')
    })

    it('should return smallest suitable box first', async () => {
      const suitableBoxes = await boxCatalogManager.findSuitableBoxes(
        { length: 15, width: 10, height: 8 },
        3
      )

      expect(suitableBoxes.length).toBeGreaterThan(0)
      expect(suitableBoxes[0].name).toBe('Small')
    })

    it('should return empty array when no box fits', async () => {
      const suitableBoxes = await boxCatalogManager.findSuitableBoxes(
        { length: 100, width: 80, height: 60 },
        50
      )

      expect(suitableBoxes.length).toBe(0)
    })

    it('should exclude boxes that exceed weight limit', async () => {
      const suitableBoxes = await boxCatalogManager.findSuitableBoxes(
        { length: 15, width: 10, height: 8 },
        10 // Exceeds Small box weight limit
      )

      expect(suitableBoxes.length).toBeGreaterThan(0)
      expect(suitableBoxes[0].name).not.toBe('Small')
    })

    it('should handle different orientations', async () => {
      // Items can be rotated, so 10x15x20 should fit in 20x15x10 box
      const suitableBoxes = await boxCatalogManager.findSuitableBoxes(
        { length: 10, width: 15, height: 20 },
        3
      )

      expect(suitableBoxes.length).toBeGreaterThan(0)
      // Should find at least one box that can accommodate when rotated
    })

    it('should only return active boxes', async () => {
      // Add an inactive box that would fit
      await boxCatalogManager.addBox({
        name: 'Inactive Small',
        length: 25,
        width: 18,
        height: 12,
        maxWeight: 8,
        isActive: false,
      })

      const suitableBoxes = await boxCatalogManager.findSuitableBoxes(
        { length: 15, width: 10, height: 8 },
        3
      )

      const hasInactiveBox = suitableBoxes.some((box) => box.name === 'Inactive Small')
      expect(hasInactiveBox).toBe(false)
    })
  })

  describe('getBoxUsageStats', () => {
    it('should return empty array when no orders exist', async () => {
      const stats = await boxCatalogManager.getBoxUsageStats({
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
      })

      expect(stats).toEqual([])
    })

    it('should calculate usage statistics correctly', async () => {
      const box = await boxCatalogManager.addBox({
        name: 'Test Box',
        length: 30,
        width: 20,
        height: 15,
        maxWeight: 10,
      })

      // Create mock orders (would normally be created by packing engine)
      await prisma.order.create({
        data: {
          orderId: 'ORD-001',
          userId: 'user-1',
          selectedBoxId: box.id,
          totalWeight: 5,
          volumetricWeight: 1.8,
          billableWeight: 5,
          shippingCost: 2.5,
          spaceUtilization: 75,
          isOptimized: true,
        },
      })

      await prisma.order.create({
        data: {
          orderId: 'ORD-002',
          userId: 'user-1',
          selectedBoxId: box.id,
          totalWeight: 6,
          volumetricWeight: 1.8,
          billableWeight: 6,
          shippingCost: 3.0,
          spaceUtilization: 85,
          isOptimized: true,
        },
      })

      const stats = await boxCatalogManager.getBoxUsageStats({
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
      })

      expect(stats.length).toBe(1)
      expect(stats[0].boxId).toBe(box.id)
      expect(stats[0].usageCount).toBe(2)
      expect(stats[0].averageUtilization).toBe(80) // (75 + 85) / 2
    })
  })
})
