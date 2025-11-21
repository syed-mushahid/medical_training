# Using External MySQL Database

This project is configured to use an existing MySQL container/database instead of creating a new one.

## Configuration Options

### Option 1: MySQL Container in Another Docker Compose Project

If your MySQL is running in another docker-compose project:

**Step 1: Find your MySQL container name**
```bash
docker ps | grep mysql
```

**Step 2: Connect to the same Docker network**

Update `docker-compose.yml` to connect to the external network:

```yaml
services:
  backend:
    # ... other config ...
    networks:
      - training-portal-network
      - external-mysql-network  # Add this line

networks:
  training-portal-network:
    driver: bridge
  external-mysql-network:
    external: true
    name: your-mysql-network-name  # Replace with actual network name
```

**Step 3: Update `.env` file**
```env
DB_HOST=your-mysql-container-name  # e.g., mysql, db, mysqldb
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your-password
DB_NAME=training_portal
```

**To find the network name:**
```bash
docker inspect your-mysql-container-name | grep NetworkMode
# or
docker network ls
docker inspect your-mysql-container-name | grep -A 10 Networks
```

### Option 2: MySQL Container on Same Docker Network

If both projects are on the same Docker network:

**Step 1: Update `.env` file**
```env
DB_HOST=your-mysql-container-name  # The container name from other project
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your-password
DB_NAME=training_portal
```

**Step 2: Connect backend to the same network**

Add to `docker-compose.yml`:
```yaml
services:
  backend:
    networks:
      - training-portal-network
      - existing-mysql-network  # The network your MySQL is on

networks:
  training-portal-network:
    driver: bridge
  existing-mysql-network:
    external: true
    name: your-existing-network-name
```

### Option 3: MySQL on Host Machine (Not in Docker)

If MySQL is running directly on your host machine:

**Windows/Mac:**
```env
DB_HOST=host.docker.internal
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your-password
DB_NAME=training_portal
```

**Linux:**
```env
DB_HOST=172.17.0.1  # Docker bridge gateway IP
# or use host network mode
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your-password
DB_NAME=training_portal
```

And add to `docker-compose.yml`:
```yaml
services:
  backend:
    extra_hosts:
      - "host.docker.internal:host-gateway"
```

### Option 4: MySQL Container Name (Simplest)

If you know the exact container name:

**Step 1: Find container name**
```bash
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"
```

**Step 2: Update `.env`**
```env
DB_HOST=your-mysql-container-name  # e.g., mysql_db_1, mysqldb, etc.
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your-password
DB_NAME=training_portal
```

**Step 3: Ensure both containers are on the same network**

If they're not, connect them:
```bash
# Find MySQL container's network
docker inspect your-mysql-container-name | grep -A 5 Networks

# Connect backend to that network (after starting backend)
docker network connect your-mysql-network-name training-portal-backend
```

Or update `docker-compose.yml` to use the external network (see Option 1).

## Quick Setup Guide

### 1. Identify Your MySQL Setup

Run this to see your MySQL container:
```bash
docker ps | grep -i mysql
```

Note the container name and check its network:
```bash
docker inspect <container-name> | grep -A 10 Networks
```

### 2. Update `.env` File

```env
# Database Configuration
DB_HOST=your-mysql-container-name-or-host
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your-password-or-empty
DB_NAME=training_portal
```

### 3. Create Database (if needed)

Connect to your MySQL and create the database:
```bash
# If MySQL is in a container
docker exec -it your-mysql-container-name mysql -u root -p

# Then run:
CREATE DATABASE IF NOT EXISTS training_portal;
EXIT;
```

### 4. Update docker-compose.yml (if needed)

If your MySQL is on a different network, add network configuration (see options above).

### 5. Start Services

```bash
docker compose up -d --build
```

### 6. Verify Connection

Check backend logs:
```bash
docker compose logs backend
```

You should see successful database connection messages.

## Troubleshooting

### Connection Refused

**Check MySQL is running:**
```bash
docker ps | grep mysql
```

**Test connection from backend container:**
```bash
docker compose exec backend ping your-mysql-host
docker compose exec backend nc -zv your-mysql-host 3306
```

### Network Issues

**List all networks:**
```bash
docker network ls
```

**Inspect MySQL container network:**
```bash
docker inspect your-mysql-container-name | grep -A 20 Networks
```

**Connect backend to MySQL's network:**
```bash
docker network connect your-mysql-network-name training-portal-backend
```

### Authentication Issues

**Test MySQL connection manually:**
```bash
# From backend container
docker compose exec backend bash
# Inside container:
mysql -h your-mysql-host -u root -p
```

**Check MySQL user permissions:**
```sql
-- In MySQL
SELECT user, host FROM mysql.user;
-- Ensure root@'%' exists or create it:
CREATE USER 'root'@'%' IDENTIFIED BY '';
GRANT ALL PRIVILEGES ON *.* TO 'root'@'%';
FLUSH PRIVILEGES;
```

## Common Scenarios

### Scenario 1: MySQL in Another Compose Project

**Project A (MySQL):**
```yaml
services:
  mysql:
    image: mysql:8.0
    container_name: shared-mysql
    networks:
      - shared-network
```

**This Project:**
```yaml
services:
  backend:
    networks:
      - training-portal-network
      - shared-network

networks:
  training-portal-network:
    driver: bridge
  shared-network:
    external: true
    name: project-a_shared-network
```

`.env`:
```env
DB_HOST=shared-mysql
```

### Scenario 2: MySQL on Host Machine

`.env`:
```env
DB_HOST=host.docker.internal  # Windows/Mac
# or
DB_HOST=172.17.0.1  # Linux
```

`docker-compose.yml` already includes `extra_hosts` for this.

### Scenario 3: MySQL Container Name Known

`.env`:
```env
DB_HOST=mysql_db_1  # Your actual container name
```

Ensure both containers can communicate (same network or network bridge).

## Notes

- The MySQL service has been removed from `docker-compose.yml`
- No database volume is created in this project
- Database must be created manually if it doesn't exist
- Ensure MySQL allows connections from Docker containers (check bind-address in MySQL config)

