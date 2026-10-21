# Test script for checking API endpoints
$baseUrl = "http://localhost:5001/api"

Write-Host "Testing Health Endpoint..." -ForegroundColor Cyan
try {
    $health = Invoke-RestMethod -Uri "$baseUrl/health" -Method Get
    Write-Host "✓ Health: $($health.status)" -ForegroundColor Green
} catch {
    Write-Host "✗ Health check failed: $_" -ForegroundColor Red
}

Write-Host "`nPlease provide your auth token to test protected endpoints:"
$token = Read-Host "Token"

if ($token) {
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }
    
    Write-Host "`nTesting Projects..." -ForegroundColor Cyan
    try {
        $projects = Invoke-RestMethod -Uri "$baseUrl/projects" -Method Get -Headers $headers
        Write-Host "✓ Projects: Found $($projects.projects.Count) projects" -ForegroundColor Green
        if ($projects.projects.Count -gt 0) {
            Write-Host "  First project: $($projects.projects[0].projectName)" -ForegroundColor Gray
        }
    } catch {
        Write-Host "✗ Projects failed: $_" -ForegroundColor Red
    }
    
    Write-Host "`nTesting Meetings..." -ForegroundColor Cyan
    try {
        $meetings = Invoke-RestMethod -Uri "$baseUrl/meetings" -Method Get -Headers $headers
        Write-Host "✓ Meetings: Found $($meetings.meetings.Count) meetings" -ForegroundColor Green
    } catch {
        Write-Host "✗ Meetings failed: $_" -ForegroundColor Red
    }
    
    Write-Host "`nTesting Check-in Status..." -ForegroundColor Cyan
    try {
        $status = Invoke-RestMethod -Uri "$baseUrl/attendance/status" -Method Get -Headers $headers
        Write-Host "✓ Check-in Status: isCheckedIn = $($status.isCheckedIn)" -ForegroundColor Green
    } catch {
        Write-Host "✗ Check-in status failed: $_" -ForegroundColor Red
    }
}

Write-Host "`nTest complete!" -ForegroundColor Cyan
