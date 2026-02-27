'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import ProtectedRoute from '@/components/ProtectedRoute'
import { Card } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { Alert } from '@/components/ui/Alert'
import type { BoxUsageData, CostTrendData, APIError } from '@/lib/types'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

function AnalyticsContent() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [boxUsage, setBoxUsage] = useState<BoxUsageData[]>([])
  const [costTrend, setCostTrend] = useState<CostTrendData[]>([])

  useEffect(() => {
    loadAnalytics()
  }, [])

  const loadAnalytics = async () => {
    try {
      const [usageResponse, trendResponse] = await Promise.all([
        api.getBoxUsage(),
        api.getCostTrend('weekly'),
      ])
      setBoxUsage(usageResponse.data || [])
      setCostTrend(trendResponse.data || [])
    } catch (err) {
      const error = err as APIError
      setError(error.response?.data?.message || 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center min-h-64">
          <Spinner size="lg" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <Alert variant="error" title="Error loading analytics">
          {error}
        </Alert>
      </div>
    )
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Analytics</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Box Usage Distribution</h2>
            {boxUsage.length > 0 ? (
              <div className="space-y-4">
                {boxUsage.map((box, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <div 
                        className="w-4 h-4 rounded-full mr-3"
                        style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                      ></div>
                      <span className="font-medium">{box.boxType}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{box.count}</div>
                      <div className="text-sm text-gray-500">{box.percentage.toFixed(1)}%</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No data available</p>
            )}
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Weekly Cost Trend</h2>
            {costTrend.length > 0 ? (
              <div className="space-y-4">
                {costTrend.map((trend, idx) => (
                  <div key={idx} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">{trend.date}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-gray-500">Baseline</div>
                        <div className="text-lg font-bold text-red-600">${trend.baseline.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Optimized</div>
                        <div className="text-lg font-bold text-blue-600">${trend.optimized.toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No data available</p>
            )}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Space Utilization</h2>
            {boxUsage.length > 0 ? (
              <div className="space-y-4">
                {boxUsage.map((box, idx) => (
                  <div key={idx}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700">{box.boxType}</span>
                      <span className="text-gray-900 font-medium">{box.percentage.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${box.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No data available</p>
            )}
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Key Metrics</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <span className="text-gray-700">Total Box Types</span>
                <span className="text-2xl font-bold text-gray-900">{boxUsage.length}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <span className="text-gray-700">Most Used Box</span>
                <span className="text-lg font-semibold text-gray-900">
                  {boxUsage[0]?.boxType || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <span className="text-gray-700">Total Orders Analyzed</span>
                <span className="text-2xl font-bold text-gray-900">
                  {boxUsage.reduce((sum, box) => sum + box.count, 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

export default function AnalyticsPage() {
  return (
    <ProtectedRoute>
      <AnalyticsContent />
    </ProtectedRoute>
  )
}