# Environment Configuration Guide

This project uses environment variables to configure all URLs and API endpoints. No hardcoded URLs should be used in the codebase.

## Environment Variables

### Frontend Variables (VITE_*)

These variables are used during the frontend build process and are baked into the JavaScript bundle.

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `VITE_API_URL` | Backend API base URL (must include `/api`) | `http://46.224.35.114:5000/api` | `http://46.224.35.114:5000/api` |
| `VITE_FRONTEND_URL` | Frontend application URL | `http://46.224.35.114:3000` | `http://46.224.35.114:3000` |
| `VITE_RAGFLOW_BASE_URL` | RAGFlow server base URL | `http://46.224.35.114:80` | `http://46.224.35.114:80` |

### Backend Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `FRONTEND_URL` | Frontend URL for CORS configuration | `http://46.224.35.114:3000` | `http://46.224.35.114:3000` |
| `CORS_ORIGINS` | Comma-separated list of allowed CORS origins | Empty (uses FRONTEND_URL) | `http://46.224.35.114:3000,http://46.224.35.114:3000` |
| `RAGFLOW_BASE_URL` | RAGFlow server base URL | `http://46.224.35.114:80` | `http://46.224.35.114:80` |
| `BACKEND_PORT` | Backend port (external) | `5000` | `5000` |
| `FRONTEND_PORT` | Frontend port (external) | `3000` | `3000` |

## Configuration Files

### `.env` File

Create a `.env` file in the root directory with your configuration:

```env
# Database Configuration
DB_HOST=db
DB_PORT=3307
DB_USER=root
DB_PASSWORD=
DB_NAME=training_portal

# Backend Configuration
BACKEND_PORT=5000
JWT_SECRET_KEY=your-secret-key
RAGFLOW_BASE_URL=http://46.224.35.114:80
RAGFLOW_API_KEY=your-ragflow-api-key
OPENAI_API_KEY=your-openai-api-key

# Frontend Configuration
FRONTEND_PORT=3000
FRONTEND_URL=http://46.224.35.114:3000
VITE_API_URL=http://46.224.35.114:5000/api
VITE_FRONTEND_URL=http://46.224.35.114:3000
VITE_RAGFLOW_BASE_URL=http://46.224.35.114:80

# CORS Configuration
CORS_ORIGINS=http://46.224.35.114:3000
```

### Production Example

```env
# Production Configuration
FRONTEND_URL=http://46.224.35.114:3000
VITE_API_URL=http://46.224.35.114:5000/api
VITE_FRONTEND_URL=http://46.224.35.114:3000
VITE_RAGFLOW_BASE_URL=http://46.224.35.114:80
CORS_ORIGINS=http://46.224.35.114:3000
```

## Using Configuration in Code

### Frontend

Import the config module:

```javascript
import { getApiUrl, getRagflowUrl, API_BASE_URL, FRONTEND_URL } from '../config';

// Use helper functions
const apiUrl = getApiUrl('/ragflow/chats/123');
const ragflowUrl = getRagflowUrl('/v1/document/image/456');

// Or use constants directly
const baseUrl = API_BASE_URL;
```

### Backend

Use environment variables directly:

```python
import os

frontend_url = os.getenv('FRONTEND_URL', 'http://46.224.35.114:3000')
ragflow_url = os.getenv('RAGFLOW_BASE_URL', 'http://46.224.35.114:80')
```

## Environment-Specific Configuration

### Development

```env
VITE_API_URL=http://46.224.35.114:5000/api
VITE_FRONTEND_URL=http://46.224.35.114:3000
VITE_RAGFLOW_BASE_URL=http://46.224.35.114:80
FRONTEND_URL=http://46.224.35.114:3000
```

### Production

```env
VITE_API_URL=http://46.224.35.114:5000/api
VITE_FRONTEND_URL=http://46.224.35.114:3000
VITE_RAGFLOW_BASE_URL=http://46.224.35.114:80
FRONTEND_URL=http://46.224.35.114:3000
CORS_ORIGINS=http://46.224.35.114:3000
```

## Important Notes

1. **Frontend variables** (`VITE_*`) are baked into the build at build time. You must rebuild the frontend if these change.

2. **Backend variables** are read at runtime. You can change them and restart the backend.

3. **No hardcoded URLs** should exist in the codebase. All URLs should come from environment variables.

4. **CORS configuration**: The backend automatically includes `FRONTEND_URL` in allowed origins. You can also specify additional origins in `CORS_ORIGINS`.

5. **API URL format**: `VITE_API_URL` should include the `/api` suffix (e.g., `http://46.224.35.114:5000/api`).

## Rebuilding After Changes

After changing frontend environment variables, rebuild:

```bash
docker compose build frontend
docker compose up -d frontend
```

After changing backend environment variables, restart:

```bash
docker compose restart backend
```



