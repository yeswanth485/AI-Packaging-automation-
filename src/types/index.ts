// ============================================================================
// User and Authentication Types
// ============================================================================

export enum UserRole {
  ADMIN = 'admin',
  CUSTOMER = 'customer',
  TRIAL = 'trial',
}

export enum SubscriptionTier {
  FREE = 'free',
  BASIC = 'basic',
  PRO = 'pro',
  ENTERPRISE = 'enterprise',
}

export interface User {
  id: string
  email: string
  role: UserRole
  subscriptionTier: SubscriptionTier
  createdAt: Date
  lastLogin: Date
}

export interface AuthToken {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export interface APIKey {
  key: string
  userId: string
  createdAt: Date
  lastUsed: Date
  isActive: boolean
}

// ============================================================================
// Box Catalog Types
// ============================================================================

export interface BoxDefinition {
  name: string
  length: number
  width: number
  height: number
  maxWeight: number
  isActive?: boolean
}

export interface Box extends BoxDefinition {
  id: string
  volume: number
  createdAt: Date
  updatedAt: Date
}

export interface Dimensions {
  length: number
  width: number
  height: number
}

export interface BoxUsageStats {
  boxId: string
  boxName: string
  usageCount: number
  averageUtilization: number
  totalVolume: number
  wastedVolume: number
}

export interface DateRange {
  startDate: Date
  endDate: Date
}

// ============================================================================
// Packing Engine Types
// ============================================================================

export interface Order {
  orderId: string
  items: Item[]
  totalWeight: number
}

export interface Item {
  itemId: string
  length: number
  width: number
  height: number
  weight: number
  quantity: number
}

export interface PackingConfig {
  bufferPadding: number
  volumetricDivisor: number
  shippingRatePerKg: number
  maxWeightOverride?: number
}

export interface PackingResult {
  orderId: string
  selectedBox: Box
  totalDimensions: Dimensions
  totalWeight: number
  volumetricWeight: number
  billableWeight: number
  shippingCost: number
  spaceUtilization: number
  wastedVolume: number
  isValid: boolean
  rejectionReason?: string
}

export interface BatchPackingResult {
  results: PackingResult[]
  totalOrders: number
  successfulPacks: number
  failedPacks: number
  totalCost: number
  averageUtilization: number
}

// ============================================================================
// Simulation Types
// ============================================================================

export enum JobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export interface SimulationJob {
  jobId: string
  userId: string
  fileName: string
  totalOrders: number
  status: JobStatus
  createdAt: Date
}

export interface BaselineResult {
  orderId: string
  selectedBox: Box
  shippingCost: number
  billableWeight: number
}

export interface ComparisonMetrics {
  totalOrdersProcessed: number
  optimizedTotalCost: number
  baselineTotalCost: number
  totalSavings: number
  savingsPercentage: number
  averageUtilizationOptimized: number
  averageUtilizationBaseline: number
  volumetricWeightReduction: number
}

export interface SavingsAnalysis {
  perOrderSavings: number
  monthlySavings: number
  annualSavings: number
  isRealistic: boolean
  confidenceLevel: number
}

export interface SimulationResult {
  simulationId: string
  jobId: string
  optimizedResults: PackingResult[]
  baselineResults: BaselineResult[]
  comparison: ComparisonMetrics
  savings: SavingsAnalysis
  recommendations: string[]
  anomalyWarnings: string[]
}

export interface SimulationSummary {
  simulationId: string
  createdAt: Date
  totalOrders: number
  savingsPercentage: number
  totalSavings: number
}

export interface PDFReport {
  reportId: string
  downloadUrl: string
  expiresAt: Date
}

// ============================================================================
// Analytics Types
// ============================================================================

export enum TimeGranularity {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

export interface DashboardKPIs {
  totalOrdersProcessed: number
  manualShippingCost: number
  optimizedShippingCost: number
  totalSavings: number
  savingsPercentage: number
  avgVolumetricWeightReduction: number
  avgSpaceUtilization: number
  mostUsedBoxSize: string
  mostInefficientBoxSize: string
  monthlySavingsProjection: number
  annualSavingsProjection: number
}

export enum TrendDirection {
  INCREASING = 'increasing',
  DECREASING = 'decreasing',
  STABLE = 'stable',
}

export interface CostDataPoint {
  timestamp: Date
  manualCost: number
  optimizedCost: number
  savings: number
}

export interface CostTrendData {
  dataPoints: CostDataPoint[]
  trend: TrendDirection
}

export interface BoxUsageData {
  boxId: string
  boxName: string
  usageCount: number
  percentage: number
  averageUtilization: number
}

export interface HeatmapCell {
  boxId: string
  dateRange: string
  wastePercentage: number
  orderCount: number
}

export interface HeatmapData {
  matrix: HeatmapCell[][]
  maxWaste: number
  minWaste: number
}

export interface WeightBucket {
  rangeStart: number
  rangeEnd: number
  count: number
  percentage: number
}

export interface WeightDistributionData {
  actualWeightBuckets: WeightBucket[]
  volumetricWeightBuckets: WeightBucket[]
  billableWeightBuckets: WeightBucket[]
}

export interface ForecastPeriod {
  month: string
  predictedOrders: number
  predictedCost: number
  predictedSavings: number
}

export interface ForecastData {
  forecastPeriods: ForecastPeriod[]
  confidence: number
  methodology: string
}

// ============================================================================
// Subscription Types
// ============================================================================

export enum SubscriptionStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  CANCELLED = 'cancelled',
  TRIAL = 'trial',
}

export interface Subscription {
  subscriptionId: string
  userId: string
  tier: SubscriptionTier
  monthlyQuota: number
  currentUsage: number
  status: SubscriptionStatus
  startDate: Date
  renewalDate: Date
  price: number
}

export interface QuotaStatus {
  monthlyQuota: number
  currentUsage: number
  remainingQuota: number
  percentageUsed: number
  isExceeded: boolean
}

export interface UsageRecord {
  recordId: string
  userId: string
  timestamp: Date
  orderCount: number
  cumulativeUsage: number
}

export interface BillingPeriod {
  startDate: Date
  endDate: Date
}

export enum InvoiceStatus {
  PENDING = 'pending',
  PAID = 'paid',
  OVERDUE = 'overdue',
}

export interface Invoice {
  invoiceId: string
  subscriptionId: string
  billingPeriod: BillingPeriod
  totalOrders: number
  basePrice: number
  overageCharges: number
  totalAmount: number
  status: InvoiceStatus
  dueDate: Date
}

// ============================================================================
// Configuration Types
// ============================================================================

export enum BaselineStrategy {
  NEXT_LARGER = 'next_larger',
  FIXED_OVERSIZED = 'fixed_oversized',
  RANDOM_INEFFICIENT = 'random_inefficient',
}

export interface ConfigurationModel {
  id: string
  userId: string
  bufferPadding: number
  volumetricDivisor: number
  shippingRatePerKg: number
  maxWeightOverride?: number
  baselineBoxSelectionStrategy: BaselineStrategy
  enableForecast: boolean
  createdAt: Date
  updatedAt: Date
}
