// Jest setup file for test environment configuration

// Suppress Redis connection errors in tests
const originalConsoleError = console.error
console.error = (...args: any[]) => {
  // Filter out Redis connection errors
  const message = args[0]?.toString() || ''
  if (
    message.includes('Redis connection error') ||
    message.includes('ECONNREFUSED') ||
    message.includes('Redis connection closed')
  ) {
    return
  }
  originalConsoleError(...args)
}

// Set test environment variables
process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'test-secret-key-for-testing-only'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db'
process.env.REDIS_URL = 'redis://localhost:6379'

// Increase test timeout for integration tests
jest.setTimeout(30000)
