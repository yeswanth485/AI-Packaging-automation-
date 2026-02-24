'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { useToast } from '@/components/ui/Toast'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { LoadingScreen } from '@/components/ui/Spinner'
import { Settings, Info } from 'lucide-react'
import type { APIError } from '@/lib/types'

export default function ConfigPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const { addToast } = useToast()
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
    } catch (err) {
      const error = err as APIError
      setError(error.response?.data?.message || 'Failed to load configuration')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      const data = {
        bufferPadding: parseFloat(config.bufferPadding),
        volumetricDivisor: parseFloat(config.volumetricDivisor),
        shippingRate: parseFloat(config.shippingRate),
      }

      await api.updateConfiguration(data)
      addToast('Configuration saved successfully', 'success')
    } catch (err) {
      const error = err as APIError
      const errorMessage = error.response?.data?.message || 'Failed to save configuration'
      setError(errorMessage)
      addToast(errorMessage, 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingScreen message="Loading configuration..." />

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-8">
        <Settings className="h-8 w-8 text-gray-700" />
        <h1 className="text-3xl font-bold text-gray-900">Configuration</h1>
      </div>

      {error && <Alert variant="error" className="mb-6">{error}</Alert>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>System Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit}>
                <div className="space-y-6">
                  <Input
                    label="Buffer Padding"
                    type="number"
                    step="0.01"
                    value={config.bufferPadding}
                    onChange={(e) => setConfig({ ...config, bufferPadding: e.target.value })}
                    required
                  />
                  <p className="text-sm text-gray-500 -mt-4">
                    Extra space to add around items (in inches). Recommended: 0.1 - 0.5
                  </p>

                  <Input
                    label="Volumetric Divisor"
                    type="number"
                    step="1"
                    value={config.volumetricDivisor}
                    onChange={(e) => setConfig({ ...config, volumetricDivisor: e.target.value })}
                    required
                  />
                  <p className="text-sm text-gray-500 -mt-4">
                    Used to calculate dimensional weight. Standard: 166 (domestic), 139 (international)
                  </p>

                  <Input
                    label="Shipping Rate ($/lb)"
                    type="number"
                    step="0.01"
                    value={config.shippingRate}
                    onChange={(e) => setConfig({ ...config, shippingRate: e.target.value })}
                    required
                  />
                  <p className="text-sm text-gray-500 -mt-4">
                    Base shipping rate per pound. Typical range: $0.30 - $1.00
                  </p>

                  <Button type="submit" className="w-full" isLoading={saving}>
                    Save Configuration
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Info className="h-5 w-5 text-blue-500" />
                <CardTitle>Configuration Guide</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-sm text-gray-600">
                <div>
                  <p className="font-semibold text-gray-900 mb-1">Buffer Padding</p>
                  <p>Adds extra space around items to account for packing materials and ensure items fit comfortably. Higher values provide more protection but may increase box size.</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 mb-1">Volumetric Divisor</p>
                  <p>Used by carriers to calculate dimensional weight. Lower values result in higher dimensional weights. Check with your carrier for the correct divisor.</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 mb-1">Shipping Rate</p>
                  <p>Base cost per pound for shipping. This is used to calculate baseline costs. Adjust based on your carrier rates and shipping zones.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
