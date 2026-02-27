'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { LoadingScreen } from '@/components/ui/Spinner'
import { TrendingUp, CheckCircle } from 'lucide-react'
import ProtectedRoute from '@/components/ProtectedRoute'
import type { Subscription, QuotaStatus, UsageHistory, APIError } from '@/lib/types'

const TIERS = [
  {
    name: 'FREE',
    price: 0,
    features: [
      '100 simulations/month',
      'Basic analytics',
      'Email support',
      '1 user',
    ],
  },
  {
    name: 'BASIC',
    price: 49,
    features: [
      '1,000 simulations/month',
      'Advanced analytics',
      'Priority email support',
      '5 users',
      'API access',
    ],
  },
  {
    name: 'PROFESSIONAL',
    price: 199,
    features: [
      '10,000 simulations/month',
      'Full analytics suite',
      '24/7 support',
      'Unlimited users',
      'API access',
      'Custom integrations',
    ],
  },
  {
    name: 'ENTERPRISE',
    price: 499,
    features: [
      'Unlimited simulations',
      'Enterprise analytics',
      'Dedicated support',
      'Unlimited users',
      'API access',
      'Custom integrations',
      'SLA guarantee',
    ],
  },
]

function SubscriptionContent() {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [quota, setQuota] = useState<QuotaStatus | null>(null)
  const [usageHistory, setUsageHistory] = useState<UsageHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadSubscriptionData()
  }, [])

  const loadSubscriptionData = async () => {
    try {
      const [subResponse, quotaResponse, historyResponse] = await Promise.all([
        api.getSubscription(),
        api.getQuotaStatus(),
        api.getUsageHistory(),
      ])
      setSubscription(subResponse.data)
      setQuota(quotaResponse.data)
      setUsageHistory(historyResponse.data || [])
    } catch (err) {
      const error = err as APIError
      setError(error.response?.data?.message || 'Failed to load subscription data')
    } finally {
      setLoading(false)
    }
  }

  const handleUpgrade = async (tier: string) => {
    if (!confirm(`Upgrade to ${tier} plan?`)) return

    try {
      await api.updateSubscription(tier)
      loadSubscriptionData()
    } catch (err) {
      const error = err as APIError
      setError(error.response?.data?.message || 'Failed to update subscription')
    }
  }

  if (loading) return <LoadingScreen message="Loading subscription..." />

  const usagePercentage = quota ? (quota.used / quota.limit) * 100 : 0

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Subscription</h1>

      {error && <Alert variant="error" className="mb-6">{error}</Alert>}

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold text-gray-900">{subscription?.tier || 'FREE'}</div>
              <div className="text-gray-500">
                ${TIERS.find((t) => t.name === subscription?.tier)?.price || 0}/month
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Status</div>
              <div className="text-lg font-semibold text-green-600">
                {subscription?.status || 'Active'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Usage This Month</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-700">Simulations</span>
              <span className="text-gray-900 font-medium">
                {quota?.used || 0} / {quota?.limit || 0}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className={`h-4 rounded-full ${
                  usagePercentage > 90 ? 'bg-red-600' : usagePercentage > 70 ? 'bg-yellow-600' : 'bg-blue-600'
                }`}
                style={{ width: `${Math.min(usagePercentage, 100)}%` }}
              ></div>
            </div>
            <div className="text-sm text-gray-500 mt-2">
              {usagePercentage.toFixed(1)}% used
            </div>
          </div>
          {usagePercentage > 80 && (
            <Alert variant="warning">
              You're approaching your monthly limit. Consider upgrading your plan.
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Usage History</CardTitle>
        </CardHeader>
        <CardContent>
          {usageHistory.length > 0 ? (
            <div className="space-y-3">
              {usageHistory.slice(0, 10).map((usage, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="font-medium text-gray-900">{usage.type}</p>
                      <p className="text-sm text-gray-500">{usage.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{usage.count}</p>
                    <p className="text-sm text-gray-500">simulations</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No usage history available</p>
          )}
        </CardContent>
      </Card>

      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Available Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {TIERS.map((tier) => (
            <Card
              key={tier.name}
              className={subscription?.tier === tier.name ? 'ring-2 ring-blue-600' : ''}
            >
              <CardContent className="p-6">
                <div className="text-center mb-4">
                  <h3 className="text-xl font-bold text-gray-900">{tier.name}</h3>
                  <div className="mt-2">
                    <span className="text-4xl font-bold text-gray-900">${tier.price}</span>
                    <span className="text-gray-500">/month</span>
                  </div>
                </div>
                <ul className="space-y-3 mb-6">
                  {tier.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                      <span className="text-sm text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>
                {subscription?.tier === tier.name ? (
                  <Button disabled className="w-full" variant="secondary">
                    Current Plan
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleUpgrade(tier.name)}
                    className="w-full"
                  >
                    {tier.price > (TIERS.find((t) => t.name === subscription?.tier)?.price || 0)
                      ? 'Upgrade'
                      : 'Downgrade'}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function SubscriptionPage() {
  return (
    <ProtectedRoute>
      <SubscriptionContent />
    </ProtectedRoute>
  )
}
