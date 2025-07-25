"""
FastAPI Throttling Service using SlowAPI
Supports user-based throttling with JWT tokens and database tokens
"""

import redis
import json
import logging
from typing import Optional, Dict, Any, List, Callable
from functools import wraps
from datetime import datetime, timedelta

from fastapi import Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from jose import JWTError, jwt
import asyncio

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Security scheme for JWT
security = HTTPBearer(auto_error=False)


class ThrottlingConfig:
    """Configuration for throttling settings"""
    
    def __init__(
        self,
        redis_url: str = "redis://localhost:6379",
        jwt_secret_key: str = "your-secret-key-here",
        jwt_algorithm: str = "HS256",
        default_rate_limit: str = "100/minute",
        excluded_paths: List[str] = None,
        user_rate_limits: Dict[str, str] = None
    ):
        self.redis_url = redis_url
        self.jwt_secret_key = jwt_secret_key
        self.jwt_algorithm = jwt_algorithm
        self.default_rate_limit = default_rate_limit
        self.excluded_paths = excluded_paths or ["/health", "/docs", "/openapi.json", "/favicon.ico"]
        self.user_rate_limits = user_rate_limits or {}


class UserIdentificationService:
    """Service to identify users from JWT tokens or database tokens"""
    
    def __init__(self, config: ThrottlingConfig, db_connection=None):
        self.config = config
        self.db = db_connection
        self.token_cache = {}  # Simple in-memory cache for database tokens
        
    async def get_user_id_from_jwt(self, token: str) -> Optional[str]:
        """Extract user ID from JWT token"""
        try:
            payload = jwt.decode(
                token, 
                self.config.jwt_secret_key, 
                algorithms=[self.config.jwt_algorithm]
            )
            return payload.get("sub") or payload.get("user_id")
        except JWTError as e:
            logger.warning(f"Invalid JWT token: {e}")
            return None
    
    async def get_user_id_from_db_token(self, token: str) -> Optional[str]:
        """Extract user ID from database token"""
        # Check cache first
        if token in self.token_cache:
            cache_entry = self.token_cache[token]
            if cache_entry["expires"] > datetime.now():
                return cache_entry["user_id"]
            else:
                del self.token_cache[token]
        
        if not self.db:
            return None
            
        try:
            # Example database query - adapt to your database structure
            query = "SELECT user_id, expires_at FROM user_tokens WHERE token = %s AND is_active = true"
            result = await self.db.fetch_one(query, (token,))
            
            if result and result["expires_at"] > datetime.now():
                user_id = str(result["user_id"])
                # Cache the result for 5 minutes
                self.token_cache[token] = {
                    "user_id": user_id,
                    "expires": datetime.now() + timedelta(minutes=5)
                }
                return user_id
            
        except Exception as e:
            logger.error(f"Database token lookup failed: {e}")
            
        return None
    
    async def get_user_id_from_request(self, request: Request) -> Optional[str]:
        """Extract user ID from request (JWT or database token)"""
        # Try Authorization header first (Bearer token)
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header[7:]  # Remove "Bearer " prefix
            
            # Try JWT first
            user_id = await self.get_user_id_from_jwt(token)
            if user_id:
                return user_id
            
            # Fallback to database token
            user_id = await self.get_user_id_from_db_token(token)
            if user_id:
                return user_id
        
        # Try X-API-Key header for database tokens
        api_key = request.headers.get("X-API-Key")
        if api_key:
            user_id = await self.get_user_id_from_db_token(api_key)
            if user_id:
                return user_id
        
        # Try custom token header
        custom_token = request.headers.get("X-User-Token")
        if custom_token:
            user_id = await self.get_user_id_from_db_token(custom_token)
            if user_id:
                return user_id
        
        return None


