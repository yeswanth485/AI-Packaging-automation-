// Core entity types
export interface Box {
  id: string;
  name: string;
  length: number;
  width: number;
  height: number;
  cost: number;
  weight?: number;
  maxWeight?: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Subscription {
  id: string;
  userId: string;
  tier: 'free' | 'basic' | 'premium' | 'enterprise';
  status: 'active' | 'inactive' | 'cancelled' | 'expired';
  startDate: string;
  endDate?: string;
  autoRenew?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface QuotaStatus {
  limit: number;
  used: number;
  remaining: number;
  resetDate: string;
  tier: string;
}

export interface UsageHistory {
  id?: string;
  date: string;
  count: number;
  type: string;
  description?: string;
}

export interface SimulationResult {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  results?: {
    baseline: PackingResult;
    optimized: PackingResult;
    savings: SavingsMetrics;
  };
  metrics?: SimulationMetrics;
  error?: string;
  createdAt?: string;
  completedAt?: string;
}

export interface PackingResult {
  totalBoxes: number;
  totalCost: number;
  boxBreakdown: BoxBreakdown[];
  utilizationRate?: number;
}

export interface BoxBreakdown {
  boxType: string;
  count: number;
  cost: number;
  dimensions?: string;
}

export interface SavingsMetrics {
  costSavings: number;
  percentageSavings: number;
  boxReduction: number;
}

export interface SimulationMetrics {
  processingTime: number;
  itemsProcessed: number;
  efficiency: number;
}

export interface SimulationHistory {
  id: string;
  createdAt: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  fileName?: string;
  itemCount?: number;
  costSavings?: number;
  results?: SimulationResult['results'];
}

// Dashboard types
export interface DashboardKPIs {
  totalSimulations: number;
  totalOrders?: number;
  totalSavings: number;
  avgSavings: number;
  savingsPercentage?: number;
  averageUtilization?: number;
  monthlySavings?: number;
  annualSavings?: number;
  activeSubscription?: string;
}


export interface CostTrendData {
  date: string;
  baseline: number;
  optimized: number;
  savings: number;
}

export interface BoxUsageData {
  boxType: string;
  count: number;
  percentage: number;
  cost?: number;
}

// Configuration types
export interface ConfigurationData {
  defaultBoxes: Box[];
  shippingRate?: number;
  weightLimit?: number;
  bufferPadding?: number;
  volumetricDivisor?: number;
  preferences?: Record<string, unknown>;
}

// Admin types
export interface AdminStats {
  totalUsers: number;
  activeSubscriptions: number;
  totalRevenue: number;
  totalSimulations: number;
  revenueByTier?: Record<string, number>;
  userGrowth?: number;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  role: 'user' | 'admin';
  subscription?: Subscription;
  createdAt: string;
  lastLogin?: string;
  isActive?: boolean;
}

// API Error types
export interface APIError {
  response?: {
    data?: {
      message?: string;
      error?: string;
    };
    status?: number;
  };
  message?: string;
}

// Form types
export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  email: string;
  password: string;
  name?: string;
}

export interface BoxFormData {
  name: string;
  length: number;
  width: number;
  height: number;
  cost: number;
  weight?: number;
  maxWeight?: number;
}

// API Response types
export interface AuthResponse {
  data: {
    accessToken: string;
    refreshToken: string;
    user: User;
  };
}

export interface MessageResponse {
  message: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
