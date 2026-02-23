import { prisma } from '../config/database'
import { Box, BoxDefinition, BoxUsageStats, DateRange, Dimensions } from '../types'
import { cacheService } from './CacheService'

export class BoxCatalogManager {
  /**
   * Add a new box to the catalog
   * Validates dimensions and weight, calculates volume automatically
   */
  async addBox(boxDef: BoxDefinition): Promise<Box> {
    // Validate dimensions are positive
    if (boxDef.length <= 0 || boxDef.width <= 0 || boxDef.height <= 0) {
      throw new Error('Box dimensions must be positive numbers')
    }

    // Validate max weight is positive
    if (boxDef.maxWeight <= 0) {
      throw new Error('Max weight must be a positive number')
    }

    // Calculate volume
    const volume = boxDef.length * boxDef.width * boxDef.height

    // Create box in database
    const box = await prisma.box.create({
      data: {
        name: boxDef.name,
        length: boxDef.length,
        width: boxDef.width,
        height: boxDef.height,
        volume,
        maxWeight: boxDef.maxWeight,
        isActive: boxDef.isActive ?? true,
      },
    })

    // Invalidate box catalog cache
    await cacheService.invalidateBoxCatalog()

    return this.mapToBox(box)
  }

  /**
   * Update an existing box
   * Uses optimistic locking via updatedAt timestamp
   */
  async updateBox(boxId: string, updates: Partial<BoxDefinition>): Promise<Box> {
    // Validate dimensions if provided
    if (updates.length !== undefined && updates.length <= 0) {
      throw new Error('Length must be a positive number')
    }
    if (updates.width !== undefined && updates.width <= 0) {
      throw new Error('Width must be a positive number')
    }
    if (updates.height !== undefined && updates.height <= 0) {
      throw new Error('Height must be a positive number')
    }
    if (updates.maxWeight !== undefined && updates.maxWeight <= 0) {
      throw new Error('Max weight must be a positive number')
    }

    // Get current box to calculate new volume if dimensions change
    const currentBox = await prisma.box.findUnique({
      where: { id: boxId },
    })

    if (!currentBox) {
      throw new Error(`Box with ID ${boxId} not found`)
    }

    // Calculate new volume if any dimension changes
    const length = updates.length ?? currentBox.length
    const width = updates.width ?? currentBox.width
    const height = updates.height ?? currentBox.height
    const volume = length * width * height

    // Update box
    const updatedBox = await prisma.box.update({
      where: { id: boxId },
      data: {
        ...updates,
        volume,
        updatedAt: new Date(),
      },
    })

    // Invalidate box catalog cache
    await cacheService.invalidateBoxCatalog()

    return this.mapToBox(updatedBox)
  }

  /**
   * Soft delete a box by marking it inactive
   * Preserves historical data integrity
   */
  async deleteBox(boxId: string): Promise<void> {
    await prisma.box.update({
      where: { id: boxId },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    })

    // Invalidate box catalog cache
    await cacheService.invalidateBoxCatalog()
  }

  /**
   * Get a single box by ID
   */
  async getBox(boxId: string): Promise<Box> {
    const box = await prisma.box.findUnique({
      where: { id: boxId },
    })

    if (!box) {
      throw new Error(`Box with ID ${boxId} not found`)
    }

    return this.mapToBox(box)
  }

