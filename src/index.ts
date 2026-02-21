import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import dotenv from 'dotenv'
import { logger } from './utils/logger'
import { performHealthCheck } from './utils/healthCheck'
import { errorHandler, requestIdMiddleware } from './middleware/errorHandler'
import { auditLogMiddleware } from './middleware/auditLog'
import { metricsMiddleware } from './middleware/metrics'
import { register } from './utils/metrics'
import { prisma } from './config/database'
import { redis } from './config/redis'
import authRoutes from './routes/auth.routes'
import boxRoutes from './routes/box.routes'
import simulationRoutes from './routes/simulation.routes'
import optimizeRoutes from './routes/optimize.routes'
import subscriptionRoutes from './routes/subscription.routes'
import analyticsRoutes from './routes/analytics.routes'
import configRoutes from './routes/config.routes'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    frameguard: {
      action: 'deny',
    },
    noSniff: true,
    xssFilter: true,
  })
)
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-CSRF-Token', 'X-Request-ID'],
}))

// Request ID middleware
app.use(requestIdMiddleware)

// Metrics middleware
app.use(metricsMiddleware)

// Audit logging middleware
app.use(auditLogMiddleware)

// Body parsing middleware with size limits
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Health check endpoint
app.get('/health', async (req, res) => {
  // Simple health check for load balancers (query param: simple=true)
  if (req.query.simple === 'true') {
    return res.json({ status: 'ok', timestamp: new Date().toISOString() })
  }
  
  // Comprehensive health check
  try {
    const healthCheck = await performHealthCheck()
    const statusCode = healthCheck.status === 'healthy' ? 200 : 
                       healthCheck.status === 'degraded' ? 200 : 503
    return res.status(statusCode).json(healthCheck)
  } catch (error) {
    logger.error('Health check failed', { error })
    return res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
    })
  }
})

// Metrics endpoint for Prometheus
app.get('/metrics', async (_req, res) => {
  try {
    res.set('Content-Type', register.contentType)
    const metrics = await register.metrics()
    res.end(metrics)
  } catch (error) {
    res.status(500).end()
  }
})

// API routes
app.use('/api/auth', authRoutes)
app.use('/api/boxes', boxRoutes)
app.use('/api/simulation', simulationRoutes)
app.use('/api/optimize', optimizeRoutes)
app.use('/api/subscriptions', subscriptionRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use('/api/config', configRoutes)


// Serve frontend static files in production
if (process.env.NODE_ENV === 'production') {
  const path = require('path')
  
  // Serve Next.js static files
  app.use(express.static(path.join(__dirname, '../frontend/.next/standalone')))
  app.use(express.static(path.join(__dirname, '../frontend/public')))
  app.use('/_next/static', express.static(path.join(__dirname, '../frontend/.next/static')))
  
  // Handle all other routes - serve Next.js app
  app.get('*', (_req, res) => {

    res.sendFile(path.join(__dirname, '../frontend/.next/standalone/index.html'))
  })
}


// Error handling middleware
app.use(errorHandler)

// Graceful shutdown
const gracefulShutdown = async (): Promise<void> => {
  logger.info('Shutting down gracefully...')
  
  await prisma.$disconnect()
  redis.disconnect()
  
  process.exit(0)
}

process.on('SIGTERM', gracefulShutdown)
process.on('SIGINT', gracefulShutdown)

// Start server
const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`)
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`)
})

export { app, server }
