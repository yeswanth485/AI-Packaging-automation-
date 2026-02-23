'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import CostTrendChart from '@/components/charts/CostTrendChart'
import BoxUsageChart from '@/components/charts/BoxUsageChart'
import type { DashboardKPIs, CostTrendData, BoxUsageData, APIError } from '@/lib/types'

export default function DashboardPage() {
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null)
  const [costTrend, setCostTrend] = useState<CostTrendData[]>([])
  const [boxUsage, setBoxUsage] = useState<BoxUsageData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dateRange, setDateRange] = useState({ start: '', end: '' })

  useEffect(() => {
    loadDashboardData()
  }, [dateRange])

  const loadDashboardData = async () => {
    try {
      const [kpiResponse, trendResponse, usageResponse] = await Promise.all([
        api.getDashboardKPIs(dateRange.start, dateRange.end),
        api.getCostTrend('daily', dateRange.start, dateRange.end),
        api.getBoxUsage(dateRange.start, dateRange.end),
      ])
      setKpis(kpiResponse.data)
      setCostTrend(trendResponse.data || [])
      setBoxUsage(usageResponse.data || [])
    } catch (err) {
      const error = err as APIError
      setError(error.response?.data?.message || 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500 mb-2">Total Orders</div>
          <div className="text-3xl font-bold text-gray-900">
            {kpis?.totalOrders?.toLocaleString() || '0'}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500 mb-2">Total Savings</div>
          <div className="text-3xl font-bold text-green-600">
            ${kpis?.totalSavings?.toLocaleString() || '0'}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500 mb-2">Savings %</div>
          <div className="text-3xl font-bold text-blue-600">
            {kpis?.savingsPercentage?.toFixed(1) || '0'}%
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500 mb-2">Avg Utilization</div>
          <div className="text-3xl font-bold text-purple-600">
            {kpis?.averageUtilization?.toFixed(1) || '0'}%
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Monthly Projection</h2>
          <div className="text-4xl font-bold text-green-600 mb-2">
            ${kpis?.monthlySavings?.toLocaleString() || '0'}
          </div>
          <p className="text-sm text-gray-500">Estimated monthly savings</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Annual Projection</h2>
          <div className="text-4xl font-bold text-green-600 mb-2">
            ${kpis?.annualSavings?.toLocaleString() || '0'}
          </div>
          <p className="text-sm text-gray-500">Estimated annual savings</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Cost Trend</h2>
          {costTrend.length > 0 ? (
            <CostTrendChart data={costTrend} />
          ) : (
            <p className="text-gray-500 text-center py-8">No data available</p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Box Usage</h2>
          {boxUsage.length > 0 ? (
            <BoxUsageChart data={boxUsage} />
          ) : (
            <p className="text-gray-500 text-center py-8">No data available</p>
          )}
        </div>
      </div>
    </div>
  )
}
