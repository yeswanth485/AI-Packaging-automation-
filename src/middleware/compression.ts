import { Request, Response, NextFunction } from 'express'
import zlib from 'zlib'
import { logger } from '../utils/logger'

/**
 * Compression middleware for API responses
 * Requirements: 22.11 (response compression)
 */
export function compressionMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const acceptEncoding = req.headers['accept-encoding'] || ''

  // Skip compression for small responses (< 1KB)
  const originalSend = res.send
  const originalJson = res.json

  // Override res.send
  res.send = function (data: any): Response {
    if (shouldCompress(data, acceptEncoding)) {
      return compressAndSend(res, data, acceptEncoding, originalSend)
    }
    return originalSend.call(res, data)
  }

  // Override res.json
  res.json = function (data: any): Response {
    const jsonString = JSON.stringify(data)
    if (shouldCompress(jsonString, acceptEncoding)) {
      return compressAndSend(res, jsonString, acceptEncoding, originalSend)
    }
    return originalJson.call(res, data)
  }

  next()
}

/**
 * Check if response should be compressed
 */
function shouldCompress(data: any, acceptEncoding: string): boolean {
  // Don't compress if client doesn't support it
  if (!acceptEncoding.includes('gzip') && !acceptEncoding.includes('deflate')) {
    return false
  }

  // Get data size
  const dataSize = Buffer.byteLength(
    typeof data === 'string' ? data : JSON.stringify(data)
  )

  // Only compress if data is larger than 1KB
  return dataSize > 1024
}

/**
 * Compress and send response
 */
function compressAndSend(
  res: Response,
  data: any,
  acceptEncoding: string,
  originalSend: Function
): Response {
  const buffer = Buffer.from(typeof data === 'string' ? data : JSON.stringify(data))

  // Use gzip if supported, otherwise deflate
  if (acceptEncoding.includes('gzip')) {
    zlib.gzip(buffer, (err, compressed) => {
      if (err) {
        logger.error('Compression error:', err)
        return originalSend.call(res, data)
      }
      res.setHeader('Content-Encoding', 'gzip')
      res.setHeader('Content-Length', compressed.length.toString())
      return originalSend.call(res, compressed)
    })
  } else if (acceptEncoding.includes('deflate')) {
    zlib.deflate(buffer, (err, compressed) => {
      if (err) {
        logger.error('Compression error:', err)
        return originalSend.call(res, data)
      }
      res.setHeader('Content-Encoding', 'deflate')
      res.setHeader('Content-Length', compressed.length.toString())
      return originalSend.call(res, compressed)
    })
  }

  return res
}
