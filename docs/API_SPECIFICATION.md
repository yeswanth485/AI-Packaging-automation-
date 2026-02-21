# API Specification

## Base URL

```
Production: https://api.packaging-optimizer.com
Development: http://localhost:3000
```

## Authentication

### JWT Token Authentication

Include the JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### API Key Authentication

Include the API key in the X-API-Key header:

```
X-API-Key: <your-api-key>
```

## Rate Limiting

- **Authenticated requests**: 100 requests per minute
- **Unauthenticated requests**: 20 requests per minute

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Time when limit resets (Unix timestamp)

## Error Responses

All errors follow this format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {},
    "requestId": "uuid"
  }
}
```

### HTTP Status Codes

- `200 OK`: Request successful
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Authentication required or failed
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource conflict (e.g., duplicate email)
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error
- `503 Service Unavailable`: Service temporarily unavailable

## Endpoints

### Authentication

#### POST /api/auth/register

Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response (201):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "createdAt": "2026-02-21T10:00:00Z"
  },
  "tokens": {
    "accessToken": "jwt-token",
    "refreshToken": "refresh-token",
    "expiresIn": 900
  }
}
```

#### POST /api/auth/login

Authenticate and receive JWT tokens.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  },
  "tokens": {
    "accessToken": "jwt-token",
    "refreshToken": "refresh-token",
    "expiresIn": 900
  }
}
```

#### POST /api/auth/refresh

Refresh access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "refresh-token"
}
```

**Response (200):**
```json
{
  "accessToken": "new-jwt-token",
  "expiresIn": 900
}
```

#### POST /api/auth/api-key

Generate API key for programmatic access.

**Headers:** `Authorization: Bearer <jwt-token>`

**Response (201):**
```json
{
  "apiKey": "pk_live_abc123...",
  "createdAt": "2026-02-21T10:00:00Z"
}
```

### Box Catalog

#### GET /api/boxes

List all boxes in the catalog.

**Headers:** `Authorization: Bearer <jwt-token>`

**Query Parameters:**
- `active` (boolean): Filter by active status
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)

**Response (200):**
```json
{
  "boxes": [
    {
      "id": "uuid",
      "name": "Small Box",
      "length": 12,
      "width": 10,
      "height": 8,
      "volume": 960,
      "maxWeight": 10,
      "cost": 2.50,
      "isActive": true,
      "createdAt": "2026-02-21T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "pages": 3
  }
}
```

#### POST /api/boxes

Create a new box (Admin only).

**Headers:** `Authorization: Bearer <jwt-token>`

**Request Body:**
```json
{
  "name": "Small Box",
  "length": 12,
  "width": 10,
  "height": 8,
  "maxWeight": 10,
  "cost": 2.50
}
```

**Response (201):**
```json
{
  "box": {
    "id": "uuid",
    "name": "Small Box",
    "length": 12,
    "width": 10,
    "height": 8,
    "volume": 960,
    "maxWeight": 10,
    "cost": 2.50,
    "isActive": true,
    "createdAt": "2026-02-21T10:00:00Z"
  }
}
```

#### PUT /api/boxes/:id

Update an existing box (Admin only).

**Headers:** `Authorization: Bearer <jwt-token>`

**Request Body:**
```json
{
  "name": "Small Box Updated",
  "cost": 2.75
}
```

**Response (200):**
```json
{
  "box": {
    "id": "uuid",
    "name": "Small Box Updated",
    "cost": 2.75,
    "updatedAt": "2026-02-21T11:00:00Z"
  }
}
```

#### DELETE /api/boxes/:id

Deactivate a box (Admin only).

**Headers:** `Authorization: Bearer <jwt-token>`

**Response (200):**
```json
{
  "message": "Box deactivated successfully"
}
```

### Simulation

#### POST /api/simulation/upload

Upload CSV file for simulation.

**Headers:** `Authorization: Bearer <jwt-token>`

