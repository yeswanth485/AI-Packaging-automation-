import { Registry, Counter, Histogram, Gauge } from 'prom-client'

// Create a Registry to register the metrics
export const register = new Registry()

// Add default labels to all metrics
register.setDefaultLabels({
  app: 'packaging-optimizer',
})

// API Request metrics
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.2, 0.5, 1, 2, 5],
  registers: [register],
})

export const httpRequestTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
})

// Optimization metrics
export const optimizationDuration = new Histogram({
  name: 'optimization_duration_seconds',
  help: 'Duration of packing optimization operations in seconds',
  labelNames: ['operation_type'],
  buckets: [0.01, 0.05, 0.1, 0.2, 0.5, 1, 2],
  registers: [register],
})

export const optimizationTotal = new Counter({
  name: 'optimizations_total',
  help: 'Total number of optimization operations',
  labelNames: ['operation_type', 'status'],
  registers: [register],
})

// Database metrics
export const databaseQueryDuration = new Histogram({
  name: 'database_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
  registers: [register],
})

export const databaseConnectionsActive = new Gauge({
  name: 'database_connections_active',
  help: 'Number of active database connections',
  registers: [register],
})

// Error metrics
export const errorTotal = new Counter({
  name: 'errors_total',
  help: 'Total number of errors',
  labelNames: ['type', 'endpoint'],
  registers: [register],
})

// Quota metrics
export const quotaViolations = new Counter({
  name: 'quota_violations_total',
  help: 'Total number of quota violations',
  labelNames: ['user_tier'],
  registers: [register],
})

// Authentication metrics
export const authenticationAttempts = new Counter({
  name: 'authentication_attempts_total',
  help: 'Total number of authentication attempts',
  labelNames: ['method', 'status'],
  registers: [register],
})

// CSV Processing metrics
export const csvParsingErrors = new Counter({
  name: 'csv_parsing_errors_total',
  help: 'Total number of CSV parsing errors',
  labelNames: ['error_type'],
  registers: [register],
})

export const csvRowsProcessed = new Counter({
  name: 'csv_rows_processed_total',
  help: 'Total number of CSV rows processed',
  labelNames: ['status'],
  registers: [register],
})

// Cache metrics
export const cacheHits = new Counter({
  name: 'cache_hits_total',
  help: 'Total number of cache hits',
  labelNames: ['cache_key'],
  registers: [register],
})

export const cacheMisses = new Counter({
  name: 'cache_misses_total',
  help: 'Total number of cache misses',
  labelNames: ['cache_key'],
  registers: [register],
})

// Job Queue metrics
export const jobQueueSize = new Gauge({
  name: 'job_queue_size',
  help: 'Current size of the job queue',
  labelNames: ['queue_name'],
  registers: [register],
})

export const jobProcessingDuration = new Histogram({
  name: 'job_processing_duration_seconds',
  help: 'Duration of job processing in seconds',
  labelNames: ['job_type'],
  buckets: [1, 5, 10, 30, 60, 120, 300],
  registers: [register],
})
