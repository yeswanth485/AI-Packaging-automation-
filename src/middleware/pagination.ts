import { Request, Response, NextFunction } from 'express'

/**
 * Pagination parameters interface
 */
export interface PaginationParams {
  page: number
  limit: number
  offset: number
}

/**
 * Paginated response interface
 */
export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

/**
 * Pagination middleware
 * Requirements: 22.13 (pagination for large result sets)
 */
export function paginationMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Parse pagination parameters from query string
  const page = Math.max(1, parseInt(req.query.page as string) || 1)
  const limit = Math.min(
    100,
    Math.max(1, parseInt(req.query.limit as string) || 20)
  )
  const offset = (page - 1) * limit

  // Attach pagination params to request
  req.pagination = {
    page,
    limit,
    offset,
  }

  // Add helper method to create paginated response
  res.paginate = function <T>(data: T[], total: number): Response {
    const totalPages = Math.ceil(total / limit)
    const hasNext = page < totalPages
    const hasPrev = page > 1

    const response: PaginatedResponse<T> = {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext,
        hasPrev,
      },
    }

    return res.json(response)
  }

  next()
}

/**
 * Helper function to create pagination metadata
 */
export function createPaginationMeta(
  page: number,
  limit: number,
  total: number
): PaginatedResponse<any>['pagination'] {
  const totalPages = Math.ceil(total / limit)
  const hasNext = page < totalPages
  const hasPrev = page > 1

  return {
    page,
    limit,
    total,
    totalPages,
    hasNext,
    hasPrev,
  }
}

/**
 * Apply pagination to Prisma query
 */
export function applyPagination(pagination: PaginationParams) {
  return {
    skip: pagination.offset,
    take: pagination.limit,
  }
}

// Extend Express Request and Response types
declare global {
  namespace Express {
    interface Request {
      pagination?: PaginationParams
    }
    interface Response {
      paginate?<T>(data: T[], total: number): Response
    }
  }
}
