'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import CSVUpload from '@/components/simulation/CSVUpload'
import ResultsTable from '@/components/simulation/ResultsTable'
import type { SimulationResult, SimulationHistory, APIError } from '@/lib/types'

export default function SimulationPage() {
  const [uploading, setUploading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [currentJobId, setCurrentJobId] = useState<string | null>(null)
  const [results, setResults] = useState<SimulationResult['results'] | null>(null)
  const [history, setHistory] = useState<SimulationHistory[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    loadHistory()
  }, [])

  useEffect(() => {
    if (currentJobId && processing) {
      const interval = setInterval(checkStatus, 2000)
      return () => clearInterval(interval)
    }
  }, [currentJobId, processing])

  const loadHistory = async () => {
    try {
      const response = await api.getSimulationHistory()
      setHistory(response.data || [])
    } catch (err) {
      console.error('Failed to load history:', err)
    }
  }

  const handleUpload = async (file: File) => {
    setUploading(true)
    setError('')
    try {
      const response = await api.uploadCSV(file)
      const jobId = response.data.jobId
      setCurrentJobId(jobId)
      
      // Start processing
      await api.processSimulation(jobId)
      setProcessing(true)
    } catch (err) {
      const error = err as APIError
      setError(error.response?.data?.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const checkStatus = async () => {
    if (!currentJobId) return

    try {
      const response = await api.getSimulationStatus(currentJobId)
      const status = response.data

      if (status.status === 'completed') {
        setResults(status.results)
        setProcessing(false)
        loadHistory()
      } else if (status.status === 'failed') {
        setError(status.error || 'Simulation failed')
        setProcessing(false)
      }
    } catch (err) {
      console.error('Status check failed:', err)
    }
  }

  const downloadReport = async (simulationId: string) => {
    try {
      const blob = await api.generateReport(simulationId)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `simulation-report-${simulationId}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      setError('Failed to download report')
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Simulation</h1>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Upload CSV</h2>
        <CSVUpload onUpload={handleUpload} uploading={uploading} />
      </div>

      {processing && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-8">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
            <p className="text-blue-800">Processing simulation...</p>
          </div>
        </div>
      )}

      {results && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Results</h2>
            <button
              onClick={() => downloadReport(currentJobId!)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Download PDF Report
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-500">Total Orders</div>
              <div className="text-2xl font-bold text-gray-900">
                {results.summary?.totalOrders || 0}
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-500">Total Savings</div>
              <div className="text-2xl font-bold text-green-600">
                ${results.summary?.totalSavings?.toFixed(2) || '0.00'}
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-500">Savings %</div>
              <div className="text-2xl font-bold text-blue-600">
                {results.summary?.savingsPercentage?.toFixed(1) || '0.0'}%
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-500">Avg Utilization</div>
              <div className="text-2xl font-bold text-purple-600">
                {results.summary?.averageUtilization?.toFixed(1) || '0.0'}%
              </div>
            </div>
          </div>

          <ResultsTable results={results.orders || []} />
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Simulation History</h2>
        {history.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No simulations yet</p>
        ) : (
          <div className="space-y-3">
            {history.map((sim) => (
              <div
                key={sim.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <div>
                  <div className="font-medium text-gray-900">{sim.filename}</div>
                  <div className="text-sm text-gray-500">
                    {new Date(sim.createdAt).toLocaleString()} • {sim.totalOrders} orders
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-sm text-gray-500">Savings</div>
                    <div className="font-semibold text-green-600">
                      ${sim.totalSavings?.toFixed(2) || '0.00'}
                    </div>
                  </div>
                  <button
                    onClick={() => downloadReport(sim.id)}
                    className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  >
                    Download
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