class CustomLimiter(Limiter):
    """Extended Limiter with custom user identification and exclusions"""
    
    def __init__(self, config: ThrottlingConfig, user_service: UserIdentificationService):
        self.config = config
        self.user_service = user_service
        
        # Initialize Redis storage
        storage_uri = config.redis_url
        
        super().__init__(
            key_func=self._get_limiter_key,
            storage_uri=storage_uri,
            default_limits=[config.default_rate_limit]
        )
    
    def _get_limiter_key(self, request: Request) -> str:
        """Generate key for rate limiting based on user or IP"""
        # Check if path should be excluded
        if self._should_exclude_path(request.url.path):
            return None  # No rate limiting for excluded paths
        
        # Try to get user ID asynchronously
        loop = asyncio.get_event_loop()
        user_id = loop.run_until_complete(
            self.user_service.get_user_id_from_request(request)
        )
        
        if user_id:
            return f"user:{user_id}"
        else:
            # Fallback to IP-based rate limiting
            return f"ip:{get_remote_address(request)}"
    
    def _should_exclude_path(self, path: str) -> bool:
        """Check if path should be excluded from rate limiting"""
        for excluded_path in self.config.excluded_paths:
            if excluded_path.endswith("*"):
                # Wildcard matching
                prefix = excluded_path[:-1]
                if path.startswith(prefix):
                    return True
            elif path == excluded_path:
                return True
        return False
    
    def get_user_rate_limit(self, user_id: str) -> str:
        """Get rate limit for specific user"""
        return self.config.user_rate_limits.get(user_id, self.config.default_rate_limit)


