import { Request, Response, NextFunction } from 'express'
import Joi from 'joi'
import { AppError } from './errorHandler'
import { logger } from '../utils/logger'

/**
 * Sanitize string input to prevent XSS and injection attacks
 */
const sanitizeString = (value: string): string => {
  if (typeof value !== 'string') return value
  
  // Remove potential XSS patterns
  return value
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim()
}

/**
 * Recursively sanitize object values
 */
const sanitizeObject = (obj: any): any => {
  if (typeof obj === 'string') {
    return sanitizeString(obj)
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject)
  }
  
  if (obj && typeof obj === 'object') {
    const sanitized: any = {}
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        sanitized[key] = sanitizeObject(obj[key])
      }
    }
    return sanitized
  }
  
  return obj
}

/**
 * Middleware to validate request body against a Joi schema
 */
export const validateRequest = (schema: Joi.ObjectSchema) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    })

    if (error) {
      const errorMessage = error.details
        .map((detail) => detail.message)
        .join(', ')
      
      logger.warn('Request validation failed', {
        path: req.path,
        method: req.method,
        errors: error.details,
        userId: req.user?.id,
      })
      
      return next(new AppError(errorMessage, 400))
    }

    // Sanitize and replace request body with validated value
    req.body = sanitizeObject(value)
    next()
  }
}

/**
 * Middleware to validate query parameters against a Joi schema
 */
export const validateQuery = (schema: Joi.ObjectSchema) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    })

    if (error) {
      const errorMessage = error.details
        .map((detail) => detail.message)
        .join(', ')
      
      logger.warn('Query validation failed', {
        path: req.path,
        method: req.method,
        errors: error.details,
        userId: req.user?.id,
      })
      
      return next(new AppError(errorMessage, 400))
    }

    // Sanitize and replace query with validated value
    req.query = sanitizeObject(value)
    next()
  }
}

/**
 * Middleware to validate route parameters against a Joi schema
 */
export const validateParams = (schema: Joi.ObjectSchema) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
    })

    if (error) {
      const errorMessage = error.details
        .map((detail) => detail.message)
        .join(', ')
      
      logger.warn('Params validation failed', {
        path: req.path,
        method: req.method,
        errors: error.details,
        userId: req.user?.id,
      })
      
      return next(new AppError(errorMessage, 400))
    }

    // Sanitize and replace params with validated value
    req.params = sanitizeObject(value)
    next()
  }
}

/**
 * Middleware to validate file uploads
 */
export const validateFileUpload = (
  allowedMimeTypes: string[],
  maxSizeBytes: number
) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.file) {
      return next(new AppError('File upload required', 400))
    }

    // Validate file size
    if (req.file.size > maxSizeBytes) {
      logger.warn('File upload size exceeded', {
        fileName: req.file.originalname,
        size: req.file.size,
        maxSize: maxSizeBytes,
        userId: req.user?.id,
      })
      return next(
        new AppError(
          `File size exceeds maximum allowed size of ${maxSizeBytes / (1024 * 1024)}MB`,
          400
        )
      )
    }

    // Validate MIME type
    if (!allowedMimeTypes.includes(req.file.mimetype)) {
      logger.warn('Invalid file type uploaded', {
        fileName: req.file.originalname,
        mimeType: req.file.mimetype,
        allowedTypes: allowedMimeTypes,
        userId: req.user?.id,
      })
      return next(
        new AppError(
          `Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}`,
          400
        )
      )
    }

    // Validate file extension
    const fileExtension = req.file.originalname.split('.').pop()?.toLowerCase()
    const allowedExtensions = allowedMimeTypes.map((type) => {
      const parts = type.split('/')
      return parts[parts.length - 1]
    })

    if (fileExtension && !allowedExtensions.includes(fileExtension)) {
      logger.warn('Invalid file extension', {
        fileName: req.file.originalname,
        extension: fileExtension,
        allowedExtensions,
        userId: req.user?.id,
      })
      return next(
        new AppError(
          `Invalid file extension. Allowed extensions: ${allowedExtensions.join(', ')}`,
          400
        )
      )
    }

    next()
  }
}
