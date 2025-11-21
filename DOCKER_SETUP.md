# Docker Setup Guide

This guide will help you run the Medical Training Portal using Docker.

## Prerequisites

- **Docker Desktop installed and running** (⚠️ Make sure Docker Desktop is started before running commands)
- Docker Compose (included with Docker Desktop)

## Quick Start

### Option 1: Using the Helper Script (Recommended for Windows/PowerShell)

1. **Start Docker Desktop** - Make sure Docker Desktop is running (check system tray)

2. **Run the helper script**:
   ```powershell
   .\start-docker.ps1
   ```

### Option 2: Manual Setup

1. **Ensure Docker Desktop is running** - Check the Docker icon in your system tray
   - If not running, start Docker Desktop from Start menu
   - Wait for it to fully initialize (Docker icon should be steady, not animating)

2. **Create a `.env` file** in the root directory:
   ```powershell
   # In PowerShell, copy the example file:
   Copy-Item .env.example .env
   ```
   
   Or manually create `.env` with these variables:
   ```env
   # Database Configuration
   # IMPORTANT: Update DB_HOST to your existing MySQL container name or host
   # Options: container-name, host.docker.internal (Windows/Mac), or IP address
   DB_HOST=your-mysql-container-name
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=
   DB_NAME=training_portal

   # Backend Configuration
   BACKEND_PORT=5002
   JWT_SECRET_KEY=dev-secret-key-change-in-production
   RAGFLOW_BASE_URL=http://localhost:80
   RAGFLOW_API_KEY=
   OPENAI_API_KEY=

   # Frontend Configuration
   FRONTEND_PORT=3000
   VITE_API_URL=http://localhost:5002/api
   ```

3. **Build and start all services**:
   ```powershell
   docker-compose up --build
   ```
   
   **Note**: If you see warnings about "K" variable, you can ignore them - they're harmless PowerShell parsing warnings that don't affect functionality.

3. **Access the application**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5002
   - **Note**: This project uses an external MySQL database. See `EXTERNAL_MYSQL_SETUP.md` for configuration details.

## Important Notes

### API URL Configuration

The `VITE_API_URL` environment variable should point to where the backend is accessible **from your browser**, not from within Docker containers.

- **Local development**: Use `http://localhost:5002/api`
- **Production**: Use your server's domain/IP (e.g., `http://your-server.com:5002/api`)

### External MySQL Database

This project is configured to use an **external MySQL database** (from another Docker project or host machine). 

**Important**: Before starting, ensure:
1. Your MySQL database is running
2. The database `training_portal` exists (or update `DB_NAME` in `.env`)
3. `DB_HOST` in `.env` points to your MySQL container name or host

See `EXTERNAL_MYSQL_SETUP.md` for detailed configuration options.

### Stopping the Services

To stop all services:
```bash
docker-compose down
```

To stop and remove volumes (⚠️ this will delete your database data):
```bash
docker-compose down -v
```

## Individual Service Management

### Rebuild a specific service:
```bash
docker-compose build backend
docker-compose build frontend
```

### View logs:
```bash
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f db
```

### Access database:
Since MySQL is external, connect directly:
```bash
# If MySQL is in another container:
docker exec -it your-mysql-container-name mysql -u root -p

# If MySQL is on host:
mysql -u root -p -h localhost
```

### Run backend commands:
```bash
docker-compose exec backend python seed.py
```

## Troubleshooting

### Docker Desktop Not Running
If you see an error like `unable to get image` or `The system cannot find the file specified`:
1. **Start Docker Desktop** - Make sure Docker Desktop is running
   - Look for Docker icon in system tray (bottom right)
   - If not there, start Docker Desktop from Start menu
2. **Wait for Docker to fully start** - The Docker icon should be steady (not animating)
   - This can take 30-60 seconds after starting
3. **Verify Docker is running**:
   ```powershell
   docker ps
   ```
   - Should return container list (or empty list if no containers running)
   - If you get an error, Docker Desktop is not ready yet

### PowerShell Variable Warnings ("K" variable)
If you see warnings like `The "K" variable is not set`:
- **These warnings are harmless** - They're PowerShell trying to parse Docker Compose variables
- They don't affect functionality - Docker Compose handles variables correctly
- **Solution**: Ensure Docker Desktop is running first, then the warnings won't prevent containers from starting
- If warnings persist, make sure your `.env` file exists and has all required variables

### Port Already in Use
If you get port conflicts, change the ports in your `.env` file:
- `BACKEND_PORT=5001`
- `FRONTEND_PORT=3001`
- `DB_PORT=3307`

### Database Connection Issues
1. **Verify MySQL is running**: 
   ```bash
   docker ps | grep mysql
   # or if on host:
   mysqladmin ping -h localhost
   ```
2. **Check DB_HOST in `.env`** matches your MySQL container name or host
3. **Verify network connectivity**: Ensure backend container can reach MySQL
   ```bash
   docker compose exec backend ping your-mysql-host
   ```
4. **Check MySQL allows connections**: Ensure MySQL bind-address allows Docker connections
5. **Create database if needed**:
   ```sql
   CREATE DATABASE IF NOT EXISTS training_portal;
   ```

### Frontend Can't Connect to Backend
1. Check that `VITE_API_URL` in your `.env` matches where the backend is accessible
2. Ensure the backend container is running: `docker-compose ps`
3. Check backend logs: `docker-compose logs backend`

### Rebuild Everything from Scratch
```bash
docker-compose down -v
docker-compose build --no-cache
docker-compose up
```

## Production Considerations

For production deployment:

1. **Change default passwords** in `.env`
2. **Set a strong JWT_SECRET_KEY**
3. **Use HTTPS** - configure nginx with SSL certificates
4. **Update CORS settings** in `backend/app.py` to restrict origins
5. **Set proper database credentials**
6. **Use environment-specific `.env` files**

