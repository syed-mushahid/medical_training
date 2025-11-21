# PowerShell script to start Docker containers
# This script checks if Docker is running and starts the services

Write-Host "Checking Docker Desktop status..." -ForegroundColor Cyan

# Check if Docker is running
try {
    $dockerInfo = docker info 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Docker Desktop is running" -ForegroundColor Green
    } else {
        Write-Host "✗ Docker Desktop is not running!" -ForegroundColor Red
        Write-Host "Please start Docker Desktop and wait for it to fully initialize, then run this script again." -ForegroundColor Yellow
        Write-Host "You can start Docker Desktop from the Start menu or system tray." -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host "✗ Docker Desktop is not running!" -ForegroundColor Red
    Write-Host "Please start Docker Desktop and wait for it to fully initialize, then run this script again." -ForegroundColor Yellow
    exit 1
}

# Check if .env file exists
if (-not (Test-Path .env)) {
    Write-Host "⚠ .env file not found!" -ForegroundColor Yellow
    Write-Host "Creating .env from .env.example..." -ForegroundColor Cyan
    if (Test-Path .env.example) {
        Copy-Item .env.example .env
        Write-Host "✓ .env file created. Please review and update it if needed." -ForegroundColor Green
    } else {
        Write-Host "✗ .env.example file not found!" -ForegroundColor Red
        Write-Host "Please create a .env file with the required environment variables." -ForegroundColor Yellow
        exit 1
    }
} else {
    Write-Host "✓ .env file found" -ForegroundColor Green
}

Write-Host "`nStarting Docker containers..." -ForegroundColor Cyan
Write-Host "This may take a few minutes on the first run..." -ForegroundColor Yellow
Write-Host ""

# Run docker-compose
docker-compose up --build

