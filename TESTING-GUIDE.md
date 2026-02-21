# Backend API Testing Guide

## Prerequisites

Before testing, ensure you have:
1. ✅ Node.js installed
2. ✅ Docker Desktop running
3. ✅ Dependencies installed (`npm install`)
4. ✅ Prisma client generated (`npm run prisma:generate`)
5. ✅ Docker containers running (`docker compose up -d`)
6. ✅ Database migrated (`npm run prisma:migrate`)

## Step 1: Start the Server

```bash
npm run dev
```

Expected output:
```
Server running on port 3000
Environment: development
```

## Step 2: Test Health Check

### Using curl:
```bash
curl http://localhost:3000/health
```

### Expected Response:
```json
{
  "status": "ok",
  "timestamp": "2026-02-20T16:30:00.000Z"
}
```

## Step 3: Test User Registration

### Using curl:
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234!",
    "name": "Test User"
  }'
```

### Expected Response:
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "uuid-here",
      "email": "test@example.com",
      "name": "Test User",
      "role": "USER"
    },
    "tokens": {
      "accessToken": "jwt-token-here",
      "refreshToken": "refresh-token-here"
    }
  }
}
```

**Save the accessToken** - you'll need it for authenticated requests!

## Step 4: Test User Login

### Using curl:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234!"
  }'
```

### Expected Response:
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "uuid-here",
      "email": "test@example.com",
      "name": "Test User"
    },
    "tokens": {
      "accessToken": "jwt-token-here",
      "refreshToken": "refresh-token-here"
    }
  }
}
```

## Step 5: Test Box Catalog (Add Box)

**Note**: You need to be an admin to add boxes. For testing, you can:
1. Manually update your user role in the database to ADMIN
2. Or use the seeded admin account if you created one

### Using curl (replace YOUR_ACCESS_TOKEN):
```bash
curl -X POST http://localhost:3000/api/boxes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "name": "Small Box",
    "length": 20,
    "width": 15,
    "height": 10,
    "maxWeight": 5,
    "cost": 2.50
  }'
```

### Expected Response:
```json
{
  "status": "success",
  "data": {
    "box": {
      "id": "uuid-here",
      "name": "Small Box",
      "length": 20,
      "width": 15,
      "height": 10,
      "volume": 3000,
      "maxWeight": 5,
      "cost": 2.50,
      "isActive": true
    }
  }
}
```

## Step 6: Test Get All Boxes

### Using curl (replace YOUR_ACCESS_TOKEN):
```bash
curl http://localhost:3000/api/boxes \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Expected Response:
```json
{
  "status": "success",
  "data": {
    "boxes": [
      {
        "id": "uuid-here",
        "name": "Small Box",
        "length": 20,
        "width": 15,
        "height": 10,
        "volume": 3000,
        "maxWeight": 5,
        "cost": 2.50,
        "isActive": true
      }
    ],
    "total": 1
  }
}
```

## Step 7: Test Live Optimization

### Using curl (replace YOUR_ACCESS_TOKEN):
```bash
curl -X POST http://localhost:3000/api/optimize \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "items": [
      {
        "length": 10,
        "width": 8,
        "height": 5,
        "weight": 2,
        "quantity": 1
      }
    ]
  }'
```

### Expected Response:
```json
{
  "status": "success",
  "data": {
    "result": {
      "selectedBox": {
        "id": "uuid-here",
        "name": "Small Box",
        "dimensions": {
          "length": 20,
          "width": 15,
          "height": 10
        }
      },
      "totalWeight": 2,
      "volumetricWeight": 0.6,
      "billableWeight": 2,
      "shippingCost": 10,
      "spaceUtilization": 16.67,
      "isValid": true
    }
  }
}
```

## Step 8: Test Subscription Creation

### Using curl (replace YOUR_ACCESS_TOKEN):
```bash
curl -X POST http://localhost:3000/api/subscriptions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "tier": "BASIC"
  }'
```

### Expected Response:
```json
{
  "status": "success",
  "data": {
    "subscription": {
      "subscriptionId": "uuid-here",
      "userId": "user-uuid",
      "tier": "BASIC",
      "monthlyQuota": 1000,
      "currentUsage": 0,
      "status": "ACTIVE",
      "price": 49,
      "renewalDate": "2026-03-20T16:30:00.000Z"
    }
  }
}
```

## Step 9: Test Configuration

### Create Configuration:
```bash
curl -X POST http://localhost:3000/api/config \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "bufferPadding": 2,
    "volumetricDivisor": 5000,
    "shippingRatePerKg": 5
  }'
```

### Get Configuration:
```bash
curl http://localhost:3000/api/config \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Step 10: Test Metrics Endpoint

### Using curl:
```bash
curl http://localhost:3000/metrics
```

### Expected Response:
Prometheus metrics in text format:
```
# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",route="/health",status="200"} 1

# HELP http_request_duration_seconds HTTP request duration in seconds
# TYPE http_request_duration_seconds histogram
...
```

