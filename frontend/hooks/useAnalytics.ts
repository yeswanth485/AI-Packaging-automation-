'use client'

import { useState, useCallback, useEffect } from 'react'
import { api } from '@/lib/api'
import type { DashboardKPIs, CostTrendData, BoxUsageData } from '@/lib/types'

interface UseAnalyticsReturn {
  kpis: DashboardKPIs | null
  costTrend: CostTrendData[] | null
  boxUsage: BoxUsageData[] | null
  isLoading: boolean
  error: string | null
  fetchKPIs: (startDate?: string, endDate?: string) => Promise<void>
  fetchCostTrend: (granularity: string, startDate?: string, endDate?: string) => Promise<void>
  fetchBoxUsage: (startDate?: string, endDate?: string) => Promise<void>
  refresh: () => Promise<void>
}

export function useAnalytics(autoFetch: boolean = false): UseAnalyticsReturn {
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null)
  const [costTrend, setCostTrend] = useState<CostTrendData[] | null>(null)
  const [boxUsage, setBoxUsage] = useState<BoxUsageData[] | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchKPIs = useCallback(async (startDate?: string, endDate?: string) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await api.getDashboardKPIs(startDate, endDate)
      setKpis(response.data)
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to fetch KPIs'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const fetchCostTrend = useCallback(async (
    granularity: string,
    startDate?: string,
    endDate?: string
  ) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await api.getCostTrend(granularity, startDate, endDate)
      setCostTrend(response.data)
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to fetch cost trend'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const fetchBoxUsage = useCallback(async (startDate?: string, endDate?: string) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await api.getBoxUsage(startDate, endDate)
      setBoxUsage(response.data)
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to fetch box usage'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const refresh = useCallback(async () => {
    await Promise.all([
      fetchKPIs(),
      fetchCostTrend('daily'),
      fetchBoxUsage(),
    ])
  }, [fetchKPIs, fetchCostTrend, fetchBoxUsage])

  useEffect(() => {
    if (autoFetch) {
      refresh()
    }
  }, [autoFetch, refresh])

  return {
    kpis,
    costTrend,
    boxUsage,
    isLoading,
    error,
    fetchKPIs,
    fetchCostTrend,
    fetchBoxUsage,
    refresh,
  }
}
