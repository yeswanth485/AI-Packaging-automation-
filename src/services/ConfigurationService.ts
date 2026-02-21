import { PrismaClient } from '@prisma/client'
import { v4 as uuidv4 } from 'uuid'
import { ConfigurationModel, BaselineStrategy } from '../types'
import { cacheService } from './CacheService'

/**
 * ConfigurationService - Manages user-specific packing configurations
 * Requirements: 19.1-19.11
 */
export class ConfigurationService {
  private prisma: PrismaClient

  // Default configuration values
  private readonly defaults = {
    bufferPadding: 2, // cm
    volumetricDivisor: 5000,
    shippingRatePerKg: 0.5, // $ per kg
    baselineBoxSelectionStrategy: BaselineStrategy.NEXT_LARGER,
    enableForecast: true,
  }

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  /**
   * Create a new configuration for a user
   * Requirements: 19.1-19.8
   */
  async createConfiguration(
    userId: string,
    config: {
      bufferPadding?: number
      volumetricDivisor?: number
      shippingRatePerKg?: number
      maxWeightOverride?: number
      baselineBoxSelectionStrategy?: BaselineStrategy
      enableForecast?: boolean
    }
  ): Promise<ConfigurationModel> {
    // Requirement 19.6: Validate buffer padding is non-negative
    if (config.bufferPadding !== undefined && config.bufferPadding < 0) {
      throw new Error('Buffer padding must be non-negative')
    }

    // Requirement 19.7: Validate volumetric divisor is positive
    if (config.volumetricDivisor !== undefined && config.volumetricDivisor <= 0) {
      throw new Error('Volumetric divisor must be positive')
    }

    // Requirement 19.8: Validate shipping rate is positive
    if (config.shippingRatePerKg !== undefined && config.shippingRatePerKg <= 0) {
      throw new Error('Shipping rate must be positive')
    }

    // Validate max weight override if provided
    if (config.maxWeightOverride !== undefined && config.maxWeightOverride <= 0) {
      throw new Error('Max weight override must be positive')
    }

    const now = new Date()

    const configuration = await this.prisma.configuration.create({
      data: {
        id: uuidv4(),
        userId,
        bufferPadding: config.bufferPadding ?? this.defaults.bufferPadding,
        volumetricDivisor: config.volumetricDivisor ?? this.defaults.volumetricDivisor,
        shippingRatePerKg: config.shippingRatePerKg ?? this.defaults.shippingRatePerKg,
        maxWeightOverride: config.maxWeightOverride,
        baselineBoxSelectionStrategy:
          config.baselineBoxSelectionStrategy ?? this.defaults.baselineBoxSelectionStrategy,
        enableForecast: config.enableForecast ?? this.defaults.enableForecast,
        createdAt: now,
        updatedAt: now,
      },
    })

    const result = this.mapToConfigurationModel(configuration)

    // Cache the configuration
    await cacheService.setUserConfig(userId, result)

    return result
  }

  /**
   * Update user configuration
   * Requirement: 19.9
   */
  async updateConfiguration(
    userId: string,
    updates: {
      bufferPadding?: number
      volumetricDivisor?: number
      shippingRatePerKg?: number
      maxWeightOverride?: number
      baselineBoxSelectionStrategy?: BaselineStrategy
      enableForecast?: boolean
    }
  ): Promise<ConfigurationModel> {
    // Validate updates
    if (updates.bufferPadding !== undefined && updates.bufferPadding < 0) {
      throw new Error('Buffer padding must be non-negative')
    }

    if (updates.volumetricDivisor !== undefined && updates.volumetricDivisor <= 0) {
      throw new Error('Volumetric divisor must be positive')
    }

    if (updates.shippingRatePerKg !== undefined && updates.shippingRatePerKg <= 0) {
      throw new Error('Shipping rate must be positive')
    }

    if (updates.maxWeightOverride !== undefined && updates.maxWeightOverride <= 0) {
      throw new Error('Max weight override must be positive')
    }

    const configuration = await this.prisma.configuration.update({
      where: { userId },
      data: {
        ...updates,
        updatedAt: new Date(),
      },
    })

    const result = this.mapToConfigurationModel(configuration)

    // Invalidate and update cache
    await cacheService.setUserConfig(userId, result)

    return result
  }

  /**
   * Get configuration for a user
   * Requirement: 19.10, 19.11
   */
  async getConfiguration(userId: string): Promise<ConfigurationModel> {
    // Try to get from cache first
    const cached = await cacheService.getUserConfig(userId)
    if (cached) {
      return cached
    }

    const configuration = await this.prisma.configuration.findUnique({
      where: { userId },
    })

    if (!configuration) {
      // Return default configuration if none exists
      return this.createConfiguration(userId, {})
    }

    const result = this.mapToConfigurationModel(configuration)

    // Cache the result
    await cacheService.setUserConfig(userId, result)

    return result
  }

  /**
   * Delete user configuration (reset to defaults)
   */
  async deleteConfiguration(userId: string): Promise<void> {
    await this.prisma.configuration.delete({
      where: { userId },
    })

    // Invalidate cache
    await cacheService.invalidateUserConfig(userId)
  }

  /**
   * Get default configuration values
   */
  getDefaults(): Omit<ConfigurationModel, 'id' | 'userId' | 'createdAt' | 'updatedAt'> {
    return {
      bufferPadding: this.defaults.bufferPadding,
      volumetricDivisor: this.defaults.volumetricDivisor,
      shippingRatePerKg: this.defaults.shippingRatePerKg,
      maxWeightOverride: undefined,
      baselineBoxSelectionStrategy: this.defaults.baselineBoxSelectionStrategy,
      enableForecast: this.defaults.enableForecast,
    }
  }

  /**
   * Validate configuration values
   */
  validateConfiguration(config: {
    bufferPadding?: number
    volumetricDivisor?: number
    shippingRatePerKg?: number
    maxWeightOverride?: number
  }): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (config.bufferPadding !== undefined && config.bufferPadding < 0) {
      errors.push('Buffer padding must be non-negative')
    }

    if (config.volumetricDivisor !== undefined && config.volumetricDivisor <= 0) {
      errors.push('Volumetric divisor must be positive')
    }

    if (config.shippingRatePerKg !== undefined && config.shippingRatePerKg <= 0) {
      errors.push('Shipping rate must be positive')
    }

    if (config.maxWeightOverride !== undefined && config.maxWeightOverride <= 0) {
      errors.push('Max weight override must be positive')
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  /**
   * Map Prisma configuration to domain model
   */
  private mapToConfigurationModel(configuration: any): ConfigurationModel {
    return {
      id: configuration.id,
      userId: configuration.userId,
      bufferPadding: configuration.bufferPadding,
      volumetricDivisor: configuration.volumetricDivisor,
      shippingRatePerKg: configuration.shippingRatePerKg,
      maxWeightOverride: configuration.maxWeightOverride,
      baselineBoxSelectionStrategy: configuration.baselineBoxSelectionStrategy as BaselineStrategy,
      enableForecast: configuration.enableForecast,
      createdAt: configuration.createdAt,
      updatedAt: configuration.updatedAt,
    }
  }
}
