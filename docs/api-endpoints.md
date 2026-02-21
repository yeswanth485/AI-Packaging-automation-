# API Endpoints Documentation

## Overview

This document describes all REST API endpoints for the AI Packaging Optimizer platform.

All endpoints return responses in the following format:

```json
{
  "status": "success" | "error",
  "data": { ... },
  "message": "...",
  "requestId": "uuid"
}
```

## Error Codes

- **400 Bad Request**: Validation errors with detailed error messages
- **401 Unauthorized**: Authentication failures (invalid token or API key)
- **403 Forbidden**: Authorization failures (insufficient permissions)
- **404 Not Found**: Resource not found
- **409 Conflict**: Concurrent modifications or unique constraint violations
- **429 Too Many Requests**: Rate limit or quota exceeded
- **500 Internal Server Error**: Unexpected server errors
- **503 Service Unavailable**: Database failures (retry recommended)

All error responses include a `requestId` for tracking and debugging.

## Authentication

### JWT Token Authentication

Include JWT token in Authorization header:
```
Authorization: Bearer <access_token>
```

### API Key Authentication

Include API key in custom header:
```
X-API-Key: <api_key>
```

## Rate Limiting

- Live optimization endpoints: 100 requests per minute per user
- All other endpoints: No rate limiting (subject to quota)

## Endpoints

### Authentication Endpoints

#### POST /api/auth/register
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "role": "CUSTOMER"
}
```

**Response:** 201 Created
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "role": "CUSTOMER"
    }
  }
}
```

#### POST /api/auth/login
Login and receive JWT tokens.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response:** 200 OK
```json
{
  "status": "success",
  "data": {
    "accessToken": "jwt_token",
    "refreshToken": "refresh_token",
    "expiresIn": 900
  }
}
```

#### POST /api/auth/api-key
Generate API key for programmatic access.

**Authentication:** Required (JWT)

