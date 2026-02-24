import winston from 'winston'

const logLevel = process.env.LOG_LEVEL || 'info'

const transports: winston.transport[] = []

// Always add console transport
transports.push(
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  })
)

// Add file transports only if logs directory is writable (development/local)
if (process.env.NODE_ENV !== 'production') {
  try {
    transports.push(
      new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
      new winston.transports.File({ filename: 'logs/combined.log' })
    )
  } catch (error) {
    console.warn('Could not create file transports for logger:', error)
  }
}

const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'packaging-optimizer' },
  transports,
})

export { logger }
