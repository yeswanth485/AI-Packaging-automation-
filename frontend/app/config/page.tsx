'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'

export default function ConfigPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [config, setConfig] = useState({
    bufferPadding: '',
    volumetricDivisor: '',
    shippingRate: '',
  })

  useEffect(() => {
    loadConfiguration()
  }, [])

  const loadConfiguration = async () => {
    try {
      const response = await api.getConfiguration()
      const data = response.data
      setConfig({
        bufferPadding: data.bufferPadding?.toString() || '0.1',
        volumetricDivisor: data.volumetricDivisor?.toString() || '166',
        shippingRate: data.shippingRate?.toString() || '0.5',
      })
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load configuration')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const data = {
        bufferPadding: parseFloat(config.bufferPadding),
        volumetricDivisor: parseFloat(config.volumetricDivisor),
        shippingRate: parseFloat(config.shippingRate),
      }

      await api.updateConfiguration(data)
      setSuccess('Configuration saved successfully')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save configuration')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Configuration</h1>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4">
          <p className="text-green-800">{success}</p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Buffer Padding
              </label>
              <input
                type="number"
                step="0.01"
                value={config.bufferPadding}
                onChange={(e) => setConfig({ ...config, bufferPadding: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
              <p className="mt-1 text-sm text-gray-500">
                Extra space to add around items (in inches). Recommended: 0.1 - 0.5
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Volumetric Divisor
              </label>
              <input
                type="number"
                step="1"
                value={config.volumetricDivisor}
                onChange={(e) => setConfig({ ...config, volumetricDivisor: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
              <p className="mt-1 text-sm text-gray-500">
                Used to calculate dimensional weight. Standard: 166 (domestic), 139 (international)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Shipping Rate ($/lb)
              </label>
              <input
                type="number"
                step="0.01"
                value={config.shippingRate}
                onChange={(e) => setConfig({ ...config, shippingRate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
              <p className="mt-1 text-sm text-gray-500">
                Base shipping rate per pound. Typical range: $0.30 - $1.00
              </p>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={saving}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </div>
        </form>

        <div className="mt-8 pt-8 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Configuration Guide</h3>
          <div className="space-y-4 text-sm text-gray-600">
            <div>
              <strong className="text-gray-900">Buffer Padding:</strong> Adds extra space around items
              to account for packing materials and ensure items fit comfortably. Higher values provide
              more protection but may increase box size.
            </div>
            <div>
              <strong className="text-gray-900">Volumetric Divisor:</strong> Used by carriers to
              calculate dimensional weight. Lower values result in higher dimensional weights. Check
              with your carrier for the correct divisor.
            </div>
            <div>
              <strong className="text-gray-900">Shipping Rate:</strong> Base cost per pound for
              shipping. This is used to calculate baseline costs. Adjust based on your carrier rates
              and shipping zones.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
