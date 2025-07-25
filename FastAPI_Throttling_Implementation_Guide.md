# FastAPI User-Based Throttling Implementation Guide

## Table of Contents
1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Installation](#installation) 
4. [Basic Implementation](#basic-implementation)
5. [User-Based Throttling](#user-based-throttling)
6. [Configuration Options](#configuration-options)
7. [Database Integration](#database-integration)
8. [URL Exclusions](#url-exclusions)
9. [Monitoring & Management](#monitoring--management)
10. [Production Deployment](#production-deployment)
11. [Testing](#testing)
12. [Troubleshooting](#troubleshooting)

---

## Overview

This guide provides a complete solution for implementing **user-based throttling** in FastAPI using the **SlowAPI** library. The solution supports:

✅ **User identification** from JWT tokens and database tokens  
✅ **Configurable rate limits** per user or user role  
✅ **URL exclusions** with wildcard support  
✅ **Redis storage** for distributed systems  
✅ **Real-time configuration** updates  
✅ **Comprehensive monitoring** and metrics  

### Key Features

- **Multiple Authentication Methods**: JWT tokens, API keys, database tokens
- **Flexible Rate Limiting**: Per-user, per-IP, per-endpoint
- **Production Ready**: Redis backend, error handling, monitoring
- **Easy Integration**: Minimal changes to existing FastAPI applications

---

## Quick Start

### 1. Install Dependencies

```bash
pip install slowapi redis python-jose[cryptography] fastapi uvicorn
```

### 2. Basic Setup

```python
from fastapi import FastAPI, Request
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

# Create limiter
limiter = Limiter(key_func=get_remote_address, storage_uri="redis://localhost:6379")

# Create FastAPI app
app = FastAPI()
app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Apply rate limiting to endpoints
@app.get("/api/data")
@limiter.limit("100/minute")
async def get_data(request: Request):
    return {"data": "Hello World"}
```

### 3. Test It

```bash
# Start server
uvicorn main:app --reload

# Test endpoint
curl http://localhost:8000/api/data
```

---

## Installation

### Required Dependencies

Add to your `requirements.txt`:

```txt
fastapi>=0.68.0
slowapi>=0.1.9
redis>=4.0.0
python-jose[cryptography]>=3.3.0
passlib[bcrypt]>=1.7.4
python-multipart>=0.0.5
uvicorn[standard]>=0.15.0
```

### Install Command

```bash
pip install -r requirements.txt
```

### Redis Setup

**Option 1: Docker**
```bash
docker run -d -p 6379:6379 redis:alpine
```

**Option 2: Local Installation**
```bash
# Ubuntu/Debian
sudo apt install redis-server

# macOS
brew install redis
```

---

## Basic Implementation

### Step 1: Create the Throttling Service

Create `throttling_service.py`:

```python
import redis
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta

from fastapi import Request, HTTPException
from slowapi import Limiter
from slowapi.util import get_remote_address
from jose import JWTError, jwt

logger = logging.getLogger(__name__)

class ThrottlingConfig:
    def __init__(
        self,
        redis_url: str = "redis://localhost:6379",
        jwt_secret_key: str = "your-secret-key",
        default_rate_limit: str = "100/minute",
        excluded_paths: List[str] = None
    ):
        self.redis_url = redis_url
        self.jwt_secret_key = jwt_secret_key
        self.default_rate_limit = default_rate_limit
        self.excluded_paths = excluded_paths or ["/health", "/docs", "/openapi.json"]

class UserIdentificationService:
    def __init__(self, config: ThrottlingConfig, db_connection=None):
        self.config = config
        self.db = db_connection
        self.token_cache = {}

    async def get_user_id_from_jwt(self, token: str) -> Optional[str]:
        try:
            payload = jwt.decode(
                token, 
                self.config.jwt_secret_key, 
                algorithms=["HS256"]
            )
            return payload.get("sub") or payload.get("user_id")
        except JWTError:
            return None

    async def get_user_id_from_db_token(self, token: str) -> Optional[str]:
        if not self.db:
            return None
        
        try:
            query = "SELECT user_id FROM user_tokens WHERE token = $1 AND is_active = true"
            result = await self.db.fetchrow(query, token)
            return str(result["user_id"]) if result else None
        except Exception as e:
            logger.error(f"Database token lookup failed: {e}")
            return None

    async def get_user_id_from_request(self, request: Request) -> Optional[str]:
        # Try Authorization header (JWT)
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header[7:]
            user_id = await self.get_user_id_from_jwt(token)
            if user_id:
                return user_id
        
        # Try X-API-Key header (database token)
        api_key = request.headers.get("X-API-Key")
        if api_key:
            user_id = await self.get_user_id_from_db_token(api_key)
            if user_id:
                return user_id
        
        return None
```

### Step 2: Create Custom Limiter

```python
class CustomLimiter(Limiter):
    def __init__(self, config: ThrottlingConfig, user_service: UserIdentificationService):
        self.config = config
        self.user_service = user_service
        
        super().__init__(
            key_func=self._get_limiter_key,
            storage_uri=config.redis_url,
            default_limits=[config.default_rate_limit]
        )
    
    def _get_limiter_key(self, request: Request) -> str:
        # Skip excluded paths
        if self._should_exclude_path(request.url.path):
            return None
        
        # Get user ID
        import asyncio
        loop = asyncio.get_event_loop()
        user_id = loop.run_until_complete(
            self.user_service.get_user_id_from_request(request)
        )
        
        if user_id:
            return f"user:{user_id}"
        else:
            return f"ip:{get_remote_address(request)}"
    
    def _should_exclude_path(self, path: str) -> bool:
        for excluded_path in self.config.excluded_paths:
            if excluded_path.endswith("*"):
                if path.startswith(excluded_path[:-1]):
                    return True
            elif path == excluded_path:
                return True
        return False
```

### Step 3: Integrate with FastAPI

```python
from fastapi import FastAPI, Request
from slowapi.middleware import SlowAPIMiddleware
from slowapi.errors import RateLimitExceeded

# Configuration
config = ThrottlingConfig(
    redis_url="redis://localhost:6379",
    jwt_secret_key="your-jwt-secret-key",
    default_rate_limit="100/minute",
    excluded_paths=["/health", "/docs", "/openapi.json"]
)

# Create services
user_service = UserIdentificationService(config)
limiter = CustomLimiter(config, user_service)

# Create FastAPI app
app = FastAPI()
app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)

# Exception handler
@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return HTTPException(
        status_code=429,
        detail={
            "error": "Rate limit exceeded",
            "detail": str(exc.detail),
            "retry_after": 60
        }
    )

# Your endpoints
@app.get("/api/data")
async def get_data(request: Request):
    return {"message": "Success", "timestamp": datetime.now().isoformat()}
```

---

## User-Based Throttling

### JWT Token Authentication

#### Creating JWT Tokens

```python
from jose import jwt
from datetime import datetime, timedelta

def create_jwt_token(user_id: str, secret_key: str) -> str:
    payload = {
        "sub": user_id,
        "user_id": user_id,
        "exp": datetime.utcnow() + timedelta(hours=24)
    }
    return jwt.encode(payload, secret_key, algorithm="HS256")

# Usage
token = create_jwt_token("user123", "your-secret-key")
```

#### Using JWT Tokens

**Client Request:**
```bash
curl -H "Authorization: Bearer <jwt-token>" http://localhost:8000/api/data
```

**FastAPI Dependency:**
```python
from fastapi import Depends
from fastapi.security import HTTPBearer

security = HTTPBearer()

async def get_current_user(credentials = Depends(security)):
    token = credentials.credentials
    payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    return payload.get("user_id")

@app.get("/protected")
async def protected_endpoint(user_id = Depends(get_current_user)):
    return {"user_id": user_id}
```

### Database Token Authentication

#### Database Schema

```sql
CREATE TABLE user_tokens (
    id SERIAL PRIMARY KEY,
    token VARCHAR(255) UNIQUE NOT NULL,
    user_id INTEGER NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_tokens_token ON user_tokens(token);
CREATE INDEX idx_user_tokens_user_id ON user_tokens(user_id);
```

#### Using Database Tokens

**Client Request:**
```bash
curl -H "X-API-Key: your-api-token" http://localhost:8000/api/data
```

**Implementation:**
```python
async def get_user_from_db_token(token: str, db_connection):
    query = """
        SELECT user_id, expires_at 
        FROM user_tokens 
        WHERE token = $1 AND is_active = true
    """
    result = await db_connection.fetchrow(query, token)
    
    if result and result["expires_at"] > datetime.now():
        return str(result["user_id"])
    
    return None
```

### Different Rate Limits per User

```python
# User-specific rate limits
USER_RATE_LIMITS = {
    "premium_user": "1000/minute",
    "basic_user": "100/minute",
    "guest_user": "50/minute"
}

class UserBasedLimiter(Limiter):
    def get_user_rate_limit(self, user_id: str) -> str:
        # Get user role/type from database
        user_type = get_user_type(user_id)  # Implement this
        return USER_RATE_LIMITS.get(user_type, "100/minute")
```

---

## Configuration Options

### Environment Variables

Create `.env` file:

```env
# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your-redis-password

# JWT Configuration  
JWT_SECRET_KEY=your-super-secret-jwt-key-change-this-in-production
JWT_ALGORITHM=HS256

# Rate Limiting
DEFAULT_RATE_LIMIT=100/minute
MAX_RATE_LIMIT=1000/minute

# Database
DATABASE_URL=postgresql://user:password@localhost/dbname
```

### Configuration Class

```python
import os
from typing import List, Dict

class ThrottlingConfig:
    def __init__(self):
        self.redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
        self.jwt_secret_key = os.getenv("JWT_SECRET_KEY", "change-this-key")
        self.jwt_algorithm = os.getenv("JWT_ALGORITHM", "HS256")
        self.default_rate_limit = os.getenv("DEFAULT_RATE_LIMIT", "100/minute")
        
        # Parse excluded paths from environment
        excluded_paths_str = os.getenv("EXCLUDED_PATHS", "/health,/docs,/openapi.json")
        self.excluded_paths = [path.strip() for path in excluded_paths_str.split(",")]
        
        # User-specific rate limits (can be loaded from database)
        self.user_rate_limits: Dict[str, str] = {}

# Load configuration
config = ThrottlingConfig()
```

### Dynamic Configuration Updates

```python
@app.post("/admin/config/rate-limit")
async def update_user_rate_limit(user_id: str, rate_limit: str):
    """Update rate limit for specific user"""
    config.user_rate_limits[user_id] = rate_limit
    logger.info(f"Updated rate limit for user {user_id}: {rate_limit}")
    return {"message": f"Updated rate limit for {user_id}"}

@app.get("/admin/config")
async def get_config():
    """Get current configuration"""
    return {
        "default_rate_limit": config.default_rate_limit,
        "excluded_paths": config.excluded_paths,
        "user_rate_limits": config.user_rate_limits
    }
```

---

## Database Integration

### AsyncPG Example

```python
import asyncpg
from typing import Optional

class DatabaseService:
    def __init__(self, database_url: str):
        self.database_url = database_url
        self.pool = None
    
    async def connect(self):
        self.pool = await asyncpg.create_pool(self.database_url)
    
    async def get_user_by_token(self, token: str) -> Optional[dict]:
        async with self.pool.acquire() as connection:
            query = """
                SELECT u.id, u.username, u.rate_limit, t.expires_at
                FROM users u
                JOIN user_tokens t ON u.id = t.user_id
                WHERE t.token = $1 AND t.is_active = true
            """
            result = await connection.fetchrow(query, token)
            
            if result and result["expires_at"] > datetime.now():
                return {
                    "id": str(result["id"]),
                    "username": result["username"],
                    "rate_limit": result["rate_limit"] or "100/minute"
                }
            
            return None

# Integration
db_service = DatabaseService("postgresql://user:password@localhost/dbname")

@app.on_event("startup")
async def startup():
    await db_service.connect()
    user_service.db = db_service
```

### SQLAlchemy Example

```python
from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True)
    username = Column(String(50), unique=True)
    email = Column(String(100))
    rate_limit = Column(String(20), default="100/minute")
    is_active = Column(Boolean, default=True)

class UserToken(Base):
    __tablename__ = "user_tokens"
    
    id = Column(Integer, primary_key=True)
    token = Column(String(255), unique=True)
    user_id = Column(Integer)
    expires_at = Column(DateTime)
    is_active = Column(Boolean, default=True)

# Usage
async def get_user_by_token_sqlalchemy(token: str, session):
    result = session.query(User, UserToken).join(
        UserToken, User.id == UserToken.user_id
    ).filter(
        UserToken.token == token,
        UserToken.is_active == True,
        UserToken.expires_at > datetime.now()
    ).first()
    
    if result:
        user, token_obj = result
        return {
            "id": str(user.id),
            "username": user.username,
            "rate_limit": user.rate_limit
        }
    
    return None
```

---

## URL Exclusions

### Basic Path Exclusions

```python
config = ThrottlingConfig(
    excluded_paths=[
        "/health",           # Health checks
        "/metrics",          # Monitoring
        "/docs",             # API documentation
        "/openapi.json",     # OpenAPI schema
        "/favicon.ico",      # Browser requests
    ]
)
```

### Wildcard Exclusions

```python
config = ThrottlingConfig(
    excluded_paths=[
        "/static/*",         # All static files
        "/admin/*",          # Admin panel
        "/internal/*",       # Internal APIs
        "/webhooks/*",       # Webhook endpoints
    ]
)
```

### Advanced Exclusion Logic

```python
class AdvancedLimiter(Limiter):
    def _should_exclude_path(self, request: Request) -> bool:
        path = request.url.path
        
        # Standard exclusions
        if super()._should_exclude_path(path):
            return True
        
        # Exclude based on user agent
        user_agent = request.headers.get("User-Agent", "")
        if "HealthChecker" in user_agent or "Prometheus" in user_agent:
            return True
        
        # Exclude internal requests
        if request.headers.get("X-Internal-Request") == "true":
            return True
        
        # Exclude WebSocket upgrades
        if request.headers.get("Upgrade") == "websocket":
            return True
        
        # Exclude OPTIONS requests (CORS preflight)
        if request.method == "OPTIONS":
            return True
        
        return False
```

### Method-Based Exclusions

```python
EXCLUDED_METHODS = {"OPTIONS", "HEAD"}

def should_exclude_request(request: Request) -> bool:
    return request.method in EXCLUDED_METHODS
```

---

## Monitoring & Management

### Metrics Collection

```python
import time
from collections import defaultdict

class ThrottlingMetrics:
    def __init__(self):
        self.total_requests = 0
        self.throttled_requests = 0
        self.requests_by_user = defaultdict(int)
        self.requests_by_endpoint = defaultdict(int)
        self.throttle_events = []
    
    def record_request(self, user_id: str = None, endpoint: str = None):
        self.total_requests += 1
        if user_id:
            self.requests_by_user[user_id] += 1
        if endpoint:
            self.requests_by_endpoint[endpoint] += 1
    
    def record_throttle_event(self, user_id: str, endpoint: str, limit: str):
        self.throttled_requests += 1
        self.throttle_events.append({
            "timestamp": time.time(),
            "user_id": user_id,
            "endpoint": endpoint,
            "limit": limit
        })
        
        # Keep only last 1000 events
        if len(self.throttle_events) > 1000:
            self.throttle_events = self.throttle_events[-1000:]

# Global metrics instance
metrics = ThrottlingMetrics()

@app.get("/admin/metrics")
async def get_metrics():
    return {
        "total_requests": metrics.total_requests,
        "throttled_requests": metrics.throttled_requests,
        "throttle_rate": metrics.throttled_requests / max(1, metrics.total_requests),
        "top_users": dict(sorted(metrics.requests_by_user.items(), 
                                key=lambda x: x[1], reverse=True)[:10]),
        "top_endpoints": dict(sorted(metrics.requests_by_endpoint.items(), 
                                   key=lambda x: x[1], reverse=True)[:10]),
        "recent_throttle_events": metrics.throttle_events[-10:]
    }
```

### Health Checks

```python
@app.get("/health")
async def health_check():
    """Comprehensive health check including throttling service"""
    
    # Check Redis connection
    redis_status = "unknown"
    try:
        redis_client = redis.from_url(config.redis_url)
        redis_client.ping()
        redis_status = "connected"
        redis_client.close()
    except Exception:
        redis_status = "disconnected"
    
    # Check database connection
    db_status = "unknown"
    if user_service.db:
        try:
            await user_service.db.pool.fetchval("SELECT 1")
            db_status = "connected"
        except Exception:
            db_status = "disconnected"
    
    return {
        "status": "healthy" if redis_status == "connected" else "degraded",
        "timestamp": datetime.now().isoformat(),
        "services": {
            "redis": redis_status,
            "database": db_status
        },
        "throttling": {
            "total_requests": metrics.total_requests,
            "throttled_requests": metrics.throttled_requests,
            "active_users": len(metrics.requests_by_user)
        }
    }
```

### Logging Configuration

```python
import logging
import sys

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("throttling.log"),
        logging.StreamHandler(sys.stdout)
    ]
)

# Create throttling logger
throttling_logger = logging.getLogger("throttling")

# Custom logging in middleware
@app.middleware("http")
async def logging_middleware(request: Request, call_next):
    start_time = time.time()
    
    response = await call_next(request)
    
    process_time = time.time() - start_time
    
    # Log throttling events
    if response.status_code == 429:
        throttling_logger.warning(
            f"Rate limit exceeded - "
            f"Path: {request.url.path}, "
            f"IP: {request.client.host}, "
            f"User-Agent: {request.headers.get('User-Agent', 'Unknown')}"
        )
    
    # Log slow requests
    if process_time > 1.0:
        throttling_logger.info(
            f"Slow request - "
            f"Path: {request.url.path}, "
            f"Duration: {process_time:.2f}s"
        )
    
    return response
```

---

## Production Deployment

### Redis Configuration

**Redis Configuration File (`redis.conf`):**
```conf
# Memory optimization
maxmemory 256mb
maxmemory-policy allkeys-lru

# Persistence (optional for rate limiting)
save ""
appendonly no

# Network
bind 0.0.0.0
port 6379
requirepass your-strong-password

# Security
protected-mode yes
```

**Docker Compose:**
```yaml
version: '3.8'

services:
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
    command: redis-server --requirepass your-strong-password
    volumes:
      - redis_data:/data
    restart: unless-stopped

  fastapi:
    build: .
    ports:
      - "8000:8000"
    environment:
      - REDIS_URL=redis://:your-strong-password@redis:6379
      - JWT_SECRET_KEY=your-production-jwt-secret
    depends_on:
      - redis
    restart: unless-stopped

volumes:
  redis_data:
```

### Environment Configuration

**Production `.env`:**
```env
# Application
ENVIRONMENT=production
DEBUG=false

# Security
JWT_SECRET_KEY=your-super-secure-jwt-key-minimum-32-characters
ALLOWED_HOSTS=your-domain.com,api.your-domain.com

# Redis
REDIS_URL=redis://:password@redis-cluster:6379
REDIS_PASSWORD=your-strong-redis-password

# Rate Limiting
DEFAULT_RATE_LIMIT=1000/minute
BURST_RATE_LIMIT=100/minute
STRICT_MODE=true

# Database
DATABASE_URL=postgresql://user:password@db:5432/production_db

# Monitoring
SENTRY_DSN=your-sentry-dsn
LOG_LEVEL=INFO
```

### Load Balancer Configuration

**Nginx Configuration:**
```nginx
upstream fastapi_backend {
    server app1:8000;
    server app2:8000;
    server app3:8000;
}

server {
    listen 80;
    server_name api.yourdomain.com;

    # Rate limiting at nginx level (additional protection)
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    
    location / {
        limit_req zone=api burst=20 nodelay;
        
        proxy_pass http://fastapi_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Health check endpoint (no rate limiting)
    location /health {
        proxy_pass http://fastapi_backend;
        access_log off;
    }
}
```

### Performance Optimization

```python
# Redis connection pooling
import redis.asyncio as redis

redis_pool = redis.ConnectionPool.from_url(
    REDIS_URL,
    max_connections=20,
    retry_on_timeout=True,
    socket_keepalive=True,
    socket_keepalive_options={}
)

# Use connection pool in limiter
limiter = Limiter(
    key_func=get_limiter_key,
    storage_uri=REDIS_URL,
    storage_options={"connection_pool": redis_pool}
)

# Async database connection pooling
import asyncpg

async def create_db_pool():
    return await asyncpg.create_pool(
        DATABASE_URL,
        min_size=5,
        max_size=20,
        command_timeout=60
    )
```

---

## Testing

### Unit Tests

```python
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock

@pytest.fixture
def client():
    from main import app
    return TestClient(app)

@pytest.fixture
def jwt_token():
    return create_jwt_token("test_user", "test-secret-key")

def test_rate_limiting_basic(client):
    """Test basic IP-based rate limiting"""
    # Make requests up to the limit
    for i in range(5):  # Assuming limit is 5/minute for testing
        response = client.get("/api/data")
        assert response.status_code == 200
    
    # Next request should be rate limited
    response = client.get("/api/data")
    assert response.status_code == 429

def test_jwt_authentication(client, jwt_token):
    """Test JWT-based user identification"""
    headers = {"Authorization": f"Bearer {jwt_token}"}
    response = client.get("/api/data", headers=headers)
    assert response.status_code == 200

def test_api_key_authentication(client):
    """Test API key-based user identification"""
    headers = {"X-API-Key": "test-api-key"}
    response = client.get("/api/data", headers=headers)
    assert response.status_code == 200

def test_excluded_paths(client):
    """Test that excluded paths are not rate limited"""
    # Make many requests to health endpoint
    for i in range(100):
        response = client.get("/health")
        assert response.status_code == 200

@pytest.mark.asyncio
async def test_user_identification_service():
    """Test user identification from different token types"""
    config = ThrottlingConfig(jwt_secret_key="test-key")
    service = UserIdentificationService(config)
    
    # Test JWT token
    token = create_jwt_token("user123", "test-key")
    user_id = await service.get_user_id_from_jwt(token)
    assert user_id == "user123"
    
    # Test invalid JWT
    user_id = await service.get_user_id_from_jwt("invalid-token")
    assert user_id is None

@pytest.mark.asyncio
async def test_database_token_lookup():
    """Test database token lookup with mocked database"""
    config = ThrottlingConfig()
    
    # Mock database connection
    mock_db = AsyncMock()
    mock_db.fetchrow.return_value = {"user_id": 123}
    
    service = UserIdentificationService(config, mock_db)
    user_id = await service.get_user_id_from_db_token("test-token")
    
    assert user_id == "123"
    mock_db.fetchrow.assert_called_once()
```

### Integration Tests

```python
import asyncio
import aiohttp
import pytest

@pytest.mark.asyncio
async def test_concurrent_requests():
    """Test rate limiting under concurrent load"""
    
    async def make_request(session, url):
        async with session.get(url) as response:
            return response.status
    
    url = "http://localhost:8000/api/data"
    
    async with aiohttp.ClientSession() as session:
        # Make 50 concurrent requests
        tasks = [make_request(session, url) for _ in range(50)]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Count successful vs rate-limited requests
        success_count = sum(1 for status in results if status == 200)
        throttled_count = sum(1 for status in results if status == 429)
        
        # Should have some successful requests and some throttled
        assert success_count > 0
        assert throttled_count > 0
        assert success_count + throttled_count == 50

@pytest.mark.asyncio 
async def test_user_specific_limits():
    """Test different rate limits for different users"""
    
    premium_token = create_jwt_token("premium_user", "test-key")
    basic_token = create_jwt_token("basic_user", "test-key")
    
    headers_premium = {"Authorization": f"Bearer {premium_token}"}
    headers_basic = {"Authorization": f"Bearer {basic_token}"}
    
    async with aiohttp.ClientSession() as session:
        # Premium user should have higher limits
        premium_requests = []
        for i in range(20):
            async with session.get(
                "http://localhost:8000/api/data", 
                headers=headers_premium
            ) as response:
                premium_requests.append(response.status)
        
        # Basic user should hit limits sooner
        basic_requests = []
        for i in range(20):
            async with session.get(
                "http://localhost:8000/api/data", 
                headers=headers_basic
            ) as response:
                basic_requests.append(response.status)
        
        # Premium user should have more successful requests
        premium_success = sum(1 for status in premium_requests if status == 200)
        basic_success = sum(1 for status in basic_requests if status == 200)
        
        assert premium_success > basic_success
```

### Load Testing

```python
# load_test.py
import asyncio
import aiohttp
import time
import statistics

async def load_test():
    """Comprehensive load test for the throttling system"""
    
    url = "http://localhost:8000/api/data"
    total_requests = 1000
    concurrent_requests = 50
    
    results = {
        "response_times": [],
        "status_codes": [],
        "errors": 0
    }
    
    async def make_request(session, request_id):
        start_time = time.time()
        try:
            async with session.get(url) as response:
                end_time = time.time()
                results["response_times"].append(end_time - start_time)
                results["status_codes"].append(response.status)
                return response.status
        except Exception as e:
            results["errors"] += 1
            return None
    
    async with aiohttp.ClientSession() as session:
        start_time = time.time()
        
        # Create semaphore to limit concurrent requests
        semaphore = asyncio.Semaphore(concurrent_requests)
        
        async def bounded_request(request_id):
            async with semaphore:
                return await make_request(session, request_id)
        
        # Execute all requests
        tasks = [bounded_request(i) for i in range(total_requests)]
        await asyncio.gather(*tasks)
        
        end_time = time.time()
    
    # Analyze results
    total_time = end_time - start_time
    successful_requests = sum(1 for status in results["status_codes"] if status == 200)
    throttled_requests = sum(1 for status in results["status_codes"] if status == 429)
    
    print(f"Load Test Results:")
    print(f"Total Time: {total_time:.2f} seconds")
    print(f"Total Requests: {total_requests}")
    print(f"Successful Requests: {successful_requests}")
    print(f"Throttled Requests: {throttled_requests}")
    print(f"Error Count: {results['errors']}")
    print(f"Requests/Second: {total_requests / total_time:.2f}")
    
    if results["response_times"]:
        print(f"Average Response Time: {statistics.mean(results['response_times']):.3f}s")
        print(f"95th Percentile Response Time: {statistics.quantiles(results['response_times'], n=20)[18]:.3f}s")

if __name__ == "__main__":
    asyncio.run(load_test())
```

---

## Troubleshooting

### Common Issues and Solutions

#### Issue 1: Rate limits not working

**Symptoms:**
- Requests never get rate limited
- All requests return 200 OK

**Solutions:**
```python
# Check Redis connection
import redis
try:
    r = redis.from_url("redis://localhost:6379")
    r.ping()
    print("Redis connected")
except redis.ConnectionError:
    print("Redis connection failed")

# Verify limiter configuration
print(f"Storage URI: {limiter.storage_uri}")
print(f"Default limits: {limiter.default_limits}")

# Check if paths are being excluded
def debug_exclusion(path: str):
    limiter_instance = app.state.limiter
    excluded = limiter_instance._should_exclude_path(path)
    print(f"Path '{path}' excluded: {excluded}")

debug_exclusion("/api/data")
```

#### Issue 2: User identification not working

**Symptoms:**
- All requests treated as IP-based
- User-specific limits not applied

**Solutions:**
```python
# Debug JWT token parsing
async def debug_jwt_token(token: str):
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=["HS256"])
        print(f"JWT payload: {payload}")
        user_id = payload.get("sub") or payload.get("user_id")
        print(f"Extracted user ID: {user_id}")
        return user_id
    except JWTError as e:
        print(f"JWT decode error: {e}")
        return None

# Test user identification service
async def debug_user_identification(request: Request):
    user_service = app.state.user_service
    user_id = await user_service.get_user_id_from_request(request)
    print(f"Identified user: {user_id}")
```

#### Issue 3: Database connection issues

**Symptoms:**
- Database token lookup fails
- Errors in logs about database connections

**Solutions:**
```python
# Test database connection
async def test_db_connection():
    try:
        if user_service.db:
            result = await user_service.db.fetchval("SELECT 1")
            print(f"Database connection OK: {result}")
        else:
            print("Database not configured")
    except Exception as e:
        print(f"Database connection error: {e}")

# Add connection retry logic
async def robust_db_query(query: str, *args):
    max_retries = 3
    for attempt in range(max_retries):
        try:
            return await user_service.db.fetchrow(query, *args)
        except Exception as e:
            if attempt == max_retries - 1:
                raise
            await asyncio.sleep(0.1 * (2 ** attempt))  # Exponential backoff
```

#### Issue 4: Redis memory issues

**Symptoms:**
- Redis runs out of memory
- Rate limiting becomes inconsistent

**Solutions:**
```python
# Monitor Redis memory usage
def check_redis_memory():
    r = redis.from_url(REDIS_URL)
    info = r.info('memory')
    print(f"Used memory: {info['used_memory_human']}")
    print(f"Max memory: {info.get('maxmemory_human', 'unlimited')}")
    
    # Check keyspace
    keyspace = r.info('keyspace')
    print(f"Keyspace: {keyspace}")

# Implement key cleanup
async def cleanup_old_keys():
    r = redis.from_url(REDIS_URL)
    
    # Find all rate limit keys
    keys = r.keys("user:*")
    keys.extend(r.keys("ip:*"))
    
    # Remove empty or very old keys
    current_time = time.time()
    for key in keys:
        # Check if key has any recent activity
        score_range = r.zrangebyscore(key, current_time - 3600, current_time)
        if not score_range:
            r.delete(key)
            print(f"Cleaned up old key: {key}")
```

#### Issue 5: Performance issues

**Symptoms:**
- Slow response times
- High CPU usage
- Request timeouts

**Solutions:**
```python
# Add request timing middleware
@app.middleware("http")
async def timing_middleware(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    
    # Log slow requests
    if process_time > 0.5:  # 500ms threshold
        logger.warning(f"Slow request: {request.url.path} took {process_time:.2f}s")
    
    response.headers["X-Process-Time"] = str(process_time)
    return response

# Optimize Redis operations
class OptimizedLimiter(Limiter):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Use connection pooling
        self.redis_pool = redis.ConnectionPool.from_url(
            self.storage_uri,
            max_connections=20
        )
    
    async def check_rate_limit_optimized(self, key: str, limit: str):
        # Use pipeline for atomic operations
        r = redis.Redis(connection_pool=self.redis_pool)
        pipe = r.pipeline()
        
        # Parse limit (e.g., "100/minute")
        count, period = limit.split("/")
        count = int(count)
        
        window_seconds = {"second": 1, "minute": 60, "hour": 3600}[period]
        current_time = time.time()
        window_start = current_time - window_seconds
        
        # Remove old entries and count current ones atomically
        pipe.zremrangebyscore(key, 0, window_start)
        pipe.zcard(key)
        pipe.zadd(key, {str(current_time): current_time})
        pipe.expire(key, window_seconds)
        
        results = pipe.execute()
        current_count = results[1]
        
        return current_count < count
```

### Debug Endpoints

```python
@app.get("/debug/throttle/info")
async def debug_throttle_info(request: Request):
    """Debug endpoint to check throttling status"""
    
    # Get user identification
    user_id = await user_service.get_user_id_from_request(request)
    ip_address = get_remote_address(request)
    
    # Check current rate limit status
    if user_id:
        key = f"user:{user_id}"
        rate_limit = USER_RATE_LIMITS.get(user_id, "100/minute")
    else:
        key = f"ip:{ip_address}"
        rate_limit = "100/minute"
    
    # Get current count from Redis
    r = redis.from_url(REDIS_URL)
    current_count = r.zcard(key)
    
    return {
        "user_id": user_id,
        "ip_address": ip_address,
        "rate_limit_key": key,
        "rate_limit": rate_limit,
        "current_count": current_count,
        "headers": dict(request.headers),
        "excluded": limiter._should_exclude_path(request.url.path)
    }

@app.get("/debug/redis/keys")
async def debug_redis_keys():
    """Debug endpoint to see current Redis keys"""
    r = redis.from_url(REDIS_URL)
    
    user_keys = r.keys("user:*")
    ip_keys = r.keys("ip:*")
    
    result = {
        "total_keys": len(user_keys) + len(ip_keys),
        "user_keys": [key.decode() for key in user_keys[:10]],  # Show first 10
        "ip_keys": [key.decode() for key in ip_keys[:10]]
    }
    
    return result
```

---

## Best Practices

### Security Considerations

1. **JWT Secret Management:**
```python
# Use strong, randomly generated secrets
import secrets
JWT_SECRET_KEY = secrets.token_urlsafe(32)

# Rotate secrets regularly
# Store in environment variables or secret management systems
```

2. **Rate Limit Headers:**
```python
# Add informative headers
response.headers["X-RateLimit-Limit"] = str(rate_limit)
response.headers["X-RateLimit-Remaining"] = str(remaining)
response.headers["X-RateLimit-Reset"] = str(reset_time)
```

3. **Input Validation:**
```python
def validate_rate_limit_format(rate_limit: str) -> bool:
    """Validate rate limit format (e.g., '100/minute')"""
    import re
    pattern = r'^\d+/(second|minute|hour|day)$'
    return bool(re.match(pattern, rate_limit))
```

### Performance Optimization

1. **Connection Pooling:**
```python
# Redis connection pooling
redis_pool = redis.ConnectionPool.from_url(REDIS_URL, max_connections=20)

# Database connection pooling
db_pool = await asyncpg.create_pool(DATABASE_URL, min_size=5, max_size=20)
```

2. **Caching:**
```python
from functools import lru_cache

@lru_cache(maxsize=1000)
def get_user_rate_limit(user_id: str) -> str:
    """Cache user rate limits to avoid database lookups"""
    return USER_RATE_LIMITS.get(user_id, "100/minute")
```

3. **Monitoring:**
```python
# Use monitoring tools
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration

sentry_sdk.init(
    dsn="your-sentry-dsn",
    integrations=[FastApiIntegration()]
)
```

---

## Conclusion

This comprehensive throttling solution provides:

✅ **User-based throttling** with JWT and database token support  
✅ **Flexible configuration** with environment variables  
✅ **URL exclusions** with wildcard support  
✅ **Production-ready** Redis backend  
✅ **Real-time monitoring** and metrics  
✅ **Comprehensive testing** framework  
✅ **Detailed troubleshooting** guide  

### Quick Implementation Checklist

- [ ] Install dependencies (`slowapi`, `redis`, `python-jose`)
- [ ] Set up Redis server
- [ ] Configure JWT secret key
- [ ] Implement user identification service
- [ ] Add throttling middleware to FastAPI app
- [ ] Configure excluded paths
- [ ] Set up monitoring endpoints
- [ ] Add comprehensive tests
- [ ] Deploy with proper Redis configuration

### Next Steps

1. **Customize** user identification logic for your authentication system
2. **Configure** rate limits based on your user tiers/roles  
3. **Set up** monitoring and alerting for throttling events
4. **Test** thoroughly under realistic load conditions
5. **Deploy** with proper Redis clustering for production scale

The solution is designed to be **non-intrusive** and **production-ready**, requiring minimal changes to your existing FastAPI application while providing comprehensive throttling capabilities.