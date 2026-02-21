import { PrismaClient } from '@prisma/client'
import {
  DashboardKPIs,
  DateRange,
  TimeGranularity,
  CostTrendData,
  CostDataPoint,
  TrendDirection,
  BoxUsageData,
  HeatmapData,
  HeatmapCell,
  WeightDistributionData,
  WeightBucket,
  ForecastData,
  ForecastPeriod,
} from '../types'

/**
 * AnalyticsService - Provides comprehensive analytics, KPIs, and forecasting
 * Requirements: 12.1-17.8
 */
export class AnalyticsService {
  private prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  /**
   * Calculate dashboard KPIs for a user
   * Requirements: 12.1-12.12
   */
  async getDashboardKPIs(userId: string, dateRange: DateRange): Promise<DashboardKPIs> {
    // Get all optimization records in date range
    const optimizations = await this.prisma.order.findMany({
      where: {
        userId,
        createdAt: {
          gte: dateRange.startDate,
          lte: dateRange.endDate,
        },
      },
      include: {
        box: true,
      },
    })

    if (optimizations.length === 0) {
      return this.getEmptyKPIs()
    }

    // Requirement 12.1: Total orders processed
    const totalOrdersProcessed = optimizations.length

    // Requirement 12.2: Total manual (baseline) shipping cost
    const manualShippingCost = optimizations.reduce(
      (sum: number, opt: any) => sum + (opt.baselineShippingCost || 0),
      0
    )

    // Requirement 12.3: Total optimized shipping cost
    const optimizedShippingCost = optimizations.reduce((sum: number, opt: any) => sum + opt.shippingCost, 0)

    // Requirement 12.4: Total savings and savings percentage
    const totalSavings = manualShippingCost - optimizedShippingCost
    const savingsPercentage = manualShippingCost > 0 ? (totalSavings / manualShippingCost) * 100 : 0

    // Requirement 12.5: Average volumetric weight reduction
    const avgVolumetricWeightReduction = this.calculateAvgVolumetricWeightReduction(optimizations)

    // Requirement 12.6: Average space utilization
    const avgSpaceUtilization =
      optimizations.reduce((sum: number, opt: any) => sum + opt.spaceUtilization, 0) / optimizations.length

    // Requirement 12.7: Most used box size
    const mostUsedBoxSize = this.findMostUsedBox(optimizations)

    // Requirement 12.8: Most inefficient box size
    const mostInefficientBoxSize = this.findMostInefficientBox(optimizations)

    // Requirement 12.9, 12.10: Monthly and annual savings projections
    const daysInRange = this.getDaysInRange(dateRange)
    const dailyAvgSavings = totalSavings / daysInRange
    const monthlySavingsProjection = dailyAvgSavings * 30
    const annualSavingsProjection = monthlySavingsProjection * 12

    return {
      totalOrdersProcessed,
      manualShippingCost,
      optimizedShippingCost,
      totalSavings,
      savingsPercentage,
      avgVolumetricWeightReduction,
      avgSpaceUtilization,
      mostUsedBoxSize,
      mostInefficientBoxSize,
      monthlySavingsProjection,
      annualSavingsProjection,
    }
  }

