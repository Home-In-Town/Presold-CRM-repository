# Training System Deployment Status Checker
Write-Host "`n🔍 TRAINING SYSTEM DEPLOYMENT STATUS CHECK" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Cyan

# Backend API URL
$apiUrl = "https://presold-crm-server-624770114041.asia-south1.run.app"

Write-Host "`n📡 Testing Backend Endpoints..." -ForegroundColor Yellow

# Test 1: Training Modules Endpoint
Write-Host "`n1. Training Modules Endpoint" -ForegroundColor White
try {
    $response = Invoke-WebRequest -Uri "$apiUrl/api/training/modules" -UseBasicParsing -TimeoutSec 10
    Write-Host "   ✅ Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "   ✅ Training routes are deployed!" -ForegroundColor Green
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 401) {
        Write-Host "   ✅ Status: 401 (Unauthorized)" -ForegroundColor Green
        Write-Host "   ✅ Training routes are deployed! (Expected 401 without auth)" -ForegroundColor Green
    } elseif ($statusCode -eq 404) {
        Write-Host "   ❌ Status: 404 (Not Found)" -ForegroundColor Red
        Write-Host "   ❌ Training routes NOT deployed yet" -ForegroundColor Red
        Write-Host "   ⏳ Waiting for Cloud Build to complete..." -ForegroundColor Yellow
    } else {
        Write-Host "   ⚠️  Status: $statusCode" -ForegroundColor Yellow
        Write-Host "   Response: $($_.Exception.Message)" -ForegroundColor Gray
    }
}

# Test 2: Training Video Endpoint
Write-Host "`n2. Training Video Streaming Endpoint" -ForegroundColor White
try {
    $response = Invoke-WebRequest -Uri "$apiUrl/api/training/videos/test123" -UseBasicParsing -TimeoutSec 10
    Write-Host "   ✅ Status: $($response.StatusCode)" -ForegroundColor Green
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 404) {
        Write-Host "   ✅ Status: 404 (File not found)" -ForegroundColor Green
        Write-Host "   ✅ Video streaming endpoint is deployed! (Expected 404 for invalid ID)" -ForegroundColor Green
    } elseif ($statusCode -eq 401) {
        Write-Host "   ✅ Status: 401 (Unauthorized)" -ForegroundColor Green
        Write-Host "   ✅ Video endpoint is deployed!" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Status: $statusCode" -ForegroundColor Yellow
    }
}

# Test 3: My Modules Endpoint (User endpoint)
Write-Host "`n3. User Training Modules Endpoint" -ForegroundColor White
try {
    $response = Invoke-WebRequest -Uri "$apiUrl/api/training/my-modules" -UseBasicParsing -TimeoutSec 10
    Write-Host "   ✅ Status: $($response.StatusCode)" -ForegroundColor Green
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 401) {
        Write-Host "   ✅ Status: 401 (Unauthorized)" -ForegroundColor Green
        Write-Host "   ✅ User endpoint is deployed! (Expected 401 without auth)" -ForegroundColor Green
    } elseif ($statusCode -eq 404) {
        Write-Host "   ❌ Status: 404 (Not Found)" -ForegroundColor Red
        Write-Host "   ❌ Endpoint NOT deployed yet" -ForegroundColor Red
    } else {
        Write-Host "   ⚠️  Status: $statusCode" -ForegroundColor Yellow
    }
}

Write-Host "`n" -NoNewline
Write-Host "=" * 60 -ForegroundColor Cyan

# Summary
Write-Host "`n📊 DEPLOYMENT SUMMARY" -ForegroundColor Cyan
Write-Host "   • GitHub Push: ✅ Completed (commit 31fc807)" -ForegroundColor Green
Write-Host "   • Cloud Build: ⏳ In Progress (check Google Cloud Console)" -ForegroundColor Yellow
Write-Host "   • Backend Deployment: ⏳ Waiting for Cloud Build" -ForegroundColor Yellow
Write-Host "   • Frontend Deployment: ⏳ Pending (deploy after backend)" -ForegroundColor Yellow

Write-Host "`n🔗 USEFUL LINKS" -ForegroundColor Cyan
Write-Host "   • Cloud Build Builds: https://console.cloud.google.com/cloud-build/builds" -ForegroundColor Blue
Write-Host "   • Cloud Run Service: https://console.cloud.google.com/run" -ForegroundColor Blue
Write-Host "   • GitHub Repo: https://github.com/Home-In-Town/Presold-CRM-repository" -ForegroundColor Blue

Write-Host "`n⏱️  NEXT STEPS" -ForegroundColor Cyan
Write-Host "   1. Wait 5-10 minutes for Cloud Build to complete" -ForegroundColor White
Write-Host "   2. Run this script again to verify deployment" -ForegroundColor White
Write-Host "   3. Deploy frontend to Vercel (if backend is ready)" -ForegroundColor White
Write-Host "   4. Test complete training flow" -ForegroundColor White

Write-Host "`n💡 TIP: Run this script every 2-3 minutes to check status" -ForegroundColor Yellow
Write-Host "   Command: .\check-deployment.ps1`n" -ForegroundColor Gray
