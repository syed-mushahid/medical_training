# Remote Server Deployment Guide

This guide will help you deploy the Medical Training Portal to a remote server using Docker.

## Prerequisites

- Remote server with SSH access
- Docker and Docker Compose installed on the server
- Domain name (optional but recommended)
- Basic knowledge of Linux commands

## Step 1: Prepare Your Project

### 1.1 Ensure All Files Are Ready

Make sure you have:
- `docker-compose.yml`
- `backend/Dockerfile`
- `frontend/Dockerfile`
- `frontend/nginx.conf`
- `.env.example` (as a template)

### 1.2 Create Production Environment File

Create a `.env.production` file locally with production values:

```env
# Database Configuration
DB_HOST=db
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your-secure-password-here
DB_NAME=training_portal

# Backend Configuration
BACKEND_PORT=5000
JWT_SECRET_KEY=your-very-secure-random-secret-key-here
RAGFLOW_BASE_URL=http://your-ragflow-server:80
RAGFLOW_API_KEY=your-ragflow-api-key
OPENAI_API_KEY=your-openai-api-key

# Frontend Configuration
FRONTEND_PORT=80
VITE_API_URL=http://your-server-ip-or-domain:5000/api
```

**Important Security Notes:**
- Use strong, unique passwords
- Generate a secure JWT_SECRET_KEY (you can use: `openssl rand -hex 32`)
- Never commit `.env` files to version control

## Step 2: Transfer Files to Server

### Option A: Using SCP (Secure Copy)

```bash
# From your local machine, compress the project (excluding unnecessary files)
# Create a deployment package
tar --exclude='node_modules' \
    --exclude='venv' \
    --exclude='__pycache__' \
    --exclude='.git' \
    --exclude='.env' \
    -czf medical-portal-deploy.tar.gz .

# Transfer to server
scp medical-portal-deploy.tar.gz user@your-server-ip:/home/user/

# SSH into server
ssh user@your-server-ip

# Extract on server
cd /home/user
mkdir medical-portal
cd medical-portal
tar -xzf ../medical-portal-deploy.tar.gz
```

### Option B: Using Git (Recommended)

```bash
# On your local machine, ensure .env is in .gitignore
# Push to Git repository (GitHub, GitLab, etc.)

# On remote server
ssh user@your-server-ip
cd /home/user
git clone https://github.com/your-username/medical-training-portal.git
cd medical-training-portal
```

### Option C: Using rsync

```bash
# From your local machine
rsync -avz --exclude 'node_modules' \
           --exclude 'venv' \
           --exclude '__pycache__' \
           --exclude '.git' \
           --exclude '.env' \
           ./ user@your-server-ip:/home/user/medical-portal/
```

## Step 3: Set Up Environment on Server

### 3.1 Create Production .env File

```bash
# On the server
cd /home/user/medical-portal  # or wherever you extracted/cloned

# Copy example file
cp .env.example .env

# Edit with your production values
nano .env
# or
vim .env
```

**Update these critical values:**
- `DB_PASSWORD`: Strong password for MySQL
- `JWT_SECRET_KEY`: Generate with `openssl rand -hex 32`
- `VITE_API_URL`: Your server's public IP or domain (e.g., `http://yourdomain.com:5000/api` or `http://123.45.67.89:5000/api`)
- `RAGFLOW_BASE_URL`: Your RAGFlow server URL
- `OPENAI_API_KEY`: Your OpenAI API key
- `RAGFLOW_API_KEY`: Your RAGFlow API key

### 3.2 Update Frontend API URL

The frontend needs to know where the backend is accessible from the browser. Update `VITE_API_URL` in `.env`:

```env
# If using IP address:
VITE_API_URL=http://your-server-ip:5000/api

# If using domain name:
VITE_API_URL=http://yourdomain.com:5000/api

# If using HTTPS (recommended for production):
VITE_API_URL=https://api.yourdomain.com/api
```

## Step 4: Install Docker on Server (if not installed)

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt install docker-compose-plugin -y
# or for older versions:
# sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
# sudo chmod +x /usr/local/bin/docker-compose

# Add your user to docker group (to run without sudo)
sudo usermod -aG docker $USER
# Log out and back in for this to take effect

