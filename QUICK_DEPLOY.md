# Quick Deployment Guide

## TL;DR - Deploy to Remote Server

### 1. Transfer Files to Server

**Option A: Using Git (Recommended)**
```bash
# On server
git clone https://github.com/your-repo/medical-training-portal.git
cd medical-training-portal
```

**Option B: Using SCP**
```bash
# On local machine
tar --exclude='node_modules' --exclude='venv' --exclude='.git' --exclude='.env' -czf deploy.tar.gz .
scp deploy.tar.gz user@server:/home/user/
# On server: tar -xzf deploy.tar.gz
```

### 2. Set Up Environment

```bash
# On server
cd medical-training-portal
cp .env.example .env
nano .env  # Edit with your production values
```

**Critical values to update:**
- `DB_PASSWORD`: Set a secure password (or leave empty if you prefer)
- `JWT_SECRET_KEY`: Generate with `openssl rand -hex 32`
- `VITE_API_URL`: Your server's public IP/domain (e.g., `http://123.45.67.89:5002/api`)

### 3. Install Docker (if needed)

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
# Log out and back in
```

### 4. Deploy

```bash
# Build and start
docker compose up -d --build

# Check status
docker compose ps

# View logs
docker compose logs -f
```

### 5. Configure Firewall

```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp     # HTTP
sudo ufw allow 443/tcp    # HTTPS
sudo ufw allow 5002/tcp   # Backend API
sudo ufw enable
```

### 6. Access Your Application

- **Frontend**: `http://your-server-ip:3000`
- **Backend API**: `http://your-server-ip:5002/api`

## Important Notes

1. **Update VITE_API_URL**: The frontend needs to know where the backend is accessible from the browser. Update this in `.env` to your server's public IP or domain.

2. **Security**: 
   - Change default passwords
   - Use strong JWT_SECRET_KEY
   - Consider setting up HTTPS/SSL

3. **Production Mode**: Use `docker-compose.prod.yml` for production:
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
   ```

## Common Commands

```bash
# Start services
docker compose up -d

# Stop services
docker compose down

# View logs
docker compose logs -f

# Rebuild after changes
docker compose up -d --build

# Access database
docker compose exec db mysql -u root training_portal

# Backup database
docker compose exec db mysqldump -u root training_portal > backup.sql
```

For detailed instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md)