**Request:** `multipart/form-data`
- `file`: CSV file (max 50MB)

**Response (201):**
```json
{
  "job": {
    "id": "uuid",
    "status": "PENDING",
    "totalOrders": 100,
    "createdAt": "2026-02-21T10:00:00Z"
  }
}
```

#### POST /api/simulation/:jobId/process

Process uploaded simulation.

**Headers:** `Authorization: Bearer <jwt-token>`

**Response (200):**
```json
{
  "job": {
    "id": "uuid",
    "status": "PROCESSING",
    "startedAt": "2026-02-21T10:00:00Z"
  }
}
```

#### GET /api/simulation/:jobId/status

Get simulation job status.

**Headers:** `Authorization: Bearer <jwt-token>`

**Response (200):**
```json
{
  "job": {
    "id": "uuid",
    "status": "COMPLETED",
    "totalOrders": 100,
    "processedOrders": 100,
    "failedOrders": 0,
    "results": {
      "baselineCost": 1000.00,
      "optimizedCost": 850.00,
      "totalSavings": 150.00,
      "savingsPercentage": 15.0,
      "averageUtilization": 85.5,
      "monthlySavings": 4500.00,
      "annualSavings": 54000.00
    },
    "completedAt": "2026-02-21T10:05:00Z"
  }
}
```

#### GET /api/simulation/:simulationId/report

Download PDF report.

**Headers:** `Authorization: Bearer <jwt-token>`

**Response (200):** PDF file download

### Live Optimization

#### POST /api/optimize

Optimize a single order.

**Headers:** `X-API-Key: <api-key>`

**Request Body:**
```json
{
  "orderId": "ORD001",
  "items": [
    {
      "length": 10,
      "width": 8,
      "height": 6,
      "weight": 2,
      "quantity": 1
    }
  ]
}
```

**Response (200):**
```json
{
  "orderId": "ORD001",
  "recommendedBox": {
    "id": "uuid",
    "name": "Small Box",
    "dimensions": {
      "length": 12,
      "width": 10,
      "height": 8
    }
  },
  "costs": {
    "volumetricWeight": 2.5,
    "billableWeight": 2.5,
    "shippingCost": 1.25
  },
  "utilization": {
    "spaceUtilization": 62.5,
    "weightUtilization": 20.0
  }
}
```

#### POST /api/optimize/batch

Optimize multiple orders.

**Headers:** `X-API-Key: <api-key>`

**Request Body:**
```json
{
  "orders": [
    {
      "orderId": "ORD001",
      "items": [...]
    },
    {
      "orderId": "ORD002",
      "items": [...]
    }
  ]
}
```

**Response (200):**
```json
{
  "results": [
    {
      "orderId": "ORD001",
      "recommendedBox": {...},
      "costs": {...}
    }
  ],
  "summary": {
    "totalOrders": 2,
    "successfulOptimizations": 2,
    "failedOptimizations": 0,
    "totalCost": 5.50
  }
}
```

### Analytics

#### GET /api/analytics/dashboard

Get dashboard KPIs.

**Headers:** `Authorization: Bearer <jwt-token>`

**Query Parameters:**
- `startDate` (ISO 8601): Start date for filtering
- `endDate` (ISO 8601): End date for filtering

**Response (200):**
```json
{
  "kpis": {
    "totalOrders": 1000,
    "manualCost": 10000.00,
    "optimizedCost": 8500.00,
    "totalSavings": 1500.00,
    "savingsPercentage": 15.0,
    "averageUtilization": 85.5,
    "mostUsedBox": "Small Box",
    "monthlySavings": 4500.00,
    "annualSavings": 54000.00
  }
}
```

#### GET /api/analytics/cost-trend

Get cost trend data.

**Headers:** `Authorization: Bearer <jwt-token>`

**Query Parameters:**
- `granularity` (string): "daily", "weekly", or "monthly"
- `startDate` (ISO 8601): Start date
- `endDate` (ISO 8601): End date

