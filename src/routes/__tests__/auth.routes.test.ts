import request from 'supertest'
import express, { Express } from 'express'
import { PrismaClient, UserRole } from '@prisma/client'
import authRoutes from '../auth.routes'
import { errorHandler } from '../../middleware/errorHandler'
import { AuthenticationService } from '../../services/AuthenticationService'

// Mock the PrismaClient
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  }
  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
    UserRole: {
      ADMIN: 'admin',
      CUSTOMER: 'customer',
      TRIAL: 'trial',
    },
  }
})

describe('Authentication Routes', () => {
  let app: Express
  let prisma: PrismaClient

  beforeEach(() => {
    app = express()
    app.use(express.json())
    app.use('/api/auth', authRoutes)
    app.use(errorHandler)

    prisma = new PrismaClient()
    jest.clearAllMocks()
  })

  describe('POST /api/auth/register', () => {
    it('should register a new user with valid credentials', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        role: UserRole.CUSTOMER,
        subscriptionTier: 'free',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLogin: new Date(),
        apiKey: null,
        apiKeyCreatedAt: null,
      }

      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.user.create as jest.Mock).mockResolvedValue(mockUser)

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
        })

      expect(response.status).toBe(201)
      expect(response.body.status).toBe('success')
      expect(response.body.data.user.email).toBe('test@example.com')
      expect(response.body.data.user.role).toBe(UserRole.CUSTOMER)
    })

    it('should return 400 for invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: 'password123',
        })

      expect(response.status).toBe(400)
      expect(response.body.status).toBe('error')
    })

    it('should return 400 for short password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'short',
        })

      expect(response.status).toBe(400)
      expect(response.body.status).toBe('error')
    })

    it('should return 409 for duplicate email', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        role: UserRole.CUSTOMER,
        subscriptionTier: 'free',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLogin: new Date(),
        apiKey: null,
        apiKeyCreatedAt: null,
      }

      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
        })

      expect(response.status).toBe(409)
      expect(response.body.status).toBe('error')
      expect(response.body.message).toBe('Email already registered')
    })
  })

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        passwordHash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIeWEHaSuu', // 'password123'
        role: UserRole.CUSTOMER,
        subscriptionTier: 'free',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLogin: new Date(),
        apiKey: null,
        apiKeyCreatedAt: null,
      }

      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
      ;(prisma.user.update as jest.Mock).mockResolvedValue(mockUser)

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        })

      expect(response.status).toBe(200)
      expect(response.body.status).toBe('success')
      expect(response.body.data.accessToken).toBeDefined()
      expect(response.body.data.refreshToken).toBeDefined()
      expect(response.body.data.expiresIn).toBe(900) // 15 minutes
    })

    it('should return 401 for invalid credentials', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword',
        })

      expect(response.status).toBe(401)
      expect(response.body.status).toBe('error')
      expect(response.body.message).toBe('Invalid credentials')
    })

    it('should return 400 for missing email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          password: 'password123',
        })

      expect(response.status).toBe(400)
      expect(response.body.status).toBe('error')
    })
  })

  describe('POST /api/auth/refresh', () => {
    it('should refresh access token with valid refresh token', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        role: UserRole.CUSTOMER,
        subscriptionTier: 'free',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLogin: new Date(),
        apiKey: null,
        apiKeyCreatedAt: null,
      }

      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)

      // First login to get a valid refresh token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        })

      const { refreshToken } = loginResponse.body.data

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken,
        })

      expect(response.status).toBe(200)
      expect(response.body.status).toBe('success')
      expect(response.body.data.accessToken).toBeDefined()
    })

    it('should return 400 for missing refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({})

      expect(response.status).toBe(400)
      expect(response.body.status).toBe('error')
    })

    it('should return 401 for invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: 'invalid-token',
        })

      expect(response.status).toBe(401)
      expect(response.body.status).toBe('error')
    })
  })

  describe('POST /api/auth/logout', () => {
    it('should logout authenticated user', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        role: UserRole.CUSTOMER,
        subscriptionTier: 'free',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLogin: new Date(),
        apiKey: null,
        apiKeyCreatedAt: null,
      }

      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)

      // First login to get a valid token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        })

      const { accessToken } = loginResponse.body.data

      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)

      expect(response.status).toBe(200)
      expect(response.body.status).toBe('success')
      expect(response.body.message).toBe('Logged out successfully')
    })

    it('should return 401 for missing authentication', async () => {
      const response = await request(app).post('/api/auth/logout')

      expect(response.status).toBe(401)
      expect(response.body.status).toBe('error')
    })
  })

  describe('POST /api/auth/api-key', () => {
    it('should generate API key for authenticated user', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        role: UserRole.CUSTOMER,
        subscriptionTier: 'free',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLogin: new Date(),
        apiKey: 'pk_test123',
        apiKeyCreatedAt: new Date(),
      }

      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
      ;(prisma.user.update as jest.Mock).mockResolvedValue(mockUser)

      // First login to get a valid token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        })

      const { accessToken } = loginResponse.body.data

      const response = await request(app)
        .post('/api/auth/api-key')
        .set('Authorization', `Bearer ${accessToken}`)

      expect(response.status).toBe(201)
      expect(response.body.status).toBe('success')
      expect(response.body.data.apiKey.key).toBeDefined()
      expect(response.body.data.apiKey.createdAt).toBeDefined()
    })

    it('should return 401 for missing authentication', async () => {
      const response = await request(app).post('/api/auth/api-key')

      expect(response.status).toBe(401)
      expect(response.body.status).toBe('error')
    })
  })
})
