'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { api } from './api'

interface User {
  id: string
  email: string
  role: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user is logged in on mount
    const token = localStorage.getItem('accessToken')
    if (token) {
      // TODO: Validate token and fetch user data
      setLoading(false)
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (email: string, password: string) => {
    try {
      const response = await api.login(email, password)
      // TODO: Set user from response
      setUser({ id: '1', email, role: 'CUSTOMER' })
    } catch (error) {
      throw error
    }
  }

  const register = async (email: string, password: string) => {
    try {
      await api.register(email, password)
      await login(email, password)
    } catch (error) {
      throw error
    }
  }

  const logout = async () => {
    try {
      await api.logout()
      setUser(null)
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
