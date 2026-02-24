# Railway Deployment - Fresh Start Guide

## Problem Summary
The application container is not starting on Railway. Health checks fail because the server never responds.

## Root Cause Analysis
The issue is likely one of these:
1. **Dockerfile CMD is wrong** - pointing to wrong file
2. **Build output missing** - dist/index-minimal.js not created
3. **Database migration blocking** - prisma migrate hangs
4. **Port binding issue** - Railway can't reach the server
5. **Missing environment variables** - causing startup crash

## Fresh Start Steps

### Step 1: Verify Local Build Works
```bash
# Clean everything
rm -rf dist node_modules frontend/node_modules frontend/.next

# Install dependencies
npm install
cd frontend && npm install && cd ..

# Generate Prisma client
npx prisma generate

# Build TypeScript
npm run build

# Verify dist/index-minimal.js exists
ls dist/index-minimal.js

# Test locally
node dist/index-minimal.js
```

If this works locally, the code is fine. Problem is Railway-specific.

### Step 2: Simplify Dockerfile (Remove Database Migration)

The `prisma migrate deploy` in CMD might be hanging. Create this simplified Dockerfile:

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY frontend/package*.json ./frontend/

# Install dependencies
RUN npm ci --legacy-peer-deps
RUN cd frontend && npm ci --legacy-peer-deps

# Copy prisma schema and generate client
COPY prisma ./prisma
RUN npx prisma generate

# Copy source code
COPY . .

# Build frontend and backend
RUN cd frontend && npm run build
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY frontend/package*.json ./frontend/

# Install production dependencies only
RUN npm ci --only=production --legacy-peer-deps
RUN cd frontend && npm ci --only=production --legacy-peer-deps

# Copy prisma and generate
COPY prisma ./prisma
RUN npx prisma generate

# Copy built files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/frontend/.next ./frontend/.next
COPY --from=builder /app/frontend/next.config.js ./frontend/

# Create logs directory
RUN mkdir -p logs

EXPOSE 3000

# CRITICAL: Start minimal server WITHOUT database migration
CMD ["node", "dist/index-minimal.js"]
```

### Step 3: Railway Configuration

**In Railway Dashboard:**

1. **Service Settings → Builder**
   - Builder: Docker
   - Dockerfile Path: `Dockerfile`
   - Docker Build Context: `.`

2. **Service Settings → Deploy**
   - Start Command: (leave empty, use Dockerfile CMD)
   - Health Check Path: `/health`
   - Health Check Timeout: 300 seconds

3. **Environment Variables** (CRITICAL - SET THESE):
   ```
   NODE_ENV=production
   PORT=3000
   JWT_SECRET=your-secret-here-change-this
   SESSION_SECRET=42cd5d1cf7c110124e309b8bdf7316ada2a6792d7a266db659a102e7d71ce02b
   ```

4. **Add PostgreSQL Plugin**
   - This auto-creates `DATABASE_URL`
   - After adding, run migration manually (see Step 4)

5. **Add Redis Plugin** (Optional for now)
   - This auto-creates `REDIS_URL`
   - Can skip initially to simplify

### Step 4: Run Database Migration Separately

**Option A: Use Railway CLI**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Run migration
railway run npx prisma migrate deploy
```

**Option B: Use Railway Dashboard**
- Go to your service
- Click "Deploy" → "Run Command"
- Enter: `npx prisma migrate deploy`
- This runs migration without restarting the app

### Step 5: Deploy and Monitor

```bash
# Commit changes
git add Dockerfile
git commit -m "Simplify Dockerfile - remove migration from CMD"
git push origin main
```

**Watch Railway Logs:**
- Go to Railway Dashboard → Your Service → Deployments
- Click latest deployment → View Logs
- Look for these lines:
  ```
  Starting AI Packaging Optimizer...
  Node version: v20.x.x
  Environment: production
  PORT from env: 3000
  Express app created
  Using PORT: 3000
  Middleware configured
  Health check route registered
  Root route registered
  About to start listening on port 3000
  Server started successfully!
  ```

### Step 6: Test Health Check

Once deployed, test from your local machine:
```bash
# Replace with your Railway URL
curl https://your-app.railway.app/health

# Should return:
# {"status":"ok","timestamp":"...","port":3000,"env":"production"}
```

## Alternative: Use Railway's Nixpacks (Easier)

If Docker keeps failing, try Railway's automatic builder:

1. **Delete Dockerfile** (or rename to `Dockerfile.backup`)
2. **Railway will auto-detect Node.js**
3. **Set these in Railway:**
   - Start Command: `node dist/index-minimal.js`
   - Build Command: `npm install && npx prisma generate && npm run build`

## Debugging Tips

### Check Build Logs
Look for these in Railway build logs:
- ✅ `npm ci` succeeds
- ✅ `npx prisma generate` succeeds
- ✅ `npm run build` succeeds
- ✅ `dist/index-minimal.js` is created

### Check Runtime Logs
Look for these in Railway runtime logs:
- ✅ "Starting AI Packaging Optimizer..."
- ✅ "Server started successfully!"
- ❌ Any error messages
- ❌ "EADDRINUSE" (port already in use)
- ❌ "ECONNREFUSED" (can't connect to database)

### Common Issues

**Issue: "Cannot find module 'express'"**
- Fix: Production dependencies not installed
- Check: `npm ci --only=production` in Dockerfile

**Issue: "Prisma Client not generated"**
- Fix: Run `npx prisma generate` after copying prisma folder
- Check: Dockerfile has `RUN npx prisma generate` in production stage

**Issue: "Port 3000 already in use"**
- Fix: Railway assigns dynamic port, use `process.env.PORT`
- Check: Code has `const PORT = parseInt(process.env.PORT || '3000', 10)`

**Issue: Health check timeout**
- Fix: Increase timeout in Railway settings to 300 seconds
- Fix: Make sure server binds to `0.0.0.0` not `localhost`

## Nuclear Option: Start Completely Fresh

If nothing works:

1. **Delete Railway service completely**
2. **Create new Railway project**
3. **Use this minimal setup:**
   - No Dockerfile (use Nixpacks)
   - No Redis initially
   - No database migration in start command
   - Just: `node dist/index-minimal.js`

4. **Add complexity gradually:**
   - First: Get minimal server working
   - Then: Add database
   - Then: Add Redis
   - Then: Add full application
   - Finally: Add migrations

## Success Criteria

You'll know it's working when:
1. ✅ Railway build completes without errors
2. ✅ Railway deployment shows "Active" status
3. ✅ Health check passes (green checkmark)
4. ✅ You can curl the /health endpoint
5. ✅ Logs show "Server started successfully!"

## Next Steps After Success

Once minimal server works:
1. Switch from `index-minimal.js` to `index.js` (full app)
2. Add database migrations back
3. Add Redis connection
4. Test all API endpoints
5. Deploy frontend

---

**IMPORTANT**: The key is to start simple and add complexity gradually. Don't try to deploy everything at once.
