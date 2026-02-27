'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { 
  LayoutDashboard, 
  RefreshCw, 
  BarChart3, 
  Package, 
  CreditCard, 
  Settings,
  LogOut,
  User,
  Shield,
  Code
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Simulation', href: '/simulation', icon: RefreshCw },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Box Catalog', href: '/boxes', icon: Package },
  { name: 'Subscription', href: '/subscription', icon: CreditCard },
  { name: 'API Integration', href: '/api-integration', icon: Code },
  { name: 'Configuration', href: '/config', icon: Settings },
]

const adminNavigation = [
  { name: 'Admin', href: '/admin', icon: Shield },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  return (
    <div className="flex flex-col w-64 bg-gray-800 min-h-screen">
      <div className="flex items-center justify-center h-16 bg-gray-900 border-b border-gray-700">
        <Package className="h-8 w-8 text-blue-500 mr-2" />
        <span className="text-white text-xl font-bold">AI Packaging</span>
      </div>
      
      <nav className="flex-1 px-2 py-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors',
                isActive
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              )}
            >
              <Icon className="mr-3 h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
        
        {/* Admin-only navigation */}
        {user?.role === 'ADMIN' && (
          <>
            <div className="border-t border-gray-700 my-4"></div>
            {adminNavigation.map((item) => {
              const isActive = pathname === item.href
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors',
                    isActive
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  )}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
          </>
        )}
      </nav>

      <div className="p-4 border-t border-gray-700">
        <div className="flex items-center mb-4 px-2">
          <div className="flex items-center justify-center h-10 w-10 rounded-full bg-gray-700 mr-3">
            <User className="h-5 w-5 text-gray-300" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.email}</p>
            <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
          </div>
        </div>
        <Button
          onClick={logout}
          variant="secondary"
          className="w-full"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  )
}
