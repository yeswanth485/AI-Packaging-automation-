import PDFDocument from 'pdfkit'
import { v4 as uuidv4 } from 'uuid'
import { SimulationResult, PDFReport, BoxUsageData } from '../types'
import fs from 'fs'
import path from 'path'

/**
 * ReportGenerator - Generates professional PDF reports for simulation results
 * Requirements: 8.1-8.12
 */
export class ReportGenerator {
  private reportsDir: string
  private urlExpirationHours: number

  constructor(reportsDir: string = './reports', urlExpirationHours: number = 24) {
    this.reportsDir = reportsDir
    this.urlExpirationHours = urlExpirationHours

    // Ensure reports directory exists
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true })
    }
  }

  /**
   * Generate a professional PDF report from simulation results
   * Requirements: 8.1-8.10
   */
  async generateReport(simulationResult: SimulationResult): Promise<PDFReport> {
    const reportId = uuidv4()
    const fileName = `report-${reportId}.pdf`
    const filePath = path.join(this.reportsDir, fileName)

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 })
        const stream = fs.createWriteStream(filePath)

        doc.pipe(stream)

        // Header
        this.addHeader(doc, simulationResult)

        // Executive Summary
        this.addExecutiveSummary(doc, simulationResult)

        // KPIs Section
        this.addKPIsSection(doc, simulationResult)

        // Savings Analysis
        this.addSavingsAnalysis(doc, simulationResult)

        // Box Usage Distribution
        this.addBoxUsageDistribution(doc, simulationResult)

        // Cost Comparison Visualization
        this.addCostComparison(doc, simulationResult)

        // Recommendations
        this.addRecommendations(doc, simulationResult)

        // Anomaly Warnings
        if (simulationResult.anomalyWarnings.length > 0) {
          this.addAnomalyWarnings(doc, simulationResult)
        }

        // Footer
        this.addFooter(doc)

        doc.end()

        stream.on('finish', () => {
          const expiresAt = new Date()
          expiresAt.setHours(expiresAt.getHours() + this.urlExpirationHours)

          const report: PDFReport = {
            reportId,
            downloadUrl: `/api/reports/${reportId}`,
            expiresAt,
          }

          resolve(report)
        })

        stream.on('error', reject)
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * Check if a report URL has expired
   * Requirements: 8.12
   */
  isReportExpired(expiresAt: Date): boolean {
    return new Date() > expiresAt
  }

  /**
   * Get report file path by ID
   */
  getReportPath(reportId: string): string {
    return path.join(this.reportsDir, `report-${reportId}.pdf`)
  }

  /**
   * Check if report file exists
   */
  reportExists(reportId: string): boolean {
    return fs.existsSync(this.getReportPath(reportId))
  }

  private addHeader(doc: InstanceType<typeof PDFDocument>, result: SimulationResult): void {
    doc
      .fontSize(24)
      .font('Helvetica-Bold')
      .text('AI Packaging Optimizer', { align: 'center' })
      .fontSize(16)
      .font('Helvetica')
      .text('Simulation Report', { align: 'center' })
      .moveDown()
      .fontSize(10)
      .text(`Report ID: ${result.simulationId}`, { align: 'center' })
      .text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' })
      .moveDown(2)
  }

  private addExecutiveSummary(doc: InstanceType<typeof PDFDocument>, result: SimulationResult): void {
    doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .text('Executive Summary')
      .moveDown(0.5)
      .fontSize(11)
      .font('Helvetica')

    const { comparison } = result

    doc
      .text(
        `This report analyzes ${comparison.totalOrdersProcessed} orders to identify packaging optimization opportunities.`
      )
      .text(
        `By switching from manual oversized packing to optimized box selection, you can achieve ${comparison.savingsPercentage.toFixed(2)}% cost reduction.`
      )
      .moveDown()
  }

  private addKPIsSection(doc: InstanceType<typeof PDFDocument>, result: SimulationResult): void {
    const { comparison } = result

    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('Key Performance Indicators')
      .moveDown(0.5)
      .fontSize(11)
      .font('Helvetica')

    // Requirement 8.2: Total orders processed
    this.addKPI(doc, 'Total Orders Processed', comparison.totalOrdersProcessed.toString())

    // Requirement 8.3: Baseline cost, optimized cost, total savings
    this.addKPI(doc, 'Baseline Shipping Cost', `$${comparison.baselineTotalCost.toFixed(2)}`)
    this.addKPI(
      doc,
      'Optimized Shipping Cost',
      `$${comparison.optimizedTotalCost.toFixed(2)}`
    )
    this.addKPI(doc, 'Total Savings', `$${comparison.totalSavings.toFixed(2)}`)

    // Requirement 8.4: Savings percentage
    this.addKPI(doc, 'Savings Percentage', `${comparison.savingsPercentage.toFixed(2)}%`)

    // Requirement 8.6: Average space utilization
    this.addKPI(
      doc,
      'Avg Space Utilization (Optimized)',
      `${comparison.averageUtilizationOptimized.toFixed(2)}%`
    )
    this.addKPI(
      doc,
      'Avg Space Utilization (Baseline)',
      `${comparison.averageUtilizationBaseline.toFixed(2)}%`
    )
    this.addKPI(
      doc,
      'Volumetric Weight Reduction',
      `${comparison.volumetricWeightReduction.toFixed(2)}%`
    )

    doc.moveDown()
  }

  private addKPI(doc: InstanceType<typeof PDFDocument>, label: string, value: string): void {
    doc.font('Helvetica-Bold').text(label + ': ', { continued: true }).font('Helvetica').text(value)
  }

  private addSavingsAnalysis(doc: InstanceType<typeof PDFDocument>, result: SimulationResult): void {
    const { savings } = result

    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('Savings Analysis')
      .moveDown(0.5)
      .fontSize(11)
      .font('Helvetica')

    // Requirement 8.5: Monthly and annual savings projections
    this.addKPI(doc, 'Per-Order Savings', `$${savings.perOrderSavings.toFixed(2)}`)
    this.addKPI(doc, 'Monthly Savings Projection', `$${savings.monthlySavings.toFixed(2)}`)
    this.addKPI(doc, 'Annual Savings Projection', `$${savings.annualSavings.toFixed(2)}`)
    this.addKPI(doc, 'Confidence Level', `${(savings.confidenceLevel * 100).toFixed(1)}%`)
    this.addKPI(doc, 'Realistic Estimate', savings.isRealistic ? 'Yes' : 'No')

    doc.moveDown()
  }

  private addBoxUsageDistribution(doc: InstanceType<typeof PDFDocument>, result: SimulationResult): void {
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('Box Usage Distribution')
      .moveDown(0.5)
      .fontSize(11)
      .font('Helvetica')

    // Requirement 8.7: Box usage distribution charts
    const boxUsage = this.calculateBoxUsage(result.optimizedResults)

    if (boxUsage.length === 0) {
      doc.text('No box usage data available.')
      doc.moveDown()
      return
    }

    // Create a simple text-based chart
    doc.text('Most Used Boxes:').moveDown(0.3)

    boxUsage.slice(0, 5).forEach((usage, index) => {
      const bar = '█'.repeat(Math.floor(usage.percentage / 2))
      doc
        .fontSize(10)
        .text(
          `${index + 1}. ${usage.boxName}: ${usage.usageCount} orders (${usage.percentage.toFixed(1)}%)`
        )
        .text(`   ${bar}`)
    })

    doc.moveDown()
  }

  private calculateBoxUsage(results: any[]): BoxUsageData[] {
    const usageMap = new Map<string, { count: number; box: any }>()

    results.forEach((result) => {
      const boxId = result.selectedBox.id
      if (!usageMap.has(boxId)) {
        usageMap.set(boxId, { count: 0, box: result.selectedBox })
      }
      usageMap.get(boxId)!.count++
    })

    const total = results.length
    const usageData: BoxUsageData[] = []

    usageMap.forEach((data, boxId) => {
      usageData.push({
        boxId,
        boxName: data.box.name,
        usageCount: data.count,
        percentage: (data.count / total) * 100,
        averageUtilization: 0, // Would need to calculate from results
      })
    })

    return usageData.sort((a, b) => b.usageCount - a.usageCount)
  }

  private addCostComparison(doc: InstanceType<typeof PDFDocument>, result: SimulationResult): void {
    const { comparison } = result

    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('Cost Comparison')
      .moveDown(0.5)
      .fontSize(11)
      .font('Helvetica')

    // Requirement 8.8: Cost comparison visualizations
    const baselineHeight = 100
    const optimizedHeight = (comparison.optimizedTotalCost / comparison.baselineTotalCost) * 100
    const savingsHeight = baselineHeight - optimizedHeight

    const startX = 100
    const startY = doc.y
    const barWidth = 80
    const spacing = 120

    // Baseline bar
    doc
      .rect(startX, startY, barWidth, baselineHeight)
      .fillAndStroke('#ff6b6b', '#ff6b6b')
      .fillColor('#000000')
      .fontSize(10)
      .text('Baseline', startX, startY + baselineHeight + 10, {
        width: barWidth,
        align: 'center',
      })
      .text(`$${comparison.baselineTotalCost.toFixed(0)}`, startX, startY + baselineHeight + 25, {
        width: barWidth,
        align: 'center',
      })

    // Optimized bar
    doc
      .rect(startX + spacing, startY + savingsHeight, barWidth, optimizedHeight)
      .fillAndStroke('#51cf66', '#51cf66')
      .fillColor('#000000')
      .text('Optimized', startX + spacing, startY + baselineHeight + 10, {
        width: barWidth,
        align: 'center',
      })
      .text(
        `$${comparison.optimizedTotalCost.toFixed(0)}`,
        startX + spacing,
        startY + baselineHeight + 25,
        {
          width: barWidth,
          align: 'center',
        }
      )

    // Savings indicator
    doc
      .fontSize(12)
      .fillColor('#2f9e44')
      .text(
        `Savings: $${comparison.totalSavings.toFixed(2)} (${comparison.savingsPercentage.toFixed(1)}%)`,
        startX + spacing * 2,
        startY + 40
      )

    doc.moveDown(8)
  }

  private addRecommendations(doc: InstanceType<typeof PDFDocument>, result: SimulationResult): void {
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .fillColor('#000000')
      .text('Recommendations')
      .moveDown(0.5)
      .fontSize(11)
      .font('Helvetica')

    // Requirement 8.9: Recommendations
    if (result.recommendations.length === 0) {
      doc.text('No specific recommendations at this time.')
    } else {
      result.recommendations.forEach((recommendation, index) => {
        doc.text(`${index + 1}. ${recommendation}`).moveDown(0.3)
      })
    }

    doc.moveDown()
  }

  private addAnomalyWarnings(doc: InstanceType<typeof PDFDocument>, result: SimulationResult): void {
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .fillColor('#fa5252')
      .text('Anomaly Warnings')
      .moveDown(0.5)
      .fontSize(11)
      .font('Helvetica')
      .fillColor('#000000')

    // Requirement 8.9: Anomaly warnings
    result.anomalyWarnings.forEach((warning) => {
      doc.text(`⚠ ${warning}`).moveDown(0.3)
    })

    doc.moveDown()
  }

  private addFooter(doc: InstanceType<typeof PDFDocument>): void {
    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#666666')
      .text('AI Packaging Optimizer - Confidential Report', {
        align: 'center',
      })
      .text('This report is generated for internal use only.', {
        align: 'center',
      })
  }
}