  /**
   * Get all boxes, optionally filtered by active status
   */
  async getAllBoxes(activeOnly: boolean = false): Promise<Box[]> {
    // Try to get from cache first
    const cached = await cacheService.getBoxCatalog(activeOnly)
    if (cached) {
      return cached
    }

    // Fetch from database
    const boxes = await prisma.box.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { volume: 'asc' }, // Sort by volume ascending
    })

    const result = boxes.map((box: any) => this.mapToBox(box))

    // Cache the result
    await cacheService.setBoxCatalog(activeOnly, result)

    return result
  }

  /**
   * Find suitable boxes for given dimensions and weight
   * Returns boxes sorted by volume ascending (smallest first)
   */
  async findSuitableBoxes(dimensions: Dimensions, weight: number): Promise<Box[]> {
    // Validate inputs
    if (dimensions.length <= 0 || dimensions.width <= 0 || dimensions.height <= 0) {
      throw new Error('Dimensions must be positive numbers')
    }
    if (weight < 0) {
      throw new Error('Weight must be non-negative')
    }

    // Create cache key from dimensions and weight
    const dimensionsKey = `${dimensions.length}x${dimensions.width}x${dimensions.height}`
    
    // Try to get from cache first
    const cached = await cacheService.getSuitableBoxes(dimensionsKey, weight)
    if (cached) {
      return cached
    }

    // Get all active boxes
    const allBoxes = await this.getAllBoxes(true)

    // Filter boxes that can accommodate dimensions and weight
    const suitableBoxes = allBoxes.filter((box) => {
      // Check weight constraint
      if (box.maxWeight < weight) {
        return false
      }

      // Check dimension constraints (considering all orientations)
      return this.checkDimensionFit(box, dimensions)
    })

    // Cache the result
    await cacheService.setSuitableBoxes(dimensionsKey, weight, suitableBoxes)

    // Already sorted by volume ascending from getAllBoxes
    return suitableBoxes
  }

  /**
   * Get box usage statistics for a date range
   */
  async getBoxUsageStats(dateRange: DateRange): Promise<BoxUsageStats[]> {
    // Create cache key from date range
    const dateRangeKey = `${dateRange.startDate.toISOString()}_${dateRange.endDate.toISOString()}`
    
    // Try to get from cache first
    const cached = await cacheService.getBoxStats(dateRangeKey)
    if (cached) {
      return cached
    }

    // Query orders within date range and aggregate by box
    const stats = await prisma.order.groupBy({
      by: ['selectedBoxId'],
      where: {
        createdAt: {
          gte: dateRange.startDate,
          lte: dateRange.endDate,
        },
        selectedBoxId: {
          not: null,
        },
      },
      _count: {
        id: true,
      },
      _avg: {
        spaceUtilization: true,
      },
    })

    // Fetch box details and calculate statistics
    const boxUsageStats: BoxUsageStats[] = []

    for (const stat of stats) {
      if (!stat.selectedBoxId) continue

      const box = await prisma.box.findUnique({
        where: { id: stat.selectedBoxId },
      })

      if (!box) continue

      // Calculate total and wasted volume
      const avgUtilization = stat._avg.spaceUtilization ?? 0
      const totalVolume = box.volume * stat._count.id
      const wastedVolume = totalVolume * (1 - avgUtilization / 100)

      boxUsageStats.push({
        boxId: box.id,
        boxName: box.name,
        usageCount: stat._count.id,
        averageUtilization: avgUtilization,
        totalVolume,
        wastedVolume,
      })
    }

    // Cache the result
    await cacheService.setBoxStats(dateRangeKey, boxUsageStats)

    return boxUsageStats
  }

  /**
   * Toggle box active status
   */
  async toggleBoxStatus(boxId: string, isActive: boolean): Promise<Box> {
    const updatedBox = await prisma.box.update({
      where: { id: boxId },
      data: {
        isActive,
        updatedAt: new Date(),
      },
    })

    // Invalidate box catalog cache
    await cacheService.invalidateBoxCatalog()

    return this.mapToBox(updatedBox)
  }

  /**
   * Check if required dimensions fit in box (considering all orientations)
   */
  private checkDimensionFit(box: Box, requiredDimensions: Dimensions): boolean {
    // Sort both box and required dimensions in descending order
    const boxDims = [box.length, box.width, box.height].sort((a: number, b: number) => b - a)
    const reqDims = [requiredDimensions.length, requiredDimensions.width, requiredDimensions.height].sort(
      (a: number, b: number) => b - a
    )

    // Check if each required dimension fits in corresponding box dimension
    return boxDims[0] >= reqDims[0] && boxDims[1] >= reqDims[1] && boxDims[2] >= reqDims[2]
  }

  /**
   * Map Prisma box model to Box type
   */
  private mapToBox(prismaBox: any): Box {
    return {
      id: prismaBox.id,
      name: prismaBox.name,
      length: prismaBox.length,
      width: prismaBox.width,
      height: prismaBox.height,
      volume: prismaBox.volume,
      maxWeight: prismaBox.maxWeight,
      isActive: prismaBox.isActive,
      createdAt: prismaBox.createdAt,
      updatedAt: prismaBox.updatedAt,
    }
  }
}
