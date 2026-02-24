# Railway Deployment Checklist

## ✅ Pre-Deployment Checklist

### 1. Environment Variables (CRITICAL)
Make sure these are set in Railway:

**Required:**
- `NODE_ENV=production`
- `PORT=3000`
- `DATABASE_URL` (auto-created by PostgreSQL service)
- `REDIS_URL` (auto-created by Redis service)
- `JWT_SECRET` (generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
- `SESSION_SECRET=42cd5d1cf7c110124e309b8bdf7316ada2a6792d7a266db659a102e7d71ce02b`

**Optional:**
- `ALLOWED_ORIGINS` (comma-separated list of allowed CORS origins)

### 2. Railway Services Setup

**Step 1: Create PostgreSQL Database**
1. In Railway project, click "+ New"
2. Select "Database" → "PostgreSQL"
3. Railway auto-creates `DATABASE_URL` environment variable
4. Wait for database to be ready (green status)

**Step 2: Create Redis Database**
1. In Railway project, click "+ New"
2. Select "Database" → "Redis"
3. Railway auto-creates `REDIS_URL` environment variable
4. Wait for Redis to be ready (green status)

**Step 3: Deploy Application**
1. Connect GitHub repository
2. Railway auto-detects Dockerfile
3. Set environment variables (see above)
4. Deploy

### 3. Build Configuration
- Builder: **Docker** (NOT Nixpacks)
- Dockerfile Path: `Dockerfile` (in project root)
- Root Directory: Leave empty

## 🔍 Troubleshooting Health Check Failures

### Symptom: "service unavailable" or "replicas never became healthy"

**Possible Causes:**

1. **Missing Environment Variables**
   - Check Railway dashboard → Variables tab
   - Ensure DATABASE_URL and REDIS_URL are set
   - Ensure JWT_SECRET is set

2. **Database Not Ready**
   - Check PostgreSQL service status (should be green)
   - Check deployment logs for "Database connected successfully"
   - If connection fails, check DATABASE_URL format

3. **Redis Not Ready**
   - Check Redis service status (should be green)
   - Check deployment logs for "Redis connected successfully"
   - If connection fails, check REDIS_URL format

4. **Port Mismatch**
   - Ensure PORT=3000 in environment variables
   - Check Dockerfile EXPOSE 3000
   - Check src/index.ts uses process.env.PORT

5. **Prisma Migrations Failed**
   - Check deployment logs for "npx prisma migrate deploy"
   - If migrations fail, check DATABASE_URL connection
   - Ensure database is accessible from Railway

### How to Check Logs

1. Go to Railway dashboard
2. Click on your service
3. Click "Deployments" tab
4. Click on the latest deployment
5. View "Build Logs" and "Deploy Logs"

### Common Log Messages

**✅ Good Signs:**
```
Database connected successfully
Redis connected successfully
Server running on port 3000
```

**❌ Bad Signs:**
```
DATABASE_URL environment variable is not set
Database connection failed after all retries
Redis connection error
ECONNREFUSED
```

## 🚀 Deployment Process

### What Happens During Deployment:

1. **Build Stage (Dockerfile builder)**
   - Install dependencies (npm ci)
   - Generate Prisma client
   - Build frontend (Next.js)
   - Build backend (TypeScript → JavaScript)

2. **Production Stage**
   - Copy built files
   - Install production dependencies only
   - Set up non-root user

3. **Startup (CMD)**
   - Run Prisma migrations: `npx prisma migrate deploy`
   - Start Node.js server: `node dist/index.js`

4. **Health Check**
   - Railway checks `/health?simple=true`
   - Must respond with 200 status within 5 minutes
   - Retries every 10-30 seconds

## 📊 Expected Timeline

- Build: 5-10 minutes (first time)
- Startup: 30-60 seconds
- Health check: Should pass within 1 minute
- Total: ~6-12 minutes for first deployment

## 🔧 Quick Fixes

### If Health Check Keeps Failing:

1. **Check Environment Variables**
   ```bash
   # In Railway dashboard, verify:
   NODE_ENV=production
   PORT=3000
   DATABASE_URL=postgresql://...
   REDIS_URL=redis://...
   JWT_SECRET=<your-secret>
   SESSION_SECRET=<your-secret>
   ```

2. **Check Database Connection**
   - Ensure PostgreSQL service is running
   - Check DATABASE_URL is correct
   - Try connecting manually using psql

3. **Check Redis Connection**
   - Ensure Redis service is running
   - Check REDIS_URL is correct

4. **Restart Deployment**
   - Sometimes services need time to initialize
   - Click "Redeploy" in Railway dashboard

5. **Check Application Logs**
   - Look for startup errors
   - Check for missing dependencies
   - Verify Prisma migrations ran successfully

## 📝 Post-Deployment Verification

Once deployment succeeds:

1. **Test Health Endpoint**
   ```bash
   curl https://your-app.railway.app/health?simple=true
   # Should return: {"status":"ok","timestamp":"..."}
   ```

2. **Test API Endpoints**
   ```bash
   # Register a user
   curl -X POST https://your-app.railway.app/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"Test123!","name":"Test User"}'
   ```

3. **Check Metrics**
   ```bash
   curl https://your-app.railway.app/metrics
   # Should return Prometheus metrics
   ```

## 🎯 Success Criteria

- ✅ Build completes without errors
- ✅ Health check passes (200 OK)
- ✅ Application logs show "Server running on port 3000"
- ✅ Database connection successful
- ✅ Redis connection successful
- ✅ API endpoints respond correctly

## 🆘 Still Having Issues?

1. Check Railway status page: https://status.railway.app/
2. Review deployment logs carefully
3. Verify all environment variables are set
4. Ensure PostgreSQL and Redis services are running
5. Try redeploying from scratch
6. Check GitHub repository has latest code

## 📞 Support Resources

- Railway Docs: https://docs.railway.app/
- Railway Discord: https://discord.gg/railway
- GitHub Issues: Check your repository issues

---

**Last Updated:** After fixing health check resilience
**Deployment Status:** Ready for production deployment
