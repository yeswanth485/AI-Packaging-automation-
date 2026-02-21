'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'

export default function AdminPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalSimulations: 0,
    totalRevenue: 0,
  })
  const [users, setUsers] = useState<any[]>([])

  useEffect(() => {
    if (user?.role !== 'ADMIN') {
      window.location.href = '/dashboard'
      return
    }
    loadAdminData()
  }, [user])

  const loadAdminData = async () => {
    try {
      // Mock data - in real app, fetch from API
      setMetrics({
        totalUsers: 1234,
        activeUsers: 856,
        totalSimulations: 45678,
        totalRevenue: 12345.67,
      })
      setUsers([
        {
          id: '1',
          email: 'user1@example.com',
          tier: 'PROFESSIONAL',
          status: 'ACTIVE',
          createdAt: '2024-01-15',
          lastLogin: '2024-03-20',
        },
        {
          id: '2',
          email: 'user2@example.com',
          tier: 'BASIC',
          status: 'ACTIVE',
          createdAt: '2024-02-01',
          lastLogin: '2024-03-19',
        },
        {
          id: '3',
          email: 'user3@example.com',
          tier: 'FREE',
          status: 'INACTIVE',
          createdAt: '2024-03-01',
          lastLogin: '2024-03-10',
        },
      ])
    } catch (err: any) {
      console.error('Failed to load admin data:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500 mb-2">Total Users</div>
          <div className="text-3xl font-bold text-gray-900">
            {metrics.totalUsers.toLocaleString()}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500 mb-2">Active Users</div>
          <div className="text-3xl font-bold text-green-600">
            {metrics.activeUsers.toLocaleString()}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500 mb-2">Total Simulations</div>
          <div className="text-3xl font-bold text-blue-600">
            {metrics.totalSimulations.toLocaleString()}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500 mb-2">Total Revenue</div>
          <div className="text-3xl font-bold text-purple-600">
            ${metrics.totalRevenue.toLocaleString()}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">User Management</h2>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tier
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Login
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {user.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {user.tier}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.status === 'ACTIVE'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {user.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(user.lastLogin).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button className="text-blue-600 hover:text-blue-900 mr-4">
                    View
                  </button>
                  <button className="text-red-600 hover:text-red-900">
                    Suspend
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
