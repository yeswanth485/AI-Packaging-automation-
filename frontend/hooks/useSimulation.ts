'use client'

import { useState, useCallback } from 'react'
import { api } from '@/lib/api'
import type { SimulationResult } from '@/lib/types'

interface UseSimulationReturn {
  isUploading: boolean
  isProcessing: boolean
  error: string | null
  result: SimulationResult | null
  uploadCSV: (file: File) => Promise<string | null>
  processSimulation: (jobId: string, config?: Record<string, unknown>) => Promise<void>
  checkStatus: (jobId: string) => Promise<void>
  reset: () => void
}

export function useSimulation(): UseSimulationReturn {
  const [isUploading, setIsUploading] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<SimulationResult | null>(null)

  const uploadCSV = useCallback(async (file: File): Promise<string | null> => {
    setIsUploading(true)
    setError(null)
    
    try {
      const response = await api.uploadCSV(file)
      return response.data.jobId
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to upload CSV file'
      setError(errorMessage)
      return null
    } finally {
      setIsUploading(false)
    }
  }, [])

  const processSimulation = useCallback(async (
    jobId: string,
    config?: Record<string, unknown>
  ): Promise<void> => {
    setIsProcessing(true)
    setError(null)
    
    try {
      const response = await api.processSimulation(jobId, config)
      setResult(response.data)
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to process simulation'
      setError(errorMessage)
    } finally {
      setIsProcessing(false)
    }
  }, [])

  const checkStatus = useCallback(async (jobId: string): Promise<void> => {
    try {
      const response = await api.getSimulationStatus(jobId)
      setResult(response.data)
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to check simulation status'
      setError(errorMessage)
    }
  }, [])

  const reset = useCallback(() => {
    setIsUploading(false)
    setIsProcessing(false)
    setError(null)
    setResult(null)
  }, [])

  return {
    isUploading,
    isProcessing,
    error,
    result,
    uploadCSV,
    processSimulation,
    checkStatus,
    reset,
  }
}