  /**
   * Get cost trend analysis over time
   * Requirements: 13.1-13.9
   */
  async getCostTrend(
    userId: string,
    dateRange: DateRange,
    granularity: TimeGranularity
  ): Promise<CostTrendData> {
    const optimizations = await this.prisma.order.findMany({
      where: {
        userId,
        createdAt: {
          gte: dateRange.startDate,
          lte: dateRange.endDate,
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    // Requirement 13.1, 13.2: Aggregate by time granularity
    const dataPoints = this.aggregateByGranularity(optimizations, granularity)

    // Requirement 13.6: Determine trend direction
    const trend = this.determineTrend(dataPoints)

    return {
      dataPoints,
      trend,
    }
  }

  /**
   * Get box usage distribution
   * Requirements: 14.1-14.7
   */
  async getBoxUsageDistribution(userId: string, dateRange: DateRange): Promise<BoxUsageData[]> {
    const optimizations = await this.prisma.order.findMany({
      where: {
        userId,
        createdAt: {
          gte: dateRange.startDate,
          lte: dateRange.endDate,
        },
      },
      include: {
        box: true,
      },
    })

    // Requirement 14.1: Aggregate usage by box ID
    const usageMap = new Map<string, { box: any; count: number; totalUtilization: number }>()

    optimizations.forEach((opt: any) => {
      const boxId = opt.boxId
      if (!usageMap.has(boxId)) {
        usageMap.set(boxId, {
          box: opt.box,
          count: 0,
          totalUtilization: 0,
        })
      }
      const data = usageMap.get(boxId)!
      data.count++
      data.totalUtilization += opt.spaceUtilization
    })

    const total = optimizations.length
    const usageData: BoxUsageData[] = []

    usageMap.forEach((data, boxId) => {
      usageData.push({
        boxId,
        boxName: data.box.name,
        usageCount: data.count,
        percentage: (data.count / total) * 100,
        averageUtilization: data.totalUtilization / data.count,
      })
    })

    // Requirement 14.5: Sort by usage count descending
    return usageData.sort((a, b) => b.usageCount - a.usageCount)
  }

  /**
   * Get space waste heatmap
   * Requirements: 15.1-15.6
   */
  async getSpaceWasteHeatmap(userId: string, dateRange: DateRange): Promise<HeatmapData> {
    const optimizations = await this.prisma.order.findMany({
      where: {
        userId,
        createdAt: {
          gte: dateRange.startDate,
          lte: dateRange.endDate,
        },
      },
      include: {
        box: true,
      },
    })

    // Requirement 15.1: Aggregate wasted volume by box and time period
    const matrix: HeatmapCell[][] = []
    const periods = this.createTimePeriods(dateRange, TimeGranularity.WEEKLY)
    const boxIds = [...new Set(optimizations.map((opt: any) => opt.boxId))]

    let maxWaste = 0
    let minWaste = 100

    boxIds.forEach((boxId) => {
      const row: HeatmapCell[] = []

      periods.forEach((period) => {
        const periodOpts = optimizations.filter(
          (opt: any) =>
            opt.boxId === boxId &&
            opt.createdAt >= period.start &&
            opt.createdAt <= period.end
        )

        if (periodOpts.length > 0) {
          const avgWaste =
            periodOpts.reduce((sum: number, opt: any) => sum + (100 - opt.spaceUtilization), 0) /
            periodOpts.length

          maxWaste = Math.max(maxWaste, avgWaste)
          minWaste = Math.min(minWaste, avgWaste)

          row.push({
            boxId,
            dateRange: `${period.start.toISOString().split('T')[0]} - ${period.end.toISOString().split('T')[0]}`,
            wastePercentage: avgWaste,
            orderCount: periodOpts.length,
          })
        } else {
          row.push({
            boxId,
            dateRange: `${period.start.toISOString().split('T')[0]} - ${period.end.toISOString().split('T')[0]}`,
            wastePercentage: 0,
            orderCount: 0,
          })
        }
      })

      matrix.push(row)
    })

    return {
      matrix,
      maxWaste,
      minWaste,
    }
  }

  /**
   * Get weight distribution analysis
   * Requirements: 16.1-16.7
   */
  async getWeightDistribution(
    userId: string,
    dateRange: DateRange
  ): Promise<WeightDistributionData> {
    const optimizations = await this.prisma.order.findMany({
      where: {
        userId,
        createdAt: {
          gte: dateRange.startDate,
          lte: dateRange.endDate,
        },
      },
    })

    // Requirement 16.1, 16.2, 16.3: Create buckets for different weight types
    const actualWeights = optimizations.map((opt: any) => opt.totalWeight)
    const volumetricWeights = optimizations.map((opt: any) => opt.volumetricWeight)
    const billableWeights = optimizations.map((opt: any) => opt.billableWeight)

    return {
      actualWeightBuckets: this.createWeightBuckets(actualWeights),
      volumetricWeightBuckets: this.createWeightBuckets(volumetricWeights),
      billableWeightBuckets: this.createWeightBuckets(billableWeights),
    }
  }

  /**
   * Forecast packaging demand
   * Requirements: 17.1-17.8
   */
  async forecastPackagingDemand(userId: string, forecastMonths: number): Promise<ForecastData> {
    // Requirement 17.8: Require minimum historical data
    const minHistoricalMonths = 3
    const historicalStartDate = new Date()
    historicalStartDate.setMonth(historicalStartDate.getMonth() - minHistoricalMonths)

    const historicalData = await this.prisma.order.findMany({
      where: {
        userId,
        createdAt: {
          gte: historicalStartDate,
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    if (historicalData.length < 30) {
      throw new Error('Insufficient historical data for forecasting (minimum 30 orders required)')
    }

    // Requirement 17.1: Analyze historical order patterns
    const monthlyStats = this.aggregateMonthlyStats(historicalData)

    // Requirement 17.2, 17.3, 17.4, 17.5: Generate predictions using simple linear regression
    const forecastPeriods: ForecastPeriod[] = []
    const avgMonthlyOrders =
      monthlyStats.reduce((sum, stat) => sum + stat.orders, 0) / monthlyStats.length
    const avgMonthlyCost =
      monthlyStats.reduce((sum, stat) => sum + stat.cost, 0) / monthlyStats.length
    const avgMonthlySavings =
      monthlyStats.reduce((sum, stat) => sum + stat.savings, 0) / monthlyStats.length

    // Simple trend calculation
    const trend = this.calculateTrend(monthlyStats)

    for (let i = 1; i <= forecastMonths; i++) {
      const month = new Date()
      month.setMonth(month.getMonth() + i)

      forecastPeriods.push({
        month: month.toISOString().substring(0, 7), // YYYY-MM format
        predictedOrders: Math.round(avgMonthlyOrders * (1 + trend * i)),
        predictedCost: avgMonthlyCost * (1 + trend * i),
        predictedSavings: avgMonthlySavings * (1 + trend * i),
      })
    }

    // Requirement 17.6: Calculate confidence level
    const confidence = this.calculateForecastConfidence(monthlyStats)

    return {
      forecastPeriods,
      confidence,
      methodology: 'Linear regression based on historical monthly averages with trend adjustment',
    }
  }

  // Helper methods

  private getEmptyKPIs(): DashboardKPIs {
    return {
      totalOrdersProcessed: 0,
      manualShippingCost: 0,
      optimizedShippingCost: 0,
      totalSavings: 0,
      savingsPercentage: 0,
      avgVolumetricWeightReduction: 0,
      avgSpaceUtilization: 0,
      mostUsedBoxSize: 'N/A',
      mostInefficientBoxSize: 'N/A',
      monthlySavingsProjection: 0,
      annualSavingsProjection: 0,
    }
  }

  private calculateAvgVolumetricWeightReduction(optimizations: any[]): number {
    if (optimizations.length === 0) return 0

    const reductions = optimizations
      .filter((opt: any) => opt.baselineVolumetricWeight && opt.volumetricWeight)
      .map((opt: any) => {
        const reduction =
          ((opt.baselineVolumetricWeight - opt.volumetricWeight) / opt.baselineVolumetricWeight) *
          100
        return reduction
      })

    return reductions.length > 0
      ? reductions.reduce((sum, r) => sum + r, 0) / reductions.length
      : 0
  }

  private findMostUsedBox(optimizations: any[]): string {
    const boxCounts = new Map<string, number>()

    optimizations.forEach((opt: any) => {
      const boxName = opt.box?.name || 'Unknown'
      boxCounts.set(boxName, (boxCounts.get(boxName) || 0) + 1)
    })

    let maxCount = 0
    let mostUsed = 'N/A'

    boxCounts.forEach((count, boxName) => {
      if (count > maxCount) {
        maxCount = count
        mostUsed = boxName
      }
    })

    return mostUsed
  }

  private findMostInefficientBox(optimizations: any[]): string {
    const boxWaste = new Map<string, { totalWaste: number; count: number }>()

    optimizations.forEach((opt: any) => {
      const boxName = opt.box?.name || 'Unknown'
      const waste = 100 - opt.spaceUtilization

      if (!boxWaste.has(boxName)) {
        boxWaste.set(boxName, { totalWaste: 0, count: 0 })
      }

      const data = boxWaste.get(boxName)!
      data.totalWaste += waste
      data.count++
    })

    let maxAvgWaste = 0
    let mostInefficient = 'N/A'

    boxWaste.forEach((data, boxName) => {
      const avgWaste = data.totalWaste / data.count
      if (avgWaste > maxAvgWaste) {
        maxAvgWaste = avgWaste
        mostInefficient = boxName
      }
    })

    return mostInefficient
  }

  private getDaysInRange(dateRange: DateRange): number {
    const diff = dateRange.endDate.getTime() - dateRange.startDate.getTime()
    return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  }

  private aggregateByGranularity(
    optimizations: any[],
    granularity: TimeGranularity
  ): CostDataPoint[] {
    const dataPoints: CostDataPoint[] = []
    const groups = this.groupByGranularity(optimizations, granularity)

    groups.forEach((opts, timestamp) => {
      const manualCost = opts.reduce((sum: number, opt: any) => sum + (opt.baselineShippingCost || 0), 0)
      const optimizedCost = opts.reduce((sum: number, opt: any) => sum + opt.shippingCost, 0)
      const savings = manualCost - optimizedCost

      dataPoints.push({
        timestamp,
        manualCost,
        optimizedCost,
        savings,
      })
    })

    return dataPoints.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
  }

  private groupByGranularity(
    optimizations: any[],
    granularity: TimeGranularity
  ): Map<Date, any[]> {
    const groups = new Map<string, any[]>()

    optimizations.forEach((opt: any) => {
      const key = this.getGranularityKey(opt.createdAt, granularity)
      if (!groups.has(key)) {
        groups.set(key, [])
      }
      groups.get(key)!.push(opt)
    })

    const result = new Map<Date, any[]>()
    groups.forEach((opts, key) => {
      result.set(new Date(key), opts)
    })

    return result
  }

  private getGranularityKey(date: Date, granularity: TimeGranularity): string {
    switch (granularity) {
      case TimeGranularity.DAILY:
        return date.toISOString().split('T')[0]
      case TimeGranularity.WEEKLY:
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - date.getDay())
        return weekStart.toISOString().split('T')[0]
      case TimeGranularity.MONTHLY:
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      default:
        return date.toISOString().split('T')[0]
    }
  }

  private determineTrend(dataPoints: CostDataPoint[]): TrendDirection {
    if (dataPoints.length < 2) return TrendDirection.STABLE

    const firstHalf = dataPoints.slice(0, Math.floor(dataPoints.length / 2))
    const secondHalf = dataPoints.slice(Math.floor(dataPoints.length / 2))

    const firstAvg =
      firstHalf.reduce((sum, dp) => sum + dp.savings, 0) / firstHalf.length
    const secondAvg =
      secondHalf.reduce((sum, dp) => sum + dp.savings, 0) / secondHalf.length

    const change = ((secondAvg - firstAvg) / firstAvg) * 100

    if (change > 10) return TrendDirection.INCREASING
    if (change < -10) return TrendDirection.DECREASING
    return TrendDirection.STABLE
  }

  private createTimePeriods(
    dateRange: DateRange,
    granularity: TimeGranularity
  ): Array<{ start: Date; end: Date }> {
    const periods: Array<{ start: Date; end: Date }> = []
    let current = new Date(dateRange.startDate)

    while (current < dateRange.endDate) {
      const start = new Date(current)
      const end = new Date(current)

      switch (granularity) {
        case TimeGranularity.DAILY:
          end.setDate(end.getDate() + 1)
          break
        case TimeGranularity.WEEKLY:
          end.setDate(end.getDate() + 7)
          break
        case TimeGranularity.MONTHLY:
          end.setMonth(end.getMonth() + 1)
          break
      }

      periods.push({ start, end: end > dateRange.endDate ? dateRange.endDate : end })
      current = end
    }

    return periods
  }

  private createWeightBuckets(weights: number[]): WeightBucket[] {
    if (weights.length === 0) return []

    const min = Math.min(...weights)
    const max = Math.max(...weights)
    const bucketCount = 10
    const bucketSize = (max - min) / bucketCount

    const buckets: WeightBucket[] = []

    for (let i = 0; i < bucketCount; i++) {
      const rangeStart = min + i * bucketSize
      const rangeEnd = min + (i + 1) * bucketSize

      const count = weights.filter((w) => w >= rangeStart && w < rangeEnd).length
      const percentage = (count / weights.length) * 100

      buckets.push({
        rangeStart,
        rangeEnd,
        count,
        percentage,
      })
    }

    return buckets
  }

  private aggregateMonthlyStats(
    optimizations: any[]
  ): Array<{ month: string; orders: number; cost: number; savings: number }> {
    const monthlyMap = new Map<
      string,
      { orders: number; cost: number; savings: number }
    >()

    optimizations.forEach((opt: any) => {
      const month = opt.createdAt.toISOString().substring(0, 7)
      if (!monthlyMap.has(month)) {
        monthlyMap.set(month, { orders: 0, cost: 0, savings: 0 })
      }

      const data = monthlyMap.get(month)!
      data.orders++
      data.cost += opt.shippingCost
      data.savings += (opt.baselineShippingCost || opt.shippingCost) - opt.shippingCost
    })

    return Array.from(monthlyMap.entries())
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month))
  }

  private calculateTrend(
    monthlyStats: Array<{ month: string; orders: number; cost: number; savings: number }>
  ): number {
    if (monthlyStats.length < 2) return 0

    // Simple linear trend: (last - first) / first / months
    const first = monthlyStats[0].orders
    const last = monthlyStats[monthlyStats.length - 1].orders
    const months = monthlyStats.length

    return (last - first) / first / months
  }

  private calculateForecastConfidence(
    monthlyStats: Array<{ month: string; orders: number; cost: number; savings: number }>
  ): number {
    // Simple confidence based on data consistency
    if (monthlyStats.length < 3) return 0.5

    const orders = monthlyStats.map((s) => s.orders)
    const avg = orders.reduce((sum, o) => sum + o, 0) / orders.length
    const variance =
      orders.reduce((sum, o) => sum + Math.pow(o - avg, 2), 0) / orders.length
    const stdDev = Math.sqrt(variance)
    const cv = stdDev / avg // Coefficient of variation

    // Lower CV = higher confidence
    return Math.max(0.5, Math.min(0.95, 1 - cv))
  }
}

