import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { PrismaClient, User, UserRole, SubscriptionTier } from '@prisma/client'

const BCRYPT_COST_FACTOR = 12
const ACCESS_TOKEN_EXPIRY = '15m'
const REFRESH_TOKEN_EXPIRY = '7d'

export interface AuthToken {
  accessToken: string
  refreshToken: string
  expiresIn: number
  user: {
    id: string
    email: string
    role: string
    subscriptionTier?: string
    isActive: boolean
    createdAt: Date
    lastLogin?: Date
  }
}

export interface APIKey {
  key: string
  userId: string
  createdAt: Date
  lastUsed: Date | null
  isActive: boolean
}

export class AuthenticationService {
  private prisma: PrismaClient
  private jwtSecret: string
  private jwtRefreshSecret: string

  constructor(prisma: PrismaClient, jwtSecret?: string, jwtRefreshSecret?: string) {
    this.prisma = prisma
    this.jwtSecret = jwtSecret || process.env.JWT_SECRET || 'default-secret-change-in-production'
    this.jwtRefreshSecret = jwtRefreshSecret || process.env.JWT_REFRESH_SECRET || 'default-refresh-secret-change-in-production'
  }

  /**
   * Register a new user with email, password, and role
   * Validates email uniqueness and password complexity
   * Hashes password with bcrypt cost factor 12
   */
  async register(email: string, password: string, role: UserRole = UserRole.CUSTOMER): Promise<User> {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format')
    }

    // Validate password complexity (minimum 8 characters)
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long')
    }

    // Check email uniqueness
    const existingUser = await this.prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      throw new Error('Email already registered')
    }

    // Hash password with bcrypt cost factor 12
    const passwordHash = await bcrypt.hash(password, BCRYPT_COST_FACTOR)

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        role,
        subscriptionTier: SubscriptionTier.FREE,
        isActive: true
      }
    })

    return user
  }

  /**
   * Login with email and password
   * Validates credentials and generates JWT tokens
   */
  async login(email: string, password: string): Promise<AuthToken> {
    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      throw new Error('Invalid credentials')
    }

    // Validate password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash)

    if (!isPasswordValid) {
      throw new Error('Invalid credentials')
    }

    // Update last login timestamp
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    })

    // Generate tokens
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      this.jwtSecret,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    )

    const refreshToken = jwt.sign(
      { userId: user.id },
      this.jwtRefreshSecret,
      { expiresIn: REFRESH_TOKEN_EXPIRY }
    )

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60, // 15 minutes in seconds
      user: {
        id: user.id,
        email: user.email,
        name: user.name || undefined,
        role: user.role,
        subscriptionTier: user.subscriptionTier,
        isActive: user.isActive,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin || undefined
      }
    }
  }

  /**
   * Validate JWT access token and return user
   */
  async validateToken(token: string): Promise<User> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as { userId: string }

      const user = await this.prisma.user.findUnique({
        where: { id: decoded.userId }
      })

      if (!user || !user.isActive) {
        throw new Error('User not found or inactive')
      }

      return user
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token expired')
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token')
      }
      throw error
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<AuthToken> {
    try {
      const decoded = jwt.verify(refreshToken, this.jwtRefreshSecret) as { userId: string }

      const user = await this.prisma.user.findUnique({
        where: { id: decoded.userId }
      })

      if (!user || !user.isActive) {
        throw new Error('User not found or inactive')
      }

      // Generate new access token
      const accessToken = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        this.jwtSecret,
        { expiresIn: ACCESS_TOKEN_EXPIRY }
      )

      return {
        accessToken,
        refreshToken, // Return the same refresh token
        expiresIn: 15 * 60
      }
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Refresh token expired')
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid refresh token')
      }
      throw error
    }
  }

  /**
   * Generate unique API key for user
   */
  async generateAPIKey(userId: string): Promise<APIKey> {
    // Verify user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      throw new Error('User not found')
    }

    // Generate unique API key
    const apiKey = `pk_${crypto.randomBytes(32).toString('hex')}`

    // Update user with API key
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        apiKey,
        apiKeyCreatedAt: new Date()
      }
    })

    return {
      key: apiKey,
      userId: updatedUser.id,
      createdAt: updatedUser.apiKeyCreatedAt!,
      lastUsed: null,
      isActive: true
    }
  }

  /**
   * Validate API key and return user
   */
  async validateAPIKey(apiKey: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { apiKey }
    })

    if (!user || !user.isActive) {
      throw new Error('Invalid API key')
    }

    // Update last used timestamp (fire and forget)
    this.prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    }).catch(() => {
      // Ignore errors in background update
    })

    return user
  }

  /**
   * Logout user (placeholder for future session management)
   */
  async logout(userId: string): Promise<void> {
    // Verify user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      throw new Error('User not found')
    }

    // In a production system, this would invalidate tokens in Redis
    // For now, this is a placeholder
  }
}
