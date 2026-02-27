# Start both backend and frontend servers

Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   Starting AI Packaging Optimizer Application" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Check if Docker containers are running
Write-Host "Checking Docker containers..." -ForegroundColor Yellow
$postgresRunning = docker ps --filter "name=packaging_optimizer_db" --format "{{.Names}}"
$redisRunning = docker ps --filter "name=packaging_optimizer_redis" --format "{{.Names}}"

if (-not $postgresRunning -or -not $redisRunning) {
    Write-Host "Starting Docker containers..." -ForegroundColor Yellow
    docker-compose up -d
    Start-Sleep -Seconds 5
    Write-Host "✅ Docker containers started" -ForegroundColor Green
} else {
    Write-Host "✅ Docker containers already running" -ForegroundColor Green
}

Write-Host ""
Write-Host "Starting servers..." -ForegroundColor Yellow
Write-Host ""

# Start backend server in background
Write-Host "Starting Backend Server (Port 3000)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm start" -WorkingDirectory $PWD

# Wait a bit for backend to start
Start-Sleep -Seconds 3

# Start frontend server in background
Write-Host "Starting Frontend Server (Port 3001)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev" -WorkingDirectory "$PWD\frontend"

# Wait for servers to start
Start-Sleep -Seconds 5

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "   ✅ APPLICATION IS RUNNING!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Frontend: http://localhost:3001" -ForegroundColor Cyan
Write-Host "🔌 Backend:  http://localhost:3000" -ForegroundColor Cyan
Write-Host "💾 Database: localhost:5432" -ForegroundColor Cyan
Write-Host ""
Write-Host "📖 Test Account:" -ForegroundColor Yellow
Write-Host "   Email: test@example.com" -ForegroundColor White
Write-Host "   Password: testpass123" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop this script (servers will keep running)" -ForegroundColor Gray
Write-Host "To stop servers, close the PowerShell windows or run: docker-compose down" -ForegroundColor Gray
Write-Host ""

# Keep script running
while ($true) {
    Start-Sleep -Seconds 1
}
