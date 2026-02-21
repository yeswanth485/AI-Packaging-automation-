import { Readable } from 'stream'
import csvParser from 'csv-parser'
import { PrismaClient } from '@prisma/client'
import { SimulationJob, Order, JobStatus } from '../types'

const prisma = new PrismaClient()

interface CSVRow {
  order_id: string
  item_length: string
  item_width: string
  item_height: string
  item_weight: string
  quantity: string
}

interface ParsedItem {
  itemId: string
  length: number
  width: number
  height: number
  weight: number
  quantity: number
}

interface ParsedOrder {
  orderId: string
  items: ParsedItem[]
  totalWeight: number
}

interface CSVParseResult {
  orders: ParsedOrder[]
  invalidRowCount: number
  totalRowCount: number
  errors: string[]
}

export class CSVParsingService {
  private static readonly MAX_FILE_SIZE = 50 * 1024 * 1024 // 50 MB
  private static readonly REQUIRED_COLUMNS = [
    'order_id',
    'item_length',
    'item_width',
    'item_height',
    'item_weight',
    'quantity',
  ]

  /**
   * Upload and parse CSV file, creating a simulation job
   */
  async uploadCSV(
    fileBuffer: Buffer,
    fileName: string,
    userId: string
  ): Promise<SimulationJob> {
    // Validate file size
    if (fileBuffer.length > CSVParsingService.MAX_FILE_SIZE) {
      throw new Error(
        `File size exceeds maximum limit of ${CSVParsingService.MAX_FILE_SIZE / 1024 / 1024} MB`
      )
    }

    // Parse CSV
    const parseResult = await this.parseCSV(fileBuffer)

    // Validate required columns were present
    if (parseResult.orders.length === 0 && parseResult.invalidRowCount > 0) {
      throw new Error(
        `CSV parsing failed. Errors: ${parseResult.errors.join(', ')}`
      )
    }

    // Check for anomaly warning (>10% invalid rows)
    const anomalyWarnings: string[] = []
    if (
      parseResult.totalRowCount > 0 &&
      parseResult.invalidRowCount / parseResult.totalRowCount > 0.1
    ) {
      anomalyWarnings.push(
        `Warning: ${((parseResult.invalidRowCount / parseResult.totalRowCount) * 100).toFixed(1)}% of rows were invalid`
      )
    }

    // Create simulation job
    const job = await this.createSimulationJob(
      userId,
      fileName,
      parseResult.orders
    )

    return job
  }

  /**
   * Parse CSV buffer into orders
   */
  private async parseCSV(fileBuffer: Buffer): Promise<CSVParseResult> {
    return new Promise((resolve, reject) => {
      const orders = new Map<string, ParsedItem[]>()
      const errors: string[] = []
      let totalRowCount = 0
      let invalidRowCount = 0

      const stream = Readable.from(fileBuffer)

      stream
        .pipe(csvParser())
        .on('headers', (headers: string[]) => {
          // Validate required columns
          const missingColumns = CSVParsingService.REQUIRED_COLUMNS.filter(
            (col) => !headers.includes(col)
          )

          if (missingColumns.length > 0) {
            reject(
              new Error(
                `Missing required columns: ${missingColumns.join(', ')}`
              )
            )
            return
          }
        })
        .on('data', (row: CSVRow) => {
          totalRowCount++

          try {
            // Validate and parse row
            const item = this.parseRow(row, totalRowCount)

            // Group items by order_id
            if (!orders.has(item.orderId)) {
              orders.set(item.orderId, [])
            }
            orders.get(item.orderId)!.push(item.item)
          } catch (error) {
            invalidRowCount++
            errors.push(
              `Row ${totalRowCount}: ${error instanceof Error ? error.message : 'Unknown error'}`
            )
          }
        })
        .on('end', () => {
          // Convert map to array of orders
          const parsedOrders: ParsedOrder[] = []

          for (const [orderId, items] of orders.entries()) {
            const totalWeight = items.reduce(
              (sum, item) => sum + item.weight * item.quantity,
              0
            )

            parsedOrders.push({
              orderId,
              items,
              totalWeight,
            })
          }

          resolve({
            orders: parsedOrders,
            invalidRowCount,
            totalRowCount,
            errors,
          })
        })
        .on('error', (error) => {
          reject(new Error(`CSV parsing error: ${error.message}`))
        })
    })
  }

  /**
   * Parse and validate a single CSV row
   */
  private parseRow(
    row: CSVRow,
    rowNumber: number
  ): { orderId: string; item: ParsedItem } {
    // Validate order_id
    if (!row.order_id || row.order_id.trim() === '') {
      throw new Error('order_id is required')
    }

    // Parse and validate dimensions
    const length = parseFloat(row.item_length)
    if (isNaN(length) || length <= 0) {
      throw new Error('item_length must be a positive number')
    }

    const width = parseFloat(row.item_width)
    if (isNaN(width) || width <= 0) {
      throw new Error('item_width must be a positive number')
    }

    const height = parseFloat(row.item_height)
    if (isNaN(height) || height <= 0) {
      throw new Error('item_height must be a positive number')
    }

    // Parse and validate weight (non-negative)
    const weight = parseFloat(row.item_weight)
    if (isNaN(weight) || weight < 0) {
      throw new Error('item_weight must be a non-negative number')
    }

    // Parse and validate quantity (positive integer)
    const quantity = parseInt(row.quantity, 10)
    if (isNaN(quantity) || quantity <= 0 || !Number.isInteger(quantity)) {
      throw new Error('quantity must be a positive integer')
    }

    return {
      orderId: row.order_id.trim(),
      item: {
        itemId: `item_${rowNumber}`,
        length,
        width,
        height,
        weight,
        quantity,
      },
    }
  }

  /**
   * Create simulation job and persist orders to database
   */
  private async createSimulationJob(
    userId: string,
    fileName: string,
    orders: ParsedOrder[]
  ): Promise<SimulationJob> {
    // Create job and orders in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create simulation job
      const job = await tx.simulationJob.create({
        data: {
          userId,
          fileName,
          totalOrders: orders.length,
          status: 'PENDING',
        },
      })

      // Create orders and items
      for (const order of orders) {
        await tx.order.create({
          data: {
            orderId: order.orderId,
            userId,
            jobId: job.id,
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

      return job
    })

    return {
      jobId: result.id,
      userId: result.userId,
      fileName: result.fileName,
      totalOrders: result.totalOrders,
      status: result.status as JobStatus,
      createdAt: result.createdAt,
    }
  }

  /**
   * Get simulation job by ID
   */
  async getSimulationJob(jobId: string): Promise<SimulationJob | null> {
    const job = await prisma.simulationJob.findUnique({
      where: { id: jobId },
    })

    if (!job) {
      return null
    }

    return {
      jobId: job.id,
      userId: job.userId,
      fileName: job.fileName,
      totalOrders: job.totalOrders,
      status: job.status as JobStatus,
      createdAt: job.createdAt,
    }
  }

  /**
   * Get orders for a simulation job
   */
  async getOrdersForJob(jobId: string): Promise<Order[]> {
    const orders = await prisma.order.findMany({
      where: { jobId },
      include: {
        items: true,
      },
    })

    return orders.map((order) => ({
      orderId: order.orderId,
      items: order.items.map((item) => ({
        itemId: item.itemId,
        length: item.length,
        width: item.width,
        height: item.height,
        weight: item.weight,
        quantity: item.quantity,
      })),
      totalWeight: order.totalWeight,
    }))
  }
}
