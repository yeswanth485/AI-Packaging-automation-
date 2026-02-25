# 🚀 Railway Setup Guide - Step by Step

## Complete Guide to Deploy Your Application on Railway

---

## Prerequisites

- GitHub account with your code pushed to: https://github.com/yeswanth485/AI-Packaging-automation-.git
- Railway account (sign up at https://railway.app/)

---

## STEP 1: Create New Railway Project

### 1.1 Go to Railway
- Open https://railway.app/
- Click **"Login"** or **"Start a New Project"**
- Sign in with your GitHub account

### 1.2 Create Project from GitHub
1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. If prompted, authorize Railway to access your GitHub
4. Find and select: **"AI-Packaging-automation-"**
5. Railway will automatically detect the Dockerfile
6. Click **"Deploy Now"**

**Wait**: Railway will start building (this takes 3-5 minutes)

---

## STEP 2: Add PostgreSQL Database

### 2.1 Add Database to Project
1. In your Railway project dashboard, click **"+ New"**
2. Select **"Database"**
3. Choose **"Add PostgreSQL"**
4. Railway will create a PostgreSQL database

### 2.2 Verify Database Connection
1. Click on the **PostgreSQL** service in your project
2. Go to **"Variables"** tab
3. You should see these variables automatically created:
   - `PGHOST`
   - `PGPORT`
   - `PGUSER`
   - `PGPASSWORD`
   - `PGDATABASE`
   - `DATABASE_URL` (this is what your app uses)

**Important**: Railway automatically connects `DATABASE_URL` to your application service. You don't need to copy/paste it manually!

---

## STEP 3: Add Redis (OPTIONAL)

**Note**: Redis is optional for your application. It will work fine without it.

### 3.1 If You Want Redis
1. In your Railway project dashboard, click **"+ New"**
2. Select **"Database"**
3. Choose **"Add Redis"**
4. Railway will create a Redis instance

### 3.2 Connect Redis to Your App
1. Click on your **application service** (not the Redis service)
2. Go to **"Variables"** tab
3. Click **"+ New Variable"**
4. Add:
   - **Variable Name**: `REDIS_URL`
   - **Value**: Click **"Reference"** → Select **"Redis"** → Select **"REDIS_URL"**
5. Click **"Add"**

### 3.3 If You Don't Want Redis
- Skip this step entirely
- Your application will work without Redis
- You'll see Redis connection errors in logs (this is normal and harmless)

---

## STEP 4: Add Environment Variables

### 4.1 Go to Your Application Service
1. Click on your **application service** (the one with your code, not the database)
2. Go to **"Variables"** tab
3. You should already see `DATABASE_URL` (automatically added by Railway)

### 4.2 Add Required Variables

Click **"+ New Variable"** for each of these:

#### Variable 1: NODE_ENV
- **Variable Name**: `NODE_ENV`
- **Value**: `production`
- Click **"Add"**

#### Variable 2: JWT_SECRET
- **Variable Name**: `JWT_SECRET`
- **Value**: Generate a random 32+ character string
- Click **"Add"**

**How to generate JWT_SECRET**:
```bash
# Option 1: Use Node.js (run in your terminal)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Option 2: Use this example (but generate your own!)
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
```

#### Variable 3: SESSION_SECRET
- **Variable Name**: `SESSION_SECRET`
- **Value**: Generate another random 32+ character string (different from JWT_SECRET)
- Click **"Add"**

**How to generate SESSION_SECRET**:
```bash
# Same as JWT_SECRET, but use a different value
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### Variable 4: PORT (Optional)
- **Variable Name**: `PORT`
- **Value**: `3000`
- Click **"Add"**

**Note**: Railway usually sets this automatically, but adding it explicitly ensures consistency.

### 4.3 Verify All Variables

Your **Variables** tab should now show:
- ✅ `DATABASE_URL` (automatically added by Railway)
- ✅ `NODE_ENV` = `production`
- ✅ `JWT_SECRET` = `your-random-string`
- ✅ `SESSION_SECRET` = `your-different-random-string`
- ✅ `PORT` = `3000` (optional)
- ✅ `REDIS_URL` (only if you added Redis)

---

## STEP 5: Configure Health Check

### 5.1 Go to Settings
1. Click on your **application service**
2. Go to **"Settings"** tab
3. Scroll down to **"Health Check"** section

### 5.2 Configure Health Check
- **Health Check Path**: `/health`
- **Health Check Timeout**: `10` seconds
- **Health Check Interval**: `30` seconds
- Click **"Save"**

**Important**: The path must be `/health` (not `/health?simple=true`)

---

## STEP 6: Deploy and Monitor

### 6.1 Trigger Deployment
If your app hasn't deployed yet:
1. Go to **"Deployments"** tab
2. Click **"Deploy"** or wait for automatic deployment

### 6.2 Monitor Build Logs
1. Go to **"Deployments"** tab
2. Click on the latest deployment
3. Watch the build logs

**Expected build time**: 3-5 minutes

### 6.3 Watch for Success Messages

Look for these logs (in order):
```
=== SERVER STARTING ===
PORT: 3000
NODE_ENV: production
DATABASE_URL: SET
JWT_SECRET: SET
Frontend static files found at: /app/frontend/out
=== SERVER STARTED ===
Server running on port 3000
Environment: production
Health check available at /health
Server bound to 0.0.0.0 (accessible externally)
======================
Loading API routes...
API routes loaded successfully
Running database migrations...
Migrations completed
Initializing database connection...
Database connection initialized
```

### 6.4 Health Check Status
Watch for:
```
==================== Starting Healthcheck ====================
Path: /health
Attempt #1 succeeded ✅
```

---

## STEP 7: Get Your Application URL

### 7.1 Find Your URL
1. Go to **"Settings"** tab
2. Scroll to **"Domains"** section
3. You'll see your Railway URL (something like):
   ```
   https://ai-packaging-automation-production.up.railway.app
   ```

### 7.2 Test Your Application

Open these URLs in your browser:

1. **Health Check**:
   ```
   https://your-app.up.railway.app/health
   ```
   Should return:
   ```json
   {"status":"ok","timestamp":"...","port":3000,"env":"production"}
   ```

2. **Frontend**:
   ```
   https://your-app.up.railway.app/
   ```
   Should show your login page

3. **API**:
   ```
   https://your-app.up.railway.app/api/auth/health
   ```
   Should return API status

---

## STEP 8: Custom Domain (Optional)

### 8.1 Add Your Own Domain
1. Go to **"Settings"** tab
2. Scroll to **"Domains"** section
3. Click **"+ Add Domain"**
4. Enter your domain (e.g., `myapp.com`)
5. Follow Railway's instructions to update your DNS

---

## Summary of What You Need

### Required:
- ✅ Railway account
- ✅ GitHub repository deployed
- ✅ PostgreSQL database added
- ✅ Environment variables set:
  - `NODE_ENV=production`
  - `JWT_SECRET=<random-string>`
  - `SESSION_SECRET=<random-string>`
- ✅ Health check configured to `/health`

### Optional:
- ⚪ Redis database
- ⚪ Custom domain

---

## Environment Variables Reference

### Required Variables

| Variable | Value | How to Get |
|----------|-------|------------|
| `NODE_ENV` | `production` | Type manually |
| `JWT_SECRET` | Random 32+ chars | Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `SESSION_SECRET` | Random 32+ chars | Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `DATABASE_URL` | Auto-generated | Railway adds this automatically when you add PostgreSQL |

### Optional Variables

| Variable | Value | When to Add |
|----------|-------|-------------|
| `PORT` | `3000` | Optional (Railway usually sets this) |
| `REDIS_URL` | Auto-generated | Only if you add Redis database |

---

## Troubleshooting

### Build Fails
- Check build logs for specific errors
- Verify all environment variables are set
- Make sure PostgreSQL database is added

### Health Check Fails
- Verify health check path is `/health` (not `/health?simple=true`)
- Check deployment logs for "SERVER STARTED" message
- Make sure PORT is set to 3000

### Database Connection Errors
- Verify PostgreSQL database is added to project
- Check that `DATABASE_URL` variable exists
- Look for "Database connection initialized" in logs

### Frontend Doesn't Load
- Check logs for "Frontend static files found" message
- Verify build completed successfully
- Try clearing browser cache

---

## Quick Reference Commands

### Generate Secrets
```bash
# Generate JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate SESSION_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Test Health Check
```bash
curl https://your-app.up.railway.app/health
```

### Test API
```bash
curl https://your-app.up.railway.app/api/auth/health
```

---

## Expected Timeline

| Step | Time |
|------|------|
| Create project | 1 minute |
| Add PostgreSQL | 30 seconds |
| Add Redis (optional) | 30 seconds |
| Set environment variables | 2 minutes |
| Configure health check | 1 minute |
| Build and deploy | 3-5 minutes |
| **Total** | **7-10 minutes** |

---

## Success Checklist

- [ ] Railway project created from GitHub
- [ ] PostgreSQL database added
- [ ] Redis added (optional)
- [ ] `NODE_ENV` set to `production`
- [ ] `JWT_SECRET` generated and added
- [ ] `SESSION_SECRET` generated and added
- [ ] `DATABASE_URL` exists (auto-added)
- [ ] Health check path set to `/health`
- [ ] Build completed successfully
- [ ] Health checks passing
- [ ] Application accessible at Railway URL
- [ ] Frontend loads correctly
- [ ] API endpoints respond

---

## Next Steps After Deployment

1. **Test the application**: Try logging in, creating boxes, running simulations
2. **Monitor logs**: Watch for any errors or warnings
3. **Check metrics**: Railway provides CPU, memory, and network metrics
4. **Set up custom domain** (optional): Add your own domain in Railway settings
5. **Configure backups**: Set up database backups in Railway

---

*Guide created: February 25, 2026*  
*Application: AI Packaging Optimizer*  
*Repository: https://github.com/yeswanth485/AI-Packaging-automation-.git*
