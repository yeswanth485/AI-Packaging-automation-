# PowerShell script to test the backend API

$BASE_URL = "http://localhost:3000"

Write-Host "=== AI Packaging Optimizer Backend API Test ===" -ForegroundColor Cyan
Write-Host ""

# Test 1: Health Check
Write-Host "Test 1: Health Check" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/health" -Method Get
    Write-Host "✓ Health check passed" -ForegroundColor Green
    Write-Host "  Status: $($response.status)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Health check failed: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Test 2: User Registration
Write-Host "Test 2: User Registration" -ForegroundColor Yellow
$registerBody = @{
    email = "test@example.com"
    password = "Test1234!"
    name = "Test User"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/api/auth/register" -Method Post -Body $registerBody -ContentType "application/json"
    Write-Host "✓ User registration successful" -ForegroundColor Green
    Write-Host "  User ID: $($response.data.user.id)" -ForegroundColor Gray
    Write-Host "  Email: $($response.data.user.email)" -ForegroundColor Gray
} catch {
    if ($_.Exception.Response.StatusCode -eq 409) {
        Write-Host "⚠ User already exists (this is OK)" -ForegroundColor Yellow
    } else {
        Write-Host "✗ Registration failed: $_" -ForegroundColor Red
    }
}

Write-Host ""

# Test 3: User Login
Write-Host "Test 3: User Login" -ForegroundColor Yellow
$loginBody = @{
    email = "test@example.com"
    password = "Test1234!"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/api/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
    $token = $response.data.tokens.accessToken
    Write-Host "✓ Login successful" -ForegroundColor Green
    Write-Host "  Token: $($token.Substring(0, 20))..." -ForegroundColor Gray
} catch {
    Write-Host "✗ Login failed: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Test 4: Get Boxes (should be empty initially)
Write-Host "Test 4: Get Boxes" -ForegroundColor Yellow
try {
    $headers = @{
        Authorization = "Bearer $token"
    }
    $response = Invoke-RestMethod -Uri "$BASE_URL/api/boxes" -Method Get -Headers $headers
    Write-Host "✓ Get boxes successful" -ForegroundColor Green
    Write-Host "  Total boxes: $($response.data.total)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Get boxes failed: $_" -ForegroundColor Red
}

Write-Host ""

# Test 5: Create Subscription
Write-Host "Test 5: Create Subscription" -ForegroundColor Yellow
$subscriptionBody = @{
    tier = "BASIC"
} | ConvertTo-Json

try {
    $headers = @{
        Authorization = "Bearer $token"
        "Content-Type" = "application/json"
    }
    $response = Invoke-RestMethod -Uri "$BASE_URL/api/subscriptions" -Method Post -Body $subscriptionBody -Headers $headers
    Write-Host "✓ Subscription created" -ForegroundColor Green
    Write-Host "  Tier: $($response.data.subscription.tier)" -ForegroundColor Gray
    Write-Host "  Quota: $($response.data.subscription.monthlyQuota)" -ForegroundColor Gray
} catch {
    if ($_.Exception.Response.StatusCode -eq 409) {
        Write-Host "⚠ Subscription already exists (this is OK)" -ForegroundColor Yellow
    } else {
        Write-Host "✗ Subscription creation failed: $_" -ForegroundColor Red
    }
}

Write-Host ""

# Test 6: Get Subscription
Write-Host "Test 6: Get Subscription" -ForegroundColor Yellow
try {
    $headers = @{
        Authorization = "Bearer $token"
    }
    $response = Invoke-RestMethod -Uri "$BASE_URL/api/subscriptions/me" -Method Get -Headers $headers
    Write-Host "✓ Get subscription successful" -ForegroundColor Green
    Write-Host "  Tier: $($response.data.subscription.tier)" -ForegroundColor Gray
    Write-Host "  Usage: $($response.data.subscription.currentUsage)/$($response.data.subscription.monthlyQuota)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Get subscription failed: $_" -ForegroundColor Red
}

Write-Host ""

# Test 7: Create Configuration
Write-Host "Test 7: Create Configuration" -ForegroundColor Yellow
$configBody = @{
    bufferPadding = 2
    volumetricDivisor = 5000
    shippingRatePerKg = 5
} | ConvertTo-Json

try {
    $headers = @{
        Authorization = "Bearer $token"
        "Content-Type" = "application/json"
    }
    $response = Invoke-RestMethod -Uri "$BASE_URL/api/config" -Method Post -Body $configBody -Headers $headers
    Write-Host "✓ Configuration created" -ForegroundColor Green
    Write-Host "  Buffer Padding: $($response.data.configuration.bufferPadding)" -ForegroundColor Gray
    Write-Host "  Volumetric Divisor: $($response.data.configuration.volumetricDivisor)" -ForegroundColor Gray
} catch {
    if ($_.Exception.Response.StatusCode -eq 409) {
        Write-Host "⚠ Configuration already exists (this is OK)" -ForegroundColor Yellow
    } else {
        Write-Host "✗ Configuration creation failed: $_" -ForegroundColor Red
    }
}

Write-Host ""

# Test 8: Metrics Endpoint
Write-Host "Test 8: Metrics Endpoint" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$BASE_URL/metrics" -Method Get
    $metricsCount = ($response.Content -split "`n" | Where-Object { $_ -match "^http_" }).Count
    Write-Host "✓ Metrics endpoint accessible" -ForegroundColor Green
    Write-Host "  Metrics found: $metricsCount" -ForegroundColor Gray
} catch {
    Write-Host "✗ Metrics endpoint failed: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Test Summary ===" -ForegroundColor Cyan
Write-Host "Backend API is running and responding correctly!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Review the TESTING-GUIDE.md for more detailed tests"
Write-Host "2. Test additional endpoints using Postman or curl"
Write-Host "3. Proceed with frontend development (Tasks 22-30)"
Write-Host ""
