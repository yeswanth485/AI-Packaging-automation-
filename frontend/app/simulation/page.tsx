'use client'

import { useState, useEffect } from 'react'
import { useSimulation } from '@/hooks/useSimulation'
import { api } from '@/lib/api'
import { useToast } from '@/components/ui/Toast'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { Spinner } from '@/components/ui/Spinner'
import { Badge } from '@/components/ui/Badge'
import { Download, FileText } from 'lucide-react'
import CSVUpload from '@/components/simulation/CSVUpload'
import ResultsTable from '@/components/simulation/ResultsTable'
import type { SimulationHistory, APIError } from '@/lib/types'

export default function SimulationPage() {
  const { isUploading, isProcessing, error, result, uploadCSV, processSimulation, checkStatus } = useSimulation()
  const { addToast } = useToast()
  const [currentJobId, setCurrentJobId] = useState<string | null>(null)
  const [history, setHistory] = useState<SimulationHistory[]>([])

  useEffect(() => {
    loadHistory()
  }, [])

  useEffect(() => {
    if (currentJobId && isProcessing) {
      const interval = setInterval(() => checkStatus(currentJobId), 2000)
      return () => clearInterval(interval)
    }
  }, [currentJobId, isProcessing, checkStatus])

  const loadHistory = async () => {
    try {
      const response = await api.getSimulationHistory()
      setHistory(response.data || [])
    } catch (err) {
      console.error('Failed to load history:', err)
    }
  }

  const handleUpload = async (file: File) => {
    const jobId = await uploadCSV(file)
    if (jobId) {
      setCurrentJobId(jobId)
      await processSimulation(jobId)
      addToast('Simulation started successfully', 'success')
      loadHistory()
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
      addToast('Report downloaded successfully', 'success')
    } catch (err) {
      addToast('Failed to download report', 'error')
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Simulation</h1>

      {error && <Alert variant="error" className="mb-6">{error}</Alert>}

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Upload CSV</CardTitle>
        </CardHeader>
        <CardContent>
          <CSVUpload onUpload={handleUpload} uploading={isUploading} />
        </CardContent>
      </Card>

      {isProcessing && (
        <Alert variant="info" className="mb-8">
          <div className="flex items-center">
            <Spinner size="sm" className="mr-3" />
            <span>Processing simulation...</span>
          </div>
        </Alert>
      )}

      {result && (
        <Card className="mb-8">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Results</CardTitle>
              <Button onClick={() => downloadReport(currentJobId!)} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Download PDF Report
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500">Total Orders</p>
                <p className="text-2xl font-bold text-gray-900">
                  {result.summary?.totalOrders || 0}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500">Total Savings</p>
                <p className="text-2xl font-bold text-green-600">
                  ${result.summary?.totalSavings?.toFixed(2) || '0.00'}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500">Savings %</p>
                <p className="text-2xl font-bold text-blue-600">
                  {result.summary?.savingsPercentage?.toFixed(1) || '0.0'}%
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500">Avg Utilization</p>
                <p className="text-2xl font-bold text-purple-600">
                  {result.summary?.averageUtilization?.toFixed(1) || '0.0'}%
                </p>
              </div>
            </div>
            <ResultsTable results={result.orders || []} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Simulation History</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No simulations yet</p>
          ) : (
            <div className="space-y-3">
              {history.map((sim) => (
                <div
                  key={sim.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">{sim.fileName}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(sim.createdAt).toLocaleString()} • {sim.totalOrders} orders
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Savings</p>
                      <p className="font-semibold text-green-600">
                        ${sim.totalSavings?.toFixed(2) || '0.00'}
                      </p>
                    </div>
                    <Button
                      onClick={() => downloadReport(sim.id)}
                      variant="outline"
                      size="sm"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
