import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'

// Load environment variables
dotenv.config()

const app = express()
const PORT = parseInt(process.env.PORT || '3000', 10)

console.log('=== SERVER STARTING ===')
console.log('PORT:', PORT)
console.log('NODE_ENV:', process.env.NODE_ENV)
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET')
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'SET' : 'NOT SET')

// Basic middleware - no dependencies
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// CORS - allow all for now
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-CSRF-Token', 'X-Request-ID'],
}))

// Simple health check - NO DEPENDENCIES
app.get('/health', (_req, res) => {
  console.log('Health check requested')
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    port: PORT,
    env: process.env.NODE_ENV || 'development'
  })
})

// Root endpoint
app.get('/', (_req, res) => {
  res.status(200).json({ 
    message: 'AI Packaging Optimizer API',
    status: 'running',
    timestamp: new Date().toISOString()
  })
})

// Serve frontend static files in production
if (process.env.NODE_ENV === 'production') {
  const frontendStaticPath = path.join(__dirname, '../frontend/out')
  
  if (fs.existsSync(frontendStaticPath)) {
    console.log('Frontend static files found at:', frontendStaticPath)
    
    // Serve static files
    app.use(express.static(frontendStaticPath))
    
    // SPA fallback for all non-API routes
    app.get('*', (req, res, next) => {
      // Skip API routes, health, and metrics
      if (req.path.startsWith('/api/') || req.path === '/health' || req.path === '/metrics') {
        return next()
      }
      
      const indexPath = path.join(frontendStaticPath, 'index.html')
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath)
      } else {
        res.status(404).json({ error: 'Frontend not found' })
      }
    })
  } else {
    console.log('Frontend build not found at:', frontendStaticPath)
  }
}

// Load API routes AFTER health check is set up
async function loadAPIRoutes() {
  try {
    console.log('Loading API routes...')
    
    // Lazy load logger
    const { logger } = await import('./utils/logger')
    
    // Load middleware
    const { errorHandler, requestIdMiddleware } = await import('./middleware/errorHandler')
    const { metricsMiddleware } = await import('./middleware/metrics')
    const { register } = await import('./utils/metrics')
    
    // Add middleware
    app.use(requestIdMiddleware)
    app.use(metricsMiddleware)
    
    // Metrics endpoint
    app.get('/metrics', async (_req, res) => {
      try {
        res.set('Content-Type', register.contentType)
        const metrics = await register.metrics()
        res.end(metrics)
      } catch (error) {
        res.status(500).end()
      }
    })
    
    // Load routes
    const authRoutes = await import('./routes/auth.routes')
    const boxRoutes = await import('./routes/box.routes')
    const simulationRoutes = await import('./routes/simulation.routes')
    const optimizeRoutes = await import('./routes/optimize.routes')
    const subscriptionRoutes = await import('./routes/subscription.routes')
    const analyticsRoutes = await import('./routes/analytics.routes')
    const configRoutes = await import('./routes/config.routes')
    
    app.use('/api/auth', authRoutes.default)
    app.use('/api/boxes', boxRoutes.default)
    app.use('/api/simulation', simulationRoutes.default)
    app.use('/api/optimize', optimizeRoutes.default)
    app.use('/api/subscriptions', subscriptionRoutes.default)
    app.use('/api/analytics', analyticsRoutes.default)
    app.use('/api/config', configRoutes.default)
    
    // Error handler
    app.use(errorHandler)
    
    logger.info('API routes loaded successfully')
    
    // Initialize database connection in background
    setTimeout(async () => {
      try {
        logger.info('Initializing database connection...')
        const { prisma } = await import('./config/database')
        await prisma.$connect()
        logger.info('Database connection initialized')
      } catch (error) {
        logger.error('Failed to initialize database connection:', error)
      }
    }, 2000)
    
  } catch (error) {
    console.error('Failed to load API routes:', error)
  }
}

// Start server FIRST, then load routes
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('=== SERVER STARTED ===')
  console.log(`Server running on port ${PORT}`)
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log('Health check available at /health')
  console.log('Server bound to 0.0.0.0 (accessible externally)')
  console.log('======================')
  
  // Run database migrations in background (non-blocking)
  if (process.env.NODE_ENV === 'production') {
    setTimeout(async () => {
      try {
        console.log('Running database migrations...')
        const { exec } = require('child_process')
        exec('npx prisma migrate deploy', (error: any, stdout: any, stderr: any) => {
          if (error) {
            console.error('Migration error:', error)
            return
          }
          console.log('Migrations completed:', stdout)
          if (stderr) console.error('Migration stderr:', stderr)
        })
      } catch (error) {
        console.error('Failed to run migrations:', error)
      }
    }, 1000)
  }
  
  // Load API routes AFTER server is listening
  loadAPIRoutes().catch(err => {
    console.error('Error loading API routes:', err)
  })
})

// Graceful shutdown
const gracefulShutdown = async (): Promise<void> => {
  console.log('Shutting down gracefully...')
  
  try {
    const { prisma } = await import('./config/database')
    await prisma.$disconnect()
  } catch (error) {
    console.warn('Could not disconnect from database:', error)
  }
  
  try {
    const { redis } = await import('./config/redis')
    redis.disconnect()
  } catch (error) {
    console.warn('Could not disconnect from Redis:', error)
  }
  
  process.exit(0)
}

process.on('SIGTERM', gracefulShutdown)
process.on('SIGINT', gracefulShutdown)

export { app, server }
