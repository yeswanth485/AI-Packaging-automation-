import { PrismaClient } from '@prisma/client'
import {
  SimulationJob,
  SimulationResult,
  JobStatus,
  PackingConfig,
  PackingResult,
  BaselineResult,
  ComparisonMetrics,
  SavingsAnalysis,
} from '../types'
import { CSVParsingService } from './CSVParsingService'
import { PackingEngine } from './PackingEngine'
import { BaselineSimulator } from './BaselineSimulator'

const prisma = new PrismaClient()

export class SimulationService {
  private csvParser: CSVParsingService
  private packingEngine: PackingEngine
  private baselineSimulator: BaselineSimulator

  constructor() {
    this.csvParser = new CSVParsingService()
    this.packingEngine = new PackingEngine()
    this.baselineSimulator = new BaselineSimulator()
  }

  /**
   * Upload CSV file and create simulation job
   */
  async uploadCSV(
    fileBuffer: Buffer,
    fileName: string,
    userId: string
  ): Promise<SimulationJob> {
    return this.csvParser.uploadCSV(fileBuffer, fileName, userId)
  }

  /**
   * Process simulation job
   */
  async processSimulation(
    jobId: string,
    config: PackingConfig
  ): Promise<SimulationResult> {
    // Get job
    const job = await this.csvParser.getSimulationJob(jobId)
    if (!job) {
      throw new Error(`Simulation job ${jobId} not found`)
    }

    if (job.status !== JobStatus.PENDING) {
      throw new Error(
        `Simulation job ${jobId} is not in PENDING status (current: ${job.status})`
      )
    }

    // Update status to PROCESSING
    await prisma.simulationJob.update({
      where: { id: jobId },
      data: { status: JobStatus.PROCESSING },
    })

    try {
      // Get orders for job
      const orders = await this.csvParser.getOrdersForJob(jobId)

      // Process each order
      const optimizedResults: PackingResult[] = []
      const baselineResults: BaselineResult[] = []
      let failedOrders = 0

      for (const order of orders) {
        try {
          // Optimize packing
          const optimizedResult = await this.packingEngine.optimizeOrder(
            order,
            config
          )

          if (optimizedResult.isValid) {
            optimizedResults.push(optimizedResult)

            // Simulate baseline
            const baselineResult = await this.baselineSimulator.simulateBaseline(
              order,
              optimizedResult,
              config
            )
            baselineResults.push(baselineResult)
          } else {
            failedOrders++
          }
        } catch (error) {
          failedOrders++
          console.error(`Failed to process order ${order.orderId}:`, error)
        }
      }

      // Calculate comparison metrics
      const comparison = this.calculateComparison(
        optimizedResults,
        baselineResults,
        orders.length
      )

      // Calculate savings analysis
      const savings = this.calculateSavings(comparison, orders.length)

      // Generate recommendations and anomaly warnings
      const recommendations = this.generateRecommendations(comparison, savings)
      const anomalyWarnings = this.generateAnomalyWarnings(savings)

      // Use transaction to create simulation and update job atomically
      const result = await prisma.$transaction(async (tx: any) => {
      const result = await prisma.$transaction(async (tx: any) => {
        const simulation = await tx.simulation.create({
          data: {
            jobId,
            optimizedTotalCost: comparison.optimizedTotalCost,
            baselineTotalCost: comparison.baselineTotalCost,
            totalSavings: comparison.totalSavings,
            savingsPercentage: comparison.savingsPercentage,
            averageUtilization: comparison.averageUtilizationOptimized,
            monthlySavings: savings.monthlySavings,
            annualSavings: savings.annualSavings,
          },
        })

        // Update job status to COMPLETED
        await tx.simulationJob.update({
          where: { id: jobId },
          data: {
            status: JobStatus.COMPLETED,
            processedOrders: optimizedResults.length,
            completedAt: new Date(),
          },
        })

        return simulation
      })

      return {
        simulationId: result.id,
        jobId,
        optimizedResults,
        baselineResults,
        comparison,
        savings,
        recommendations,
        anomalyWarnings,
      }
    } catch (error) {
      // Update job status to FAILED
      await prisma.simulationJob.update({
        where: { id: jobId },
        data: { status: JobStatus.FAILED },
      })

      throw error
    }
  }

  /**
   * Calculate comparison metrics
   */
  private calculateComparison(
    optimizedResults: PackingResult[],
    baselineResults: BaselineResult[],
    totalOrders: number
  ): ComparisonMetrics {
    const optimizedTotalCost = optimizedResults.reduce(
      (sum, r) => sum + r.shippingCost,
      0
    )
    const baselineTotalCost = baselineResults.reduce(
      (sum, r) => sum + r.shippingCost,
      0
    )
    const totalSavings = baselineTotalCost - optimizedTotalCost
    const savingsPercentage =
      baselineTotalCost > 0 ? (totalSavings / baselineTotalCost) * 100 : 0

    const averageUtilizationOptimized =
      optimizedResults.length > 0
        ? optimizedResults.reduce((sum, r) => sum + r.spaceUtilization, 0) /
          optimizedResults.length
        : 0

    // Calculate average baseline utilization
    const averageUtilizationBaseline =
      baselineResults.length > 0
        ? baselineResults.reduce((sum, r) => {
            // Calculate baseline utilization (items volume / baseline box volume)
            const optimizedResult = optimizedResults.find(
              (o) => o.orderId === r.orderId
            )
            if (optimizedResult) {
              const itemsVolume =
                (optimizedResult.selectedBox.volume *
                  optimizedResult.spaceUtilization) /
                100
              const baselineUtilization =
                (itemsVolume / r.selectedBox.volume) * 100
              return sum + baselineUtilization
            }
            return sum
          }, 0) / baselineResults.length
        : 0

    // Calculate volumetric weight reduction
    const optimizedVolumetricWeight = optimizedResults.reduce(
      (sum, r) => sum + r.volumetricWeight,
      0
    )
    const baselineVolumetricWeight = baselineResults.reduce((sum, r) => {
      // Calculate baseline volumetric weight
      const baselineVW =
        (r.selectedBox.length * r.selectedBox.width * r.selectedBox.height) /
        5000 // Using default divisor
      return sum + baselineVW
    }, 0)
    const volumetricWeightReduction =
      baselineVolumetricWeight > 0
        ? ((baselineVolumetricWeight - optimizedVolumetricWeight) /
            baselineVolumetricWeight) *
          100
        : 0

    return {
      totalOrdersProcessed: optimizedResults.length,
      optimizedTotalCost,
      baselineTotalCost,
      totalSavings,
      savingsPercentage,
      averageUtilizationOptimized,
      averageUtilizationBaseline,
      volumetricWeightReduction,
    }
  }

  /**
   * Calculate savings analysis
   */
  private calculateSavings(
    comparison: ComparisonMetrics,
    totalOrders: number
  ): SavingsAnalysis {
    const perOrderSavings =
      totalOrders > 0 ? comparison.totalSavings / totalOrders : 0

    // Assume 30 days per month for projection
    const monthlySavings = perOrderSavings * totalOrders * 30

    const annualSavings = monthlySavings * 12

    // Check if savings are realistic (5-15% range is typical)
    const isRealistic =
      comparison.savingsPercentage >= 5 && comparison.savingsPercentage <= 25

    // Confidence level based on sample size and savings percentage
    let confidenceLevel = 0.5
    if (totalOrders >= 100) {
      confidenceLevel = 0.8
    } else if (totalOrders >= 50) {
      confidenceLevel = 0.7
    } else if (totalOrders >= 20) {
      confidenceLevel = 0.6
    }

    // Adjust confidence if savings are unrealistic
    if (comparison.savingsPercentage > 25) {
      confidenceLevel *= 0.7
    }

    return {
      perOrderSavings,
      monthlySavings,
      annualSavings,
      isRealistic,
      confidenceLevel,
    }
  }

  /**
   * Generate recommendations based on results
   */
  private generateRecommendations(
    comparison: ComparisonMetrics,
    savings: SavingsAnalysis
  ): string[] {
    const recommendations: string[] = []

    if (comparison.savingsPercentage > 15) {
      recommendations.push(
        'Significant savings potential detected. Consider implementing live optimization API for real-time box selection.'
      )
    }

    if (comparison.averageUtilizationOptimized < 60) {
      recommendations.push(
        'Average space utilization is below 60%. Consider reviewing your box catalog to add more size options.'
      )
    }

    if (comparison.volumetricWeightReduction > 20) {
      recommendations.push(
        'High volumetric weight reduction achieved. Focus on optimizing dimensional weight to maximize carrier cost savings.'
      )
    }

    if (savings.isRealistic) {
      recommendations.push(
        'Savings projections are within realistic range (5-25%). These estimates are reliable for business planning.'
      )
    }

    return recommendations
  }

  /**
   * Generate anomaly warnings
   */
  private generateAnomalyWarnings(savings: SavingsAnalysis): string[] {
    const warnings: string[] = []

    if (savings.savingsPercentage > 25) {
      warnings.push(
        `Warning: Savings percentage (${savings.savingsPercentage.toFixed(1)}%) exceeds typical range. This may indicate data quality issues or extremely inefficient baseline packing.`
      )
    }

    if (!savings.isRealistic) {
      warnings.push(
        'Savings projections fall outside typical range. Please review input data quality and box catalog configuration.'
      )
    }

    return warnings
  }

  /**
   * Get simulation status
   */
  async getSimulationStatus(jobId: string): Promise<SimulationJob | null> {
    return this.csvParser.getSimulationJob(jobId)
  }
}