**Response (200):**
```json
{
  "trend": [
    {
      "period": "2026-02-01",
      "manualCost": 1000.00,
      "optimizedCost": 850.00,
      "savings": 150.00
    }
  ],
  "direction": "decreasing"
}
```

### Subscriptions

#### GET /api/subscriptions/me

Get current subscription.

**Headers:** `Authorization: Bearer <jwt-token>`

**Response (200):**
```json
{
  "subscription": {
    "id": "uuid",
    "tier": "PROFESSIONAL",
    "status": "ACTIVE",
    "monthlyQuota": 10000,
    "currentUsage": 2500,
    "renewalDate": "2026-03-21T00:00:00Z",
    "price": 99.00
  }
}
```

#### PUT /api/subscriptions/:id

Update subscription tier.

**Headers:** `Authorization: Bearer <jwt-token>`

**Request Body:**
```json
{
  "tier": "ENTERPRISE"
}
```

**Response (200):**
```json
{
  "subscription": {
    "id": "uuid",
    "tier": "ENTERPRISE",
    "status": "ACTIVE",
    "updatedAt": "2026-02-21T10:00:00Z"
  }
}
```

#### GET /api/subscriptions/quota

Check quota status.

**Headers:** `Authorization: Bearer <jwt-token>`

**Response (200):**
```json
{
  "quota": {
    "monthlyQuota": 10000,
    "currentUsage": 2500,
    "remaining": 7500,
    "percentageUsed": 25.0,
    "isExceeded": false
  }
}
```

### Configuration

#### GET /api/config

Get user configuration.

**Headers:** `Authorization: Bearer <jwt-token>`

**Response (200):**
```json
{
  "config": {
    "bufferPadding": 0.1,
    "volumetricDivisor": 166,
    "shippingRate": 0.5,
    "maxWeightOverride": null,
    "baselineStrategy": "NEXT_LARGER"
  }
}
```

#### PUT /api/config

Update user configuration.

**Headers:** `Authorization: Bearer <jwt-token>`

**Request Body:**
```json
{
  "bufferPadding": 0.15,
  "volumetricDivisor": 166,
  "shippingRate": 0.55
}
```

**Response (200):**
```json
{
  "config": {
    "bufferPadding": 0.15,
    "volumetricDivisor": 166,
    "shippingRate": 0.55,
    "updatedAt": "2026-02-21T10:00:00Z"
  }
}
```

## Webhooks (Future Feature)

Webhooks will be available for:
- Simulation completion
- Quota threshold reached
- Subscription renewal
- Payment processed

## SDK Examples

### JavaScript/TypeScript

```typescript
import axios from 'axios';

const client = axios.create({
  baseURL: 'https://api.packaging-optimizer.com',
  headers: {
    'X-API-Key': 'your-api-key'
  }
});

// Optimize an order
const result = await client.post('/api/optimize', {
  orderId: 'ORD001',
  items: [
    { length: 10, width: 8, height: 6, weight: 2, quantity: 1 }
  ]
});

console.log(result.data);
```

### Python

```python
import requests

headers = {
    'X-API-Key': 'your-api-key'
}

response = requests.post(
    'https://api.packaging-optimizer.com/api/optimize',
    headers=headers,
    json={
        'orderId': 'ORD001',
        'items': [
            {'length': 10, 'width': 8, 'height': 6, 'weight': 2, 'quantity': 1}
        ]
    }
)

print(response.json())
```

### cURL

```bash
curl -X POST https://api.packaging-optimizer.com/api/optimize \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "ORD001",
    "items": [
      {"length": 10, "width": 8, "height": 6, "weight": 2, "quantity": 1}
    ]
  }'
```

## Support

For API support:
- Email: api-support@packaging-optimizer.com
- Documentation: https://docs.packaging-optimizer.com
- Status Page: https://status.packaging-optimizer.com
