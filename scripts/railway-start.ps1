# Railway startup script for AI Packaging Optimizer (PowerShell version)
# This script ensures proper database migration and startup sequence

$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting Railway deployment..." -ForegroundColor Green

# Check if DATABASE_URL is set
if (-not $env:DATABASE_URL) {
    Write-Host "❌ ERROR: DATABASE_URL environment variable is not set" -ForegroundColor Red
    Write-Host "Please ensure Railway has provided the DATABASE_URL" -ForegroundColor Red
    exit 1
}

Write-Host "✅ DATABASE_URL is configured" -ForegroundColor Green

# Run database migrations
Write-Host "🔄 Running database migrations..." -ForegroundColor Yellow
npx prisma migrate deploy

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Database migrations completed successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Database migrations failed" -ForegroundColor Red
    exit 1
}

# Generate Prisma client (in case it's needed)
Write-Host "🔄 Generating Prisma client..." -ForegroundColor Yellow
npx prisma generate

# Start the application
Write-Host "🚀 Starting the application..." -ForegroundColor Green
node dist/index.js