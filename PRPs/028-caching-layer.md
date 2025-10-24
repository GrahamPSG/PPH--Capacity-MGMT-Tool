# PRP-028: Caching Layer

## Status
🔲 Not Started

## Priority
P2 - Medium (Performance optimization)

## Objective
Implement comprehensive caching layer using Redis for improved performance, reduced database load, and faster response times across API endpoints and computationally expensive operations.

## Scope

### Files to Create
- `src/lib/cache/redis-client.ts` - Redis client singleton
- `src/lib/cache/cache.service.ts` - Cache service abstraction
- `src/lib/cache/strategies/cache-aside.ts` - Cache-aside pattern
- `src/lib/cache/strategies/write-through.ts` - Write-through pattern
- `src/lib/cache/strategies/write-behind.ts` - Write-behind pattern
- `src/lib/cache/invalidation.ts` - Cache invalidation utilities
- `src/lib/cache/keys.ts` - Cache key generation
- `src/middleware/cache.middleware.ts` - HTTP cache middleware
- `src/decorators/cacheable.decorator.ts` - Cacheable method decorator
- `src/hooks/useCachedQuery.ts` - React Query with cache
- `tests/lib/cache/cache.service.test.ts` - Cache service tests
- `tests/lib/cache/invalidation.test.ts` - Invalidation tests

### Dependencies to Install
```bash
npm install redis
npm install ioredis
npm install --save-dev @types/redis
```

## Implementation Steps

1. **Set Up Redis Client**
   - Configure Redis connection
   - Create client singleton pattern
   - Handle connection errors and retries
   - Configure connection pooling
   - Set up Redis Sentinel for HA (production)
   - Monitor connection health

2. **Create Cache Service Abstraction**
   - Generic get/set/delete methods
   - TTL (time-to-live) support
   - Namespacing for different data types
   - Serialization/deserialization (JSON)
   - Batch operations (mget, mset)
   - Atomic operations (incr, decr)

3. **Implement Caching Strategies**
   - **Cache-Aside**: Read from cache, fetch from DB if miss, write to cache
   - **Write-Through**: Write to cache and DB simultaneously
   - **Write-Behind**: Write to cache immediately, DB asynchronously
   - Choose strategy per use case

4. **Add Cache Invalidation**
   - Time-based expiration (TTL)
   - Event-based invalidation (on data change)
   - Pattern-based invalidation (delete all project:* keys)
   - Tag-based invalidation
   - Cascade invalidation (related data)
   - Manual purge functionality

5. **Implement HTTP Caching Middleware**
   - Cache GET requests based on URL
   - Set Cache-Control headers
   - ETag support for conditional requests
   - Vary header for user-specific caching
   - Bypass cache for authenticated routes (configurable)

6. **Create Cacheable Decorator**
   - Decorator for service methods
   - Auto-generate cache keys from method args
   - Configurable TTL per method
   - Cache hit/miss logging
   - Bypass option for testing

7. **Cache Key Management**
   - Consistent key naming convention
   - Namespaces: `project:`, `capacity:`, `user:`, `report:`
   - Include version in keys for easy migration
   - Generate keys from entity IDs and filters
   - Avoid key collisions

8. **Implement Cache Warming**
   - Pre-populate cache on app start
   - Schedule background jobs to refresh cache
   - Warm cache for frequently accessed data
   - Predictive warming based on usage patterns

9. **Add Cache Metrics and Monitoring**
   - Track cache hit/miss ratio
   - Monitor cache size and memory usage
   - Alert on low hit ratio (<80%)
   - Dashboard for cache performance
   - Log cache operations (debug mode)

10. **Optimize Specific Use Cases**
    - **Projects list**: Cache for 5 minutes
    - **Capacity calculations**: Cache for 15 minutes
    - **User sessions**: Cache for duration of session
    - **Report data**: Cache for 1 hour
    - **Static data** (divisions, roles): Cache for 24 hours
    - **Real-time data** (WebSocket): Don't cache

## Acceptance Criteria

- [ ] Redis client connects successfully and handles reconnections
- [ ] Cache service provides get/set/delete operations with TTL
- [ ] Cache-aside strategy implemented for read-heavy operations
- [ ] Cache invalidation works on data mutations
- [ ] HTTP caching middleware reduces API response times
- [ ] Cache hit ratio >80% for frequently accessed data
- [ ] Cache keys follow consistent naming convention
- [ ] Cache warming pre-populates critical data on startup
- [ ] Cache metrics tracked and visible in monitoring dashboard
- [ ] All cached data has appropriate TTL (no infinite cache)
- [ ] Cache memory usage stays within limits (max 1GB)
- [ ] All tests pass with >80% coverage

## Validation Steps

