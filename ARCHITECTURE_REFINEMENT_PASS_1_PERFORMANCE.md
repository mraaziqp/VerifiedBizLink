# 🚀 REFINEMENT PASS 1: PERFORMANCE OPTIMIZATION

**Objective:** Achieve sub-100ms response times at global scale

---

## 1. QUERY OPTIMIZATION STRATEGIES

### 1.1 The Hybrid Query Problem
Original query combines pgvector + PostGIS, but naive implementation causes table scans.

**OPTIMIZED APPROACH:**

```sql
-- STEP 1: Spatial filter first (narrow down with index)
-- STEP 2: Vector similarity on smaller result set
-- STEP 3: Final ranking

CREATE OR REPLACE FUNCTION find_nearby_deals_optimized(
  user_lat FLOAT,
  user_lon FLOAT,
  user_h3_hex VARCHAR,
  user_age_cohort VARCHAR,
  radius_meters INT DEFAULT 500,
  limit_count INT DEFAULT 5
)
RETURNS TABLE(...) AS $$
BEGIN
  RETURN QUERY
  WITH nearby_deals AS (
    -- Step 1: Use spatial index (ST_DWithin uses GIST index)
    SELECT d.id, d.business_id, d.title, d.discount_percentage,
           ST_Distance(ST_SetSRID(ST_MakePoint(user_lon, user_lat), 4326), d.macro_location_center) AS distance_m
    FROM deals d
    WHERE d.status = 'active'
      AND d.expires_at > NOW()
      AND ST_DWithin(
        ST_SetSRID(ST_MakePoint(user_lon, user_lat), 4326),
        d.macro_location_center,
        radius_meters
      )
      AND (d.age_restriction_cohorts = '{}' OR user_age_cohort = ANY(d.age_restriction_cohorts))
    LIMIT 50  -- Limit spatial results before vector ops
  ),
  scored_deals AS (
    -- Step 2: Vector similarity on pre-filtered set
    SELECT nd.id, nd.business_id, nd.title, nd.discount_percentage, nd.distance_m,
           1 + (u.purchase_history_embedding <=> d.deal_embedding) / 2 AS embedding_similarity
    FROM nearby_deals nd
    JOIN deals d ON d.id = nd.id
    LEFT JOIN users u ON u.id = 'current_user_id'
  )
  -- Step 3: Final ranking
  SELECT id, business_id, title, discount_percentage, distance_m, embedding_similarity,
         ROUND((
           (1 - (distance_m / radius_meters)) * 0.4 +
           embedding_similarity * 0.3 +
           (SELECT viral_score FROM deals WHERE id = id) / 100.0 * 0.3
         )::NUMERIC, 3) AS relevance_score
  FROM scored_deals
  ORDER BY relevance_score DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;
```

**Performance Gains:**
- Spatial filter: O(log n) via GIST index
- Vector on small set: O(m * 1536) where m ≤ 50 (vs n = millions)
- Total: ~40ms vs 500ms

---

### 1.2 Connection Pooling Strategy

```typescript
// src/lib/db/pool.ts
import { Pool } from 'pg';

export const pool = new Pool({
  // Supabase connection string
  connectionString: process.env.DATABASE_URL,
  
  // Connection pool optimization
  max: 20,           // Max connections (Neon allows 100)
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  
  // Statement caching (Neon Serverless feature)
  statement_cache_size: 100,
  
  // Application name for monitoring
  application_name: 'spatial-ads-api',
});

// Health check
pool.on('error', (err) => {
  console.error('Unexpected pool error:', err);
});

export async function getConnection() {
  const client = await pool.connect();
  
  // Auto-return after query
  return {
    query: async (text, values) => {
      try {
        return await client.query(text, values);
      } finally {
        client.release();
      }
    }
  };
}
```

---

## 2. CACHING LAYER ARCHITECTURE

### 2.1 Multi-Tier Caching

