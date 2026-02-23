import { Readable } from 'stream'
import csvParser from 'csv-parser'
import { logger } from './logger'

/**
 * Stream CSV file processing to avoid loading entire file into memory
 * Requirements: 22.12 (stream large CSV files)
 */
export class StreamingCSVProcessor {
  /**
   * Process CSV file in streaming mode
   * @param fileStream - Readable stream of CSV file
   * @param onRow - Callback for each parsed row
   * @param onComplete - Callback when processing completes
   * @param onError - Callback for errors
   */
  static async processStream(
    fileStream: Readable,
    onRow: (row: any, index: number) => Promise<void> | void,
    onComplete?: (totalRows: number) => void,
    onError?: (error: Error) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      let rowIndex = 0
      let hasError = false

      fileStream
        .pipe(csvParser())
        .on('data', async (row) => {
          try {
            await onRow(row, rowIndex)
            rowIndex++
          } catch (error) {
            hasError = true
            logger.error('Error processing CSV row:', { rowIndex, error })
            if (onError) {
              onError(error as Error)
            }
          }
        })
        .on('end', () => {
          if (!hasError) {
            logger.info('CSV streaming completed', { totalRows: rowIndex })
            if (onComplete) {
              onComplete(rowIndex)
            }
            resolve()
          }
        })
        .on('error', (error) => {
          logger.error('CSV streaming error:', error)
          if (onError) {
            onError(error)
          }
          reject(error)
        })
    })
  }

  /**
   * Process CSV file in batches
   * @param fileStream - Readable stream of CSV file
   * @param batchSize - Number of rows per batch
   * @param onBatch - Callback for each batch
   * @param onComplete - Callback when processing completes
   */
  static async processBatches(
    fileStream: Readable,
    batchSize: number,
    onBatch: (batch: any[], batchIndex: number) => Promise<void> | void,
    onComplete?: (totalRows: number) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      let currentBatch: any[] = []
      let batchIndex = 0
      let totalRows = 0

      fileStream
        .pipe(csvParser())
        .on('data', async (row) => {
          currentBatch.push(row)
          totalRows++

          // Process batch when it reaches the batch size
          if (currentBatch.length >= batchSize) {
            try {
              await onBatch([...currentBatch], batchIndex)
              batchIndex++
              currentBatch = []
            } catch (error) {
              logger.error('Error processing CSV batch:', { batchIndex, error })
              reject(error)
            }
          }
        })
        .on('end', async () => {
          // Process remaining rows in the last batch
          if (currentBatch.length > 0) {
            try {
              await onBatch(currentBatch, batchIndex)
            } catch (error) {
              logger.error('Error processing final CSV batch:', { batchIndex, error })
              reject(error)
              return
            }
          }

          logger.info('CSV batch processing completed', {
            totalRows,
            totalBatches: batchIndex + 1,
          })

          if (onComplete) {
            onComplete(totalRows)
          }
          resolve()
        })
        .on('error', (error) => {
          logger.error('CSV streaming error:', error)
          reject(error)
        })
    })
  }

  /**
   * Validate CSV headers without loading entire file
   * @param fileStream - Readable stream of CSV file
   * @param requiredHeaders - Array of required header names
   */
  static async validateHeaders(
    fileStream: Readable,
    requiredHeaders: string[]
  ): Promise<{ valid: boolean; missingHeaders: string[]; headers: string[] }> {
    return new Promise((resolve, reject) => {
      let headers: string[] = []

      fileStream
        .pipe(csvParser())
        .on('headers', (parsedHeaders: string[]) => {
          headers = parsedHeaders

          // Check for missing headers
          const missingHeaders = requiredHeaders.filter(
            (required) => !headers.includes(required)
          )

          resolve({
            valid: missingHeaders.length === 0,
            missingHeaders,
            headers,
          })

          // Destroy stream after reading headers
          fileStream.destroy()
        })
        .on('error', (error) => {
          logger.error('CSV header validation error:', error)
          reject(error)
        })
    })
  }

  /**
   * Count rows in CSV file without loading into memory
   * @param fileStream - Readable stream of CSV file
   */
  static async countRows(fileStream: Readable): Promise<number> {
    return new Promise((resolve, reject) => {
      let rowCount = 0

      fileStream
        .pipe(csvParser())
        .on('data', () => {
          rowCount++
        })
        .on('end', () => {
          resolve(rowCount)
        })
        .on('error', (error) => {
          logger.error('CSV row counting error:', error)
          reject(error)
        })
    })
  }
}
