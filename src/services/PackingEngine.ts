import { BoxCatalogManager } from './BoxCatalogManager'
import {
  Order,
  Item,
  PackingConfig,
  PackingResult,
  BatchPackingResult,
  Dimensions,
  Box,
} from '../types'

export class PackingEngine {
  private boxCatalogManager: BoxCatalogManager

  constructor(boxCatalogManager: BoxCatalogManager) {
    this.boxCatalogManager = boxCatalogManager
  }

  /**
   * Calculate total dimensions for items with buffer padding
   * Assumes vertical stacking strategy
   */
  calculateTotalDimensions(items: Item[], bufferPadding: number): Dimensions {
    if (items.length === 0) {
      throw new Error('Items array cannot be empty')
    }

    if (bufferPadding < 0) {
      throw new Error('Buffer padding must be non-negative')
    }

    // Expand items by quantity
    const expandedItems: Item[] = []
    for (const item of items) {
      for (let i = 0; i < item.quantity; i++) {
        expandedItems.push(item)
      }
    }

    // Sort items by volume descending (largest first)
    expandedItems.sort((a, b) => {
      const volumeA = a.length * a.width * a.height
      const volumeB = b.length * b.width * b.height
      return volumeB - volumeA
    })

    // Calculate max length and width (items stacked vertically)
    let maxLength = 0
    let maxWidth = 0
    let totalHeight = 0

    for (const item of expandedItems) {
      maxLength = Math.max(maxLength, item.length)
      maxWidth = Math.max(maxWidth, item.width)
      totalHeight += item.height
    }

    // Add buffer padding on all sides (2 × padding per dimension)
    const finalLength = maxLength + 2 * bufferPadding
    const finalWidth = maxWidth + 2 * bufferPadding
    const finalHeight = totalHeight + 2 * bufferPadding

    return {
      length: finalLength,
      width: finalWidth,
      height: finalHeight,
    }
  }

  /**
   * Calculate volumetric weight using formula: (L × W × H) / divisor
   */
  calculateVolumetricWeight(box: Box, volumetricDivisor: number): number {
    if (volumetricDivisor <= 0) {
      throw new Error('Volumetric divisor must be positive')
    }

    if (box.length <= 0 || box.width <= 0 || box.height <= 0) {
      throw new Error('Box dimensions must be positive')
    }

    const volume = box.length * box.width * box.height
    const volumetricWeight = volume / volumetricDivisor

    return volumetricWeight
  }

  /**
   * Calculate billable weight as max(actual weight, volumetric weight)
   */
  calculateBillableWeight(actualWeight: number, volumetricWeight: number): number {
    if (actualWeight < 0) {
      throw new Error('Actual weight must be non-negative')
    }

    if (volumetricWeight <= 0) {
      throw new Error('Volumetric weight must be positive')
    }

    const billableWeight = Math.max(actualWeight, volumetricWeight)

    return billableWeight
  }

