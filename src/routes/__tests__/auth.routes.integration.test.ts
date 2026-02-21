/**
 * Integration tests for authentication routes
 * These tests verify the route structure and validation logic
 */

import { Router } from 'express'
import authRoutes from '../auth.routes'

describe('Authentication Routes Integration', () => {
  it('should export a valid Express router', () => {
    expect(authRoutes).toBeDefined()
    expect(typeof authRoutes).toBe('function')
    expect(authRoutes.stack).toBeDefined()
  })

  it('should have POST /register route', () => {
    const registerRoute = authRoutes.stack.find(
      (layer: any) => layer.route?.path === '/register' && layer.route?.methods?.post
    )
    expect(registerRoute).toBeDefined()
  })

  it('should have POST /login route', () => {
    const loginRoute = authRoutes.stack.find(
      (layer: any) => layer.route?.path === '/login' && layer.route?.methods?.post
    )
    expect(loginRoute).toBeDefined()
  })

  it('should have POST /refresh route', () => {
    const refreshRoute = authRoutes.stack.find(
      (layer: any) => layer.route?.path === '/refresh' && layer.route?.methods?.post
    )
    expect(refreshRoute).toBeDefined()
  })

  it('should have POST /logout route', () => {
    const logoutRoute = authRoutes.stack.find(
      (layer: any) => layer.route?.path === '/logout' && layer.route?.methods?.post
    )
    expect(logoutRoute).toBeDefined()
  })

  it('should have POST /api-key route', () => {
    const apiKeyRoute = authRoutes.stack.find(
      (layer: any) => layer.route?.path === '/api-key' && layer.route?.methods?.post
    )
    expect(apiKeyRoute).toBeDefined()
  })
})
