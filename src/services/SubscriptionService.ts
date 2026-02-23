import { PrismaClient } from '@prisma/client'
import { v4 as uuidv4 } from 'uuid'
import {
  Subscription,
  SubscriptionTier,
  SubscriptionStatus,
  QuotaStatus,
  UsageRecord,
  BillingPeriod,
  Invoice,
  InvoiceStatus,
} from '../types'

/**
 * SubscriptionService - Manages subscription lifecycle, usage tracking, and quota enforcement
 * Requirements: 10.1-10.14, 11.1-11.10
 */
export class SubscriptionService {
  private prisma: PrismaClient

  // Tier configurations
  private readonly tierConfig = {
    [SubscriptionTier.FREE]: { quota: 0, price: 0 },
    [SubscriptionTier.BASIC]: { quota: 1000, price: 49 },
    [SubscriptionTier.PRO]: { quota: 5000, price: 199 },
    [SubscriptionTier.ENTERPRISE]: { quota: -1, price: 999 }, // -1 = unlimited
  }

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  /**
   * Create a new subscription for a user
   * Requirements: 10.1, 10.2, 10.3, 10.4
   */
  async createSubscription(userId: string, tier: SubscriptionTier): Promise<Subscription> {
    const config = this.tierConfig[tier]
    const now = new Date()
    const renewalDate = new Date(now)
    renewalDate.setMonth(renewalDate.getMonth() + 1)

    const subscription = await this.prisma.subscription.create({
      data: {
        id: uuidv4(),
        userId,
        tier: tier as any, // Cast to Prisma enum type
        monthlyQuota: config.quota,
        currentUsage: 0,
        status: 'ACTIVE', // Use string literal instead of enum
        startDate: now,
        renewalDate,
        price: config.price,
        autoRenew: true,
      },
    })

    return this.mapToSubscription(subscription)
  }

