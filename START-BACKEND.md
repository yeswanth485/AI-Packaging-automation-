# Backend Startup Guide

## Prerequisites

1. ✅ Node.js v24.13.1 installed
2. ✅ npm 11.8.0 installed
3. ⏳ Docker Desktop installed and running
4. ✅ Dependencies installed (`npm install`)
5. ✅ Prisma Client generated (`npx prisma generate`)

## Step-by-Step Startup

### 1. Start Docker Services

Open Docker Desktop and ensure it's running, then:

```powershell
# Start PostgreSQL and Redis containers
docker compose up -d

# Verify containers are running
docker ps

# You should see:
# - packaging-optimizer-postgres
# - packaging-optimizer-redis
```

### 2. Run Database Migrations

```powershell
# Create database schema and apply migrations
npm run prisma:migrate

# When prompted for migration name, you can use: "initial_schema"
```

### 3. Verify Database Connection

```powershell
# Open Prisma Studio to view database
npm run prisma:studio

# This will open http://localhost:5555 in your browser
# You should see all tables: User, Box, Order, Item, Simulation, etc.
```

### 4. Start the Backend Server

```powershell
# Development mode with hot reload
npm run dev

# The server will start on http://localhost:3000
# You should see:
# - "Server running on port 3000"
# - "Database connected"
# - "Redis connected"
```

### 5. Test the API

```powershell
# Health check endpoint
curl http://localhost:3000/health

# Expected response:
# {
#   "status": "healthy",
#   "timestamp": "2026-02-21T...",
#   "services": {
#     "database": "connected",
#     "redis": "connected"
#   }
# }
```

## Running Tests

### With Infrastructure (Recommended)

```powershell
# Ensure Docker services are running
docker compose up -d

# Run all tests
npm test

# Run specific test suite
npm test -- BoxCatalogManager

# Run with coverage
npm run test:coverage
```

### Without Infrastructure

Tests will run but many will fail due to missing connections:

```powershell
npm test
```

## Troubleshooting

### Docker Not Running

**Error**: `failed to connect to the docker API`

**Solution**:
1. Open Docker Desktop
2. Wait for it to fully start (green icon in system tray)
3. Run `docker ps` to verify it's working

### Database Connection Failed

**Error**: `Can't reach database server at localhost:5432`

**Solution**:
```powershell
# Check if PostgreSQL container is running
docker ps | Select-String postgres

# If not running, start it
docker compose up -d postgres

# Check logs
docker logs packaging-optimizer-postgres
```

### Redis Connection Failed

**Error**: `Redis connection error: ECONNREFUSED`

**Solution**:
```powershell
# Check if Redis container is running
docker ps | Select-String redis

# If not running, start it
docker compose up -d redis

# Check logs
docker logs packaging-optimizer-redis
```

### Port Already in Use

**Error**: `Port 3000 is already in use`

**Solution**:
```powershell
# Find process using port 3000
netstat -ano | Select-String ":3000"

# Kill the process (replace PID with actual process ID)
Stop-Process -Id <PID> -Force

# Or change the port in .env file
# PORT=3001
```

### Prisma Client Not Generated

**Error**: `Cannot find module '@prisma/client'`

**Solution**:
```powershell
npx prisma generate
```

## Quick Start Script

Save this as `start.ps1`:

```powershell
# Quick start script for backend

Write-Host "Starting AI Packaging Optimizer Backend..." -ForegroundColor Green

# Check if Docker is running
$dockerRunning = docker ps 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Docker is not running. Please start Docker Desktop." -ForegroundColor Red
    exit 1
}

# Start Docker services
Write-Host "Starting Docker services..." -ForegroundColor Yellow
docker compose up -d

# Wait for services to be ready
Write-Host "Waiting for services to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Generate Prisma Client
Write-Host "Generating Prisma Client..." -ForegroundColor Yellow
npx prisma generate

# Run migrations
Write-Host "Running database migrations..." -ForegroundColor Yellow
npm run prisma:migrate

# Start the server
Write-Host "Starting backend server..." -ForegroundColor Green
npm run dev
```

Then run:
```powershell
.\start.ps1
```

## Current Status

✅ All TypeScript compilation errors fixed
✅ Test configuration updated
✅ Dependencies installed
✅ Prisma Client generated
⏳ Docker services need to be started
⏳ Database migrations need to be run
⏳ Backend server ready to start

## Next Steps

1. Start Docker Desktop
2. Run `docker compose up -d`
3. Run `npm run prisma:migrate`
4. Run `npm run dev`
5. Test the API at http://localhost:3000/health
