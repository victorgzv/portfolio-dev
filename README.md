# FastAPI User-Based Throttling Solution

This repository contains a complete implementation of user-based throttling for FastAPI applications using the **SlowAPI** library. The solution supports user identification from JWT tokens and database tokens, with configurable rate limits and URL exclusions.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
pip install slowapi redis python-jose[cryptography] fastapi uvicorn
```

### 2. Basic Usage

```python
# main.py
from fastapi import FastAPI, Request
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

# Create limiter with Redis backend
limiter = Limiter(
    key_func=get_remote_address,
    storage_uri="redis://localhost:6379"
)

# Create FastAPI app
app = FastAPI()
app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Apply rate limiting to endpoints
@app.get("/api/data")
@limiter.limit("100/minute")
async def get_data(request: Request):
    return {"message": "Hello World"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

### 3. Start Redis (Required)

```bash
# Using Docker
docker run -d -p 6379:6379 redis:alpine

# Or install locally
# Ubuntu/Debian: sudo apt install redis-server
# macOS: brew install redis
```

### 4. Run the Application

```bash
uvicorn main:app --reload
```

## 📋 Files Included

- **`throttling_service.py`** - Complete throttling service with user identification
- **`example_fastapi_app.py`** - Full example application with authentication
- **`requirements.txt`** - Python dependencies
- **`FastAPI_Throttling_Implementation_Guide.md`** - Comprehensive implementation guide
- **`generate_pdf.py`** - Script to convert guide to PDF

## 🔧 Key Features

✅ **User-Based Throttling** - Different limits per user based on JWT or database tokens  
✅ **JWT Token Support** - Extract user ID from JWT tokens automatically  
✅ **Database Token Support** - Look up users from database tokens  
✅ **URL Exclusions** - Exclude specific paths from rate limiting  
✅ **Redis Backend** - Distributed rate limiting with Redis  
✅ **Real-time Configuration** - Update limits without restarting  
✅ **Comprehensive Monitoring** - Built-in metrics and health checks  

## 🎯 User Identification Methods

### JWT Tokens
```bash
curl -H "Authorization: Bearer <jwt-token>" http://localhost:8000/api/data
```

### API Keys (Database Tokens)
```bash
curl -H "X-API-Key: <api-token>" http://localhost:8000/api/data
```

### Custom Headers
```bash
curl -H "X-User-Token: <user-token>" http://localhost:8000/api/data
```

## ⚙️ Configuration

### Environment Variables

```bash
# JWT Configuration
JWT_SECRET_KEY=your-super-secret-jwt-key
JWT_ALGORITHM=HS256

# Redis Configuration
REDIS_URL=redis://localhost:6379

# Rate Limiting
DEFAULT_RATE_LIMIT=100/minute
EXCLUDED_PATHS=/health,/docs,/openapi.json

# Database
DATABASE_URL=postgresql://user:password@localhost/dbname
```

### Different Rate Limits per User

```python
USER_RATE_LIMITS = {
    "premium_user": "1000/minute",
    "basic_user": "100/minute", 
    "guest_user": "50/minute"
}
```

## 📊 Monitoring

### Get Metrics
```bash
curl http://localhost:8000/admin/metrics
```

### Health Check
```bash
curl http://localhost:8000/health
```

### Update User Rate Limit
```bash
curl -X POST "http://localhost:8000/admin/throttle/user/user123/limit?rate_limit=200/minute"
```

## 🗄️ Database Schema

If using database tokens, create this table:

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
```

## 🧪 Testing

### Basic Rate Limiting Test
```bash
# Make multiple requests quickly
for i in {1..10}; do curl http://localhost:8000/api/data; done
```

### With JWT Token
```bash
# Login to get token
TOKEN=$(curl -X POST "http://localhost:8000/auth/login" \
  -d "username=john_doe&password=password" | jq -r .access_token)

# Use token in requests
curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/data
```

## 🔒 Security Best Practices

1. **Use Strong JWT Secrets**: Generate with `python -c "import secrets; print(secrets.token_urlsafe(32))"`
2. **Secure Redis**: Use password protection and network isolation
3. **Rate Limit Headers**: Monitor X-RateLimit-* headers in responses
4. **Input Validation**: Validate all rate limit configurations
5. **Monitor & Alert**: Set up alerts for unusual throttling patterns

## 🚀 Production Deployment

### Docker Compose Example

```yaml
version: '3.8'
services:
  redis:
    image: redis:alpine
    command: redis-server --requirepass your-password
  
  app:
    build: .
    environment:
      - REDIS_URL=redis://:your-password@redis:6379
      - JWT_SECRET_KEY=your-production-secret
    depends_on:
      - redis
```

### Nginx Load Balancer

```nginx
upstream fastapi_backend {
    server app1:8000;
    server app2:8000;
}

server {
    location / {
        proxy_pass http://fastapi_backend;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

## 📖 Complete Documentation

For detailed implementation instructions, configuration options, troubleshooting, and advanced features, see:

- **`FastAPI_Throttling_Implementation_Guide.md`** - Complete guide (60+ pages)

To generate a PDF version:
```bash
python3 generate_pdf.py
```

Or open the markdown file in any markdown viewer/editor that supports PDF export.

## 🆘 Troubleshooting

### Common Issues

1. **Rate limits not working**: Check Redis connection and configuration
2. **User identification failing**: Verify JWT secret and token format  
3. **Database errors**: Check database connection and schema
4. **Performance issues**: Use connection pooling and optimize Redis operations

### Debug Endpoints

```bash
# Check throttling status
curl http://localhost:8000/debug/throttle/info

# View Redis keys  
curl http://localhost:8000/debug/redis/keys

# Current configuration
curl http://localhost:8000/admin/throttle/config
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## 📄 License

This implementation is provided as-is for educational and commercial use. Please test thoroughly before production deployment.

---

**Ready to implement throttling in your FastAPI app?** Start with the basic example above and refer to the comprehensive guide for advanced features! 🚀