**Response:** 201 Created
```json
{
  "status": "success",
  "data": {
    "apiKey": "generated_api_key",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

### Live Optimization Endpoints

#### POST /api/optimize
Optimize single order for box selection.

**Authentication:** Required (API Key)
**Rate Limit:** 100 req/min

**Request Body:**
```json
{
  "orderId": "ORDER-001",
  "items": [
    {
      "itemId": "ITEM-001",
      "length": 30,
      "width": 20,
      "height": 10,
      "weight": 2.5,
      "quantity": 2
    }
  ]
}
```

**Response:** 200 OK
```json
{
  "status": "success",
  "data": {
    "orderId": "ORDER-001",
    "selectedBox": {
      "id": "box-uuid",
      "name": "Medium Box",
      "dimensions": {
        "length": 40,
        "width": 30,
        "height": 25
      },
      "maxWeight": 10
    },
    "totalWeight": 5.0,
    "volumetricWeight": 6.0,
    "billableWeight": 6.0,
    "shippingCost": 12.0,
    "spaceUtilization": 75.5,
    "wastedVolume": 7350
  },
  "requestId": "uuid"
}
```

**Error Responses:**
- 403: Active subscription required
- 429: Monthly quota exceeded
- 400: No suitable box found

#### POST /api/optimize/batch
Optimize multiple orders in batch.

**Authentication:** Required (API Key)
**Rate Limit:** 100 req/min

**Request Body:**
```json
{
  "orders": [
    {
      "orderId": "ORDER-001",
      "items": [...]
    },
    {
      "orderId": "ORDER-002",
      "items": [...]
    }
  ]
}
```

**Response:** 200 OK
```json
{
  "status": "success",
  "data": {
    "totalOrders": 2,
    "successfulPacks": 2,
    "failedPacks": 0,
    "totalCost": 24.0,
    "averageUtilization": 78.5,
    "results": [...]
  },
  "requestId": "uuid"
}
```

### Subscription Endpoints

#### POST /api/subscriptions
Create new subscription.

**Authentication:** Required (JWT)

**Request Body:**
```json
{
  "tier": "BASIC" | "PRO" | "ENTERPRISE"
}
```

**Response:** 201 Created

#### PUT /api/subscriptions/:id
Update subscription tier.

**Authentication:** Required (JWT)

**Request Body:**
```json
{
  "tier": "PRO"
}
```

**Response:** 200 OK

#### DELETE /api/subscriptions/:id
Cancel subscription (access maintained until renewal date).

**Authentication:** Required (JWT)

**Response:** 200 OK

#### GET /api/subscriptions/me
Get current subscription details.

**Authentication:** Required (JWT)

**Response:** 200 OK
```json
{
  "status": "success",
  "data": {
    "subscription": {
      "id": "uuid",
      "tier": "PRO",
      "monthlyQuota": 10000,
      "currentUsage": 2500,
      "status": "ACTIVE",
      "startDate": "2024-01-01T00:00:00Z",
      "renewalDate": "2024-02-01T00:00:00Z",
      "price": 99.00
    }
  }
}
```

#### GET /api/subscriptions/quota
Check quota status.

**Authentication:** Required (JWT)

**Response:** 200 OK
```json
{
  "status": "success",
  "data": {
    "quota": {
      "monthlyQuota": 10000,
      "currentUsage": 2500,
      "remainingQuota": 7500,
      "percentageUsed": 25.0,
      "isExceeded": false
    }
  }
}
```

#### GET /api/subscriptions/usage
Get usage history.

**Authentication:** Required (JWT)

**Query Parameters:**
- `startDate` (optional): ISO date string
- `endDate` (optional): ISO date string

**Response:** 200 OK

#### POST /api/subscriptions/invoices
Generate invoice for billing period.

**Authentication:** Required (JWT)

**Request Body:**
```json
{
  "startDate": "2024-01-01T00:00:00Z",
  "endDate": "2024-01-31T23:59:59Z"
}
```

**Response:** 201 Created

### Analytics Endpoints

#### GET /api/analytics/dashboard
Get dashboard KPIs.

**Authentication:** Required (JWT)

**Query Parameters:**
- `startDate` (optional): ISO date string
- `endDate` (optional): ISO date string

**Response:** 200 OK
```json
{
  "status": "success",
  "data": {
    "kpis": {
      "totalOrdersProcessed": 5000,
      "manualShippingCost": 50000,
      "optimizedShippingCost": 45000,
      "totalSavings": 5000,
      "savingsPercentage": 10.0,
      "avgVolumetricWeightReduction": 15.5,
      "avgSpaceUtilization": 78.5,
      "mostUsedBoxSize": "Medium Box",
      "mostInefficientBoxSize": "Large Box",
      "monthlySavingsProjection": 5000,
      "annualSavingsProjection": 60000
    }
  }
}
```

#### GET /api/analytics/cost-trend
Get cost trend over time.

**Authentication:** Required (JWT)

**Query Parameters:**
- `startDate` (optional): ISO date string
- `endDate` (optional): ISO date string
- `granularity` (optional): "DAILY" | "WEEKLY" | "MONTHLY"

**Response:** 200 OK

#### GET /api/analytics/box-usage
Get box usage distribution.

**Authentication:** Required (JWT)

**Query Parameters:**
- `startDate` (optional): ISO date string
- `endDate` (optional): ISO date string

**Response:** 200 OK

#### GET /api/analytics/space-waste
Get space waste heatmap data.

**Authentication:** Required (JWT)

**Query Parameters:**
- `startDate` (optional): ISO date string
- `endDate` (optional): ISO date string

**Response:** 200 OK

#### GET /api/analytics/weight-distribution
Get weight distribution analysis.

**Authentication:** Required (JWT)

**Query Parameters:**
- `startDate` (optional): ISO date string
- `endDate` (optional): ISO date string

**Response:** 200 OK

#### GET /api/analytics/forecast
Get demand forecast.

**Authentication:** Required (JWT)

**Query Parameters:**
- `forecastMonths` (optional): Number (1-12, default: 3)

**Response:** 200 OK

### Configuration Endpoints

#### POST /api/config
Create user configuration.

**Authentication:** Required (JWT)

**Request Body:**
```json
{
  "bufferPadding": 2.0,
  "volumetricDivisor": 5000,
  "shippingRatePerKg": 2.0,
  "maxWeightOverride": 30.0,
  "baselineBoxSelectionStrategy": "NEXT_LARGER",
  "enableForecast": true
}
```

**Response:** 201 Created

#### PUT /api/config
Update user configuration.

**Authentication:** Required (JWT)

**Request Body:** Same as POST

**Response:** 200 OK

#### GET /api/config
Get user configuration.

**Authentication:** Required (JWT)

**Response:** 200 OK
```json
{
  "status": "success",
  "data": {
    "config": {
      "id": "uuid",
      "bufferPadding": 2.0,
      "volumetricDivisor": 5000,
      "shippingRatePerKg": 2.0,
      "maxWeightOverride": 30.0,
      "baselineBoxSelectionStrategy": "NEXT_LARGER",
      "enableForecast": true,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  }
}
```

### Box Catalog Endpoints

See existing documentation in `src/routes/box.routes.md`

### Simulation Endpoints

See existing documentation in `src/routes/simulation.routes.md`

## Request ID

All responses include a `requestId` field for tracking and debugging. Include this ID when reporting issues.

## Logging

All API calls are logged with:
- User ID
- Endpoint
- Response time
- Request ID
- Error details (if applicable)

## Security

- All passwords are hashed using bcrypt with cost factor 12
- JWT tokens expire after 15 minutes
- Refresh tokens expire after 7 days
- API keys should be rotated every 90 days
- All communications use TLS 1.3
- Rate limiting prevents abuse
- Input validation prevents injection attacks
