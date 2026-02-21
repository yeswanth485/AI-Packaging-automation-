import { BaselineResult, Box, Order, PackingConfig, PackingResult } from '../types'
import { BoxCatalogManager } from './BoxCatalogManager'
import { PackingEngine } from './PackingEngine'

/**
 * BaselineSimulator simulates manual oversized packing for comparison with optimized results.
 * Uses "next larger box" strategy to represent realistic manual packing behavior.
 */
export class BaselineSimulator {
  constructor(
    private boxCatalogManager: BoxCatalogManager,
    private packingEngine: PackingEngine
  ) {}

  /**
   * Simulate baseline (manual) packing for an order
   * Selects next larger box than optimized result to represent manual oversized packing
   * 
   * @param order - The order being packed
   * @param optimizedResult - The optimized packing result to compare against
   * @param config - Packing configuration for weight and cost calculations
   * @returns BaselineResult with larger box and associated costs
   */
  async simulateBaselinePacking(
    order: Order,
    optimizedResult: PackingResult,
    config: PackingConfig
  ): Promise<BaselineResult> {
    // Validate preconditions
    if (!optimizedResult.isValid) {
      throw new Error('Cannot simulate baseline for invalid optimized result')
    }

    const optimizedBox = optimizedResult.selectedBox

    // Get all active boxes sorted by volume ascending
    const allBoxes = await this.boxCatalogManager.getAllBoxes(true)

    if (allBoxes.length === 0) {
      throw new Error('No active boxes available in catalog')
    }

    // Find the position of the optimized box in the sorted list
    const optimizedIndex = allBoxes.findIndex((box) => box.id === optimizedBox.id)

    if (optimizedIndex === -1) {
      throw new Error('Optimized box not found in active catalog')
    }

    // Select next larger box (baseline strategy)
    let baselineBox: Box
    if (optimizedIndex < allBoxes.length - 1) {
      // Use next larger box
      baselineBox = allBoxes[optimizedIndex + 1]
    } else {
      // Already using largest box, use same box
      baselineBox = optimizedBox
    }

    // Calculate baseline costs using the larger box
    const baselineVolumetricWeight = this.packingEngine.calculateVolumetricWeight(
      baselineBox,
      config.volumetricDivisor
    )

    const baselineBillableWeight = this.packingEngine.calculateBillableWeight(
      optimizedResult.totalWeight,
      baselineVolumetricWeight
    )

    const baselineShippingCost = baselineBillableWeight * config.shippingRatePerKg

    // Validate postconditions
    if (baselineBox.volume < optimizedBox.volume) {
      throw new Error('Baseline box volume must be >= optimized box volume')
    }

    if (baselineBox.id !== optimizedBox.id && baselineShippingCost < optimizedResult.shippingCost) {
      throw new Error('Baseline shipping cost must be >= optimized shipping cost')
    }

    return {
      orderId: order.orderId,
      selectedBox: baselineBox,
      shippingCost: baselineShippingCost,
      billableWeight: baselineBillableWeight,
    }
  }
}
