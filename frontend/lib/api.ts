import axios, { AxiosInstance, AxiosRequestConfig } from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

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
  async register(email: string, password: string) {
    const response = await this.client.post('/auth/register', { email, password })
    return response.data
  }

  async login(email: string, password: string) {
    const response = await this.client.post('/auth/login', { email, password })
    const { accessToken, refreshToken } = response.data.data
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', accessToken)
      localStorage.setItem('refreshToken', refreshToken)
    }
    
    return response.data
  }

  async logout() {
    try {
      await this.client.post('/auth/logout')
    } finally {
      this.clearTokens()
    }
  }

  async generateAPIKey() {
    const response = await this.client.post('/auth/api-key')
    return response.data
  }

  // Box Catalog
  async getBoxes() {
    const response = await this.client.get('/boxes')
    return response.data
  }

  async getBox(id: string) {
    const response = await this.client.get(`/boxes/${id}`)
    return response.data
  }

  async createBox(data: any) {
    const response = await this.client.post('/boxes', data)
    return response.data
  }

  async updateBox(id: string, data: any) {
    const response = await this.client.put(`/boxes/${id}`, data)
    return response.data
  }

  async deleteBox(id: string) {
    const response = await this.client.delete(`/boxes/${id}`)
    return response.data
  }

  // Simulation
  async uploadCSV(file: File) {
    const formData = new FormData()
    formData.append('file', file)

    const response = await this.client.post('/simulation/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  }

  async processSimulation(jobId: string, config?: any) {
    const response = await this.client.post(`/simulation/${jobId}/process`, config)
    return response.data
  }

  async getSimulationStatus(jobId: string) {
    const response = await this.client.get(`/simulation/${jobId}/status`)
    return response.data
  }

  async getSimulationHistory() {
    const response = await this.client.get('/simulation/history')
    return response.data
  }

  async generateReport(simulationId: string) {
    const response = await this.client.get(`/simulation/${simulationId}/report`, {
      responseType: 'blob',
    })
    return response.data
  }

  // Analytics
  async getDashboardKPIs(startDate?: string, endDate?: string) {
    const response = await this.client.get('/analytics/dashboard', {
      params: { startDate, endDate },
    })
    return response.data
  }

  async getCostTrend(granularity: string, startDate?: string, endDate?: string) {
    const response = await this.client.get('/analytics/cost-trend', {
      params: { granularity, startDate, endDate },
    })
    return response.data
  }

  async getBoxUsage(startDate?: string, endDate?: string) {
    const response = await this.client.get('/analytics/box-usage', {
      params: { startDate, endDate },
    })
    return response.data
  }

  // Subscriptions
  async getSubscription() {
    const response = await this.client.get('/subscriptions/me')
    return response.data
  }

  async updateSubscription(tier: string) {
    const response = await this.client.put('/subscriptions/me', { tier })
    return response.data
  }

  async getQuotaStatus() {
    const response = await this.client.get('/subscriptions/quota')
    return response.data
  }

  async getUsageHistory() {
    const response = await this.client.get('/subscriptions/usage')
    return response.data
  }

  // Configuration
  async getConfiguration() {
    const response = await this.client.get('/config')
    return response.data
  }

  async updateConfiguration(config: any) {
    const response = await this.client.put('/config', config)
    return response.data
  }
}

export const api = new APIClient()
