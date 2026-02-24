import express from 'express'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

// Minimal middleware
app.use(express.json())

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

// Root endpoint
app.get('/', (_req, res) => {
  res.json({ message: 'AI Packaging Optimizer API', status: 'running' })
})

// Start server
const server = app.listen(PORT, () => {
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
