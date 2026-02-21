# Quick start script for AI Packaging Optimizer Backend

Write-Host "`n=== AI Packaging Optimizer Backend Startup ===" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is running
Write-Host "[1/6] Checking Docker..." -ForegroundColor Yellow
$dockerRunning = docker ps 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error: Docker is not running." -ForegroundColor Red
    Write-Host "   Please start Docker Desktop and try again." -ForegroundColor Red
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "✅ Docker is running" -ForegroundColor Green

# Start Docker services
Write-Host "`n[2/6] Starting Docker services (PostgreSQL & Redis)..." -ForegroundColor Yellow
docker compose up -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to start Docker services" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "✅ Docker services started" -ForegroundColor Green

# Wait for services to be ready
Write-Host "`n[3/6] Waiting for services to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 10
Write-Host "✅ Services ready" -ForegroundColor Green

# Generate Prisma Client
Write-Host "`n[4/6] Generating Prisma Client..." -ForegroundColor Yellow
npx prisma generate | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to generate Prisma Client" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "✅ Prisma Client generated" -ForegroundColor Green

# Run migrations
Write-Host "`n[5/6] Running database migrations..." -ForegroundColor Yellow
Write-Host "   (You may be prompted to name the migration - press Enter to use default)" -ForegroundColor Gray
npm run prisma:migrate
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to run migrations" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "✅ Database migrations complete" -ForegroundColor Green

# Start the server
Write-Host "`n[6/6] Starting backend server..." -ForegroundColor Yellow
Write-Host ""
Write-Host "=== Server Starting ===" -ForegroundColor Cyan
Write-Host "API will be available at: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Health check: http://localhost:3000/health" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Gray
Write-Host ""

npm run dev
