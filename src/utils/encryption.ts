import crypto from 'crypto'
import { logger } from './logger'

// Encryption algorithm
const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16
const SALT_LENGTH = 64

/**
 * Get encryption key from environment or generate one
 */
const getEncryptionKey = (): Buffer => {
  const key = process.env.ENCRYPTION_KEY

  if (!key) {
    logger.warn(
      'ENCRYPTION_KEY not set in environment. Using default key (NOT SECURE FOR PRODUCTION)'
    )
    // In production, this should throw an error
    return crypto.scryptSync('default-key-change-in-production', 'salt', 32)
  }

  // Derive key from environment variable
  return crypto.scryptSync(key, 'salt', 32)
}

/**
 * Encrypt sensitive data using AES-256-GCM
 * @param plaintext - Data to encrypt
 * @returns Encrypted data with IV and auth tag
 */
export const encrypt = (plaintext: string): string => {
  try {
    const key = getEncryptionKey()
    const iv = crypto.randomBytes(IV_LENGTH)

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

    let encrypted = cipher.update(plaintext, 'utf8', 'hex')
    encrypted += cipher.final('hex')

    const authTag = cipher.getAuthTag()

    // Combine IV, auth tag, and encrypted data
    const result = Buffer.concat([
      iv,
      authTag,
      Buffer.from(encrypted, 'hex'),
    ]).toString('base64')

    return result
  } catch (error) {
    logger.error('Encryption error', error)
    throw new Error('Failed to encrypt data')
  }
}

/**
 * Decrypt data encrypted with AES-256-GCM
 * @param encryptedData - Encrypted data with IV and auth tag
 * @returns Decrypted plaintext
 */
export const decrypt = (encryptedData: string): string => {
  try {
    const key = getEncryptionKey()
    const buffer = Buffer.from(encryptedData, 'base64')

    // Extract IV, auth tag, and encrypted data
    const iv = buffer.subarray(0, IV_LENGTH)
    const authTag = buffer.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
    const encrypted = buffer.subarray(IV_LENGTH + AUTH_TAG_LENGTH)

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)

    let decrypted = decipher.update(encrypted.toString('hex'), 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  } catch (error) {
    logger.error('Decryption error', error)
    throw new Error('Failed to decrypt data')
  }
}

/**
 * Hash sensitive data using SHA-256 (one-way)
 * Useful for data that needs to be compared but not retrieved
 * @param data - Data to hash
 * @returns Hashed data
 */
export const hash = (data: string): string => {
  return crypto.createHash('sha256').update(data).digest('hex')
}

/**
 * Generate a secure random token
 * @param length - Length of the token in bytes (default: 32)
 * @returns Random token as hex string
 */
export const generateSecureToken = (length: number = 32): string => {
  return crypto.randomBytes(length).toString('hex')
}

/**
 * Constant-time string comparison to prevent timing attacks
 * @param a - First string
 * @param b - Second string
 * @returns True if strings are equal
 */
export const secureCompare = (a: string, b: string): boolean => {
  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))
  } catch {
    // If lengths don't match, timingSafeEqual throws
    return false
  }
}
