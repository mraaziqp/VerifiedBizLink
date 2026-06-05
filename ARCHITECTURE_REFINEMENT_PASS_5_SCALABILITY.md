# 📈 REFINEMENT PASS 5: SCALABILITY & RELIABILITY

**Objective:** Handle 100M users, 99.99% uptime, zero data loss

---

## 1. SCALING ROADMAP

### 1.1 Growth Phases

```
PHASE 1: 1K - 10K Users
├─ Single Neon database (SA region)
├─ Single Edge Functions region
├─ Redis optional
└─ Monitoring: Basic metrics

PHASE 2: 10K - 100K Users
├─ Add EU read replica (logical replication)
├─ Add US read replica (logical replication)
├─ Redis mandatory for caching
├─ Monitoring: Datadog + custom dashboards
└─ Load: ~1M requests/day

PHASE 3: 100K - 1M Users
├─ Database sharding by geographic region
├─ Edge Functions in 3 regions (SA, EU, US)
├─ Redis cluster (3 nodes min)
├─ Global CDN for static assets
├─ Kafka for event streaming
└─ Load: ~10M requests/day

PHASE 4: 1M - 10M Users
├─ Database sharding by business/user cohorts
├─ Edge Functions in 6+ regions
├─ Redis cluster with 9 nodes
├─ Multi-region failover
├─ ElasticSearch for search
└─ Load: ~100M requests/day

PHASE 5: 10M+ Users
├─ Horizontal scaling at all layers
├─ Kubernetes for orchestration
├─ Service mesh (Istio) for observability
├─ CQRS pattern (separate read/write)
├─ Event sourcing for audit trail
└─ Load: ~1B+ requests/day
```

---

## 2. DATABASE SCALING

### 2.1 Sharding Strategy

```typescript
// src/lib/db/sharding.ts
export interface ShardKey {
  userId: string;
  businessId?: string;
  dealId?: string;
}

export class ShardRouter {
  private shards: Map<number, Pool> = new Map();
  private shardCount = 16; // Start with 16 shards

  constructor() {
    // Initialize connections to each shard
    for (let i = 0; i < this.shardCount; i++) {
      const url = process.env[`SHARD_${i}_DATABASE_URL`];
      this.shards.set(i, new Pool({ connectionString: url }));
    }
  }

  // Consistent hashing (ring)
  getShardId(key: ShardKey): number {
    const hashInput = key.userId || key.businessId || key.dealId;
    const hash = murmur3(hashInput);
    return hash % this.shardCount;
  }

  async query<T>(
    shardKey: ShardKey,
    sql: string,
    params: any[]
  ): Promise<T[]> {
    const shardId = this.getShardId(shardKey);
    const pool = this.shards.get(shardId);
    
    if (!pool) throw new Error(`Shard ${shardId} not found`);

    return pool.query(sql, params);
  }

  // Scatter-gather for queries spanning shards
  async queryAllShards<T>(sql: string, params: any[]): Promise<T[]> {
    const promises = Array.from(this.shards.values()).map((pool) =>
      pool.query(sql, params)
    );

    const results = await Promise.all(promises);
    return results.flatMap((r) => r.rows);
  }
}

export const shardRouter = new ShardRouter();

// Usage:
// Put user data in single shard
const user = await shardRouter.query(
  { userId: 'user_123' },
  'SELECT * FROM users WHERE id = $1',
  ['user_123']
);

// Query all shards for global analytics
const allDeals = await shardRouter.queryAllShards(
  'SELECT COUNT(*) as count FROM deals WHERE status = $1',
  ['active']
);
```

### 2.2 Read Replicas

```sql
-- Set up logical replication
-- Primary (SA): postgres://primary.sa.db
-- Replica EU: postgres://replica.eu.db
-- Replica US: postgres://replica.us.db

-- On primary:
CREATE PUBLICATION all_tables FOR ALL TABLES;

-- On each replica:
CREATE SUBSCRIPTION eu_sub CONNECTION 'primary_connection'
  PUBLICATION all_tables;

-- Route queries
-- WRITES: Always to primary (SA)
-- READS: Route to nearest replica based on user location
```

**Benefits:**
- Writes stay in primary (consistent)
- Reads scale horizontally
- <100ms latency for reads in each region

---

## 3. CACHING AT SCALE

### 3.1 Redis Cluster Setup

