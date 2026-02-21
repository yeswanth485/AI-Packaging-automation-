import { redis } from '../config/redis'
import { logger } from '../utils/logger'

/**
 * CacheService provides a centralized caching layer using Redis
 * for frequently accessed data like box catalog, user config, and analytics
 */
export class CacheService {
  private static readonly DEFAULT_TTL = 3600 // 1 hour in seconds
  private static readonly BOX_CATALOG_TTL = 1800 // 30 minutes
  private static readonly USER_CONFIG_TTL = 3600 // 1 hour
  private static readonly ANALYTICS_TTL = 300 // 5 minutes

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await redis.get(key)
      if (!value) {
        return null
      }
      return JSON.parse(value) as T
    } catch (error) {
      logger.error('Cache get error:', { key, error })
      return null
    }
  }

  /**
   * Set value in cache with TTL
   */
  async set(key: string, value: any, ttl: number = CacheService.DEFAULT_TTL): Promise<void> {
    try {
      await redis.setex(key, ttl, JSON.stringify(value))
    } catch (error) {
      logger.error('Cache set error:', { key, error })
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<void> {
    try {
      await redis.del(key)
    } catch (error) {
      logger.error('Cache delete error:', { key, error })
    }
  }

  /**
   * Delete multiple keys matching a pattern
   */
  async deletePattern(pattern: string): Promise<void> {
    try {
      const keys = await redis.keys(pattern)
      if (keys.length > 0) {
        await redis.del(...keys)
      }
    } catch (error) {
      logger.error('Cache delete pattern error:', { pattern, error })
    }
  }

  /**
   * Cache box catalog queries
   */
  async getBoxCatalog(activeOnly: boolean): Promise<any[] | null> {
    const key = `box_catalog:${activeOnly ? 'active' : 'all'}`
    return this.get(key)
  }

  async setBoxCatalog(activeOnly: boolean, boxes: any[]): Promise<void> {
    const key = `box_catalog:${activeOnly ? 'active' : 'all'}`
    await this.set(key, boxes, CacheService.BOX_CATALOG_TTL)
  }

  async invalidateBoxCatalog(): Promise<void> {
    await this.deletePattern('box_catalog:*')
  }

  /**
   * Cache suitable boxes queries
   */
  async getSuitableBoxes(dimensions: string, weight: number): Promise<any[] | null> {
    const key = `suitable_boxes:${dimensions}:${weight}`
    return this.get(key)
  }

  async setSuitableBoxes(dimensions: string, weight: number, boxes: any[]): Promise<void> {
    const key = `suitable_boxes:${dimensions}:${weight}`
    await this.set(key, boxes, CacheService.BOX_CATALOG_TTL)
  }

  /**
   * Cache user configuration
   */
  async getUserConfig(userId: string): Promise<any | null> {
    const key = `user_config:${userId}`
    return this.get(key)
  }

  async setUserConfig(userId: string, config: any): Promise<void> {
    const key = `user_config:${userId}`
    await this.set(key, config, CacheService.USER_CONFIG_TTL)
  }

  async invalidateUserConfig(userId: string): Promise<void> {
    const key = `user_config:${userId}`
    await this.delete(key)
  }

  /**
   * Cache analytics results
   */
  async getAnalytics(userId: string, type: string, params: string): Promise<any | null> {
    const key = `analytics:${userId}:${type}:${params}`
    return this.get(key)
  }

  async setAnalytics(userId: string, type: string, params: string, data: any): Promise<void> {
    const key = `analytics:${userId}:${type}:${params}`
    await this.set(key, data, CacheService.ANALYTICS_TTL)
  }

  async invalidateUserAnalytics(userId: string): Promise<void> {
    await this.deletePattern(`analytics:${userId}:*`)
  }

  /**
   * Cache box usage statistics
   */
  async getBoxStats(dateRange: string): Promise<any | null> {
    const key = `box_stats:${dateRange}`
    return this.get(key)
  }

  async setBoxStats(dateRange: string, stats: any): Promise<void> {
    const key = `box_stats:${dateRange}`
    await this.set(key, stats, CacheService.ANALYTICS_TTL)
  }

  /**
   * Check if Redis is connected
   */
  async isConnected(): Promise<boolean> {
    try {
      await redis.ping()
      return true
    } catch (error) {
      logger.error('Redis connection check failed:', error)
      return false
    }
  }
}

export const cacheService = new CacheService()
