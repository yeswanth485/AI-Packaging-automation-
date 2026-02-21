import * as fc from 'fast-check'
import { AuthenticationService } from '../AuthenticationService'
import { PrismaClient, UserRole } from '@prisma/client'
import bcrypt from 'bcrypt'

/**
 * Property-Based Tests for AuthenticationService
 * 
 * **Property 1: Password hashing is deterministic and verifiable**
 * **Validates: Requirements 1.4, 21.1**
 * 
 * This property test verifies that:
 * 1. The same password always produces a valid hash that can be verified
 * 2. Different passwords produce different hashes
 * 3. Hashed passwords can always be verified with bcrypt.compare
 * 4. The hash uses bcrypt cost factor 12
 */

describe('AuthenticationService - Property-Based Tests', () => {
  let authService: AuthenticationService
  let mockPrisma: any

  beforeEach(() => {
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

  describe('Property 1: Password hashing is deterministic and verifiable', () => {
    it('should always produce verifiable hashes for any valid password', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate valid passwords (8-100 characters, printable ASCII)
          fc.string({ minLength: 8, maxLength: 100 }),
          fc.emailAddress(),
          async (password, email) => {
            // Mock Prisma to allow registration
            mockPrisma.user.findUnique.mockResolvedValue(null)
            
            let capturedHash: string | undefined

            mockPrisma.user.create.mockImplementation(async (args: any) => {
              capturedHash = args.data.passwordHash
              return {
                id: 'test-user-id',
                email: args.data.email,
                passwordHash: capturedHash,
                role: args.data.role,
                subscriptionTier: args.data.subscriptionTier,
                isActive: args.data.isActive,
                createdAt: new Date(),
                updatedAt: new Date()
              }
            })

            // Register user with the password
            await authService.register(email, password)

            // Verify the hash was created
            expect(capturedHash).toBeDefined()
            expect(typeof capturedHash).toBe('string')
            expect(capturedHash!.length).toBeGreaterThan(0)

            // Property 1a: The hash should be verifiable with the original password
            const isValid = await bcrypt.compare(password, capturedHash!)
            expect(isValid).toBe(true)

            // Property 1b: The hash should NOT verify with a different password
            if (password !== 'different_password_123') {
              const isInvalid = await bcrypt.compare('different_password_123', capturedHash!)
              expect(isInvalid).toBe(false)
            }

            // Property 1c: The hash should start with bcrypt identifier
            // Bcrypt hashes start with $2a$, $2b$, or $2y$ followed by cost factor
            expect(capturedHash).toMatch(/^\$2[aby]\$\d{2}\$/)

            // Property 1d: Verify cost factor is 12
            const costFactor = parseInt(capturedHash!.substring(4, 6))
            expect(costFactor).toBe(12)
          }
        ),
        { numRuns: 50 } // Run 50 test cases with different passwords
      )
    })

    it('should produce different hashes for different passwords', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 8, maxLength: 100 }),
          fc.string({ minLength: 8, maxLength: 100 }),
          fc.emailAddress(),
          async (password1, password2, email) => {
            // Skip if passwords are the same
            fc.pre(password1 !== password2)

            mockPrisma.user.findUnique.mockResolvedValue(null)

            let hash1: string | undefined
            let hash2: string | undefined

            // Register with first password
            mockPrisma.user.create.mockImplementationOnce(async (args: any) => {
              hash1 = args.data.passwordHash
              return {
                id: 'user-1',
                email: args.data.email,
                passwordHash: hash1,
                role: UserRole.CUSTOMER,
                subscriptionTier: 'FREE',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
              }
            })

            await authService.register(email, password1)

            // Register with second password
            mockPrisma.user.create.mockImplementationOnce(async (args: any) => {
              hash2 = args.data.passwordHash
              return {
                id: 'user-2',
                email: 'different-' + args.data.email,
                passwordHash: hash2,
                role: UserRole.CUSTOMER,
                subscriptionTier: 'FREE',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
              }
            })

            await authService.register('different-' + email, password2)

            // Property: Different passwords should produce different hashes
            expect(hash1).toBeDefined()
            expect(hash2).toBeDefined()
            expect(hash1).not.toBe(hash2)

            // Property: Each hash should only verify its own password
            const hash1VerifiesPassword1 = await bcrypt.compare(password1, hash1!)
            const hash1VerifiesPassword2 = await bcrypt.compare(password2, hash1!)
            const hash2VerifiesPassword1 = await bcrypt.compare(password1, hash2!)
            const hash2VerifiesPassword2 = await bcrypt.compare(password2, hash2!)

            expect(hash1VerifiesPassword1).toBe(true)
            expect(hash1VerifiesPassword2).toBe(false)
            expect(hash2VerifiesPassword1).toBe(false)
            expect(hash2VerifiesPassword2).toBe(true)
          }
        ),
        { numRuns: 30 } // Run 30 test cases
      )
    })

    it('should consistently hash and verify passwords with special characters', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate passwords with various special characters
          fc.string({
            minLength: 8,
            maxLength: 50
          }),
          fc.emailAddress(),
          async (password, email) => {
            mockPrisma.user.findUnique.mockResolvedValue(null)

            let capturedHash: string | undefined

            mockPrisma.user.create.mockImplementation(async (args: any) => {
              capturedHash = args.data.passwordHash
              return {
                id: 'test-user',
                email: args.data.email,
                passwordHash: capturedHash,
                role: UserRole.CUSTOMER,
                subscriptionTier: 'FREE',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
              }
            })

            await authService.register(email, password)

            // Property: Hash should always verify correctly regardless of special characters
            const isValid = await bcrypt.compare(password, capturedHash!)
            expect(isValid).toBe(true)

            // Property: Hash should be a valid bcrypt hash
            expect(capturedHash).toMatch(/^\$2[aby]\$12\$/)
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should handle edge case passwords correctly', async () => {
      const edgeCasePasswords = [
        '12345678', // Minimum length
        'a'.repeat(100), // Maximum length
        '!@#$%^&*()', // Special characters only
        'Pass123!', // Mixed case with numbers and special chars
        '        ', // Spaces only (8 spaces)
        'пароль123', // Unicode characters
        'password\n\t', // With whitespace characters
      ]

      for (const password of edgeCasePasswords) {
        mockPrisma.user.findUnique.mockResolvedValue(null)

        let capturedHash: string | undefined

        mockPrisma.user.create.mockImplementation(async (args: any) => {
          capturedHash = args.data.passwordHash
          return {
            id: `user-${password.length}`,
            email: `test-${password.length}@example.com`,
            passwordHash: capturedHash,
            role: UserRole.CUSTOMER,
            subscriptionTier: 'FREE',
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        })

        await authService.register(`test-${password.length}@example.com`, password)

        // Property: All edge case passwords should hash and verify correctly
        expect(capturedHash).toBeDefined()
        const isValid = await bcrypt.compare(password, capturedHash!)
        expect(isValid).toBe(true)

        // Property: Cost factor should always be 12
        const costFactor = parseInt(capturedHash!.substring(4, 6))
        expect(costFactor).toBe(12)
      }
    })
  })
})