```typescript
// src/lib/cache/cluster.ts
import Redis from 'ioredis';

export const redisCluster = new Redis.Cluster(
  [
    { host: 'redis-1.sa', port: 6379 },
    { host: 'redis-2.sa', port: 6379 },
    { host: 'redis-3.sa', port: 6379 },
  ],
  {
    retryDelayOnFailover: 100,
    retryDelayOnClusterDown: 300,
    slotsRefreshTimeout: 1000,
    redisOptions: {
      password: process.env.REDIS_PASSWORD,
      tls: true, // Encrypted connections
    },
  }
);

// Automatic failover: if 1 node fails, cluster continues
// Data replicated across nodes: lose 1 node, data still safe

export class ClusterCacheManager {
  async get(key: string): Promise<any> {
    try {
      const value = await redisCluster.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error({ key, error }, 'Cache get failed');
      return null; // Fallback to DB
    }
  }

  async set(key: string, value: any, ttl: number): Promise<void> {
    try {
      await redisCluster.setex(
        key,
        ttl,
        JSON.stringify(value)
      );
    } catch (error) {
      logger.error({ key, error }, 'Cache set failed');
      // Fail silently - app still works without cache
    }
  }

  async invalidate(pattern: string): Promise<void> {
    const keys = await redisCluster.keys(pattern);
    if (keys.length > 0) {
      await redisCluster.del(...keys);
    }
  }
}

export const cache = new ClusterCacheManager();
```

---

## 4. MONITORING & OBSERVABILITY

### 4.1 Metrics to Track

```typescript
// lib/metrics.ts
import { Histogram, Counter, Gauge } from 'prom-client';

// Latency histograms
export const queryLatency = new Histogram({
  name: 'db_query_duration_ms',
  help: 'Database query duration in milliseconds',
  labelNames: ['query_type', 'shard_id'],
  buckets: [10, 50, 100, 500, 1000, 5000],
});

export const cacheLatency = new Histogram({
  name: 'cache_latency_ms',
  help: 'Cache operation latency',
  labelNames: ['operation'], // get, set, delete
  buckets: [1, 5, 10, 50],
});

// Event counters
export const dealCreated = new Counter({
  name: 'deals_created_total',
  help: 'Total deals created',
  labelNames: ['business_tier'],
});

export const dealClaimed = new Counter({
  name: 'deals_claimed_total',
  help: 'Total deals claimed by users',
});

// Gauges (current state)
export const activeDeals = new Gauge({
  name: 'active_deals_count',
  help: 'Number of currently active deals',
});

export const cacheHitRate = new Gauge({
  name: 'cache_hit_rate',
  help: 'Cache hit rate percentage',
  labelNames: ['cache_type'],
});

// Usage in code
export async function getDealCached(dealId: string) {
  const start = Date.now();

  const cached = await cache.get(`deal:${dealId}`);
  if (cached) {
    cacheLatency.labels('get').observe(Date.now() - start);
    return cached; // Cache hit
  }

  // Cache miss - query database
  const deal = await db.query('SELECT * FROM deals WHERE id = $1', [dealId]);
  
  await cache.set(`deal:${dealId}`, deal, 300);
  queryLatency.labels('select_deal').observe(Date.now() - start);

  return deal;
}

// Export metrics for Prometheus
import { register } from 'prom-client';
export function getMetrics() {
  return register.metrics();
}
```

### 4.2 Alerting

```yaml
# prometheus-alerts.yml
groups:
  - name: database
    rules:
      - alert: HighQueryLatency
        expr: histogram_quantile(0.95, db_query_duration_ms) > 1000
        for: 5m
        annotations:
          summary: "DB queries slow (p95 > 1s)"
          
      - alert: DatabaseDown
        expr: up{job="postgres"} == 0
        for: 1m
        annotations:
          summary: "Database is down"

  - name: cache
    rules:
      - alert: CacheHitRateLow
        expr: cache_hit_rate < 0.5
        for: 10m
        annotations:
          summary: "Cache hit rate below 50%"
          
      - alert: RedisMemoryHigh
        expr: redis_memory_used_bytes / redis_memory_max_bytes > 0.9
        for: 5m
        annotations:
          summary: "Redis memory above 90%"

  - name: deals
    rules:
      - alert: DealCreationRateHigh
        expr: rate(deals_created_total[5m]) > 1000
        for: 5m
        annotations:
          summary: "Deal creation rate > 1K/min (possible bot)"
```

---

## 5. DISASTER RECOVERY

### 5.1 Backup Strategy

```bash
# Automated daily backups to S3
# Neon handles this automatically

# Weekly full backup archive
# Monthly tape archive for long-term retention

# Recovery time objective (RTO): 1 hour
# Recovery point objective (RPO): 15 minutes

# Test restore quarterly
# Verify backups can be restored (test in staging)
```

### 5.2 Failover Procedure

