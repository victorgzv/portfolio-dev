import time
import asyncio
from typing import Dict, List, Optional, Set, Callable, Any
from collections import defaultdict
from dataclasses import dataclass
from fastapi import Request, Response, HTTPException
from fastapi.responses import JSONResponse
import redis
from redis.asyncio import Redis as AsyncRedis
import json
import logging

logger = logging.getLogger(__name__)


@dataclass
class ThrottleConfig:
    """Configuration for throttling rules"""
    max_requests: int
    window_seconds: int
    excluded_paths: Set[str] = None
    excluded_methods: Set[str] = None
    key_func: Optional[Callable[[Request], str]] = None
    
    def __post_init__(self):
        if self.excluded_paths is None:
            self.excluded_paths = set()
        if self.excluded_methods is None:
            self.excluded_methods = set()


class InMemoryThrottleStorage:
    """In-memory storage for throttling data"""
    
    def __init__(self):
        self.requests: Dict[str, List[float]] = defaultdict(list)
        self._lock = asyncio.Lock()
    
    async def add_request(self, key: str, timestamp: float) -> None:
        async with self._lock:
            self.requests[key].append(timestamp)
    
    async def get_request_count(self, key: str, window_start: float) -> int:
        async with self._lock:
            # Clean old requests
            self.requests[key] = [
                ts for ts in self.requests[key] 
                if ts >= window_start
            ]
            return len(self.requests[key])
    
    async def cleanup_old_requests(self, cutoff_time: float) -> None:
        async with self._lock:
            for key in list(self.requests.keys()):
                self.requests[key] = [
                    ts for ts in self.requests[key] 
                    if ts >= cutoff_time
                ]
                if not self.requests[key]:
                    del self.requests[key]


class RedisThrottleStorage:
    """Redis-based storage for throttling data (for distributed systems)"""
    
    def __init__(self, redis_url: str = "redis://localhost:6379"):
        self.redis_url = redis_url
        self.redis_client: Optional[AsyncRedis] = None
    
    async def connect(self):
        if not self.redis_client:
            self.redis_client = AsyncRedis.from_url(self.redis_url)
    
    async def add_request(self, key: str, timestamp: float) -> None:
        await self.connect()
        pipe = self.redis_client.pipeline()
        pipe.zadd(key, {str(timestamp): timestamp})
        pipe.expire(key, 3600)  # Expire after 1 hour
        await pipe.execute()
    
    async def get_request_count(self, key: str, window_start: float) -> int:
        await self.connect()
        # Remove old entries and count current ones
        pipe = self.redis_client.pipeline()
        pipe.zremrangebyscore(key, 0, window_start)
        pipe.zcard(key)
        results = await pipe.execute()
        return results[1]


