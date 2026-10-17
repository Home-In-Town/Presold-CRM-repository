# Restart Local Development Environment
Write-Host "=== Restarting PreSold CRM Local Dev Environment ===" -ForegroundColor Cyan

# Step 1: Kill all Node processes
Write-Host "`n[1/5] Stopping all Node processes..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2
Write-Host "✓ All Node processes stopped" -ForegroundColor Green

# Step 2: Navigate to server and regenerate Prisma
Write-Host "`n[2/5] Regenerating Prisma Client..." -ForegroundColor Yellow
Set-Location "C:\Users\HP\Desktop\Presold-CRM-repository-main\server"
npm exec prisma generate
Write-Host "✓ Prisma Client regenerated" -ForegroundColor Green

# Step 3: Push schema to database
Write-Host "`n[3/5] Pushing schema to database..." -ForegroundColor Yellow
npm exec prisma db push --skip-generate
Write-Host "✓ Schema pushed to database" -ForegroundColor Green

# Step 4: Start backend server
Write-Host "`n[4/5] Starting backend server..." -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Gray
npm run dev