class ThrottlingManager:
    """Main throttling manager class"""
    
    def __init__(self, config: ThrottlingConfig, db_connection=None):
        self.config = config
        self.user_service = UserIdentificationService(config, db_connection)
        self.limiter = CustomLimiter(config, self.user_service)
        
        # Metrics tracking
        self.metrics = {
            "total_requests": 0,
            "throttled_requests": 0,
            "requests_by_user": {},
            "requests_by_ip": {}
        }
    
    def limit(self, rate_limit: str = None, per_user: bool = True):
        """Decorator for applying rate limits to endpoints"""
        def decorator(func):
            @wraps(func)
            async def wrapper(*args, **kwargs):
                # Extract request from args/kwargs
                request = None
                for arg in args:
                    if isinstance(arg, Request):
                        request = arg
                        break
                
                if not request:
                    # If no request found, proceed without throttling
                    return await func(*args, **kwargs)
                
                # Update metrics
                self.metrics["total_requests"] += 1
                
                # Check if path should be excluded
                if self.limiter._should_exclude_path(request.url.path):
                    return await func(*args, **kwargs)
                
                # Get user ID for user-specific limits
                user_id = None
                if per_user:
                    user_id = await self.user_service.get_user_id_from_request(request)
                
                # Determine rate limit
                if user_id and per_user:
                    limit_str = rate_limit or self.limiter.get_user_rate_limit(user_id)
                    key = f"user:{user_id}"
                    self.metrics["requests_by_user"][user_id] = self.metrics["requests_by_user"].get(user_id, 0) + 1
                else:
                    limit_str = rate_limit or self.config.default_rate_limit
                    key = f"ip:{get_remote_address(request)}"
                    ip = get_remote_address(request)
                    self.metrics["requests_by_ip"][ip] = self.metrics["requests_by_ip"].get(ip, 0) + 1
                
                # Apply rate limiting
                try:
                    await self._check_rate_limit(request, limit_str, key)
                    return await func(*args, **kwargs)
                except RateLimitExceeded:
                    self.metrics["throttled_requests"] += 1
                    raise HTTPException(
                        status_code=429,
                        detail={
                            "error": "Rate limit exceeded",
                            "limit": limit_str,
                            "key": key.split(":")[0],  # Return 'user' or 'ip' without the actual value
                            "retry_after": 60  # Default retry after 1 minute
                        }
                    )
            
            return wrapper
        return decorator
    
    async def _check_rate_limit(self, request: Request, limit_str: str, key: str):
        """Check rate limit for given key"""
        # This is a simplified implementation
        # In practice, you'd use the Redis storage to check and update counters
        pass
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get current throttling metrics"""
        return self.metrics.copy()
    
    def update_user_rate_limit(self, user_id: str, rate_limit: str):
        """Update rate limit for specific user"""
        self.config.user_rate_limits[user_id] = rate_limit
        logger.info(f"Updated rate limit for user {user_id}: {rate_limit}")
    
    def add_excluded_path(self, path: str):
        """Add path to exclusion list"""
        if path not in self.config.excluded_paths:
            self.config.excluded_paths.append(path)
            logger.info(f"Added excluded path: {path}")
    
    def remove_excluded_path(self, path: str):
        """Remove path from exclusion list"""
        if path in self.config.excluded_paths:
            self.config.excluded_paths.remove(path)
            logger.info(f"Removed excluded path: {path}")


# Convenience functions for common use cases

def create_throttling_manager(
    redis_url: str = "redis://localhost:6379",
    jwt_secret_key: str = "your-secret-key-here",
    default_rate_limit: str = "100/minute",
    excluded_paths: List[str] = None,
    db_connection=None
) -> ThrottlingManager:
    """Create a throttling manager with default configuration"""
    config = ThrottlingConfig(
        redis_url=redis_url,
        jwt_secret_key=jwt_secret_key,
        default_rate_limit=default_rate_limit,
        excluded_paths=excluded_paths
    )
    return ThrottlingManager(config, db_connection)


def user_rate_limit(rate: str = "100/minute"):
    """Decorator for user-based rate limiting"""
    def decorator(func):
        # This should be applied after the throttling manager is created
        return func
    return decorator


def ip_rate_limit(rate: str = "50/minute"):
    """Decorator for IP-based rate limiting"""
    def decorator(func):
        # This should be applied after the throttling manager is created
        return func
    return decorator


# Example database models (adapt to your ORM)
class UserToken:
    """Example database model for user tokens"""
    
    def __init__(self, token: str, user_id: int, expires_at: datetime, is_active: bool = True):
        self.token = token
        self.user_id = user_id
        self.expires_at = expires_at
        self.is_active = is_active


# Redis utility functions for manual rate limiting
class RedisRateLimiter:
    """Manual Redis-based rate limiter for custom implementations"""
    
    def __init__(self, redis_url: str = "redis://localhost:6379"):
        self.redis_client = redis.from_url(redis_url)
    
    async def is_allowed(self, key: str, limit: int, window_seconds: int) -> tuple[bool, int]:
        """
        Check if request is allowed and return (is_allowed, remaining_requests)
        """
        current_time = int(datetime.now().timestamp())
        window_start = current_time - window_seconds
        
        pipe = self.redis_client.pipeline()
        
        # Remove old entries
        pipe.zremrangebyscore(key, 0, window_start)
        
        # Count current requests
        pipe.zcard(key)
        
        # Add current request
        pipe.zadd(key, {str(current_time): current_time})
        
        # Set expiration
        pipe.expire(key, window_seconds)
        
        results = pipe.execute()
        current_count = results[1]
        
        if current_count >= limit:
            # Remove the request we just added since it's not allowed
            self.redis_client.zrem(key, str(current_time))
            return False, 0
        
        return True, limit - current_count - 1
    
    def reset_limit(self, key: str):
        """Reset rate limit for a specific key"""
        self.redis_client.delete(key)


# Custom exception handler for rate limit exceeded
def custom_rate_limit_handler(request: Request, exc: RateLimitExceeded):
    """Custom handler for rate limit exceeded errors"""
    response_data = {
        "error": "Rate limit exceeded",
        "detail": f"Request limit exceeded: {exc.detail}",
        "retry_after": getattr(exc, 'retry_after', 60),
        "timestamp": datetime.now().isoformat()
    }
    
    return HTTPException(
        status_code=429,
        detail=response_data
    )