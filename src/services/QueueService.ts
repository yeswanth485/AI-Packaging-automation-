import Bull, { Queue, Job, JobOptions } from 'bull'
import { redis } from '../config/redis'
import { logger } from '../utils/logger'

/**
 * Job types for async processing
 */
export enum JobType {
  CSV_PROCESSING = 'csv_processing',
  PDF_GENERATION = 'pdf_generation',
  SIMULATION_PROCESSING = 'simulation_processing',
}

/**
 * Job data interfaces
 */
export interface CSVProcessingJobData {
  jobId: string
  userId: string
  filePath: string
  fileName: string
}

export interface PDFGenerationJobData {
  simulationId: string
  userId: string
}

export interface SimulationProcessingJobData {
  jobId: string
  userId: string
  configId?: string
}

/**
 * QueueService manages background job processing using Bull
 * Requirements: 22.7 (job queue for async processing)
 */
export class QueueService {
  private queues: Map<JobType, Queue> = new Map()
  
  // Queue configuration
  private readonly defaultJobOptions: JobOptions = {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 200, // Keep last 200 failed jobs
  }

  constructor() {
    this.initializeQueues()
  }

  /**
   * Initialize all job queues
   */
  private initializeQueues(): void {
    // CSV Processing Queue
    this.queues.set(
      JobType.CSV_PROCESSING,
      new Bull(JobType.CSV_PROCESSING, {
        redis: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          password: process.env.REDIS_PASSWORD || undefined,
        },
        defaultJobOptions: {
          ...this.defaultJobOptions,
          timeout: 300000, // 5 minutes
        },
      })
    )

    // PDF Generation Queue
    this.queues.set(
      JobType.PDF_GENERATION,
      new Bull(JobType.PDF_GENERATION, {
        redis: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          password: process.env.REDIS_PASSWORD || undefined,
        },
        defaultJobOptions: {
          ...this.defaultJobOptions,
          timeout: 60000, // 1 minute
        },
      })
    )

    // Simulation Processing Queue
    this.queues.set(
      JobType.SIMULATION_PROCESSING,
      new Bull(JobType.SIMULATION_PROCESSING, {
        redis: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          password: process.env.REDIS_PASSWORD || undefined,
        },
        defaultJobOptions: {
          ...this.defaultJobOptions,
          timeout: 300000, // 5 minutes
        },
      })
    )

    logger.info('Job queues initialized successfully')
  }

  /**
   * Add a job to the queue
   */
  async addJob<T>(
    jobType: JobType,
    data: T,
    options?: JobOptions
  ): Promise<Job<T>> {
    const queue = this.queues.get(jobType)
    if (!queue) {
      throw new Error(`Queue not found for job type: ${jobType}`)
    }

    const job = await queue.add(data, options)
    logger.info(`Job added to queue: ${jobType}`, {
      jobId: job.id,
      jobType,
    })

    return job
  }

  /**
   * Get job status
   */
  async getJobStatus(jobType: JobType, jobId: string): Promise<{
    state: string
    progress: number
    result?: any
    failedReason?: string
  }> {
    const queue = this.queues.get(jobType)
    if (!queue) {
      throw new Error(`Queue not found for job type: ${jobType}`)
    }

    const job = await queue.getJob(jobId)
    if (!job) {
      throw new Error(`Job not found: ${jobId}`)
    }

    const state = await job.getState()
    const progress = job.progress()
    const result = job.returnvalue
    const failedReason = job.failedReason

    return {
      state,
      progress: typeof progress === 'number' ? progress : 0,
      result,
      failedReason,
    }
  }

  /**
   * Register job processor
   */
  registerProcessor<T>(
    jobType: JobType,
    processor: (job: Job<T>) => Promise<any>,
    concurrency: number = 1
  ): void {
    const queue = this.queues.get(jobType)
    if (!queue) {
      throw new Error(`Queue not found for job type: ${jobType}`)
    }

    queue.process(concurrency, async (job: Job<T>) => {
      logger.info(`Processing job: ${jobType}`, {
        jobId: job.id,
        jobType,
      })

      try {
        const result = await processor(job)
        logger.info(`Job completed: ${jobType}`, {
          jobId: job.id,
          jobType,
        })
        return result
      } catch (error) {
        logger.error(`Job failed: ${jobType}`, {
          jobId: job.id,
          jobType,
          error,
        })
        throw error
      }
    })

    // Register event handlers
    queue.on('completed', (job, result) => {
      logger.info(`Job completed: ${job.id}`, { jobType, result })
    })

    queue.on('failed', (job, err) => {
      logger.error(`Job failed: ${job.id}`, { jobType, error: err.message })
    })

    queue.on('stalled', (job) => {
      logger.warn(`Job stalled: ${job.id}`, { jobType })
    })

    logger.info(`Processor registered for job type: ${jobType}`, { concurrency })
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(jobType: JobType): Promise<{
    waiting: number
    active: number
    completed: number
    failed: number
    delayed: number
  }> {
    const queue = this.queues.get(jobType)
    if (!queue) {
      throw new Error(`Queue not found for job type: ${jobType}`)
    }

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ])

    return { waiting, active, completed, failed, delayed }
  }

  /**
   * Clean old jobs from queue
   */
  async cleanQueue(
    jobType: JobType,
    grace: number = 86400000 // 24 hours
  ): Promise<void> {
    const queue = this.queues.get(jobType)
    if (!queue) {
      throw new Error(`Queue not found for job type: ${jobType}`)
    }

    await queue.clean(grace, 'completed')
    await queue.clean(grace, 'failed')
    
    logger.info(`Queue cleaned: ${jobType}`, { grace })
  }

  /**
   * Pause queue processing
   */
  async pauseQueue(jobType: JobType): Promise<void> {
    const queue = this.queues.get(jobType)
    if (!queue) {
      throw new Error(`Queue not found for job type: ${jobType}`)
    }

    await queue.pause()
    logger.info(`Queue paused: ${jobType}`)
  }

  /**
   * Resume queue processing
   */
  async resumeQueue(jobType: JobType): Promise<void> {
    const queue = this.queues.get(jobType)
    if (!queue) {
      throw new Error(`Queue not found for job type: ${jobType}`)
    }

    await queue.resume()
    logger.info(`Queue resumed: ${jobType}`)
  }

  /**
   * Close all queues
   */
  async closeAll(): Promise<void> {
    const closePromises = Array.from(this.queues.values()).map((queue) =>
      queue.close()
    )
    await Promise.all(closePromises)
    logger.info('All queues closed')
  }

  /**
   * Get queue instance
   */
  getQueue(jobType: JobType): Queue | undefined {
    return this.queues.get(jobType)
  }
}

// Export singleton instance
export const queueService = new QueueService()
