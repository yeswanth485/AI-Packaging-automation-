'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: '📊' },
  { name: 'Simulation', href: '/simulation', icon: '🔄' },
  { name: 'Analytics', href: '/analytics', icon: '📈' },
  { name: 'Box Catalog', href: '/boxes', icon: '📦' },
  { name: 'Subscription', href: '/subscription', icon: '💳' },
  { name: 'Configuration', href: '/config', icon: '⚙️' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  return (
    <div className="flex flex-col w-64 bg-gray-800 min-h-screen">
      <div className="flex items-center justify-center h-16 bg-gray-900">
        <span className="text-white text-xl font-bold">AI Packaging</span>
      </div>
      
      <nav className="flex-1 px-2 py-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`
                flex items-center px-4 py-2 text-sm font-medium rounded-md
                ${isActive
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }
              `}
            >
              <span className="mr-3">{item.icon}</span>
              {item.name}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-gray-700">
        <div className="flex items-center mb-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-white">{user?.email}</p>
            <p className="text-xs text-gray-400">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full px-4 py-2 text-sm font-medium text-white bg-gray-700 rounded-md hover:bg-gray-600"
        >
          Logout
        </button>
      </div>
    </div>
  )
}
