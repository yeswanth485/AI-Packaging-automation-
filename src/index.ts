import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import dotenv from 'dotenv'
import { logger } from './utils/logger'
import { errorHandler, requestIdMiddleware } from './middleware/errorHandler'
import { auditLogMiddleware } from './middleware/auditLog'
import { metricsMiddleware } from './middleware/metrics'
import { register } from './utils/metrics'

// Load environment variables
dotenv.config()

// Validate critical environment variables for production
if (process.env.NODE_ENV === 'production') {
  const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET', 'SESSION_SECRET']
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName])
  
  if (missingVars.length > 0) {
    logger.error(`Missing required environment variables: ${missingVars.join(', ')}`)
    process.exit(1)
  }
}

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
      maxAge: 31536000,
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

// Simple health check endpoint - responds immediately without dependencies
app.get('/health', async (req, res) => {
  if (req.query.simple === 'true') {
    return res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() })
  }
  
  // Comprehensive health check - lazy load dependencies
  try {
    const { performHealthCheck } = await import('./utils/healthCheck')
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

// Lazy load routes to avoid loading database/redis on startup
app.use('/api/auth', async (req, res, next) => {
  const authRoutes = await import('./routes/auth.routes')
  return authRoutes.default(req, res, next)
})

app.use('/api/boxes', async (req, res, next) => {
  const boxRoutes = await import('./routes/box.routes')
  return boxRoutes.default(req, res, next)
})

app.use('/api/simulation', async (req, res, next) => {
  const simulationRoutes = await import('./routes/simulation.routes')
  return simulationRoutes.default(req, res, next)
})

app.use('/api/optimize', async (req, res, next) => {
  const optimizeRoutes = await import('./routes/optimize.routes')
  return optimizeRoutes.default(req, res, next)
})

app.use('/api/subscriptions', async (req, res, next) => {
  const subscriptionRoutes = await import('./routes/subscription.routes')
  return subscriptionRoutes.default(req, res, next)
})

app.use('/api/analytics', async (req, res, next) => {
  const analyticsRoutes = await import('./routes/analytics.routes')
  return analyticsRoutes.default(req, res, next)
})

app.use('/api/config', async (req, res, next) => {
  const configRoutes = await import('./routes/config.routes')
  return configRoutes.default(req, res, next)
})

// Serve frontend static files in production
if (process.env.NODE_ENV === 'production') {
  const path = require('path')
  const fs = require('fs')
  
  const frontendStaticPath = path.join(__dirname, '../frontend/out')
  
  if (fs.existsSync(frontendStaticPath)) {
    logger.info('Serving frontend static files from:', frontendStaticPath)
    
    // Serve static files
    app.use(express.static(frontendStaticPath))
    
    // For all non-API routes, serve index.html (SPA fallback)
    app.get('*', (req, res, next) => {
      // Skip API routes, health, and metrics
      if (req.path.startsWith('/api/') || req.path === '/health' || req.path === '/metrics') {
        return next()
      }
      
      res.sendFile(path.join(frontendStaticPath, 'index.html'))
    })
  } else {
    logger.warn('Frontend build not found at:', frontendStaticPath)
    logger.info('Serving API only')
  }
}

// Error handling middleware
app.use(errorHandler)

// Graceful shutdown
const gracefulShutdown = async (): Promise<void> => {
  logger.info('Shutting down gracefully...')
  
  try {
    const { prisma } = await import('./config/database')
    await prisma.$disconnect()
  } catch (error) {
    logger.warn('Could not disconnect from database:', error)
  }
  
  try {
    const { redis } = await import('./config/redis')
    redis.disconnect()
  } catch (error) {
    logger.warn('Could not disconnect from Redis:', error)
  }
  
  process.exit(0)
}

process.on('SIGTERM', gracefulShutdown)
process.on('SIGINT', gracefulShutdown)

// Start server
const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`)
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`)
  logger.info('Health check available at /health?simple=true')
})

// Initialize database connection in background (don't block startup)
setTimeout(async () => {
  try {
    logger.info('Initializing database connection...')
    const { prisma } = await import('./config/database')
    await prisma.$connect()
    logger.info('Database connection initialized')
  } catch (error) {
    logger.error('Failed to initialize database connection:', error)
  }
}, 1000)

export { app, server }
