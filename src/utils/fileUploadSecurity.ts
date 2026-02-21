import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { logger } from './logger'

// Maximum file size: 50MB
export const MAX_FILE_SIZE = 50 * 1024 * 1024

// Allowed MIME types for CSV uploads
export const ALLOWED_CSV_MIME_TYPES = [
  'text/csv',
  'application/csv',
  'text/plain',
  'application/vnd.ms-excel',
]

// Allowed file extensions
export const ALLOWED_CSV_EXTENSIONS = ['.csv', '.txt']

/**
 * Validate file type by checking magic bytes (file signature)
 * This prevents MIME type spoofing
 */
export const validateFileSignature = (filePath: string): boolean => {
  try {
    const buffer = Buffer.alloc(512)
    const fd = fs.openSync(filePath, 'r')
    fs.readSync(fd, buffer, 0, 512, 0)
    fs.closeSync(fd)

    // Check for CSV/text file signatures
    // CSV files are plain text, so we check for common text patterns
    const content = buffer.toString('utf8', 0, 100)

    // Check if content is valid UTF-8 text
    const isText = /^[\x20-\x7E\r\n\t]*$/.test(content)

    if (!isText) {
      logger.warn('File signature validation failed: Not a text file', {
        filePath,
      })
      return false
    }

    return true
  } catch (error) {
    logger.error('Error validating file signature', error)
    return false
  }
}

/**
 * Scan file content for malicious patterns
 * Checks for common attack vectors in CSV files
 */
export const scanFileContent = (filePath: string): {
  isSafe: boolean
  threats: string[]
} => {
  const threats: string[] = []

  try {
    const content = fs.readFileSync(filePath, 'utf8')

    // Check for CSV injection patterns
    const csvInjectionPatterns = [
      /^[=+\-@]/m, // Formula injection
      /\|.*\|/g, // Pipe commands
      /<script/gi, // Script tags
      /javascript:/gi, // JavaScript protocol
      /data:text\/html/gi, // Data URLs
    ]

    for (const pattern of csvInjectionPatterns) {
      if (pattern.test(content)) {
        threats.push(`Potential CSV injection detected: ${pattern.source}`)
      }
    }

    // Check for excessively long lines (potential DoS)
    const lines = content.split('\n')
    const maxLineLength = 10000
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].length > maxLineLength) {
        threats.push(`Line ${i + 1} exceeds maximum length`)
        break
      }
    }

    // Check for suspicious binary content
    const binaryPattern = /[\x00-\x08\x0B\x0C\x0E-\x1F]/
    if (binaryPattern.test(content)) {
      threats.push('Suspicious binary content detected')
    }

    return {
      isSafe: threats.length === 0,
      threats,
    }
  } catch (error) {
    logger.error('Error scanning file content', error)
    return {
      isSafe: false,
      threats: ['Failed to scan file content'],
    }
  }
}

/**
 * Generate a secure random filename to prevent path traversal
 */
export const generateSecureFilename = (originalName: string): string => {
  const extension = path.extname(originalName).toLowerCase()
  const randomName = crypto.randomBytes(16).toString('hex')
  return `${randomName}${extension}`
}

/**
 * Sanitize filename to prevent path traversal attacks
 */
export const sanitizeFilename = (filename: string): string => {
  // Remove path separators and special characters
  return filename
    .replace(/[\/\\]/g, '')
    .replace(/\.\./g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .substring(0, 255) // Limit filename length
}

/**
 * Create isolated upload directory with restricted permissions
 */
export const createIsolatedUploadDir = (baseDir: string): string => {
  const uploadDir = path.join(baseDir, 'uploads', crypto.randomBytes(8).toString('hex'))

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true, mode: 0o700 })
  }

  return uploadDir
}

/**
 * Securely delete file after processing
 */
export const secureDeleteFile = (filePath: string): void => {
  try {
    if (fs.existsSync(filePath)) {
      // Overwrite file with random data before deletion (optional, for sensitive data)
      const stats = fs.statSync(filePath)
      const randomData = crypto.randomBytes(stats.size)
      fs.writeFileSync(filePath, randomData)

      // Delete file
      fs.unlinkSync(filePath)

      logger.info('File securely deleted', { filePath })
    }
  } catch (error) {
    logger.error('Error securely deleting file', error)
  }
}

/**
 * Validate and sanitize CSV file upload
 */
export const validateCSVUpload = (
  filePath: string,
  originalName: string,
  mimeType: string,
  size: number
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = []

  // Check file size
  if (size > MAX_FILE_SIZE) {
    errors.push(`File size exceeds maximum allowed size of ${MAX_FILE_SIZE / (1024 * 1024)}MB`)
  }

  // Check MIME type
  if (!ALLOWED_CSV_MIME_TYPES.includes(mimeType)) {
    errors.push(`Invalid MIME type: ${mimeType}. Allowed types: ${ALLOWED_CSV_MIME_TYPES.join(', ')}`)
  }

  // Check file extension
  const extension = path.extname(originalName).toLowerCase()
  if (!ALLOWED_CSV_EXTENSIONS.includes(extension)) {
    errors.push(`Invalid file extension: ${extension}. Allowed extensions: ${ALLOWED_CSV_EXTENSIONS.join(', ')}`)
  }

  // Validate file signature
  if (!validateFileSignature(filePath)) {
    errors.push('File signature validation failed. File may not be a valid CSV.')
  }

  // Scan for malicious content
  const scanResult = scanFileContent(filePath)
  if (!scanResult.isSafe) {
    errors.push(...scanResult.threats)
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * Clean up old upload files (retention policy)
 */
export const cleanupOldUploads = (uploadDir: string, maxAgeMs: number): void => {
  try {
    if (!fs.existsSync(uploadDir)) {
      return
    }

    const files = fs.readdirSync(uploadDir)
    const now = Date.now()

    for (const file of files) {
      const filePath = path.join(uploadDir, file)
      const stats = fs.statSync(filePath)

      if (now - stats.mtimeMs > maxAgeMs) {
        secureDeleteFile(filePath)
        logger.info('Old upload file deleted', { filePath, age: now - stats.mtimeMs })
      }
    }
  } catch (error) {
    logger.error('Error cleaning up old uploads', error)
  }
}