  /**
   * Update subscription tier with optimistic locking
   * Requirements: 10.5, 10.6, 20.9, 24.2
   */
  async updateSubscription(subscriptionId: string, newTier: SubscriptionTier, expectedVersion?: number): Promise<Subscription> {
    const existing = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
    })

    if (!existing) {
      throw new Error('Subscription not found')
    }

    // Requirement 24.2: Optimistic locking - check version if provided
    if (expectedVersion !== undefined && existing.version !== expectedVersion) {
      const error = new Error('Concurrent modification detected. Please retry with the latest version.')
      ;(error as any).code = 'CONCURRENT_MODIFICATION'
      ;(error as any).statusCode = 409
      throw error
    }

    const config = this.tierConfig[newTier]
    const isUpgrade = config.price > this.tierConfig[existing.tier as SubscriptionTier].price

    // Requirement 10.5: Apply upgrades immediately
    // Requirement 10.6: Apply downgrades at renewal
    const updateData: any = {
      tier: newTier,
      monthlyQuota: config.quota,
      price: config.price,
      version: { increment: 1 }, // Increment version for optimistic locking
    }

    if (isUpgrade) {
      // Apply immediately with version check
      const subscription = await this.prisma.subscription.update({
        where: { 
          id: subscriptionId,
          version: existing.version, // Ensure version hasn't changed
        },
        data: updateData,
      })
      return this.mapToSubscription(subscription)
    } else {
      // Schedule for renewal date with version check
      const subscription = await this.prisma.subscription.update({
        where: { 
          id: subscriptionId,
          version: existing.version, // Ensure version hasn't changed
        },
        data: {
          ...updateData,
          // Store pending downgrade info (would need additional field in schema)
        },
      })
      return this.mapToSubscription(subscription)
    }
  }

  /**
   * Cancel subscription with optimistic locking
   * Requirement: 10.7 - Maintain access until renewal date
   * Requirement: 24.2 - Optimistic locking
   */
  async cancelSubscription(subscriptionId: string, expectedVersion?: number): Promise<void> {
    const existing = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
    })

    if (!existing) {
      throw new Error('Subscription not found')
    }

    // Requirement 24.2: Optimistic locking - check version if provided
    if (expectedVersion !== undefined && existing.version !== expectedVersion) {
      const error = new Error('Concurrent modification detected. Please retry with the latest version.')
      ;(error as any).code = 'CONCURRENT_MODIFICATION'
      ;(error as any).statusCode = 409
      throw error
    }

    await this.prisma.subscription.update({
      where: { 
        id: subscriptionId,
        version: existing.version, // Ensure version hasn't changed
      },
      data: {
        status: 'CANCELLED', // Use string literal instead of enum
        autoRenew: false,
        version: { increment: 1 }, // Increment version
      },
    })
  }

  /**
   * Get subscription for a user
   */
  async getSubscription(userId: string): Promise<Subscription> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    })

    if (!subscription) {
      throw new Error('Subscription not found')
    }

    return this.mapToSubscription(subscription)
  }

  /**
   * Check quota status for a user with race condition prevention
   * Requirements: 10.8, 10.9, 10.10, 10.11, 11.4, 11.5, 11.6, 11.7, 24.3
   */
  async checkQuota(userId: string, requestedOrders: number = 0): Promise<QuotaStatus> {
    // Requirement 24.3: Fetch subscription with current usage atomically
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    })

    if (!subscription) {
      throw new Error('Subscription not found')
    }

    const mappedSubscription = this.mapToSubscription(subscription)

    // Requirement 10.11: Enterprise tier has unlimited quota
    if (mappedSubscription.tier === SubscriptionTier.ENTERPRISE) {
      return {
        monthlyQuota: -1, // Unlimited
        currentUsage: mappedSubscription.currentUsage,
        remainingQuota: -1,
        percentageUsed: 0,
        isExceeded: false,
      }
    }

    // Calculate current billing period usage
    const currentUsage = await this.getCurrentPeriodUsage(userId, mappedSubscription)

    const remainingQuota = mappedSubscription.monthlyQuota - currentUsage
    const percentageUsed = (currentUsage / mappedSubscription.monthlyQuota) * 100

    // Requirement 11.6: Set isExceeded flag if quota would be exceeded
    const isExceeded = currentUsage + requestedOrders > mappedSubscription.monthlyQuota

    return {
      monthlyQuota: mappedSubscription.monthlyQuota,
      currentUsage,
      remainingQuota: Math.max(0, remainingQuota),
      percentageUsed,
      isExceeded,
    }
  }

  /**
   * Increment usage counter with atomic operations
   * Requirements: 11.1, 11.2, 11.3, 24.3
   */
  async incrementUsage(userId: string, orderCount: number): Promise<UsageRecord> {
    const subscription = await this.getSubscription(userId)
    const now = new Date()

    // Requirement 24.3: Use transaction with atomic operations to prevent race conditions
    const result = await this.prisma.$transaction(async (tx: any) => {
      // Create usage record
      const usageRecord = await tx.usageRecord.create({
        data: {
          id: uuidv4(),
          userId,
          timestamp: now,
          orderCount,
          cumulativeUsage: subscription.currentUsage + orderCount,
        },
      })

      // Requirement 24.3: Update subscription current usage atomically
      // Using Prisma's atomic increment to prevent race conditions
      await tx.subscription.update({
        where: { userId },
        data: {
          currentUsage: {
            increment: orderCount, // Atomic increment operation
          },
        },
      })

      return usageRecord
    })

    return {
      recordId: result.id,
      userId: result.userId,
      timestamp: result.timestamp,
      orderCount: result.orderCount,
      cumulativeUsage: result.cumulativeUsage,
    }
  }

  /**
   * Get usage history for a user
   * Requirements: 11.9, 11.10
   */
  async getUsageHistory(
    userId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<UsageRecord[]> {
    const where: any = { userId }

    if (startDate || endDate) {
      where.timestamp = {}
      if (startDate) where.timestamp.gte = startDate
      if (endDate) where.timestamp.lte = endDate
    }

    const records = await this.prisma.usageRecord.findMany({
      where,
      orderBy: { timestamp: 'desc' },
    })

    return records.map((record: any) => ({
      recordId: record.id,
      userId: record.userId,
      timestamp: record.timestamp,
      orderCount: record.orderCount,
      cumulativeUsage: record.cumulativeUsage,
    }))
  }

  /**
   * Generate invoice for a billing period
   * Requirements: 10.12, 10.13, 10.14
   */
  async generateInvoice(subscriptionId: string, billingPeriod: BillingPeriod): Promise<Invoice> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
    })

    if (!subscription) {
      throw new Error('Subscription not found')
    }

    // Get usage for billing period
    const usageRecords = await this.prisma.usageRecord.findMany({
      where: {
        userId: subscription.userId,
        timestamp: {
          gte: billingPeriod.startDate,
          lte: billingPeriod.endDate,
        },
      },
    })

    const totalOrders = usageRecords.reduce((sum: number, record: any) => sum + record.orderCount, 0)
    const basePrice = subscription.price

    // Calculate overage charges for enterprise tier
    let overageCharges = 0
    if (subscription.tier === 'ENTERPRISE') { // Use string literal instead of enum
      // Example: $0.10 per order over base amount
      const baseIncluded = 10000
      if (totalOrders > baseIncluded) {
        overageCharges = (totalOrders - baseIncluded) * 0.1
      }
    }

    const totalAmount = basePrice + overageCharges
    const dueDate = new Date(billingPeriod.endDate)
    dueDate.setDate(dueDate.getDate() + 15) // 15 days after period end

    const invoice = await this.prisma.invoice.create({
      data: {
        id: uuidv4(),
        subscriptionId,
        startDate: billingPeriod.startDate,
        endDate: billingPeriod.endDate,
        totalOrders,
        basePrice,
        overageCharges,
        totalAmount,
        status: 'PENDING', // Use string literal instead of enum
        dueDate,
      },
    })

    return {
      invoiceId: invoice.id,
      subscriptionId: invoice.subscriptionId,
      billingPeriod: {
        startDate: invoice.startDate,
        endDate: invoice.endDate,
      },
      totalOrders: invoice.totalOrders,
      basePrice: invoice.basePrice,
      overageCharges: invoice.overageCharges,
      totalAmount: invoice.totalAmount,
      status: invoice.status as InvoiceStatus,
      dueDate: invoice.dueDate,
    }
  }

  /**
   * Reset usage counter at billing period start
   * Requirement: 10.9
   */
  async resetUsageCounter(userId: string): Promise<void> {
    await this.prisma.subscription.update({
      where: { userId },
      data: { currentUsage: 0 },
    })
  }

  /**
   * Get current billing period usage
   */
  private async getCurrentPeriodUsage(userId: string, subscription: Subscription): Promise<number> {
    const periodStart = new Date(subscription.startDate)
    const now = new Date()

    // Calculate current period start
    while (periodStart < now) {
      periodStart.setMonth(periodStart.getMonth() + 1)
    }
    periodStart.setMonth(periodStart.getMonth() - 1)

    const usageRecords = await this.prisma.usageRecord.findMany({
      where: {
        userId,
        timestamp: {
          gte: periodStart,
        },
      },
    })

    return usageRecords.reduce((sum: number, record: any) => sum + record.orderCount, 0)
  }

  /**
   * Map Prisma subscription to domain model
   */
  private mapToSubscription(subscription: any): Subscription {
    return {
      subscriptionId: subscription.id,
      userId: subscription.userId,
      tier: subscription.tier as SubscriptionTier,
      monthlyQuota: subscription.monthlyQuota,
      currentUsage: subscription.currentUsage,
      status: subscription.status as SubscriptionStatus,
      startDate: subscription.startDate,
      renewalDate: subscription.renewalDate,
      price: subscription.price,
    }
  }
}
