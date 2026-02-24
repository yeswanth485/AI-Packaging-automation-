import axios, { AxiosInstance } from 'axios'
import type {
  Box,
  BoxFormData,
  Subscription,
  QuotaStatus,
  UsageHistory,
  SimulationResult,
  SimulationHistory,
  DashboardKPIs,
  CostTrendData,
  BoxUsageData,
  ConfigurationData,
  AuthResponse,
  MessageResponse,
} from './types'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

class APIClient {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: `${API_URL}/api`,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true,
    })

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = this.getToken()
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      },
      (error) => Promise.reject(error)
    )

    // Response interceptor to handle token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true

          try {
            const refreshToken = this.getRefreshToken()
            if (refreshToken) {
              const response = await axios.post(`${API_URL}/api/auth/refresh`, {
                refreshToken,
              })

              const { accessToken } = response.data.data
              this.setToken(accessToken)

              originalRequest.headers.Authorization = `Bearer ${accessToken}`
              return this.client(originalRequest)
            }
          } catch (refreshError) {
            this.clearTokens()
            window.location.href = '/login'
            return Promise.reject(refreshError)
          }
        }

        return Promise.reject(error)
      }
    )
  }

  private getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('accessToken')
    }
    return null
  }

  private getRefreshToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('refreshToken')
    }
    return null
  }

  private setToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', token)
    }
  }

  private clearTokens(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
    }
  }

  // Authentication
  async register(email: string, password: string): Promise<AuthResponse> {
    const response = await this.client.post<AuthResponse>('/auth/register', { email, password })
    return response.data
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await this.client.post<AuthResponse>('/auth/login', { email, password })
    const { accessToken, refreshToken } = response.data.data
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', accessToken)
      localStorage.setItem('refreshToken', refreshToken)
    }
    
    return response.data
  }

  async logout(): Promise<void> {
    try {
      await this.client.post<MessageResponse>('/auth/logout')
    } finally {
      this.clearTokens()
    }
  }

  async generateAPIKey(): Promise<{ apiKey: string }> {
    const response = await this.client.post<{ apiKey: string }>('/auth/api-key')
    return response.data
  }

  // Box Catalog
  async getBoxes(): Promise<{ data: Box[] }> {
    const response = await this.client.get<{ data: Box[] }>('/boxes')
    return response.data
  }

  async getBox(id: string): Promise<{ data: Box }> {
    const response = await this.client.get<{ data: Box }>(`/boxes/${id}`)
    return response.data
  }

  async createBox(data: BoxFormData): Promise<{ data: Box }> {
    const response = await this.client.post<{ data: Box }>('/boxes', data)
    return response.data
  }

  async updateBox(id: string, data: BoxFormData): Promise<{ data: Box }> {
    const response = await this.client.put<{ data: Box }>(`/boxes/${id}`, data)
    return response.data
  }

  async deleteBox(id: string): Promise<MessageResponse> {
    const response = await this.client.delete<MessageResponse>(`/boxes/${id}`)
    return response.data
  }

  // Simulation
  async uploadCSV(file: File): Promise<{ data: { jobId: string } }> {
    const formData = new FormData()
    formData.append('file', file)

    const response = await this.client.post<{ data: { jobId: string } }>('/simulation/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  }

  async processSimulation(jobId: string, config?: Record<string, unknown>): Promise<{ data: SimulationResult }> {
    const response = await this.client.post<{ data: SimulationResult }>(`/simulation/${jobId}/process`, config)
    return response.data
  }

  async getSimulationStatus(jobId: string): Promise<{ data: SimulationResult }> {
    const response = await this.client.get<{ data: SimulationResult }>(`/simulation/${jobId}/status`)
    return response.data
  }

  async getSimulationHistory(): Promise<{ data: SimulationHistory[] }> {
    const response = await this.client.get<{ data: SimulationHistory[] }>('/simulation/history')
    return response.data
  }

  async generateReport(simulationId: string): Promise<Blob> {
    const response = await this.client.get<Blob>(`/simulation/${simulationId}/report`, {
      responseType: 'blob',
    })
    return response.data
  }

  // Analytics
  async getDashboardKPIs(startDate?: string, endDate?: string): Promise<{ data: DashboardKPIs }> {
    const response = await this.client.get<{ data: DashboardKPIs }>('/analytics/dashboard', {
      params: { startDate, endDate },
    })
    return response.data
  }

  async getCostTrend(granularity: string, startDate?: string, endDate?: string): Promise<{ data: CostTrendData[] }> {
    const response = await this.client.get<{ data: CostTrendData[] }>('/analytics/cost-trend', {
      params: { granularity, startDate, endDate },
    })
    return response.data
  }

  async getBoxUsage(startDate?: string, endDate?: string): Promise<{ data: BoxUsageData[] }> {
    const response = await this.client.get<{ data: BoxUsageData[] }>('/analytics/box-usage', {
      params: { startDate, endDate },
    })
    return response.data
  }

  // Subscriptions
  async getSubscription(): Promise<{ data: Subscription }> {
    const response = await this.client.get<{ data: Subscription }>('/subscriptions/me')
    return response.data
  }

  async updateSubscription(tier: string): Promise<{ data: Subscription }> {
    const response = await this.client.put<{ data: Subscription }>('/subscriptions/me', { tier })
    return response.data
  }

  async getQuotaStatus(): Promise<{ data: QuotaStatus }> {
    const response = await this.client.get<{ data: QuotaStatus }>('/subscriptions/quota')
    return response.data
  }

  async getUsageHistory(): Promise<{ data: UsageHistory[] }> {
    const response = await this.client.get<{ data: UsageHistory[] }>('/subscriptions/usage')
    return response.data
  }

  // Configuration
  async getConfiguration(): Promise<{ data: ConfigurationData }> {
    const response = await this.client.get<{ data: ConfigurationData }>('/config')
    return response.data
  }

  async updateConfiguration(config: Partial<ConfigurationData>): Promise<{ data: ConfigurationData }> {
    const response = await this.client.put<{ data: ConfigurationData }>('/config', config)
    return response.data
  }
}

export const api = new APIClient()
