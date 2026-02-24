import express from 'express'
import dotenv from 'dotenv'

// Load environment variables FIRST
dotenv.config()

console.log('=================================')
console.log('Starting AI Packaging Optimizer...')
console.log('Node version:', process.version)
console.log('Environment:', process.env.NODE_ENV)
console.log('PORT from env:', process.env.PORT)
console.log('=================================')

const app = express()
const PORT = parseInt(process.env.PORT || '3000', 10)

console.log('Express app created')
console.log('Using PORT:', PORT)

// Minimal middleware
app.use(express.json())
console.log('Middleware configured')

// Ultra-simple health check
app.get('/health', (_req, res) => {
  console.log('Health check requested')
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    port: PORT,
    env: process.env.NODE_ENV
  })
})
console.log('Health check route registered')

// Root endpoint
app.get('/', (_req, res) => {
  res.json({ message: 'AI Packaging Optimizer API', status: 'running' })
})
console.log('Root route registered')

console.log('About to start listening on port', PORT)

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`=================================`)
  console.log(`Server started successfully!`)
  console.log(`Port: ${PORT}`)
  console.log(`Environment: ${process.env.NODE_ENV}`)
  console.log(`Health check: http://localhost:${PORT}/health`)
  console.log(`=================================`)
})

// Error handling
server.on('error', (error: any) => {
  console.error('Server error:', error)
  process.exit(1)
})

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error)
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason)
  process.exit(1)
})

export { app, server }