# Verify installation
docker --version
docker compose version
```

## Step 5: Configure Firewall

```bash
# Allow SSH (if not already allowed)
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow backend port (if accessing directly)
sudo ufw allow 5000/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

## Step 6: Build and Start Containers

```bash
# Navigate to project directory
cd /home/user/medical-portal

# Build and start all services
docker compose up -d --build

# Check status
docker compose ps

# View logs
docker compose logs -f
```

## Step 7: Verify Deployment

### Check Services

```bash
# Check all containers are running
docker compose ps

# Check backend logs
docker compose logs backend

# Check database logs
docker compose logs db

# Check frontend logs
docker compose logs frontend
```

### Test Access

- **Frontend**: `http://your-server-ip:3000` or `http://yourdomain.com`
- **Backend API**: `http://your-server-ip:5000/api` or `http://yourdomain.com:5000/api`

## Step 8: Production Optimizations

### 8.1 Update docker-compose.yml for Production

Create a `docker-compose.prod.yml` file:

```yaml
services:
  backend:
    # Remove volume mount for production (use code baked into image)
    # volumes:
    #   - ./backend:/app
    environment:
      FLASK_ENV: production
      FLASK_DEBUG: "false"
    
  frontend:
    # Frontend is already production-ready (built static files)
```

Then run:
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### 8.2 Set Up Reverse Proxy (Nginx) - Recommended

Install Nginx on the server:

```bash
sudo apt install nginx -y
```

Create `/etc/nginx/sites-available/medical-portal`:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/medical-portal /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

Update `.env`:
```env
VITE_API_URL=http://yourdomain.com/api
FRONTEND_PORT=3000  # Keep internal, Nginx handles external
```

### 8.3 Set Up SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com

# Auto-renewal is set up automatically
```

After SSL, update `.env`:
```env
VITE_API_URL=https://yourdomain.com/api
```

## Step 9: Maintenance Commands

### View Logs
```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f db
docker compose logs -f frontend
```

### Restart Services
```bash
# Restart all
docker compose restart

# Restart specific service
docker compose restart backend
```

### Update Application
```bash
# Pull latest code
git pull  # if using Git

# Rebuild and restart
docker compose up -d --build

# Or rebuild specific service
docker compose build backend
docker compose up -d backend
```

### Backup Database
```bash
# Create backup
docker compose exec db mysqldump -u root training_portal > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
docker compose exec -T db mysql -u root training_portal < backup_file.sql
```

### Stop Services
```bash
# Stop all
docker compose down

# Stop and remove volumes (⚠️ deletes database)
docker compose down -v
```

## Step 10: Monitoring and Troubleshooting

### Check Resource Usage
```bash
docker stats
```

### Access Database
```bash
docker compose exec db mysql -u root training_portal
```

### Access Backend Container
```bash
docker compose exec backend bash
```

### Common Issues

**Port Already in Use:**
```bash
# Check what's using the port
sudo netstat -tulpn | grep :5000
# Kill the process or change port in .env
```

**Database Connection Issues:**
```bash
# Check database is running
docker compose ps db
# Check database logs
docker compose logs db
# Test connection
docker compose exec db mysqladmin ping -h localhost -u root
```

**Frontend Can't Connect to Backend:**
- Verify `VITE_API_URL` in `.env` matches where backend is accessible
- Check CORS settings in `backend/app.py`
- Verify firewall rules allow traffic

## Security Checklist

- [ ] Changed all default passwords
- [ ] Set strong JWT_SECRET_KEY
- [ ] Updated CORS settings in backend for production
- [ ] Set up firewall rules
- [ ] Using HTTPS (SSL certificate)
- [ ] `.env` file has correct permissions (chmod 600)
- [ ] Database backups are configured
- [ ] Regular security updates: `sudo apt update && sudo apt upgrade`

## Quick Reference

```bash
# Start services
docker compose up -d

# Stop services
docker compose down

# View logs
docker compose logs -f

# Rebuild after code changes
docker compose up -d --build

# Check status
docker compose ps

# Access database
docker compose exec db mysql -u root training_portal

# Backup database
docker compose exec db mysqldump -u root training_portal > backup.sql
```

## Support

For issues, check:
1. Container logs: `docker compose logs`
2. Container status: `docker compose ps`
3. Server resources: `docker stats`
4. Network connectivity: `docker network ls`

