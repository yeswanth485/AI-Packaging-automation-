import { Response } from 'express'

/**
 * Response optimization utilities
 * Requirements: 22.11, 22.13 (optimize JSON serialization and responses)
 */

/**
 * Optimized JSON serialization with circular reference handling
 */
export function optimizedJSONStringify(obj: any, space?: number): string {
  const seen = new WeakSet()

  return JSON.stringify(
    obj,
    (_, value) => {
      // Handle circular references
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular]'
        }
        seen.add(value)
      }

      // Remove undefined values
      if (value === undefined) {
        return null
      }

      // Convert BigInt to string
      if (typeof value === 'bigint') {
        return value.toString()
      }

      // Remove null prototype objects
      if (value && typeof value === 'object' && !Object.getPrototypeOf(value)) {
        return { ...value }
      }

      return value
    },
    space
  )
}

/**
 * Send optimized JSON response
 */
export function sendOptimizedJSON(res: Response, data: any, statusCode: number = 200): Response {
  const jsonString = optimizedJSONStringify(data)
  
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Content-Length', Buffer.byteLength(jsonString).toString())
  
  return res.status(statusCode).send(jsonString)
}

/**
 * Remove sensitive fields from response
 */
export function sanitizeResponse<T extends Record<string, any>>(
  obj: T,
  fieldsToRemove: string[] = ['passwordHash', 'apiKey', 'refreshToken']
): Partial<T> {
  const sanitized = { ...obj }

  fieldsToRemove.forEach((field) => {
    delete sanitized[field]
  })

  return sanitized
}

/**
 * Flatten nested objects for better serialization performance
 */
export function flattenObject(
  obj: Record<string, any>,
  prefix: string = '',
  result: Record<string, any> = {}
): Record<string, any> {
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const newKey = prefix ? `${prefix}.${key}` : key

      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        flattenObject(obj[key], newKey, result)
      } else {
        result[newKey] = obj[key]
      }
    }
  }

  return result
}

/**
 * Limit array size in response
 */
export function limitArraySize<T>(array: T[], maxSize: number = 1000): T[] {
  if (array.length <= maxSize) {
    return array
  }

  return array.slice(0, maxSize)
}

/**
 * Create lightweight response by removing unnecessary fields
 */
export function createLightweightResponse<T extends Record<string, any>>(
  obj: T,
  includeFields?: string[]
): Partial<T> {
  if (!includeFields) {
    return obj
  }

  const lightweight: Partial<T> = {}

  includeFields.forEach((field) => {
    if (field in obj) {
      lightweight[field as keyof T] = obj[field]
    }
  })

  return lightweight
}

/**
 * Add cache headers to response
 */
export function addCacheHeaders(
  res: Response,
  maxAge: number = 3600,
  isPublic: boolean = false
): void {
  const cacheControl = isPublic ? 'public' : 'private'
  res.setHeader('Cache-Control', `${cacheControl}, max-age=${maxAge}`)
  res.setHeader('Expires', new Date(Date.now() + maxAge * 1000).toUTCString())
}

/**
 * Add no-cache headers to response
 */
export function addNoCacheHeaders(res: Response): void {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Expires', '0')
}

/**
 * Stream large JSON array response
 */
export function streamJSONArray(res: Response, items: any[]): void {
  res.setHeader('Content-Type', 'application/json')
  res.write('[')

  items.forEach((item, index) => {
    res.write(optimizedJSONStringify(item))
    if (index < items.length - 1) {
      res.write(',')
    }
  })

  res.write(']')
  res.end()
}

/**
 * Calculate response size
 */
export function calculateResponseSize(data: any): number {
  return Buffer.byteLength(optimizedJSONStringify(data))
}

/**
 * Check if response should be paginated based on size
 */
export function shouldPaginate(data: any[], threshold: number = 100): boolean {
  return data.length > threshold
}
