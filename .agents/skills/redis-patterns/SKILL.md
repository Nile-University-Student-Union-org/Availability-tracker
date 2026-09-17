---
name: redis-patterns
description: >-
  Distributed caching patterns, Cache-Aside, stampede mitigation, TTL invalidation,
  and high-performance Redis data structure optimization for Node.js and .NET backends.
---

# Redis Caching & Distributed Architecture Patterns

This skill provides production-grade patterns, algorithms, and architectural guidelines for integrating Redis caching, session state, and distributed primitives.

---

## 1. Core Caching Patterns

### Cache-Aside (Lazy Loading) — Default Pattern
Read from cache first; on a miss, read from the database, write back to cache with TTL, and return data.

```typescript
async function getEntityWithCache<T>(
  key: string,
  ttlSeconds: number,
  fetchFn: () => Promise<T>
): Promise<T> {
  const cached = await redis.get(key)
  if (cached) {
    return JSON.parse(cached) as T
  }

  const freshData = await fetchFn()
  if (freshData !== null && freshData !== undefined) {
    await redis.set(key, JSON.stringify(freshData), "EX", ttlSeconds)
  }
  return freshData
}
```

### Write-Through & Write-Behind
- **Write-Through**: Write to DB and update the cache in the same request transaction.
- **Write-Behind (Write-Back)**: Acknowledge write immediately into a Redis Stream / Queue; async background worker flushes batches into the primary database.

---

## 2. Cache Stampede (Dog-Piling) Mitigation

When a hot key expires, multiple concurrent requests hammer the primary database simultaneously.

### Strategy A: Probabilistic Early Expiration (XFetch Algorithm)
Recompute the cache before it officially expires based on read compute time `delta` and a beta factor.

$$\text{shouldRecompute} = -\beta \times \delta \times \ln(\text{random}()) > (\text{ttl} - \text{currentTime})$$

### Strategy B: Distributed Mutex / Lock (`SET NX EX`)
Only the first cache-miss caller acquires the lock to query the DB; others poll or serve stale data.

```typescript
async function getWithMutex<T>(
  key: string,
  ttlSeconds: number,
  fetchFn: () => Promise<T>
): Promise<T> {
  const cached = await redis.get(key)
  if (cached) return JSON.parse(cached)

  const lockKey = `lock:${key}`
  const acquired = await redis.set(lockKey, "1", "NX", "EX", 10)

  if (acquired) {
    try {
      const fresh = await fetchFn()
      await redis.set(key, JSON.stringify(fresh), "EX", ttlSeconds)
      return fresh
    } finally {
      await redis.del(lockKey)
    }
  } else {
    // Wait briefly and retry reading from cache
    await new Promise((r) => setTimeout(r, 50))
    return getWithMutex(key, ttlSeconds, fetchFn)
  }
}
```

---

## 3. TTL and Invalidation Strategies

1. **Jittered Expiration**: Always add random jitter to TTLs (`ttl = baseTtl + Math.floor(Math.random() * jitterRange)`) to prevent simultaneous bulk expirations.
2. **Explicit Event-Driven Invalidation**: On entity updates/deletions, publish an event to invalidate relevant keys rather than waiting for TTL.
3. **Key Namespacing**: Format keys consistently:
   ```text
   <app>:<environment>:<domain>:<entity-id>:<attribute>
   nusu:prod:events:evt_123:details
   ```

---

## 4. Dual Backend Implementation Examples

### Node.js (ioredis / node-redis)
- Use connection pooling and automatic reconnect backoff.
- Prefer pipeline and transaction (`multi`) operations for bulk fetches.

### .NET (StackExchange.Redis)
- Reuse the `ConnectionMultiplexer` singleton instance across the application lifetime.
- Use `IDatabase.StringGetAsync` and `StringSetAsync` with `When.NotExists` for locking.
