import { AuthenticationService } from '../AuthenticationService'
import { PrismaClient, UserRole } from '@prisma/client'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

// Mock Prisma Client
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(),
  UserRole: {
    ADMIN: 'ADMIN',
    CUSTOMER: 'CUSTOMER',
    TRIAL: 'TRIAL'
  }
}))

jest.mock('bcrypt')
jest.mock('jsonwebtoken')

describe('AuthenticationService', () => {
  let authService: AuthenticationService
  let mockPrisma: any

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()

    // Create mock Prisma client
    mockPrisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn()
      }
    }

    authService = new AuthenticationService(
      mockPrisma as unknown as PrismaClient,
      'test-secret',
      'test-refresh-secret'
    )
  })

  describe('register', () => {
    it('should successfully register a new user with valid inputs', async () => {
      const email = 'test@example.com'
      const password = 'password123'
      const hashedPassword = 'hashed_password'

      mockPrisma.user.findUnique.mockResolvedValue(null)
      mockPrisma.user.create.mockResolvedValue({
        id: 'user-1',
        email,
        passwordHash: hashedPassword,
        role: UserRole.CUSTOMER,
        subscriptionTier: 'FREE',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      })

      ;(bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword)

      const user = await authService.register(email, password)

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { email } })
      expect(bcrypt.hash).toHaveBeenCalledWith(password, 12)
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          email,
          passwordHash: hashedPassword,
          role: UserRole.CUSTOMER,
          subscriptionTier: 'FREE',
          isActive: true
        }
      })
      expect(user.email).toBe(email)
    })

    it('should reject registration with invalid email format', async () => {
      await expect(authService.register('invalid-email', 'password123')).rejects.toThrow(
        'Invalid email format'
      )
    })

    it('should reject registration with password less than 8 characters', async () => {
      await expect(authService.register('test@example.com', 'short')).rejects.toThrow(
        'Password must be at least 8 characters long'
      )
    })

    it('should reject registration with duplicate email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'existing-user',
        email: 'test@example.com'
      })

      await expect(authService.register('test@example.com', 'password123')).rejects.toThrow(
        'Email already registered'
      )
    })

    it('should register user with ADMIN role when specified', async () => {
      const email = 'admin@example.com'
      const password = 'password123'

      mockPrisma.user.findUnique.mockResolvedValue(null)
      mockPrisma.user.create.mockResolvedValue({
        id: 'admin-1',
        email,
        role: UserRole.ADMIN
      })

      ;(bcrypt.hash as jest.Mock).mockResolvedValue('hashed')

      await authService.register(email, password, UserRole.ADMIN)

      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          role: UserRole.ADMIN
        })
      })
    })
  })

  describe('login', () => {
    it('should successfully login with correct credentials', async () => {
      const email = 'test@example.com'
      const password = 'password123'
      const user = {
        id: 'user-1',
        email,
        passwordHash: 'hashed_password',
        role: UserRole.CUSTOMER
      }

      mockPrisma.user.findUnique.mockResolvedValue(user)
      mockPrisma.user.update.mockResolvedValue(user)
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)
      ;(jwt.sign as jest.Mock).mockReturnValue('mock-token')

      const authToken = await authService.login(email, password)

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { email } })
      expect(bcrypt.compare).toHaveBeenCalledWith(password, user.passwordHash)
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: user.id },
        data: { lastLogin: expect.any(Date) }
      })
      expect(authToken.accessToken).toBe('mock-token')
      expect(authToken.refreshToken).toBe('mock-token')
      expect(authToken.expiresIn).toBe(900) // 15 minutes
    })

    it('should reject login with non-existent email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)

      await expect(authService.login('nonexistent@example.com', 'password123')).rejects.toThrow(
        'Invalid credentials'
      )
    })

    it('should reject login with incorrect password', async () => {
      const user = {
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: 'hashed_password'
      }

      mockPrisma.user.findUnique.mockResolvedValue(user)
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(false)

      await expect(authService.login('test@example.com', 'wrongpassword')).rejects.toThrow(
        'Invalid credentials'
      )
    })

    it('should generate both access and refresh tokens', async () => {
      const user = {
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: 'hashed',
        role: UserRole.CUSTOMER
      }

      mockPrisma.user.findUnique.mockResolvedValue(user)
      mockPrisma.user.update.mockResolvedValue(user)
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)

      let callCount = 0
      ;(jwt.sign as jest.Mock).mockImplementation(() => {
        callCount++
        return callCount === 1 ? 'access-token' : 'refresh-token'
      })

      const authToken = await authService.login(user.email, 'password123')

      expect(jwt.sign).toHaveBeenCalledTimes(2)
      expect(authToken.accessToken).toBe('access-token')
      expect(authToken.refreshToken).toBe('refresh-token')
    })
  })

  describe('validateToken', () => {
    it('should successfully validate a valid token', async () => {
      const user = {
        id: 'user-1',
        email: 'test@example.com',
        isActive: true
      }

      ;(jwt.verify as jest.Mock).mockReturnValue({ userId: user.id })
      mockPrisma.user.findUnique.mockResolvedValue(user)

      const result = await authService.validateToken('valid-token')

      expect(jwt.verify).toHaveBeenCalledWith('valid-token', 'test-secret')
      expect(result).toEqual(user)
    })

    it('should reject expired token', async () => {
      ;(jwt.verify as jest.Mock).mockImplementation(() => {
        throw new jwt.TokenExpiredError('Token expired', new Date())
      })

      await expect(authService.validateToken('expired-token')).rejects.toThrow('Token expired')
    })

    it('should reject invalid token', async () => {
      ;(jwt.verify as jest.Mock).mockImplementation(() => {
        throw new jwt.JsonWebTokenError('Invalid token')
      })

      await expect(authService.validateToken('invalid-token')).rejects.toThrow('Invalid token')
    })

    it('should reject token for inactive user', async () => {
      ;(jwt.verify as jest.Mock).mockReturnValue({ userId: 'user-1' })
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        isActive: false
      })

      await expect(authService.validateToken('valid-token')).rejects.toThrow(
        'User not found or inactive'
      )
    })
  })

  describe('refreshToken', () => {
    it('should successfully refresh access token with valid refresh token', async () => {
      const user = {
        id: 'user-1',
        email: 'test@example.com',
        role: UserRole.CUSTOMER,
        isActive: true
      }

      ;(jwt.verify as jest.Mock).mockReturnValue({ userId: user.id })
      mockPrisma.user.findUnique.mockResolvedValue(user)
      ;(jwt.sign as jest.Mock).mockReturnValue('new-access-token')

      const result = await authService.refreshToken('valid-refresh-token')

      expect(result.accessToken).toBe('new-access-token')
      expect(result.refreshToken).toBe('valid-refresh-token')
      expect(result.expiresIn).toBe(900)
    })

    it('should reject expired refresh token', async () => {
      ;(jwt.verify as jest.Mock).mockImplementation(() => {
        throw new jwt.TokenExpiredError('Token expired', new Date())
      })

      await expect(authService.refreshToken('expired-refresh-token')).rejects.toThrow(
        'Refresh token expired'
      )
    })

    it('should reject invalid refresh token', async () => {
      ;(jwt.verify as jest.Mock).mockImplementation(() => {
        throw new jwt.JsonWebTokenError('Invalid token')
      })

      await expect(authService.refreshToken('invalid-refresh-token')).rejects.toThrow(
        'Invalid refresh token'
      )
    })
  })

  describe('generateAPIKey', () => {
    it('should successfully generate API key for valid user', async () => {
      const userId = 'user-1'
      const user = { id: userId, email: 'test@example.com' }

      mockPrisma.user.findUnique.mockResolvedValue(user)
      mockPrisma.user.update.mockResolvedValue({
        ...user,
        apiKey: 'pk_generated_key',
        apiKeyCreatedAt: new Date()
      })

      const apiKey = await authService.generateAPIKey(userId)

      expect(apiKey.key).toMatch(/^pk_[a-f0-9]{64}$/)
      expect(apiKey.userId).toBe(userId)
      expect(apiKey.isActive).toBe(true)
    })

    it('should reject API key generation for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)

      await expect(authService.generateAPIKey('non-existent')).rejects.toThrow('User not found')
    })

    it('should generate unique API keys', async () => {
      const user = { id: 'user-1', email: 'test@example.com' }
      mockPrisma.user.findUnique.mockResolvedValue(user)

      const keys: string[] = []
      for (let i = 0; i < 3; i++) {
        mockPrisma.user.update.mockResolvedValue({
          ...user,
          apiKey: `pk_key_${i}`,
          apiKeyCreatedAt: new Date()
        })
        const apiKey = await authService.generateAPIKey('user-1')
        keys.push(apiKey.key)
      }

      // All keys should be different
      const uniqueKeys = new Set(keys)
      expect(uniqueKeys.size).toBe(3)
    })
  })

  describe('validateAPIKey', () => {
    it('should successfully validate valid API key', async () => {
      const user = {
        id: 'user-1',
        email: 'test@example.com',
        apiKey: 'pk_valid_key',
        isActive: true
      }

      mockPrisma.user.findUnique.mockResolvedValue(user)
      mockPrisma.user.update.mockResolvedValue(user)

      const result = await authService.validateAPIKey('pk_valid_key')

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { apiKey: 'pk_valid_key' }
      })
      expect(result).toEqual(user)
    })

    it('should reject invalid API key', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)

      await expect(authService.validateAPIKey('pk_invalid_key')).rejects.toThrow('Invalid API key')
    })

    it('should reject API key for inactive user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        apiKey: 'pk_valid_key',
        isActive: false
      })

      await expect(authService.validateAPIKey('pk_valid_key')).rejects.toThrow('Invalid API key')
    })
  })

  describe('logout', () => {
    it('should successfully logout existing user', async () => {
      const user = { id: 'user-1', email: 'test@example.com' }
      mockPrisma.user.findUnique.mockResolvedValue(user)

      await expect(authService.logout('user-1')).resolves.not.toThrow()
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 'user-1' } })
    })

    it('should reject logout for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)

      await expect(authService.logout('non-existent')).rejects.toThrow('User not found')
    })
  })
})
