import { Job } from 'bull'
import {
  queueService,
  JobType,
  CSVProcessingJobData,
  PDFGenerationJobData,
  SimulationProcessingJobData,
} from '../services/QueueService'
import { logger } from '../utils/logger'
import { prisma } from '../config/database'
import fs from 'fs/promises'

/**
 * Initialize all job processors
 * Requirements: 22.7 (async processing for CSV and PDF)
 */
export function initializeJobProcessors(): void {
  // CSV Processing Processor
  queueService.registerProcessor<CSVProcessingJobData>(
    JobType.CSV_PROCESSING,
    processCSVJob,
    2 // Process 2 CSV files concurrently
  )

  // PDF Generation Processor
  queueService.registerProcessor<PDFGenerationJobData>(
    JobType.PDF_GENERATION,
    processPDFJob,
    3 // Generate 3 PDFs concurrently
  )

  // Simulation Processing Processor
  queueService.registerProcessor<SimulationProcessingJobData>(
    JobType.SIMULATION_PROCESSING,
    processSimulationJob,
    parseInt(process.env.MAX_CONCURRENT_SIMULATIONS || '5')
  )

  logger.info('All job processors initialized')
}

/**
 * Process CSV file upload and parsing
 */
async function processCSVJob(job: Job<CSVProcessingJobData>): Promise<void> {
  const { jobId, userId, filePath, fileName } = job.data

  try {
    // Update job progress
    await job.progress(10)

    // Update simulation job status to PROCESSING
    await prisma.simulationJob.update({
      where: { id: jobId },
      data: { status: 'PROCESSING' },
    })

    await job.progress(20)

    // Import CSV parsing service dynamically to avoid circular dependencies
    const { CSVParsingService } = await import('../services/CSVParsingService')
    const csvService = new CSVParsingService()

    await job.progress(30)

    // Parse CSV file
    const fileBuffer = await fs.readFile(filePath)
    const orders = await csvService.parseCSV(fileBuffer)

    await job.progress(60)

    // Store orders in database
    for (const order of orders) {
      await prisma.order.create({
        data: {
          orderId: order.orderId,
          userId,
          jobId,
          totalWeight: order.totalWeight,
          items: {
            create: order.items.map((item) => ({
              itemId: item.itemId,
              length: item.length,
              width: item.width,
              height: item.height,
              weight: item.weight,
              quantity: item.quantity,
            })),
          },
        },
      })
    }

    await job.progress(90)

    // Update simulation job with order count
    await prisma.simulationJob.update({
      where: { id: jobId },
      data: {
        totalOrders: orders.length,
        status: 'PENDING', // Ready for simulation processing
      },
    })

    // Clean up uploaded file
    await fs.unlink(filePath).catch((err) => {
      logger.warn('Failed to delete uploaded file:', { filePath, error: err })
    })

    await job.progress(100)

    logger.info('CSV processing completed', { jobId, orderCount: orders.length })
  } catch (error) {
    logger.error('CSV processing failed', { jobId, error })

    // Update job status to FAILED
    await prisma.simulationJob.update({
      where: { id: jobId },
      data: { status: 'FAILED' },
    })

    throw error
  }
}

/**
 * Process PDF report generation
 */
async function processPDFJob(job: Job<PDFGenerationJobData>): Promise<string> {
  const { simulationId, userId } = job.data

  try {
    await job.progress(10)

    // Import report generator dynamically
    const { ReportGenerator } = await import('../services/ReportGenerator')
    const reportGenerator = new ReportGenerator()

    await job.progress(30)

    // Fetch simulation data
    const simulation = await prisma.simulation.findUnique({
      where: { id: simulationId },
      include: {
        job: {
          include: {
            orders: {
              include: {
                items: true,
                box: true,
              },
            },
          },
        },
      },
    })

    if (!simulation) {
      throw new Error(`Simulation not found: ${simulationId}`)
    }

    await job.progress(50)

    // Generate PDF report
    const reportUrl = await reportGenerator.generateReport(simulation)

    await job.progress(90)

    // Update simulation with report URL
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // Expire in 7 days

    await prisma.simulation.update({
      where: { id: simulationId },
      data: {
        reportUrl,
        reportExpiresAt: expiresAt,
      },
    })

    await job.progress(100)

    logger.info('PDF generation completed', { simulationId, reportUrl })

    return reportUrl
  } catch (error) {
    logger.error('PDF generation failed', { simulationId, error })
    throw error
  }
}

/**
 * Process simulation optimization
 */
async function processSimulationJob(
  job: Job<SimulationProcessingJobData>
): Promise<void> {
  const { jobId, userId, configId } = job.data

  try {
    await job.progress(10)

    // Import simulation service dynamically
    const { SimulationService } = await import('../services/SimulationService')
    const { ConfigurationService } = await import('../services/ConfigurationService')

    const simulationService = new SimulationService()
    const configService = new ConfigurationService(prisma)

    await job.progress(20)

    // Get user configuration
    const config = await configService.getConfiguration(userId)

    await job.progress(30)

    // Process simulation
    const result = await simulationService.processSimulation(jobId, {
      bufferPadding: config.bufferPadding,
      volumetricDivisor: config.volumetricDivisor,
      shippingRatePerKg: config.shippingRatePerKg,
      maxWeightOverride: config.maxWeightOverride,
    })

    await job.progress(90)

    // Update job status
    await prisma.simulationJob.update({
      where: { id: jobId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    })

    await job.progress(100)

    logger.info('Simulation processing completed', { jobId })
  } catch (error) {
    logger.error('Simulation processing failed', { jobId, error })

    // Update job status to FAILED
    await prisma.simulationJob.update({
      where: { id: jobId },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
      },
    })

    throw error
  }
}

/**
 * Graceful shutdown handler
 */
export async function shutdownJobProcessors(): Promise<void> {
  logger.info('Shutting down job processors...')
  await queueService.closeAll()
  logger.info('Job processors shut down successfully')
}
