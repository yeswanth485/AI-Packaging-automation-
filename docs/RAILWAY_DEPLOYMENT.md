# Railway Deployment Guide

This guide covers deploying the AI Packaging Optimizer to Railway.

## Prerequisites

1. Railway account
2. GitHub repository connected to Railway
3. PostgreSQL database service on Railway
4. Redis service on Railway (optional but recommended)

## Railway Configuration

### Environment Variables

Set these environment variables in your Railway service:

**Required:**
- `NODE_ENV=production`
- `DATABASE_URL` - Automatically provided by Railway PostgreSQL service
- `JWT_SECRET` - Generate a secure secret key
- `SESSION_SECRET` - Generate a secure session secret

**Optional but Recommended:**
- `REDIS_URL` - Automatically provided by Railway Redis service
- `LOG_LEVEL=info`
- `PORT` - Railway will set this automatically

**Application Specific:**
```
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
API_KEY_ROTATION_DAYS=90
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
MAX_FILE_SIZE_MB=50
DEFAULT_BUFFER_PADDING=2
DEFAULT_VOLUMETRIC_DIVISOR=5000
DEFAULT_SHIPPING_RATE_PER_KG=0.5
SIMULATION_TIMEOUT_MS=300000
MAX_CONCURRENT_SIMULATIONS=5
BCRYPT_ROUNDS=12
```

### Build and Start Commands

Railway will automatically detect the configuration from `railway.json`:

**Build Command:**
```bash
npm install && npx prisma generate && npx prisma migrate deploy && cd frontend && npm install && npm run build && cd .. && npm run build
```

**Start Command:**
```bash
npx prisma migrate deploy && node dist/index.js
```

## Deployment Steps

### 1. Connect Repository

1. Go to Railway dashboard
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your repository

### 2. Add Database Service

1. In your project, click "New Service"
2. Select "Database" → "PostgreSQL"
3. Railway will automatically set `DATABASE_URL`

### 3. Add Redis Service (Optional)

1. Click "New Service"
2. Select "Database" → "Redis"
3. Railway will automatically set `REDIS_URL`

### 4. Configure Environment Variables

1. Go to your main service
2. Click "Variables" tab
3. Add the required environment variables listed above

### 5. Deploy

1. Push your code to the connected GitHub repository
2. Railway will automatically build and deploy
3. Check the deployment logs for any issues

## Health Checks

The application includes health check endpoints:

- **Simple health check:** `GET /health?simple=true`
- **Comprehensive health check:** `GET /health`

Railway will use the simple health check endpoint for monitoring.

## Troubleshooting

### Database Connection Issues

**Error:** `P1001: Can't reach database server at localhost:5432`

**Solution:** Ensure `DATABASE_URL` environment variable is set by Railway PostgreSQL service.

### Migration Issues

**Error:** Migration failures during deployment

**Solution:** 
1. Check that `DATABASE_URL` is accessible
2. Ensure migrations are compatible with PostgreSQL
3. Check Railway logs for specific migration errors

### Redis Connection Issues

**Error:** Redis connection failures

**Solution:**
1. Redis is optional - the app will continue without it
2. Ensure `REDIS_URL` is set if using Railway Redis
3. Check Redis service status in Railway dashboard

### Build Failures

**Error:** Build process fails

**Solution:**
1. Check that all dependencies are in `package.json`
2. Ensure TypeScript compiles without errors locally
3. Check Railway build logs for specific errors

## Monitoring

### Logs

Access logs through Railway dashboard:
1. Go to your service
2. Click "Logs" tab
3. Monitor for errors and performance issues

### Metrics

The application exposes Prometheus metrics at `/metrics` endpoint for monitoring.

## Scaling

Railway automatically handles scaling based on traffic. For high-traffic applications:

1. Consider upgrading to Railway Pro plan
2. Monitor resource usage in Railway dashboard
3. Optimize database queries and Redis usage

## Security Considerations

1. **Environment Variables:** Never commit secrets to repository
2. **HTTPS:** Railway provides HTTPS by default
3. **Database:** Railway PostgreSQL includes SSL by default
4. **Rate Limiting:** Configured in the application
5. **CORS:** Configure `ALLOWED_ORIGINS` for production domains

## Production Checklist

- [ ] All environment variables set
- [ ] Database service connected
- [ ] Redis service connected (optional)
- [ ] Health checks responding
- [ ] Logs showing successful startup
- [ ] Frontend assets loading correctly
- [ ] API endpoints responding
- [ ] Database migrations applied
- [ ] SSL/HTTPS working
- [ ] Custom domain configured (if needed)