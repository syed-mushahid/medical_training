#!/bin/bash
# Deployment script for Medical Training Portal
# Usage: ./deploy.sh [production|staging]

set -e

ENVIRONMENT=${1:-production}
COMPOSE_FILE="docker-compose.yml"

echo "🚀 Deploying Medical Training Portal ($ENVIRONMENT environment)"

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please create .env file from .env.example"
    exit 1
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running!"
    exit 1
fi

# Load production overrides if production
if [ "$ENVIRONMENT" = "production" ] && [ -f "docker-compose.prod.yml" ]; then
    COMPOSE_FILE="-f docker-compose.yml -f docker-compose.prod.yml"
    echo "📦 Using production configuration"
fi

echo "🔨 Building and starting containers..."
docker compose $COMPOSE_FILE up -d --build

echo "⏳ Waiting for services to be healthy..."
sleep 10

echo "📊 Checking service status..."
docker compose ps

echo "📝 Recent logs:"
docker compose logs --tail=50

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Services should be available at:"
echo "  - Frontend: http://localhost:${FRONTEND_PORT:-3000}"
echo "  - Backend: http://localhost:${BACKEND_PORT:-5000}"
echo ""
echo "To view logs: docker compose logs -f"
echo "To stop: docker compose down"