  /**
   * Main packing optimization algorithm
   * Selects optimal box for order using best-fit algorithm
   */
  async optimizeOrder(order: Order, config: PackingConfig): Promise<PackingResult> {
    // Validate preconditions
    if (!order || !order.items || order.items.length === 0) {
      throw new Error('Order must have at least one item')
    }

    if (config.bufferPadding < 0) {
      throw new Error('Buffer padding must be non-negative')
    }

    if (config.volumetricDivisor <= 0) {
      throw new Error('Volumetric divisor must be positive')
    }

    if (config.shippingRatePerKg <= 0) {
      throw new Error('Shipping rate must be positive')
    }

    // Validate all items have positive dimensions and quantity
    for (const item of order.items) {
      if (item.length <= 0 || item.width <= 0 || item.height <= 0) {
        throw new Error('All items must have positive dimensions')
      }
      if (item.weight < 0) {
        throw new Error('Item weight must be non-negative')
      }
      if (item.quantity <= 0) {
        throw new Error('Item quantity must be positive')
      }
    }

    try {
      // Step 1: Calculate total dimensions with buffer
      const totalDimensions = this.calculateTotalDimensions(order.items, config.bufferPadding)

      // Step 2: Calculate total weight
      let totalWeight = 0
      for (const item of order.items) {
        totalWeight += item.weight * item.quantity
      }

      // Step 3: Find suitable boxes from catalog
      const suitableBoxes = await this.boxCatalogManager.findSuitableBoxes(
        totalDimensions,
        totalWeight
      )

      // Step 4: Check if any suitable box found
      if (suitableBoxes.length === 0) {
        return {
          orderId: order.orderId,
          selectedBox: {} as Box,
          totalDimensions,
          totalWeight,
          volumetricWeight: 0,
          billableWeight: 0,
          shippingCost: 0,
          spaceUtilization: 0,
          wastedVolume: 0,
          isValid: false,
          rejectionReason: `No suitable box found for dimensions ${totalDimensions.length}x${totalDimensions.width}x${totalDimensions.height} and weight ${totalWeight}kg`,
        }
      }

      // Step 5: Select smallest suitable box (first in sorted list)
      const selectedBox = suitableBoxes[0]

      // Step 6: Calculate volumetric weight
      const volumetricWeight = this.calculateVolumetricWeight(selectedBox, config.volumetricDivisor)

      // Step 7: Calculate billable weight
      const billableWeight = this.calculateBillableWeight(totalWeight, volumetricWeight)

      // Step 8: Calculate shipping cost
      const shippingCost = billableWeight * config.shippingRatePerKg

      // Step 9: Calculate space utilization
      const expandedItems: Item[] = []
      for (const item of order.items) {
        for (let i = 0; i < item.quantity; i++) {
          expandedItems.push(item)
        }
      }

      let itemsVolume = 0
      for (const item of expandedItems) {
        itemsVolume += item.length * item.width * item.height
      }

      const spaceUtilization = (itemsVolume / selectedBox.volume) * 100
      const wastedVolume = selectedBox.volume - itemsVolume

      // Step 10: Validate constraints
      if (spaceUtilization > 100) {
        return {
          orderId: order.orderId,
          selectedBox,
          totalDimensions,
          totalWeight,
          volumetricWeight,
          billableWeight,
          shippingCost,
          spaceUtilization,
          wastedVolume,
          isValid: false,
          rejectionReason: 'Space utilization exceeds 100%',
        }
      }

      if (totalWeight > selectedBox.maxWeight) {
        return {
          orderId: order.orderId,
          selectedBox,
          totalDimensions,
          totalWeight,
          volumetricWeight,
          billableWeight,
          shippingCost,
          spaceUtilization,
          wastedVolume,
          isValid: false,
          rejectionReason: `Total weight ${totalWeight}kg exceeds box max weight ${selectedBox.maxWeight}kg`,
        }
      }

      // Return valid packing result
      return {
        orderId: order.orderId,
        selectedBox,
        totalDimensions,
        totalWeight,
        volumetricWeight,
        billableWeight,
        shippingCost,
        spaceUtilization,
        wastedVolume,
        isValid: true,
      }
    } catch (error) {
      // Handle any unexpected errors
      return {
        orderId: order.orderId,
        selectedBox: {} as Box,
        totalDimensions: { length: 0, width: 0, height: 0 },
        totalWeight: 0,
        volumetricWeight: 0,
        billableWeight: 0,
        shippingCost: 0,
        spaceUtilization: 0,
        wastedVolume: 0,
        isValid: false,
        rejectionReason: error instanceof Error ? error.message : 'Unknown error occurred',
      }
    }
  }

  /**
   * Optimize multiple orders in a batch
   * Processes each order independently and aggregates results
   */
  async optimizeBatch(orders: Order[], config: PackingConfig): Promise<BatchPackingResult> {
    const results: PackingResult[] = []
    let successfulPacks = 0
    let failedPacks = 0
    let totalCost = 0
    let totalUtilization = 0

    for (const order of orders) {
      try {
        const result = await this.optimizeOrder(order, config)
        results.push(result)

        if (result.isValid) {
          successfulPacks++
          totalCost += result.shippingCost
          totalUtilization += result.spaceUtilization
        } else {
          failedPacks++
        }
      } catch (error) {
        // Continue processing remaining orders on failure
        failedPacks++
        results.push({
          orderId: order.orderId,
          selectedBox: {} as Box,
          totalDimensions: { length: 0, width: 0, height: 0 },
          totalWeight: 0,
          volumetricWeight: 0,
          billableWeight: 0,
          shippingCost: 0,
          spaceUtilization: 0,
          wastedVolume: 0,
          isValid: false,
          rejectionReason: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    const averageUtilization = successfulPacks > 0 ? totalUtilization / successfulPacks : 0

    return {
      results,
      totalOrders: orders.length,
      successfulPacks,
      failedPacks,
      totalCost,
      averageUtilization,
    }
  }

  /**
   * Validate packing result against constraints
   */
  validatePacking(items: Item[], box: Box, buffer: number): boolean {
    try {
      const totalDimensions = this.calculateTotalDimensions(items, buffer)

      // Check dimension constraints
      const boxDims = [box.length, box.width, box.height].sort((a, b) => b - a)
      const reqDims = [totalDimensions.length, totalDimensions.width, totalDimensions.height].sort(
        (a, b) => b - a
      )

      const dimensionsFit = boxDims[0] >= reqDims[0] && boxDims[1] >= reqDims[1] && boxDims[2] >= reqDims[2]

      // Check weight constraint
      let totalWeight = 0
      for (const item of items) {
        totalWeight += item.weight * item.quantity
      }

      const weightFits = box.maxWeight >= totalWeight

      return dimensionsFit && weightFits
    } catch (error) {
      return false
    }
  }
}
