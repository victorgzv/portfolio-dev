"""
Example FastAPI application with user-based throttling
Shows integration with JWT tokens and database tokens
"""

import os
from datetime import datetime, timedelta
from typing import Optional, List

from fastapi import FastAPI, Request, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from jose import JWTError, jwt
import asyncpg

from throttling_service import (
    ThrottlingManager, 
    ThrottlingConfig, 
    create_throttling_manager,
    custom_rate_limit_handler
)

# Configuration
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-super-secret-jwt-key-change-this-in-production")
JWT_ALGORITHM = "HS256"
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost/dbname")

# Initialize FastAPI app
app = FastAPI(
    title="FastAPI with User-Based Throttling",
    description="Example app showing throttling based on user ID from JWT or database tokens",
    version="1.0.0"
)

# Database connection (example with asyncpg)
db_pool = None

async def get_db_connection():
    global db_pool
    if not db_pool:
        db_pool = await asyncpg.create_pool(DATABASE_URL)
    return db_pool

# Create throttling manager
throttling_manager = create_throttling_manager(
    redis_url=REDIS_URL,
    jwt_secret_key=JWT_SECRET_KEY,
    default_rate_limit="100/minute",
    excluded_paths=["/health", "/docs", "/openapi.json", "/favicon.ico", "/admin/throttle/*"],
    db_connection=None  # Will be set after database connection is established
)

# Initialize slowapi limiter for direct use
limiter = Limiter(key_func=get_remote_address, storage_uri=REDIS_URL)
app.state.limiter = limiter

# Add slowapi middleware
app.add_middleware(SlowAPIMiddleware)

# Add custom rate limit exception handler
app.add_exception_handler(RateLimitExceeded, custom_rate_limit_handler)

# Security
security = HTTPBearer(auto_error=False)

# Example user data (in production, this would be in your database)
USERS_DB = {
    "user1": {
        "id": "user1",
        "username": "john_doe",
        "email": "john@example.com",
        "rate_limit": "200/minute",  # Premium user
        "is_active": True
    },
    "user2": {
        "id": "user2", 
        "username": "jane_smith",
        "email": "jane@example.com", 
        "rate_limit": "50/minute",   # Basic user
        "is_active": True
    }
}

# Example API tokens in database
API_TOKENS_DB = {
    "api_token_123": {
        "user_id": "user1",
        "expires_at": datetime.now() + timedelta(days=30),
        "is_active": True
    },
    "api_token_456": {
        "user_id": "user2", 
        "expires_at": datetime.now() + timedelta(days=7),
        "is_active": True
    }
}

# Startup event
@app.on_event("startup")
async def startup_event():
    """Initialize database connection and set up throttling"""
    global throttling_manager
    
    try:
        # Initialize database connection
        db_conn = await get_db_connection()
        
        # Update throttling manager with database connection
        throttling_manager.user_service.db = db_conn
        
        # Set user-specific rate limits
        for user_id, user_data in USERS_DB.items():
            throttling_manager.update_user_rate_limit(user_id, user_data["rate_limit"])
        
        print("✅ Throttling service initialized successfully")
        
    except Exception as e:
        print(f"❌ Failed to initialize services: {e}")

# Utility functions
def create_jwt_token(user_id: str) -> str:
    """Create JWT token for user"""
    payload = {
        "sub": user_id,
        "user_id": user_id,
        "exp": datetime.utcnow() + timedelta(hours=24)
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

async def get_current_user_from_jwt(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Optional[dict]:
    """Get current user from JWT token"""
    if not credentials:
        return None
    
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub") or payload.get("user_id")
        if user_id and user_id in USERS_DB:
            return USERS_DB[user_id]
    except JWTError:
        pass
    
    return None

async def get_user_from_api_token(request: Request) -> Optional[dict]:
    """Get user from API token in headers"""
    api_key = request.headers.get("X-API-Key")
    if api_key and api_key in API_TOKENS_DB:
        token_data = API_TOKENS_DB[api_key]
        if token_data["is_active"] and token_data["expires_at"] > datetime.now():
            user_id = token_data["user_id"]
            if user_id in USERS_DB:
                return USERS_DB[user_id]
    
    return None

# Health check endpoint (excluded from throttling)
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "throttling": {
            "redis_connected": True,  # You can add actual Redis health check here
            "total_requests": throttling_manager.get_metrics()["total_requests"]
        }
    }

# Authentication endpoints
@app.post("/auth/login")
@limiter.limit("5/minute")  # Limit login attempts
async def login(request: Request, username: str, password: str):
    """Login endpoint to get JWT token"""
    # Simple authentication (in production, verify password hash)
    user = None
    for user_data in USERS_DB.values():
        if user_data["username"] == username and user_data["is_active"]:
            user = user_data
            break
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    # Create JWT token
    access_token = create_jwt_token(user["id"])
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": user["id"],
        "rate_limit": user["rate_limit"]
    }

# Protected endpoints with user-based throttling
@app.get("/api/profile")
async def get_profile(request: Request, user: dict = Depends(get_current_user_from_jwt)):
    """Get user profile (user-based throttling applied via middleware)"""
    if not user:
        # Try API token
        user = await get_user_from_api_token(request)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required"
            )
    
    return {
        "user_id": user["id"],
        "username": user["username"],
        "email": user["email"],
        "rate_limit": user["rate_limit"]
    }

