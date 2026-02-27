'use client'

import { useEffect } from 'react'
import { useAnalytics } from '@/hooks/useAnalytics'
import ProtectedRoute from '@/components/ProtectedRoute'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'
import { LoadingScreen } from '@/components/ui/Spinner'
import { TrendingUp, Package, DollarSign, Percent } from 'lucide-react'

function DashboardContent() {
  const { kpis, costTrend, boxUsage, isLoading, error, refresh } = useAnalytics(true)

  if (isLoading) {
    return <LoadingScreen message="Loading dashboard..." />
  }

  if (error) {
    return (
      <div className="p-8">
        <Alert variant="error" title="Error">
          {error}
        </Alert>
      </div>
    )
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Orders</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {kpis?.totalOrders?.toLocaleString() || '0'}
                </p>
              </div>
              <Package className="h-10 w-10 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Savings</p>
                <p className="text-3xl font-bold text-green-600 mt-2">
                  ${kpis?.totalSavings?.toLocaleString() || '0'}
                </p>
              </div>
              <DollarSign className="h-10 w-10 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Savings %</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">
                  {kpis?.savingsPercentage?.toFixed(1) || '0'}%
                </p>
              </div>
              <Percent className="h-10 w-10 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Avg Utilization</p>
                <p className="text-3xl font-bold text-purple-600 mt-2">
                  {kpis?.averageUtilization?.toFixed(1) || '0'}%
                </p>
              </div>
              <TrendingUp className="h-10 w-10 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Projection</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-green-600 mb-2">
              ${kpis?.monthlySavings?.toLocaleString() || '0'}
            </p>
            <p className="text-sm text-gray-500">Estimated monthly savings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Annual Projection</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-green-600 mb-2">
              ${kpis?.annualSavings?.toLocaleString() || '0'}
            </p>
            <p className="text-sm text-gray-500">Estimated annual savings</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Cost Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <div className="text-center">
                <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Cost trend chart will be displayed here</p>
                <p className="text-sm text-gray-400 mt-2">Chart functionality coming soon</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Box Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <div className="text-center">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Box usage chart will be displayed here</p>
                <p className="text-sm text-gray-400 mt-2">Chart functionality coming soon</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  )
}
