'use client'

import Sidebar from '@/components/Sidebar'
import ProtectedRoute from '@/components/ProtectedRoute'
import { AuthProvider } from '@/lib/auth-context'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      <ProtectedRoute>
        <div className="flex h-screen bg-gray-100">
          <Sidebar />
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </ProtectedRoute>
    </AuthProvider>
  )
}