## Common Issues & Solutions

### Issue 1: "Cannot connect to database"
**Solution**: Ensure Docker containers are running:
```bash
docker ps
# Should show packaging_optimizer_db and packaging_optimizer_redis
```

If not running:
```bash
docker compose up -d
```

### Issue 2: "Prisma Client not generated"
**Solution**: Generate Prisma client:
```bash
npm run prisma:generate
```

### Issue 3: "Table does not exist"
**Solution**: Run migrations:
```bash
npm run prisma:migrate
```

### Issue 4: "Port 3000 already in use"
**Solution**: Either:
1. Stop the process using port 3000
2. Or change PORT in .env file

### Issue 5: "Redis connection failed"
**Solution**: Check Redis container:
```bash
docker logs packaging_optimizer_redis
```

Restart if needed:
```bash
docker compose restart redis
```

### Issue 6: "JWT token expired"
**Solution**: Login again to get a new token:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234!"}'
```

## Using Postman

### Import Collection:
1. Open Postman
2. Click "Import"
3. Select `postman/auth-endpoints.postman_collection.json`
4. The collection includes pre-configured requests

### Set Environment Variables:
1. Create a new environment in Postman
2. Add variables:
   - `baseUrl`: `http://localhost:3000`
   - `accessToken`: (will be set automatically after login)

### Test Flow:
1. Run "Register User" request
2. Run "Login" request (saves token automatically)
3. Run other authenticated requests

## Testing Checklist

Use this checklist to verify all endpoints:

### Authentication
- [ ] POST /api/auth/register - User registration
- [ ] POST /api/auth/login - User login
- [ ] POST /api/auth/refresh - Token refresh
- [ ] POST /api/auth/logout - User logout
- [ ] POST /api/auth/api-key - Generate API key

### Box Catalog
- [ ] POST /api/boxes - Add box (admin)
- [ ] GET /api/boxes - Get all boxes
- [ ] GET /api/boxes/:id - Get single box
- [ ] PUT /api/boxes/:id - Update box (admin)
- [ ] DELETE /api/boxes/:id - Delete box (admin)
- [ ] GET /api/boxes/suitable - Query suitable boxes
- [ ] GET /api/boxes/stats - Get usage statistics

### Live Optimization
- [ ] POST /api/optimize - Optimize single order
- [ ] POST /api/optimize/batch - Optimize batch

### Subscriptions
- [ ] POST /api/subscriptions - Create subscription
- [ ] GET /api/subscriptions/me - Get current subscription
- [ ] PUT /api/subscriptions/:id - Update subscription
- [ ] DELETE /api/subscriptions/:id - Cancel subscription
- [ ] GET /api/subscriptions/quota - Check quota
- [ ] GET /api/subscriptions/usage - Get usage history

### Configuration
- [ ] POST /api/config - Create configuration
- [ ] GET /api/config - Get configuration
- [ ] PUT /api/config - Update configuration

### System
- [ ] GET /health - Health check
- [ ] GET /metrics - Prometheus metrics

## Performance Testing

### Test Response Times:
```bash
# Test health endpoint (should be < 50ms)
time curl http://localhost:3000/health

# Test optimization (should be < 100ms)
time curl -X POST http://localhost:3000/api/optimize \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{"items":[{"length":10,"width":8,"height":5,"weight":2,"quantity":1}]}'
```

### Load Testing (optional):
```bash
# Install Apache Bench
# Windows: Download from Apache website
# Mac: brew install httpd
# Linux: sudo apt-get install apache2-utils

# Test with 100 requests, 10 concurrent
ab -n 100 -c 10 http://localhost:3000/health
```

## Next Steps

After verifying the backend works:
1. ✅ All endpoints respond correctly
2. ✅ Authentication works
3. ✅ Database operations succeed
4. ✅ Metrics are collected
5. ✅ Health check passes

**You're ready to proceed with frontend development (Tasks 22-30)!**

## Quick Test Script

Save this as `test-api.sh` for quick testing:

```bash
#!/bin/bash

BASE_URL="http://localhost:3000"

echo "Testing Health Check..."
curl -s $BASE_URL/health | jq

echo -e "\n\nTesting User Registration..."
REGISTER_RESPONSE=$(curl -s -X POST $BASE_URL/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234!","name":"Test User"}')
echo $REGISTER_RESPONSE | jq

echo -e "\n\nTesting User Login..."
LOGIN_RESPONSE=$(curl -s -X POST $BASE_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234!"}')
echo $LOGIN_RESPONSE | jq

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.tokens.accessToken')

echo -e "\n\nTesting Get Boxes..."
curl -s $BASE_URL/api/boxes \
  -H "Authorization: Bearer $TOKEN" | jq

echo -e "\n\nAll tests complete!"
```

Run with: `bash test-api.sh`
