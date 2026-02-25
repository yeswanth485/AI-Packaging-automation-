# Railway Health Check Fix

## Problem

Railway health checks were failing with "service unavailable" errors after 10 attempts.

**Error Pattern**:
```
Attempt #1 failed with service unavailable. Continuing to retry for 4m49s
Attempt #2 failed with service unavailable. Continuing to retry for 4m38s
...
Attempt #10 failed with service unavailable. Continuing to retry for 48s
```

## Root Cause

The Express server was not binding to `0.0.0.0`, which is required for Railway to access the health check endpoint.

**Previous Code**:
```typescript
const PORT = process.env.PORT || 3000
const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`)
})
```

**Issues**:
1. Server was binding to `localhost` by default (not accessible externally)
2. PORT was not explicitly parsed as a number

## Solution

### Fix 1: Bind to 0.0.0.0
```typescript
const server = app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Server running on port ${PORT}`)
  logger.info('Server bound to 0.0.0.0 (accessible externally)')
})
```

### Fix 2: Parse PORT as Number
```typescript
const PORT = parseInt(process.env.PORT || '3000', 10)
```

## Why This Matters

### Railway Container Networking
- Railway runs your app in a container
- The container needs to accept connections from Railway's load balancer
- Binding to `localhost` (127.0.0.1) only accepts connections from within the container
- Binding to `0.0.0.0` accepts connections from any network interface

### Health Check Flow
```
Railway Load Balancer
        ↓
   Health Check Request: GET /health?simple=true
        ↓
   Container Network Interface (requires 0.0.0.0 binding)
        ↓
   Express Server
        ↓
   Response: {"status":"ok"}
```

## Changes Made

**File**: `src/index.ts`

1. Changed PORT parsing:
   ```typescript
   const PORT = parseInt(process.env.PORT || '3000', 10)
   ```

2. Changed server binding:
   ```typescript
   const server = app.listen(PORT, '0.0.0.0', () => {
     logger.info(`Server running on port ${PORT}`)
     logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`)
     logger.info('Health check available at /health?simple=true')
     logger.info('Server bound to 0.0.0.0 (accessible externally)')
   })
   ```

## Expected Result

After this fix, Railway should:
1. ✅ Successfully connect to the health check endpoint
2. ✅ Receive `{"status":"ok"}` response
3. ✅ Mark the deployment as healthy
4. ✅ Start routing traffic to the application

## Verification

Once deployed, you can verify:

### 1. Check Railway Logs
Look for:
```
Server running on port 3000
Server bound to 0.0.0.0 (accessible externally)
Health check available at /health?simple=true
```

### 2. Test Health Endpoint
```bash
curl https://ai-packaging-automation-production.up.railway.app/health?simple=true
```

Expected response:
```json
{"status":"ok","timestamp":"2026-02-25T..."}
```

### 3. Test Frontend
Open in browser:
```
https://ai-packaging-automation-production.up.railway.app
```

Should redirect to login page.

## Deployment Status

- ✅ Code fixed
- ✅ Backend rebuilt
- ✅ Changes committed
- ✅ Changes pushed to GitHub
- ⏳ Railway auto-deploying (wait 3-5 minutes)

## Next Steps

1. Wait for Railway to detect the new commit
2. Railway will rebuild and redeploy
3. Health checks should pass this time
4. Application will be accessible

---

*Fix Applied: February 25, 2026*  
*Commit: Fix Railway deployment: Bind server to 0.0.0.0 and parse PORT as number*
