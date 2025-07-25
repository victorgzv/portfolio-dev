# FastAPI Throttling Implementation Guide

## Table of Contents
1. [Overview](#overview)
2. [Installation Requirements](#installation-requirements)
3. [Basic Implementation](#basic-implementation)
4. [Advanced Configuration](#advanced-configuration)
5. [Storage Options](#storage-options)
6. [URL Exclusions](#url-exclusions)
7. [Dynamic Configuration](#dynamic-configuration)
8. [Monitoring and Management](#monitoring-and-management)
9. [Production Considerations](#production-considerations)
10. [Troubleshooting](#troubleshooting)

## Overview

This guide provides a complete solution for implementing request throttling (rate limiting) in your existing FastAPI application. The solution includes:

- **Configurable rate limits**: Set different limits for different scenarios
- **URL exclusions**: Exclude specific endpoints from throttling
- **Multiple storage backends**: In-memory and Redis support
- **Dynamic configuration**: Update throttling rules without restarting
- **User-based throttling**: Different limits per user/IP
- **Comprehensive monitoring**: Built-in logging and metrics

## Installation Requirements

Add these dependencies to your `requirements.txt`:

```txt
fastapi>=0.68.0
redis>=4.0.0
asyncio-redis>=1.13.0
```

Install the dependencies:
```bash
pip install fastapi redis asyncio-redis
```

## Basic Implementation

### Step 1: Add the Throttling Module

Create a file called `throttling.py` in your project with the throttling implementation (provided separately).

### Step 2: Basic Integration

Here's how to integrate throttling into your existing FastAPI app:

```python
# main.py or your main FastAPI file
from fastapi import FastAPI, Request
from fastapi.middleware.base import BaseHTTPMiddleware
from throttling import create_basic_throttle, ThrottleConfig, ThrottleMiddleware

app = FastAPI()

# Basic throttling: 100 requests per minute
basic_throttle = create_basic_throttle(
    max_requests=100,
    window_seconds=60,
    excluded_paths=["/health", "/metrics", "/docs", "/openapi.json"]
)

# Add the middleware to your app
app.middleware("http")(basic_throttle)

# Your existing routes
@app.get("/")
async def root():
    return {"message": "Hello World"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
```

### Step 3: Test Your Implementation

Start your FastAPI server and test the throttling:

```bash
# Start your server
uvicorn main:app --reload

# Test with curl (run this command multiple times quickly)
curl -i http://localhost:8000/

# After 100 requests in a minute, you should see:
# HTTP/1.1 429 Too Many Requests
```

## Advanced Configuration

### Multiple Throttling Rules

```python
from throttling import ConfigurableThrottleManager, ThrottleConfig

# Create a throttle manager
throttle_manager = ConfigurableThrottleManager()

# Add different configurations
throttle_manager.add_config("api_endpoints", ThrottleConfig(
    max_requests=100,
    window_seconds=60,
    excluded_paths={"/health", "/metrics"}
))

throttle_manager.add_config("heavy_operations", ThrottleConfig(
    max_requests=10,
    window_seconds=60,
    excluded_paths={"/health"}
))

# Apply to your app
app.middleware("http")(throttle_manager.get_middleware("api_endpoints"))
```

### User-Based Throttling

```python
from throttling import create_user_based_throttle

# Custom key function for user identification
def get_user_key(request: Request) -> str:
    # Example: Extract from JWT token
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header[7:]
        # Decode JWT and extract user_id (implement your JWT logic)
        user_id = extract_user_id_from_jwt(token)
        return f"user:{user_id}"
    
    # Fallback to IP-based throttling
    return f"ip:{request.client.host}"

# Create user-based throttle
user_throttle = ThrottleMiddleware(
    config=ThrottleConfig(
        max_requests=1000,
        window_seconds=3600,  # 1 hour
        excluded_paths={"/health", "/docs"},
        key_func=get_user_key
    )
)

app.middleware("http")(user_throttle)
```

### Endpoint-Specific Throttling

```python
from throttling import create_endpoint_specific_throttle

# Define different limits for different endpoints
endpoint_limits = {
    "/api/upload": {"max_requests": 5, "window_seconds": 60},
    "/api/search": {"max_requests": 100, "window_seconds": 60},
    "/api/export": {"max_requests": 3, "window_seconds": 300},
}

endpoint_throttle = create_endpoint_specific_throttle(
    endpoint_limits=endpoint_limits,
    default_max_requests=50,
    default_window_seconds=60
)

app.middleware("http")(endpoint_throttle)
```

## Storage Options

### In-Memory Storage (Default)

Good for single-instance applications:

```python
from throttling import InMemoryThrottleStorage, ThrottleMiddleware, ThrottleConfig

storage = InMemoryThrottleStorage()
config = ThrottleConfig(max_requests=100, window_seconds=60)
throttle = ThrottleMiddleware(config, storage=storage)
```

### Redis Storage (Recommended for Production)

For distributed applications or persistence:

```python
from throttling import RedisThrottleStorage, ThrottleMiddleware, ThrottleConfig

# Redis storage
redis_storage = RedisThrottleStorage(redis_url="redis://localhost:6379")

config = ThrottleConfig(max_requests=100, window_seconds=60)
throttle = ThrottleMiddleware(config, storage=redis_storage)
```

### Redis Cluster Configuration

```python
redis_storage = RedisThrottleStorage(
    redis_url="redis://redis-cluster:6379",
    # Additional Redis options can be passed here
)
```

## URL Exclusions

### Basic Path Exclusions

```python
config = ThrottleConfig(
    max_requests=100,
    window_seconds=60,
    excluded_paths={
        "/health",
        "/metrics", 
        "/docs",
        "/openapi.json",
        "/favicon.ico"
    }
)
```

### Wildcard Exclusions

```python
config = ThrottleConfig(
    max_requests=100,
    window_seconds=60,
    excluded_paths={
        "/static/*",     # Exclude all static files
        "/admin/*",      # Exclude admin panel
        "/internal/*",   # Exclude internal APIs
    }
)
```

### Method-Based Exclusions

```python
config = ThrottleConfig(
    max_requests=100,
    window_seconds=60,
    excluded_methods={"OPTIONS", "HEAD"},  # Exclude preflight requests
    excluded_paths={"/health"}
)
```

### Complex Exclusion Logic

```python
def custom_exclusion_check(request: Request) -> bool:
    # Custom logic for exclusions
    path = request.url.path
    
    # Exclude based on user agent
    user_agent = request.headers.get("User-Agent", "")
    if "HealthChecker" in user_agent:
        return True
    
    # Exclude based on custom headers
    if request.headers.get("X-Internal-Request") == "true":
        return True
    
    # Exclude WebSocket upgrades
    if request.headers.get("Upgrade") == "websocket":
        return True
    
    return False

# Apply custom exclusion logic
class CustomThrottleMiddleware(ThrottleMiddleware):
    def _should_exclude_request(self, request: Request) -> bool:
        # First check standard exclusions
        if super()._should_exclude_request(request):
            return True
        
        # Then check custom exclusions
        return custom_exclusion_check(request)
```

## Dynamic Configuration

### Runtime Configuration Updates

```python
from fastapi import FastAPI
from throttling import ConfigurableThrottleManager

app = FastAPI()
throttle_manager = ConfigurableThrottleManager()

# Initial configuration
throttle_manager.add_config("default", ThrottleConfig(
    max_requests=100,
    window_seconds=60
))

# Admin endpoint to update throttling
@app.post("/admin/throttle/update")
async def update_throttle_config(
    config_name: str,
    max_requests: int,
    window_seconds: int,
    excluded_paths: List[str] = None
):
    """Update throttling configuration at runtime"""
    try:
        throttle_manager.update_config(
            config_name,
            max_requests=max_requests,
            window_seconds=window_seconds,
            excluded_paths=set(excluded_paths or [])
        )
        return {"status": "success", "message": f"Updated config {config_name}"}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

# Endpoint to view current configurations
@app.get("/admin/throttle/configs")
async def get_throttle_configs():
    """Get current throttling configurations"""
    return throttle_manager.list_configs()
```

### Configuration from Environment Variables

```python
import os
from throttling import ThrottleConfig

def create_config_from_env():
    return ThrottleConfig(
        max_requests=int(os.getenv("THROTTLE_MAX_REQUESTS", "100")),
        window_seconds=int(os.getenv("THROTTLE_WINDOW_SECONDS", "60")),
        excluded_paths=set(
            os.getenv("THROTTLE_EXCLUDED_PATHS", "/health,/metrics").split(",")
        )
    )

config = create_config_from_env()
```

### Configuration from Database

```python
async def load_config_from_db():
    """Load throttling configuration from database"""
    # Your database query logic here
    db_config = await db.fetch_one("SELECT * FROM throttle_config WHERE active = true")
    
    return ThrottleConfig(
        max_requests=db_config["max_requests"],
        window_seconds=db_config["window_seconds"],
        excluded_paths=set(db_config["excluded_paths"].split(","))
    )

# Periodic config refresh
import asyncio

async def refresh_config_periodically():
    while True:
        try:
            new_config = await load_config_from_db()
            throttle_manager.update_config("default", **new_config.__dict__)
        except Exception as e:
            logger.error(f"Failed to refresh config: {e}")
        
        await asyncio.sleep(300)  # Refresh every 5 minutes

# Start the refresh task
asyncio.create_task(refresh_config_periodically())
```

## Monitoring and Management

### Adding Metrics Collection

```python
import time
from collections import defaultdict
from fastapi import Request

class MonitoredThrottleMiddleware(ThrottleMiddleware):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.metrics = {
            "total_requests": 0,
            "throttled_requests": 0,
            "requests_by_key": defaultdict(int),
            "throttle_events_by_key": defaultdict(int)
        }
    
    async def __call__(self, request: Request, call_next):
        self.metrics["total_requests"] += 1
        throttle_key = self.config.key_func(request)
        self.metrics["requests_by_key"][throttle_key] += 1
        
        # Check if request would be throttled
        current_time = time.time()
        window_start = current_time - self.config.window_seconds
        request_count = await self.storage.get_request_count(throttle_key, window_start)
        
        if request_count >= self.config.max_requests:
            self.metrics["throttled_requests"] += 1
            self.metrics["throttle_events_by_key"][throttle_key] += 1
        
        return await super().__call__(request, call_next)

# Metrics endpoint
@app.get("/admin/throttle/metrics")
async def get_throttle_metrics():
    """Get throttling metrics"""
    return throttle_middleware.metrics
```

### Logging Configuration

```python
import logging

# Configure throttling logger
logging.basicConfig(level=logging.INFO)
throttle_logger = logging.getLogger("throttling")

# Custom log format for throttling events
formatter = logging.Formatter(
    '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# File handler for throttling logs
file_handler = logging.FileHandler('throttling.log')
file_handler.setFormatter(formatter)
throttle_logger.addHandler(file_handler)
```

### Health Check Integration

```python
@app.get("/health")
async def health_check():
    """Health check endpoint with throttling status"""
    # Check if Redis is available (if using Redis storage)
    redis_status = "unknown"
    if isinstance(throttle_middleware.storage, RedisThrottleStorage):
        try:
            await throttle_middleware.storage.connect()
            redis_status = "connected"
        except Exception:
            redis_status = "disconnected"
    
    return {
        "status": "healthy",
        "throttling": {
            "storage_type": type(throttle_middleware.storage).__name__,
            "redis_status": redis_status,
            "config": {
                "max_requests": throttle_middleware.config.max_requests,
                "window_seconds": throttle_middleware.config.window_seconds
            }
        }
    }
```

## Production Considerations

### Performance Optimization

```python
# Use Redis with connection pooling
import redis.asyncio as redis

redis_pool = redis.ConnectionPool.from_url("redis://localhost:6379", max_connections=20)
redis_storage = RedisThrottleStorage(redis_pool=redis_pool)
```

### Error Handling

```python
class RobustThrottleMiddleware(ThrottleMiddleware):
    async def __call__(self, request: Request, call_next):
        try:
            return await super().__call__(request, call_next)
        except Exception as e:
            # Log the error but don't block the request
            logger.error(f"Throttling error: {e}")
            # Allow request to proceed if throttling fails
            return await call_next(request)
```

### Load Balancer Considerations

When using multiple application instances behind a load balancer:

```python
# Use Redis storage for shared state
redis_storage = RedisThrottleStorage("redis://redis-cluster:6379")

# Consider using consistent hashing for user-based throttling
def consistent_user_key(request: Request) -> str:
    user_id = extract_user_id(request)
    # Hash to ensure same user always hits same throttle bucket
    import hashlib
    hash_key = hashlib.md5(f"user:{user_id}".encode()).hexdigest()
    return f"user:{hash_key}"
```

### Security Considerations

```python
# Rate limit by IP and user separately
def security_key_func(request: Request) -> str:
    ip = request.client.host
    user_id = extract_user_id(request)
    
    # More restrictive limits for unauthenticated users
    if not user_id:
        return f"ip:{ip}"
    
    return f"user:{user_id}"

# Add security headers
class SecurityThrottleMiddleware(ThrottleMiddleware):
    async def __call__(self, request: Request, call_next):
        response = await super().__call__(request, call_next)
        
        # Add security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        
        return response
```

## Troubleshooting

### Common Issues and Solutions

#### Issue 1: Memory Usage Growing Over Time
**Problem**: In-memory storage accumulating old request data.

**Solution**: Implement periodic cleanup:
```python
import asyncio

async def cleanup_old_requests():
    """Periodic cleanup of old request data"""
    while True:
        try:
            cutoff_time = time.time() - 3600  # Clean requests older than 1 hour
            await throttle_middleware.storage.cleanup_old_requests(cutoff_time)
        except Exception as e:
            logger.error(f"Cleanup error: {e}")
        
        await asyncio.sleep(300)  # Run every 5 minutes

# Start cleanup task
asyncio.create_task(cleanup_old_requests())
```

#### Issue 2: Redis Connection Failures
**Problem**: Application fails when Redis is unavailable.

**Solution**: Implement fallback storage:
```python
class FallbackThrottleStorage:
    def __init__(self, primary_storage, fallback_storage):
        self.primary = primary_storage
        self.fallback = fallback_storage
    
    async def add_request(self, key: str, timestamp: float):
        try:
            await self.primary.add_request(key, timestamp)
        except Exception:
            await self.fallback.add_request(key, timestamp)
    
    async def get_request_count(self, key: str, window_start: float) -> int:
        try:
            return await self.primary.get_request_count(key, window_start)
        except Exception:
            return await self.fallback.get_request_count(key, window_start)

# Usage
fallback_storage = FallbackThrottleStorage(
    primary_storage=RedisThrottleStorage(),
    fallback_storage=InMemoryThrottleStorage()
)
```

#### Issue 3: Different Limits for Different User Types
**Problem**: Need different throttling rules for different user roles.

**Solution**: Implement role-based throttling:
```python
def role_based_key_func(request: Request) -> str:
    user_role = extract_user_role(request)  # Implement this function
    user_id = extract_user_id(request)
    
    if user_role == "premium":
        return f"premium:{user_id}"
    elif user_role == "admin":
        return f"admin:{user_id}"
    else:
        return f"basic:{user_id}"

# Different configs for different roles
role_configs = {
    "premium": ThrottleConfig(max_requests=1000, window_seconds=60),
    "admin": ThrottleConfig(max_requests=10000, window_seconds=60),
    "basic": ThrottleConfig(max_requests=100, window_seconds=60)
}

class RoleBasedThrottleMiddleware(ThrottleMiddleware):
    def __init__(self, role_configs, storage=None):
        self.role_configs = role_configs
        self.storage = storage or InMemoryThrottleStorage()
    
    async def __call__(self, request: Request, call_next):
        user_role = extract_user_role(request)
        config = self.role_configs.get(user_role, self.role_configs["basic"])
        
        # Create temporary middleware with role-specific config
        temp_middleware = ThrottleMiddleware(config, self.storage)
        return await temp_middleware(request, call_next)
```

### Debugging Tips

1. **Enable Debug Logging**:
```python
import logging
logging.getLogger("throttling").setLevel(logging.DEBUG)
```

2. **Add Request Tracing**:
```python
import uuid

class TracingThrottleMiddleware(ThrottleMiddleware):
    async def __call__(self, request: Request, call_next):
        trace_id = str(uuid.uuid4())[:8]
        logger.info(f"[{trace_id}] Processing request: {request.method} {request.url.path}")
        
        response = await super().__call__(request, call_next)
        
        logger.info(f"[{trace_id}] Request completed with status: {response.status_code}")
        return response
```

3. **Monitor Key Distribution**:
```python
@app.get("/admin/throttle/keys")
async def get_throttle_keys():
    """Debug endpoint to see current throttle keys"""
    if isinstance(throttle_middleware.storage, InMemoryThrottleStorage):
        return {
            "keys": list(throttle_middleware.storage.requests.keys()),
            "key_counts": {
                k: len(v) for k, v in throttle_middleware.storage.requests.items()
            }
        }
    return {"message": "Only available with InMemoryThrottleStorage"}
```

## Testing Your Implementation

### Unit Tests

```python
import pytest
from fastapi.testclient import TestClient
from throttling import create_basic_throttle

def test_throttling():
    # Create test app with throttling
    from fastapi import FastAPI
    
    app = FastAPI()
    app.middleware("http")(create_basic_throttle(max_requests=2, window_seconds=60))
    
    @app.get("/test")
    async def test_endpoint():
        return {"message": "success"}
    
    client = TestClient(app)
    
    # First two requests should succeed
    response1 = client.get("/test")
    assert response1.status_code == 200
    
    response2 = client.get("/test")
    assert response2.status_code == 200
    
    # Third request should be throttled
    response3 = client.get("/test")
    assert response3.status_code == 429
```

### Load Testing

```python
# load_test.py
import asyncio
import aiohttp
import time

async def make_request(session, url):
    async with session.get(url) as response:
        return response.status

async def load_test():
    url = "http://localhost:8000/test"
    concurrent_requests = 50
    total_requests = 1000
    
    async with aiohttp.ClientSession() as session:
        start_time = time.time()
        
        tasks = []
        for i in range(total_requests):
            if len(tasks) >= concurrent_requests:
                # Wait for some tasks to complete
                done, tasks = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
            
            task = asyncio.create_task(make_request(session, url))
            tasks.append(task)
        
        # Wait for remaining tasks
        results = await asyncio.gather(*tasks)
        
        end_time = time.time()
        
        success_count = sum(1 for status in results if status == 200)
        throttled_count = sum(1 for status in results if status == 429)
        
        print(f"Load test completed in {end_time - start_time:.2f} seconds")
        print(f"Successful requests: {success_count}")
        print(f"Throttled requests: {throttled_count}")
        print(f"Total requests: {len(results)}")

if __name__ == "__main__":
    asyncio.run(load_test())
```

---

## Conclusion

This comprehensive throttling solution provides:

- ✅ **Configurable rate limits** with flexible time windows
- ✅ **URL exclusions** with wildcard support
- ✅ **Multiple storage backends** (in-memory and Redis)
- ✅ **Dynamic configuration** updates without restarts
- ✅ **User and IP-based throttling** with custom key functions
- ✅ **Production-ready features** including monitoring and error handling
- ✅ **Comprehensive testing** and debugging capabilities

The implementation is designed to be:
- **Non-intrusive**: Minimal changes to your existing FastAPI code
- **Performant**: Efficient storage and lookup mechanisms
- **Scalable**: Support for distributed deployments with Redis
- **Maintainable**: Clean separation of concerns and extensive configuration options

Start with the basic implementation and gradually add more advanced features as needed for your specific use case.