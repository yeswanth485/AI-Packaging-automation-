import request from 'supertest'
import express, { Express } from 'express'
import boxRoutes from '../box.routes'
import { BoxCatalogManager } from '../../services/BoxCatalogManager'
import { AuthenticationService } from '../../services/AuthenticationService'
import { errorHandler } from '../../middleware/errorHandler'
import { Box, BoxUsageStats } from '../../types'
import { UserRole, SubscriptionTier } from '@prisma/client'

// Mock the services
jest.mock('../../services/BoxCatalogManager')
jest.mock('../../services/AuthenticationService')

describe('Box Routes', () => {
  let app: Express
  let mockBoxCatalogManager: jest.Mocked<BoxCatalogManager>
  let mockAuthService: jest.Mocked<AuthenticationService>

  const mockAdminUser = {
    id: 'admin-id',
    email: 'admin@example.com',
    role: UserRole.ADMIN,
    subscriptionTier: SubscriptionTier.PRO,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLogin: new Date(),
    passwordHash: 'hash',
    apiKey: null,
    apiKeyCreatedAt: null,
  }

  const mockCustomerUser = {
    ...mockAdminUser,
    id: 'customer-id',
    email: 'customer@example.com',
    role: UserRole.CUSTOMER,
  }

  const mockBox: Box = {
    id: 'box-1',
    name: 'Small Box',
    length: 30,
    width: 20,
    height: 15,
    volume: 9000,
    maxWeight: 5,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  beforeEach(() => {
    app = express()
    app.use(express.json())
    app.use('/api/boxes', boxRoutes)
    app.use(errorHandler)

    mockBoxCatalogManager = new BoxCatalogManager() as jest.Mocked<BoxCatalogManager>
    mockAuthService = new AuthenticationService(null as any) as jest.Mocked<AuthenticationService>

    // Mock BoxCatalogManager methods
    ;(BoxCatalogManager as jest.Mock).mockImplementation(() => mockBoxCatalogManager)

    // Mock AuthenticationService methods
    mockAuthService.validateToken = jest.fn()
  })

  describe('POST /api/boxes', () => {
    it('should create a new box when admin authenticated', async () => {
      mockAuthService.validateToken.mockResolvedValue(mockAdminUser)
      mockBoxCatalogManager.addBox = jest.fn().mockResolvedValue(mockBox)

      const response = await request(app)
        .post('/api/boxes')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'Small Box',
          length: 30,
          width: 20,
          height: 15,
          maxWeight: 5,
        })

      expect(response.status).toBe(201)
      expect(response.body.status).toBe('success')
      expect(response.body.data.box).toMatchObject({
        name: 'Small Box',
        length: 30,
        width: 20,
        height: 15,
      })
    })

    it('should return 401 when not authenticated', async () => {
      const response = await request(app).post('/api/boxes').send({
        name: 'Small Box',
        length: 30,
        width: 20,
        height: 15,
        maxWeight: 5,
      })

      expect(response.status).toBe(401)
    })

    it('should return 403 when non-admin user tries to create box', async () => {
      mockAuthService.validateToken.mockResolvedValue(mockCustomerUser)

      const response = await request(app)
        .post('/api/boxes')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'Small Box',
          length: 30,
          width: 20,
          height: 15,
          maxWeight: 5,
        })

      expect(response.status).toBe(403)
    })

    it('should return 400 when validation fails', async () => {
      mockAuthService.validateToken.mockResolvedValue(mockAdminUser)

      const response = await request(app)
        .post('/api/boxes')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'Small Box',
          length: -30, // Invalid negative value
          width: 20,
          height: 15,
          maxWeight: 5,
        })

      expect(response.status).toBe(400)
    })

    it('should return 400 when required fields are missing', async () => {
      mockAuthService.validateToken.mockResolvedValue(mockAdminUser)

      const response = await request(app)
        .post('/api/boxes')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'Small Box',
          // Missing dimensions and weight
        })

      expect(response.status).toBe(400)
    })
  })

  describe('PUT /api/boxes/:id', () => {
    it('should update a box when admin authenticated', async () => {
      mockAuthService.validateToken.mockResolvedValue(mockAdminUser)
      const updatedBox = { ...mockBox, name: 'Updated Box' }
      mockBoxCatalogManager.updateBox = jest.fn().mockResolvedValue(updatedBox)

      const response = await request(app)
        .put('/api/boxes/box-1')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'Updated Box',
        })

      expect(response.status).toBe(200)
      expect(response.body.status).toBe('success')
      expect(response.body.data.box.name).toBe('Updated Box')
    })

    it('should return 404 when box not found', async () => {
      mockAuthService.validateToken.mockResolvedValue(mockAdminUser)
      mockBoxCatalogManager.updateBox = jest
        .fn()
        .mockRejectedValue(new Error('Box with ID box-999 not found'))

      const response = await request(app)
        .put('/api/boxes/box-999')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'Updated Box',
        })

      expect(response.status).toBe(404)
    })

    it('should return 400 when invalid dimensions provided', async () => {
      mockAuthService.validateToken.mockResolvedValue(mockAdminUser)

      const response = await request(app)
        .put('/api/boxes/box-1')
        .set('Authorization', 'Bearer valid-token')
        .send({
          length: -10, // Invalid negative value
        })

      expect(response.status).toBe(400)
    })
  })

  describe('DELETE /api/boxes/:id', () => {
    it('should deactivate a box when admin authenticated', async () => {
      mockAuthService.validateToken.mockResolvedValue(mockAdminUser)
      mockBoxCatalogManager.deleteBox = jest.fn().mockResolvedValue(undefined)

      const response = await request(app)
        .delete('/api/boxes/box-1')
        .set('Authorization', 'Bearer valid-token')

      expect(response.status).toBe(200)
      expect(response.body.status).toBe('success')
      expect(response.body.message).toBe('Box deactivated successfully')
    })

    it('should return 404 when box not found', async () => {
      mockAuthService.validateToken.mockResolvedValue(mockAdminUser)
      mockBoxCatalogManager.deleteBox = jest
        .fn()
        .mockRejectedValue(new Error('Box with ID box-999 not found'))

      const response = await request(app)
        .delete('/api/boxes/box-999')
        .set('Authorization', 'Bearer valid-token')

      expect(response.status).toBe(404)
    })

    it('should return 403 when non-admin tries to delete', async () => {
      mockAuthService.validateToken.mockResolvedValue(mockCustomerUser)

      const response = await request(app)
        .delete('/api/boxes/box-1')
        .set('Authorization', 'Bearer valid-token')

      expect(response.status).toBe(403)
    })
  })

  describe('GET /api/boxes/:id', () => {
    it('should get a single box when authenticated', async () => {
      mockAuthService.validateToken.mockResolvedValue(mockCustomerUser)
      mockBoxCatalogManager.getBox = jest.fn().mockResolvedValue(mockBox)

      const response = await request(app)
        .get('/api/boxes/box-1')
        .set('Authorization', 'Bearer valid-token')

      expect(response.status).toBe(200)
      expect(response.body.status).toBe('success')
      expect(response.body.data.box).toMatchObject({
        id: 'box-1',
        name: 'Small Box',
      })
    })

    it('should return 404 when box not found', async () => {
      mockAuthService.validateToken.mockResolvedValue(mockCustomerUser)
      mockBoxCatalogManager.getBox = jest
        .fn()
        .mockRejectedValue(new Error('Box with ID box-999 not found'))

      const response = await request(app)
        .get('/api/boxes/box-999')
        .set('Authorization', 'Bearer valid-token')

      expect(response.status).toBe(404)
    })

    it('should return 401 when not authenticated', async () => {
      const response = await request(app).get('/api/boxes/box-1')

      expect(response.status).toBe(401)
    })
  })

  describe('GET /api/boxes', () => {
    it('should get all boxes when authenticated', async () => {
      mockAuthService.validateToken.mockResolvedValue(mockCustomerUser)
      mockBoxCatalogManager.getAllBoxes = jest.fn().mockResolvedValue([mockBox])

      const response = await request(app)
        .get('/api/boxes')
        .set('Authorization', 'Bearer valid-token')

      expect(response.status).toBe(200)
      expect(response.body.status).toBe('success')
      expect(response.body.data.boxes).toHaveLength(1)
      expect(response.body.data.count).toBe(1)
    })

    it('should filter active boxes only when activeOnly=true', async () => {
      mockAuthService.validateToken.mockResolvedValue(mockCustomerUser)
      mockBoxCatalogManager.getAllBoxes = jest.fn().mockResolvedValue([mockBox])

      const response = await request(app)
        .get('/api/boxes?activeOnly=true')
        .set('Authorization', 'Bearer valid-token')

      expect(response.status).toBe(200)
      expect(mockBoxCatalogManager.getAllBoxes).toHaveBeenCalledWith(true)
    })
  })

  describe('GET /api/boxes/suitable', () => {
    it('should get suitable boxes for given dimensions and weight', async () => {
      mockAuthService.validateToken.mockResolvedValue(mockCustomerUser)
      mockBoxCatalogManager.findSuitableBoxes = jest.fn().mockResolvedValue([mockBox])

      const response = await request(app)
        .get('/api/boxes/suitable?length=25&width=15&height=10&weight=3')
        .set('Authorization', 'Bearer valid-token')

      expect(response.status).toBe(200)
      expect(response.body.status).toBe('success')
      expect(response.body.data.boxes).toHaveLength(1)
      expect(mockBoxCatalogManager.findSuitableBoxes).toHaveBeenCalledWith(
        { length: 25, width: 15, height: 10 },
        3
      )
    })

    it('should return 400 when required query parameters are missing', async () => {
      mockAuthService.validateToken.mockResolvedValue(mockCustomerUser)

      const response = await request(app)
        .get('/api/boxes/suitable?length=25&width=15')
        .set('Authorization', 'Bearer valid-token')

      expect(response.status).toBe(400)
    })

    it('should return 400 when dimensions are negative', async () => {
      mockAuthService.validateToken.mockResolvedValue(mockCustomerUser)

      const response = await request(app)
        .get('/api/boxes/suitable?length=-25&width=15&height=10&weight=3')
        .set('Authorization', 'Bearer valid-token')

      expect(response.status).toBe(400)
    })
  })

  describe('GET /api/boxes/stats', () => {
    it('should get box usage statistics for date range', async () => {
      mockAuthService.validateToken.mockResolvedValue(mockCustomerUser)
      const mockStats: BoxUsageStats[] = [
        {
          boxId: 'box-1',
          boxName: 'Small Box',
          usageCount: 10,
          averageUtilization: 75.5,
          totalVolume: 90000,
          wastedVolume: 22050,
        },
      ]
      mockBoxCatalogManager.getBoxUsageStats = jest.fn().mockResolvedValue(mockStats)

      const response = await request(app)
        .get('/api/boxes/stats?startDate=2024-01-01T00:00:00Z&endDate=2024-01-31T23:59:59Z')
        .set('Authorization', 'Bearer valid-token')

      expect(response.status).toBe(200)
      expect(response.body.status).toBe('success')
      expect(response.body.data.stats).toHaveLength(1)
      expect(response.body.data.stats[0].usageCount).toBe(10)
    })

    it('should return 400 when date range is invalid', async () => {
      mockAuthService.validateToken.mockResolvedValue(mockCustomerUser)

      const response = await request(app)
        .get('/api/boxes/stats?startDate=2024-01-31&endDate=2024-01-01')
        .set('Authorization', 'Bearer valid-token')

      expect(response.status).toBe(400)
    })

    it('should return 400 when dates are missing', async () => {
      mockAuthService.validateToken.mockResolvedValue(mockCustomerUser)

      const response = await request(app)
        .get('/api/boxes/stats')
        .set('Authorization', 'Bearer valid-token')

      expect(response.status).toBe(400)
    })
  })
})