```bash
# 1. Start Redis with Docker Compose
docker compose up -d redis

# 2. Verify Redis is running
docker compose ps
# Should show redis container as "Up"

# 3. Test Redis connection
docker exec -it [container_name] redis-cli ping
# Should return "PONG"

# 4. Run cache service tests
npm test -- tests/lib/cache/cache.service.test.ts

# 5. Run invalidation tests
npm test -- tests/lib/cache/invalidation.test.ts

# 6. Start dev server
npm run dev

# 7. Test cache-aside strategy
# Make API request to /api/projects
# Check Redis for cached data:
docker exec -it [container_name] redis-cli
> KEYS project:*
# Should show cached project data

# 8. Test cache hit
# Make same API request again
# Check server logs for "Cache HIT"
# Verify response time is faster (<50ms)

# 9. Test cache invalidation
# Update a project via API
# Check Redis cache was invalidated:
> GET project:[id]
# Should return (nil) or updated data

# 10. Test TTL expiration
# Set a cache entry with 10 second TTL
# Wait 10 seconds
# Verify cache entry expired:
> TTL project:[id]
# Should return -2 (expired)

# 11. Test cache middleware
# Make GET request with caching enabled
# Check response headers for Cache-Control
curl -I http://localhost:3000/api/projects
# Should include: Cache-Control: max-age=300

# 12. Test cache metrics
# Navigate to /admin/cache (if implemented)
# Verify metrics display:
#   - Hit ratio
#   - Memory usage
#   - Key count

# 13. Load test with cache
# Run load test with 100 concurrent requests
npm run test:load
# Verify cache improves response times
# Target: 90th percentile <100ms

# 14. Test cache warming
# Restart server
# Check logs for "Cache warming started"
# Verify critical data pre-cached

# 15. Monitor Redis memory
docker exec -it [container_name] redis-cli INFO memory
# Verify used_memory is within limits (<1GB)

# 16. Run integration tests
npm run test:ci
```

## Expected Output

```
✓ Redis client configured with connection pooling
✓ Cache service with get/set/delete operations
✓ Cache-aside, write-through, write-behind strategies
✓ Cache invalidation on data mutations
✓ HTTP caching middleware with ETag support
✓ Cacheable decorator for service methods
✓ Consistent cache key naming
✓ Cache warming for critical data
✓ Cache metrics and monitoring
✓ Cache hit ratio >80%
✓ All tests passing (>80% coverage)
```

## Cache Configuration

### Cache TTL by Data Type
```typescript
const CACHE_TTL = {
  PROJECTS_LIST: 5 * 60,           // 5 minutes
  PROJECT_DETAIL: 10 * 60,         // 10 minutes
  CAPACITY_CALC: 15 * 60,          // 15 minutes
  USER_SESSION: 12 * 60 * 60,      // 12 hours
  REPORT_DATA: 60 * 60,            // 1 hour
  STATIC_DATA: 24 * 60 * 60,       // 24 hours
  SOV_DATA: 30 * 60,               // 30 minutes
  CASHFLOW_PROJECTION: 60 * 60,    // 1 hour
}
```

### Cache Key Patterns
```typescript
const CACHE_KEYS = {
  PROJECT_LIST: (filters: string) => `project:list:${filters}`,
  PROJECT_DETAIL: (id: string) => `project:detail:${id}`,
  CAPACITY_DIVISION: (division: string, date: string) =>
    `capacity:${division}:${date}`,
  USER_SESSION: (userId: string) => `session:${userId}`,
  REPORT_RUN: (reportId: string, params: string) =>
    `report:${reportId}:${params}`,
}
```

### Invalidation Patterns
```typescript
// Invalidate single entry
await cache.delete(`project:detail:${projectId}`)

// Invalidate pattern (all projects)
await cache.deletePattern('project:*')

// Invalidate related data (cascade)
await invalidateProjectCache(projectId) // Invalidates project + phases + SOV
```

## Related PRPs
- Depends on: PRP-001 (Project Initialization)
- Enhances: All data-heavy PRPs (projects, capacity, financials)
- Related: PRP-024 (WebSocket Real-time), PRP-029 (Security Hardening)
- Blocks: None (performance optimization)

## Estimated Time
8-10 hours

## Notes
- Use ioredis library (better TypeScript support than node-redis)
- Configure Redis maxmemory policy: `allkeys-lru` (evict least recently used)
- Set maxmemory limit to prevent Redis from consuming all RAM
- Use Redis Cluster for horizontal scaling (if needed)
- Consider Redis persistence (RDB or AOF) for critical cache data
- Don't cache user-specific data without user ID in key
- Be cautious with cache stampede (many requests after cache expires)
- Use cache locking to prevent stampede
- Monitor cache eviction rate (high eviction = need more memory)
- Use Redis pub/sub for cache invalidation across multiple servers
- Consider using Redis for session storage (instead of JWT)
- Use separate Redis instances for cache vs sessions vs queues
- Implement graceful degradation (app works if Redis down)
- Use cache versioning to handle schema changes

## Cache Stampede Prevention
```typescript
// Use mutex lock to prevent stampede
async function getCachedData(key: string, fetchFn: () => Promise<any>) {
  let data = await cache.get(key)
  if (data) return data

  // Acquire lock
  const lock = await cache.acquireLock(`lock:${key}`, 10)
  if (!lock) {
    // Wait for other process to populate cache
    await sleep(100)
    return cache.get(key)
  }

  // Fetch and cache data
  data = await fetchFn()
  await cache.set(key, data, TTL)
  await cache.releaseLock(`lock:${key}`)

  return data
}
```

## Rollback Plan
If validation fails:
1. Verify Redis running: `docker compose ps`
2. Check Redis connection string in .env.local
3. Test Redis connectivity: `docker exec -it [container] redis-cli ping`
4. Check ioredis installation: `npm list ioredis`
5. Review Redis logs: `docker compose logs redis`
6. Test cache operations in Redis CLI directly
7. Verify cache keys are being set correctly
8. Check TTL values are appropriate
9. Monitor memory usage with `INFO memory`
10. If Redis fails, app should gracefully degrade (fetch from DB)
