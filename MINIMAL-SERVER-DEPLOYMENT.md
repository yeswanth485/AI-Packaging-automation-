# Minimal Server Deployment - Troubleshooting Strategy

## What I Did

I've deployed a **minimal test server** (`src/index-minimal.ts`) to isolate the startup issue. This server:

- ✅ Has ZERO dependencies on database, Redis, or complex middleware
- ✅ Starts immediately (no async initialization)
- ✅ Responds to `/health` with 200 OK instantly
- ✅ Logs everything to console for visibility
- ✅ Has comprehensive error handling

## Why This Approach

The health check was failing repeatedly, which means:
1. Either the server wasn't starting at all
2. Or it was crashing during startup
3. Or middleware was blocking the health check

By using a minimal server, we can:
- **Confirm Railway can run Node.js apps** (if this works)
- **See actual error logs** (console.log works)
- **Isolate the problem** (if minimal works, issue is in our code)

## What Should Happen Now

### If Minimal Server Works ✅

Railway deployment will succeed and you'll see:
```
Server started successfully!
Port: 3000
Environment: production
Health check: http://localhost:3000/health
```

**Next Steps:**
1. Verify health check passes
2. Test the endpoint: `curl https://your-app.railway.app/health`
3. Gradually add back features:
   - Add database connection
   - Add Redis connection
   - Add middleware
   - Add routes

### If Minimal Server Still Fails ❌

This means the issue is with Railway configuration, not our code:

**Check:**
1. PORT environment variable is set to 3000
2. Railway is using Docker builder (not Nixpacks)
3. Dockerfile path is correct
4. Build completed successfully
5. Container is actually starting

## Endpoints Available

1. **Health Check**: `GET /health`
   - Returns: `{"status":"ok","timestamp":"...","port":3000,"env":"production"}`

2. **Root**: `GET /`
   - Returns: `{"message":"AI Packaging Optimizer API","status":"running"}`

## Viewing Logs in Railway

1. Go to Railway dashboard
2. Click your service
3. Click "Deployments"
4. Click latest deployment
5. View "Deploy Logs"

Look for:
```
Server started successfully!
Port: 3000
```

## Once Minimal Server Works

We'll gradually restore the full application:

### Phase 1: Add Logging
- Restore winston logger
- Verify logs appear in Railway

### Phase 2: Add Database
- Add Prisma connection
- Make it optional (don't crash if fails)
- Test health check still works

### Phase 3: Add Redis
- Add Redis connection
- Make it optional
- Test health check still works

### Phase 4: Add Middleware
- Add one middleware at a time
- Test after each addition

### Phase 5: Add Routes
- Add API routes
- Test each route

### Phase 6: Add Frontend
- Serve Next.js static files
- Test full application

## Rollback Plan

If you need to rollback to full server:

1. Edit `package.json`:
   ```json
   "start": "node dist/index.js"
   ```

2. Edit `Dockerfile`:
   ```dockerfile
   CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
   ```

3. Commit and push

## Current Commit

- `47a34ea` - fix: Use minimal server for Railway deployment to isolate startup issues

## Expected Timeline

- Build: 5-8 minutes
- Startup: 5-10 seconds
- Health check: Should pass within 30 seconds

## Success Criteria

✅ Build completes without errors
✅ Container starts
✅ Logs show "Server started successfully!"
✅ Health check returns 200 OK
✅ `/health` endpoint responds with JSON

---

**Status**: Waiting for Railway deployment to complete
**Next**: Check deployment logs and health check status