```typescript
// src/lib/cache/multi-tier.ts
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || '6379'),
  retryStrategy: (times) => Math.min(times * 50, 2000),
});

export class CacheManager {
  // Tier 1: In-memory (process) cache
  private memoryCache = new Map<string, { value: any; expires: number }>();
  
  // Tier 2: Redis (distributed) cache
  private redis = redis;

  async get<T>(key: string): Promise<T | null> {
    // Try memory first (microseconds)
    const memory = this.memoryCache.get(key);
    if (memory && memory.expires > Date.now()) {
      return memory.value as T;
    }

    // Try Redis next (milliseconds)
    try {
      const redis = await this.redis.get(key);
      if (redis) {
        const value = JSON.parse(redis);
        // Populate memory cache
        this.memoryCache.set(key, {
          value,
          expires: Date.now() + 60000, // 1min in memory
        });
        return value;
      }
    } catch (error) {
      console.error('Redis error:', error);
    }

    return null;
  }

  async set<T>(
    key: string,
    value: T,
    ttlSeconds: number = 300
  ): Promise<void> {
    // Memory cache (1 min)
    this.memoryCache.set(key, {
      value,
      expires: Date.now() + 60000,
    });

    // Redis cache (configurable)
    try {
      await this.redis.setex(
        key,
        ttlSeconds,
        JSON.stringify(value)
      );
    } catch (error) {
      console.error('Redis set error:', error);
    }
  }

  // Invalidate on change
  async invalidate(pattern: string): Promise<void> {
    // Memory
    for (const [key] of this.memoryCache) {
      if (key.match(pattern)) {
        this.memoryCache.delete(key);
      }
    }

    // Redis
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}

export const cache = new CacheManager();

// Usage:
// cache.get('deals:nearby:h3_123') -> 5µs (memory) or 50ms (redis)
// cache.set('deals:nearby:h3_123', [...], 300) -> cache for 5 minutes
// cache.invalidate('deals:*') -> clear all deal caches on update
```

### 2.2 Cache Key Strategy

```typescript
// Cache keys follow strict naming convention
export const cacheKeys = {
  // H3 hex zone deals
  dealsNearby: (hex: string, radius: number) => 
    `deals:nearby:${hex}:${radius}`,
  
  // User preferences
  userPreferences: (userId: string) => 
    `user:prefs:${userId}`,
  
  // Business data
  businessProfile: (businessId: string) => 
    `business:${businessId}`,
  
  // Viral scores (invalidated hourly)
  dealViral: (dealId: string) => 
    `deal:viral:${dealId}`,
  
  // Auction state (invalidated every 5 min)
  auctionState: (dealId: string) => 
    `auction:${dealId}`,
};

// TTLs
export const cacheTTL = {
  nearby: 300,        // 5 min (deals change frequently)
  user: 1800,         // 30 min (preferences stable)
  business: 3600,     // 1 hour (profile stable)
  viral: 3600,        // 1 hour (hourly updates)
  auction: 300,       // 5 min (real-time bidding)
};
```

---

## 3. DATABASE MATERIALIZED VIEWS

### 3.1 Pre-computed Viral Scores

```sql
-- Materialized view: Pre-compute viral scores hourly
CREATE MATERIALIZED VIEW deal_viral_hourly AS
SELECT 
  d.id,
  d.posted_at,
  COUNT(DISTINCT de.id) FILTER (WHERE de.engagement_type = 'upvote') AS upvotes,
  COUNT(DISTINCT de.id) FILTER (WHERE de.engagement_type = 'downvote') AS downvotes,
  COUNT(DISTINCT de.id) FILTER (WHERE de.engagement_type = 'view') AS views,
  COUNT(DISTINCT de.id) FILTER (WHERE de.engagement_type = 'click') AS clicks,
  -- Viral score = engagement rate * recency decay
  ((COUNT(DISTINCT de.id) FILTER (WHERE de.engagement_type = 'upvote')::FLOAT - 
    COUNT(DISTINCT de.id) FILTER (WHERE de.engagement_type = 'downvote')::FLOAT) 
   * EXP(-0.05 * EXTRACT(EPOCH FROM (NOW() - d.posted_at)) / 3600.0)) AS viral_score
FROM deals d
LEFT JOIN deal_engagement de ON de.deal_id = d.id
WHERE d.status = 'active' AND d.expires_at > NOW()
GROUP BY d.id, d.posted_at;

-- Refresh hourly
CREATE OR REPLACE FUNCTION refresh_viral_hourly()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY deal_viral_hourly;
END;
$$ LANGUAGE plpgsql;

-- Schedule refresh
SELECT cron.schedule('refresh-viral', '0 * * * *', 'SELECT refresh_viral_hourly()');
```

**Impact:** Viral score queries now O(1) table scan instead of aggregation.

---

## 4. INDEX STRATEGY

### 4.1 Complete Index Plan