@app.get("/api/data")
async def get_data(request: Request):
    """Get some data (throttled based on user or IP)"""
    # Throttling is handled by middleware based on JWT token or API key
    return {
        "data": "Some important data",
        "timestamp": datetime.now().isoformat(),
        "message": "This endpoint is throttled based on user authentication"
    }

@app.post("/api/upload")
@limiter.limit("10/minute")  # More restrictive limit for uploads
async def upload_file(request: Request):
    """File upload endpoint with stricter limits"""
    return {
        "message": "File uploaded successfully",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/api/search")
async def search(request: Request, query: str):
    """Search endpoint with user-based throttling"""
    return {
        "query": query,
        "results": ["result1", "result2", "result3"],
        "timestamp": datetime.now().isoformat()
    }

# Public endpoints (IP-based throttling only)
@app.get("/public/info")
@limiter.limit("50/minute")  # IP-based limit for public endpoint
async def public_info(request: Request):
    """Public endpoint with IP-based throttling only"""
    return {
        "info": "This is public information",
        "timestamp": datetime.now().isoformat(),
        "note": "This endpoint uses IP-based throttling"
    }

# Admin endpoints for throttling management
@app.get("/admin/throttle/metrics")
async def get_throttling_metrics():
    """Get current throttling metrics"""
    return throttling_manager.get_metrics()

@app.post("/admin/throttle/user/{user_id}/limit")
async def update_user_rate_limit(user_id: str, rate_limit: str):
    """Update rate limit for specific user"""
    if user_id not in USERS_DB:
        raise HTTPException(status_code=404, detail="User not found")
    
    try:
        throttling_manager.update_user_rate_limit(user_id, rate_limit)
        USERS_DB[user_id]["rate_limit"] = rate_limit  # Update in-memory store
        return {
            "message": f"Updated rate limit for user {user_id}",
            "new_limit": rate_limit
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/admin/throttle/config")
async def get_throttling_config():
    """Get current throttling configuration"""
    return {
        "default_rate_limit": throttling_manager.config.default_rate_limit,
        "excluded_paths": throttling_manager.config.excluded_paths,
        "user_rate_limits": throttling_manager.config.user_rate_limits,
        "redis_url": throttling_manager.config.redis_url.replace("redis://", "redis://***:***@"),  # Hide credentials
    }

@app.post("/admin/throttle/exclude-path")
async def add_excluded_path(path: str):
    """Add path to exclusion list"""
    throttling_manager.add_excluded_path(path)
    return {"message": f"Added excluded path: {path}"}

@app.delete("/admin/throttle/exclude-path")
async def remove_excluded_path(path: str):
    """Remove path from exclusion list"""
    throttling_manager.remove_excluded_path(path)
    return {"message": f"Removed excluded path: {path}"}

# Middleware for user-based throttling
@app.middleware("http")
async def throttling_middleware(request: Request, call_next):
    """Custom middleware for user-based throttling using slowapi"""
    
    # Skip excluded paths
    if any(request.url.path.startswith(excluded) for excluded in ["/health", "/docs", "/openapi.json", "/favicon.ico"]):
        return await call_next(request)
    
    # Try to identify user
    user_id = None
    
    # Check JWT token first
    auth_header = request.headers.get("authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header[7:]
        try:
            payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
            user_id = payload.get("sub") or payload.get("user_id")
        except JWTError:
            pass
    
    # Check API key if no JWT
    if not user_id:
        api_key = request.headers.get("X-API-Key")
        if api_key and api_key in API_TOKENS_DB:
            token_data = API_TOKENS_DB[api_key]
            if token_data["is_active"] and token_data["expires_at"] > datetime.now():
                user_id = token_data["user_id"]
    
    # Apply user-specific rate limiting
    if user_id and user_id in USERS_DB:
        user_rate_limit = USERS_DB[user_id]["rate_limit"]
        
        # Create a custom key for slowapi
        def user_key_func(req: Request):
            return f"user:{user_id}"
        
        # Apply rate limit
        try:
            # Use slowapi's limiter with custom key
            original_key_func = limiter.key_func
            limiter.key_func = user_key_func
            
            # Check rate limit before proceeding
            await limiter.check_request_limit(request, user_rate_limit)
            
            # Restore original key function
            limiter.key_func = original_key_func
            
        except RateLimitExceeded as e:
            # Restore original key function
            limiter.key_func = original_key_func
            raise HTTPException(
                status_code=429,
                detail={
                    "error": "Rate limit exceeded",
                    "user_id": user_id,
                    "limit": user_rate_limit,
                    "retry_after": 60
                }
            )
    
    # Continue with request
    response = await call_next(request)
    
    # Add rate limit headers
    if user_id:
        response.headers["X-RateLimit-User"] = user_id
        response.headers["X-RateLimit-Limit"] = USERS_DB[user_id]["rate_limit"]
    
    return response

# Example usage and testing endpoints
@app.get("/examples/usage")
async def usage_examples():
    """Show examples of how to use the API with different authentication methods"""
    return {
        "jwt_example": {
            "description": "Use JWT token in Authorization header",
            "example": "Authorization: Bearer <jwt_token>",
            "get_token": "POST /auth/login with username and password"
        },
        "api_key_example": {
            "description": "Use API key in X-API-Key header",
            "example": "X-API-Key: api_token_123",
            "available_tokens": list(API_TOKENS_DB.keys())
        },
        "rate_limits": {
            "user1": "200/minute",
            "user2": "50/minute", 
            "anonymous": "100/minute (IP-based)"
        },
        "excluded_paths": throttling_manager.config.excluded_paths
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)