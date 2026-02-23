'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import type { APIError } from '@/lib/types'

export default function APIIntegrationPage() {
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadAPIKey()
  }, [])

  const loadAPIKey = async () => {
    try {
      // In a real app, this would fetch the existing API key (masked)
      setApiKey('sk_test_••••••••••••••••••••••••••••1234')
    } catch (err) {
      const error = err as APIError
      setError(error.response?.data?.message || 'Failed to load API key')
    } finally {
      setLoading(false)
    }
  }

  const generateNewKey = async () => {
    if (!confirm('Generate a new API key? This will invalidate your current key.')) return

    try {
      const response = await api.generateAPIKey()
      setApiKey(response.apiKey)
      setShowKey(true)
    } catch (err) {
      const error = err as APIError
      setError(error.response?.data?.message || 'Failed to generate API key')
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(apiKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">API Integration</h1>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">API Key</h2>
        <div className="flex items-center gap-3 mb-4">
          <input
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            readOnly
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 font-mono text-sm"
          />
          <button
            onClick={() => setShowKey(!showKey)}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            {showKey ? 'Hide' : 'Show'}
          </button>
          <button
            onClick={copyToClipboard}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <button
          onClick={generateNewKey}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
        >
          Generate New Key
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">API Usage</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-500">Total Requests</div>
            <div className="text-2xl font-bold text-gray-900">1,234</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-500">This Month</div>
            <div className="text-2xl font-bold text-gray-900">456</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-500">Success Rate</div>
            <div className="text-2xl font-bold text-green-600">99.8%</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Code Examples</h2>
        
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Authentication</h3>
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-md overflow-x-auto">
            <code>{`curl -X POST https://api.example.com/api/optimize \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "items": [
      {
        "length": 10,
        "width": 8,
        "height": 6,
        "weight": 5
      }
    ]
  }'`}</code>
          </pre>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">JavaScript/Node.js</h3>
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-md overflow-x-auto">
            <code>{`const axios = require('axios');

const response = await axios.post(
  'https://api.example.com/api/optimize',
  {
    items: [
      { length: 10, width: 8, height: 6, weight: 5 }
    ]
  },
  {
    headers: {
      'Authorization': 'Bearer YOUR_API_KEY',
      'Content-Type': 'application/json'
    }
  }
);

console.log(response.data);`}</code>
          </pre>
        </div>

        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Python</h3>
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-md overflow-x-auto">
            <code>{`import requests

response = requests.post(
    'https://api.example.com/api/optimize',
    json={
        'items': [
            {'length': 10, 'width': 8, 'height': 6, 'weight': 5}
        ]
    },
    headers={
        'Authorization': 'Bearer YOUR_API_KEY',
        'Content-Type': 'application/json'
    }
)

print(response.json())`}</code>
          </pre>
        </div>
      </div>
    </div>
  )
}