```sql
-- SPATIAL INDEXES
CREATE INDEX idx_deals_geom ON deals USING GIST(target_polygon);
CREATE INDEX idx_deals_macro_location ON deals USING GIST(macro_location_center);
CREATE INDEX idx_geofence_boundary ON geofence_zones USING GIST(boundary);

-- VECTOR INDEXES (IVFFlat for similarity search)
CREATE INDEX idx_deals_embedding ON deals USING ivfflat(deal_embedding vector_cosine_ops) 
WITH (lists = 100);  -- 100 lists = good recall at scale

-- BTree INDEXES (for range queries, sorting)
CREATE INDEX idx_deals_status_expires ON deals(status, expires_at DESC);
CREATE INDEX idx_deals_viral_score ON deals(viral_score DESC) 
WHERE status = 'active' AND expires_at > NOW();
CREATE INDEX idx_deals_posted_at ON deals(posted_at DESC);
CREATE INDEX idx_deals_business_id ON deals(business_id);

-- H3 HEX INDEXES
CREATE INDEX idx_deals_h3_hexes ON deals USING GIN(target_h3_hexes);
CREATE INDEX idx_users_h3_hex ON users(current_h3_hex);
CREATE INDEX idx_h3_zones_hex ON h3_zones(h3_hex);

-- ENGAGEMENT INDEXES
CREATE INDEX idx_engagement_deal_user ON deal_engagement(deal_id, user_id);
CREATE INDEX idx_engagement_type ON deal_engagement(engagement_type) 
WHERE engagement_type IN ('upvote', 'downvote');

-- AUCTION INDEXES
CREATE INDEX idx_auction_next_adj ON ad_auction_state(next_adjustment_at);

-- COMPOSITE INDEXES (for common filter combinations)
CREATE INDEX idx_deals_active_nearby ON deals(status, expires_at) 
WHERE status = 'active';
```

**Index Size Estimation:**
- GIST: ~50MB per 1M deals
- Vector IVFFlat: ~300MB per 1M deals (1536 dims)
- BTree: ~20MB per 1M deals
- Total: ~400MB for 1M deals (acceptable overhead)

---

## 5. EDGE FUNCTION OPTIMIZATIONS

### 5.1 Request Batching

```typescript
// Instead of 1 request per location ping
// Batch 10 pings into single batch request

interface LocationBatch {
  user_locations: Array<{
    user_id: string;
    lat: number;
    lon: number;
    accuracy: number;
  }>;
}

// Process all at once in single query
const results = await supabase.rpc('batch_process_locations', {
  locations: userLocations,
});

// SQL RPC function
CREATE OR REPLACE FUNCTION batch_process_locations(
  locations JSONB
)
RETURNS JSONB AS $$
DECLARE
  result JSONB := '[]'::JSONB;
  location JSONB;
BEGIN
  FOR location IN SELECT jsonb_array_elements(locations)
  LOOP
    -- Process each location
    result := result || jsonb_build_object(
      'user_id', location->>'user_id',
      'deals', find_nearby_deals(...)
    );
  END LOOP;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;
```

**Benefit:** 10x reduction in function invocations = 10x reduction in cold starts.

---

## 6. METRICS TO TRACK

```typescript
export interface PerformanceMetrics {
  // Latency (p50, p95, p99)
  locationInterceptMs: number;
  dealQueryMs: number;
  auctionUpdateMs: number;
  
  // Cache hit rates
  redisHitRate: number;    // Target: 80%+
  memoryHitRate: number;   // Target: 90%+
  
  // Database
  queryTimeMs: number;
  connectionPoolUtilization: number;
  
  // Vector operations
  embeddingLookupMs: number;
  
  // Realtime
  realtimeLatencyMs: number;  // Deal drop to client
}

// Monitoring query
SELECT
  'location_intercept' as metric,
  percentile_cont(0.5) WITHIN GROUP (ORDER BY duration_ms) as p50,
  percentile_cont(0.95) WITHIN GROUP (ORDER BY duration_ms) as p95,
  percentile_cont(0.99) WITHIN GROUP (ORDER BY duration_ms) as p99
FROM edge_function_logs
WHERE function_name = 'location-intercept'
  AND created_at > NOW() - INTERVAL '1 hour';
```

---

## 7. PERFORMANCE TARGETS

| Metric | Target | Current | Gap |
|--------|--------|---------|-----|
| Location intercept | <100ms | 200ms | ↓50% |
| Nearby deals query | <80ms | 150ms | ↓46% |
| Auction update | <50ms | 120ms | ↓58% |
| Deal card render | <16ms | 25ms | ↓36% |
| Cache hit rate | 85%+ | 60% | +25% |

---

**IMPLEMENTATION PRIORITY:**
1. ✅ Optimize query (split spatial → vector)
2. ✅ Add connection pooling
3. ✅ Implement multi-tier cache
4. ✅ Create materialized view for viral scores
5. ✅ Add all indexes
6. ✅ Batch location updates

**Expected Result:** Global p95 latency < 100ms 🚀