class ThrottleMiddleware:
    """FastAPI middleware for request throttling"""
    
    def __init__(
        self,
        config: ThrottleConfig,
        storage: Optional[Any] = None,
        error_message: str = "Rate limit exceeded",
        error_status_code: int = 429
    ):
        self.config = config
        self.storage = storage or InMemoryThrottleStorage()
        self.error_message = error_message
        self.error_status_code = error_status_code
        
        # Default key function (by IP address)
        if not self.config.key_func:
            self.config.key_func = lambda request: self._get_client_ip(request)
    
    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP from request"""
        # Check for forwarded headers first
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        # Fallback to direct client IP
        return request.client.host if request.client else "unknown"
    
    def _should_exclude_request(self, request: Request) -> bool:
        """Check if request should be excluded from throttling"""
        # Check excluded paths
        path = request.url.path
        if path in self.config.excluded_paths:
            return True
        
        # Check excluded methods
        if request.method in self.config.excluded_methods:
            return True
        
        # Check for wildcard path exclusions
        for excluded_path in self.config.excluded_paths:
            if excluded_path.endswith("*"):
                prefix = excluded_path[:-1]
                if path.startswith(prefix):
                    return True
        
        return False
    
    async def __call__(self, request: Request, call_next):
        # Skip throttling for excluded requests
        if self._should_exclude_request(request):
            return await call_next(request)
        
        # Generate throttle key
        throttle_key = self.config.key_func(request)
        current_time = time.time()
        window_start = current_time - self.config.window_seconds
        
        try:
            # Check current request count
            request_count = await self.storage.get_request_count(throttle_key, window_start)
            
            if request_count >= self.config.max_requests:
                logger.warning(
                    f"Rate limit exceeded for key {throttle_key}. "
                    f"Count: {request_count}, Limit: {self.config.max_requests}"
                )
                return JSONResponse(
                    status_code=self.error_status_code,
                    content={
                        "error": self.error_message,
                        "limit": self.config.max_requests,
                        "window": self.config.window_seconds,
                        "current_count": request_count
                    }
                )
            
            # Add current request
            await self.storage.add_request(throttle_key, current_time)
            
            # Process the request
            response = await call_next(request)
            
            # Add rate limit headers
            response.headers["X-RateLimit-Limit"] = str(self.config.max_requests)
            response.headers["X-RateLimit-Window"] = str(self.config.window_seconds)
            response.headers["X-RateLimit-Remaining"] = str(
                max(0, self.config.max_requests - request_count - 1)
            )
            
            return response
            
        except Exception as e:
            logger.error(f"Error in throttle middleware: {e}")
            # In case of error, allow the request to proceed
            return await call_next(request)


class ConfigurableThrottleManager:
    """Manager for multiple throttle configurations"""
    
    def __init__(self):
        self.configs: Dict[str, ThrottleConfig] = {}
        self.middlewares: Dict[str, ThrottleMiddleware] = {}
        self.storage = None
    
    def set_storage(self, storage):
        """Set the storage backend for all throttle configs"""
        self.storage = storage
    
    def add_config(self, name: str, config: ThrottleConfig) -> None:
        """Add a new throttle configuration"""
        self.configs[name] = config
        self.middlewares[name] = ThrottleMiddleware(
            config=config,
            storage=self.storage
        )
    
    def update_config(self, name: str, **kwargs) -> None:
        """Update an existing throttle configuration"""
        if name not in self.configs:
            raise ValueError(f"Config '{name}' not found")
        
        config = self.configs[name]
        for key, value in kwargs.items():
            if hasattr(config, key):
                setattr(config, key, value)
        
        # Recreate middleware with updated config
        self.middlewares[name] = ThrottleMiddleware(
            config=config,
            storage=self.storage
        )
    
    def get_middleware(self, name: str) -> ThrottleMiddleware:
        """Get middleware by name"""
        if name not in self.middlewares:
            raise ValueError(f"Middleware '{name}' not found")
        return self.middlewares[name]
    
    def list_configs(self) -> Dict[str, Dict]:
        """List all configurations"""
        return {
            name: {
                "max_requests": config.max_requests,
                "window_seconds": config.window_seconds,
                "excluded_paths": list(config.excluded_paths),
                "excluded_methods": list(config.excluded_methods)
            }
            for name, config in self.configs.items()
        }


# Convenience functions for common throttling scenarios
def create_basic_throttle(
    max_requests: int = 100,
    window_seconds: int = 60,
    excluded_paths: List[str] = None
) -> ThrottleMiddleware:
    """Create a basic throttle middleware"""
    config = ThrottleConfig(
        max_requests=max_requests,
        window_seconds=window_seconds,
        excluded_paths=set(excluded_paths or [])
    )
    return ThrottleMiddleware(config)


def create_user_based_throttle(
    max_requests: int = 1000,
    window_seconds: int = 3600,
    excluded_paths: List[str] = None
) -> ThrottleMiddleware:
    """Create a user-based throttle middleware (requires authentication)"""
    def user_key_func(request: Request) -> str:
        # Extract user ID from JWT token or session
        # This is a placeholder - implement based on your auth system
        user_id = request.headers.get("X-User-ID")
        if user_id:
            return f"user:{user_id}"
        # Fallback to IP-based throttling
        return f"ip:{request.client.host if request.client else 'unknown'}"
    
    config = ThrottleConfig(
        max_requests=max_requests,
        window_seconds=window_seconds,
        excluded_paths=set(excluded_paths or []),
        key_func=user_key_func
    )
    return ThrottleMiddleware(config)


def create_endpoint_specific_throttle(
    endpoint_limits: Dict[str, Dict[str, int]],
    default_max_requests: int = 100,
    default_window_seconds: int = 60
) -> Callable:
    """Create endpoint-specific throttling"""
    def middleware_func(request: Request, call_next):
        path = request.url.path
        
        # Check if this endpoint has specific limits
        if path in endpoint_limits:
            limits = endpoint_limits[path]
            max_req = limits.get("max_requests", default_max_requests)
            window = limits.get("window_seconds", default_window_seconds)
        else:
            max_req = default_max_requests
            window = default_window_seconds
        
        # Create config for this request
        config = ThrottleConfig(
            max_requests=max_req,
            window_seconds=window
        )
        
        # Create temporary middleware
        middleware = ThrottleMiddleware(config)
        return middleware(request, call_next)
    
    return middleware_func