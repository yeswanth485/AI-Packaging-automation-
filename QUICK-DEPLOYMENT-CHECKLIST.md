# ✅ Quick Deployment Checklist

## Before You Start

- [ ] Code is pushed to GitHub: https://github.com/yeswanth485/AI-Packaging-automation-.git
- [ ] You have a Railway account: https://railway.app/

---

## Railway Setup (5 minutes)

### 1. Create Project
- [ ] Go to Railway.app
- [ ] Click "New Project"
- [ ] Select "Deploy from GitHub repo"
- [ ] Choose: AI-Packaging-automation-

### 2. Add Database
- [ ] Click "+ New"
- [ ] Select "Database" → "PostgreSQL"
- [ ] Wait for database to provision

### 3. Set Environment Variables
- [ ] Click your service → "Variables" tab
- [ ] Add these variables:

```
NODE_ENV=production
JWT_SECRET=<generate-random-32-char-string>
SESSION_SECRET=<generate-random-32-char-string>
PORT=3000
```

**Generate secrets**:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Configure Health Check
- [ ] Click service → "Settings" tab
- [ ] Find "Health Check" section
- [ ] Set path: `/health`
- [ ] Set timeout: `10` seconds
- [ ] Set interval: `30` seconds
- [ ] Click "Save"

### 5. Deploy
- [ ] Railway auto-deploys after setup
- [ ] Watch "Deployments" tab for progress
- [ ] Wait 3-5 minutes for build

---

## Verify Deployment (2 minutes)

### Check Logs
Look for these messages:
```
✅ === SERVER STARTED ===
✅ Server running on port 3000
✅ Health check available at /health
✅ Frontend static files found at: /app/frontend/out
✅ API routes loaded successfully
```

### Check Health
- [ ] Health check passes in Railway logs
- [ ] Visit: `https://your-app.up.railway.app/health`
- [ ] Should return: `{"status":"ok",...}`

### Test Frontend
- [ ] Visit: `https://your-app.up.railway.app/`
- [ ] Should show login page
- [ ] Try registering a new user

### Test API
- [ ] Visit: `https://your-app.up.railway.app/api/auth/health`
- [ ] Should return API status

---

## If Something Goes Wrong

### Health Check Fails
1. Check logs for "SERVER STARTED"
2. Verify PORT=3000 in environment variables
3. Check health check path is `/health` (not `/health?simple=true`)

### Build Fails
1. Check environment variables are set
2. Verify PostgreSQL database is added
3. Check build logs for specific errors

### Frontend Doesn't Load
1. Check logs for "Frontend static files found"
2. Verify frontend build completed in build logs
3. Try clearing browser cache

---

## Success Criteria

✅ Build completes without errors  
✅ Health checks pass  
✅ Server logs show "SERVER STARTED"  
✅ Frontend loads at root URL  
✅ Can register/login  
✅ API endpoints respond  

---

## Your URLs After Deployment

```
Frontend: https://your-app.up.railway.app/
API:      https://your-app.up.railway.app/api/
Health:   https://your-app.up.railway.app/health
```

---

## Need Help?

1. Check Railway logs in "Deployments" tab
2. Look for error messages in server logs
3. Verify all environment variables are set
4. Make sure PostgreSQL database is connected

---

*Total Time: ~7 minutes*  
*Difficulty: Easy*  
*Status: Ready to Deploy*
