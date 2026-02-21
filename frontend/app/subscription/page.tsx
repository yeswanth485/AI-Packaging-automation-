'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

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

export default function SubscriptionPage() {
  const [subscription, setSubscription] = useState<any>(null)
  const [quota, setQuota] = useState<any>(null)
  const [usageHistory, setUsageHistory] = useState<any[]>([])
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
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load subscription data')
    } finally {
      setLoading(false)
    }
  }

  const handleUpgrade = async (tier: string) => {
    if (!confirm(`Upgrade to ${tier} plan?`)) return

    try {
      await api.updateSubscription(tier)
      loadSubscriptionData()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update subscription')
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  const usagePercentage = quota ? (quota.used / quota.limit) * 100 : 0

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Subscription</h1>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Current Plan</h2>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-3xl font-bold text-gray-900">{subscription?.tier || 'FREE'}</div>
            <div className="text-gray-500">
              {TIERS.find((t) => t.name === subscription?.tier)?.price || 0} USD/month
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">Status</div>
            <div className="text-lg font-semibold text-green-600">
              {subscription?.status || 'Active'}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Usage This Month</h2>
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
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
            <p className="text-yellow-800 text-sm">
              You're approaching your monthly limit. Consider upgrading your plan.
            </p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Usage History</h2>
        {usageHistory.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={usageHistory}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-500 text-center py-8">No usage history available</p>
        )}
      </div>

      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Available Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`bg-white rounded-lg shadow p-6 ${
                subscription?.tier === tier.name ? 'ring-2 ring-blue-600' : ''
              }`}
            >
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
                    <svg
                      className="h-5 w-5 text-green-500 mr-2 flex-shrink-0"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path d="M5 13l4 4L19 7"></path>
                    </svg>
                    <span className="text-sm text-gray-600">{feature}</span>
                  </li>
                ))}
              </ul>
              {subscription?.tier === tier.name ? (
                <button
                  disabled
                  className="w-full px-4 py-2 bg-gray-300 text-gray-600 rounded-md cursor-not-allowed"
                >
                  Current Plan
                </button>
              ) : (
                <button
                  onClick={() => handleUpgrade(tier.name)}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {tier.price > (TIERS.find((t) => t.name === subscription?.tier)?.price || 0)
                    ? 'Upgrade'
                    : 'Downgrade'}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