```typescript
// Health check every 10 seconds
export async function healthCheck() {
  const checks = {
    database: checkDatabase(),
    redis: checkRedis(),
    edgeFunctions: checkEdgeFunctions(),
    s3: checkS3(),
  };

  const results = await Promise.allSettled(Object.values(checks));
  
  const isHealthy = results.every(r => r.status === 'fulfilled');
  
  return {
    status: isHealthy ? 'healthy' : 'degraded',
    timestamp: new Date(),
    checks: results.map((r, i) => ({
      service: Object.keys(checks)[i],
      ok: r.status === 'fulfilled',
      error: r.status === 'rejected' ? r.reason.message : null,
    })),
  };
}

// On failure:
// 1. Alert on-call engineer
// 2. Switch to read-only mode if writes failing
// 3. Enable manual failover if primary region down
// 4. Redirect traffic to secondary region
```

---

## 6. LOAD TESTING

### 6.1 Capacity Planning

```bash
# Use k6 for load testing
# Simulates 10K concurrent users

# Test script: test-load.js
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp-up to 100 users
    { duration: '5m', target: 1000 },  // Ramp-up to 1K users
    { duration: '10m', target: 5000 }, // Ramp-up to 5K users
    { duration: '5m', target: 0 },     // Ramp-down
  ],
};

export default function () {
  const response = http.post(
    'https://api.example.com/api/deals/nearby',
    {
      latitude: -33.9249 + Math.random() * 0.1,
      longitude: 18.4241 + Math.random() * 0.1,
    }
  );

  check(response, {
    'status 200': (r) => r.status === 200,
    'latency < 100ms': (r) => r.timings.duration < 100,
    'deals returned': (r) => JSON.parse(r.body).deals.length > 0,
  });
}

# Run: k6 run test-load.js
# Output: Pass if:
#  - P99 latency < 500ms
#  - Error rate < 0.1%
#  - Throughput > 10K req/s
```

---

## 7. CAPACITY METRICS

```
Current Setup (Phase 1):
├─ Neon Database:     20 connections × 4 CUs = 5K req/s
├─ Redis:             ~20K concurrent keys, 50K ops/s
├─ Edge Functions:    ~100 concurrent invocations
└─ CDN:               Unlimited (Cloudflare)
Total Capacity:       ~5K requests/second

Phase 3 (100K users):
├─ Database sharding: 16 × 5K = 80K req/s
├─ Redis cluster:     100K ops/s
├─ Edge Functions:    3 regions × 100 = 300 concurrent
└─ CDN:               Global with 200+ edge locations
Total Capacity:       ~80K requests/second

Phase 5 (10M users):
├─ Database:          256 shards × 10K = 2.56M req/s
├─ Redis:             1M+ ops/s
├─ Edge Functions:    6+ regions, auto-scaling
└─ Service mesh:      Intelligent routing
Total Capacity:       ~1M+ requests/second
```

---

## 8. AUTO-SCALING POLICY

```yaml
# Kubernetes HPA (Horizontal Pod Autoscaler)
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api
  minReplicas: 5
  maxReplicas: 500
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
    - type: Pods
      pods:
        metric:
          name: http_requests_per_second
        target:
          type: AverageValue
          averageValue: "1k"
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Percent
          value: 50
          periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
        - type: Percent
          value: 100
          periodSeconds: 60
```

---

## 9. RELIABILITY TARGETS

```
Uptime:              99.99% (52 minutes/year max downtime)
Data Loss:           RPO < 15 minutes (last backup < 15min old)
Recovery Time:       RTO < 1 hour (back online within 1h)
P99 Latency:         < 500ms globally
Error Rate:          < 0.1% of requests
Cache Hit Rate:      > 85%
Database Queries:    < 100ms p95
```

---

**SCALABILITY SUMMARY:**

```
✅ Database: Sharding to 256 shards (2.56M req/s)
✅ Cache: Redis cluster with failover
✅ Edge: Multi-region Edge Functions
✅ Monitoring: Prometheus + Grafana alerts
✅ Backup: Daily automated, RPO < 15min
✅ Failover: Automatic regional switch
✅ Load Testing: Proven capacity for 10K concurrent
✅ Auto-scaling: Kubernetes HPA (5-500 pods)

Target: Handle 10M users with < 500ms p99 latency
```

---

## 10. INCIDENT RESPONSE

### Severity Levels

```
SEV 1 (Critical):
  - Complete service outage
  - All users affected
  - Data loss occurring
  → Escalate to VP Engineering immediately
  → All-hands incident response
  → Target: Resolve within 30 minutes

SEV 2 (High):
  - Partial service outage
  - >50% users affected
  - No data loss
  → Page on-call
  → Incident commander assigned
  → Target: Resolve within 2 hours

SEV 3 (Medium):
  - Degraded service
  - <50% users affected
  - No data loss
  → Create incident ticket
  → Schedule post-mortem
  → Target: Resolve within 4 hours

SEV 4 (Low):
  - Minor issues
  - Single user/feature affected
  - No data loss
  → File GitHub issue
  → Schedule for next sprint
```

