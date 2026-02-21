# Test script for AI Packaging Optimizer Backend

Write-Host "`n=== AI Packaging Optimizer Test Suite ===" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is running
Write-Host "[1/3] Checking infrastructure..." -ForegroundColor Yellow
$dockerRunning = docker ps 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Warning: Docker is not running" -ForegroundColor Yellow
    Write-Host "   Many tests will fail without PostgreSQL and Redis" -ForegroundColor Yellow
    Write-Host ""
    $response = Read-Host "Continue anyway? (y/n)"
    if ($response -ne 'y') {
        Write-Host "Exiting. Please start Docker Desktop and run: docker compose up -d" -ForegroundColor Gray
        exit 0
    }
} else {
    # Check if containers are running
    $postgresRunning = docker ps | Select-String "postgres"
    $redisRunning = docker ps | Select-String "redis"
    
    if (-not $postgresRunning -or -not $redisRunning) {
        Write-Host "⚠️  Warning: Database containers not running" -ForegroundColor Yellow
        Write-Host "   Starting containers..." -ForegroundColor Yellow
        docker compose up -d
        Start-Sleep -Seconds 5
    }
    Write-Host "✅ Infrastructure ready" -ForegroundColor Green
}

# Generate Prisma Client
Write-Host "`n[2/3] Ensuring Prisma Client is generated..." -ForegroundColor Yellow
npx prisma generate | Out-Null
Write-Host "✅ Prisma Client ready" -ForegroundColor Green

# Run tests
Write-Host "`n[3/3] Running test suite..." -ForegroundColor Yellow
Write-Host ""
Write-Host "=== Test Execution ===" -ForegroundColor Cyan
Write-Host ""

npm test

Write-Host ""
Write-Host "=== Test Summary ===" -ForegroundColor Cyan
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ All tests passed!" -ForegroundColor Green
} else {
    Write-Host "❌ Some tests failed" -ForegroundColor Red
    Write-Host ""
    Write-Host "Common issues:" -ForegroundColor Yellow
    Write-Host "  - Database not running: docker compose up -d" -ForegroundColor Gray
    Write-Host "  - Migrations not run: npm run prisma:migrate" -ForegroundColor Gray
    Write-Host "  - Redis not running: docker compose up -d" -ForegroundColor Gray
}
Write-Host ""
