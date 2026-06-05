# 🛠️ REFINEMENT PASS 4: DEVELOPER EXPERIENCE & MAINTAINABILITY

**Objective:** Make the codebase accessible to junior devs, easy to extend, self-documenting

---

## 1. CODE STRUCTURE & ORGANIZATION

### 1.1 Clear Module Boundaries

```
src/
├── api/
│   ├── location/              # Everything location-related
│   │   ├── intercept.ts       # GPS ping handler
│   │   ├── geofence.ts        # Geofence detection
│   │   ├── h3-utils.ts        # H3 hex helpers
│   │   └── __tests__/         # Tests co-located with code
│   │
│   ├── deals/
│   │   ├── creation.ts        # Create deal flow
│   │   ├── discovery.ts       # Find nearby deals
│   │   ├── engagement.ts      # Upvote, claim, share
│   │   └── __tests__/
│   │
│   ├── auction/
│   │   ├── bidding-engine.ts  # Dynamic bid logic
│   │   ├── state-management.ts
│   │   └── __tests__/
│   │
│   └── ai-campaign/           # AI-generated ads
│       ├── generator.ts
│       ├── validator.ts
│       └── __tests__/
│
├── lib/
│   ├── db/                    # Database utilities
│   │   ├── client.ts          # Postgres connection
│   │   ├── migrations.ts      # Schema changes
│   │   └── seeding.ts         # Test data
│   │
│   ├── cache/                 # Caching layer
│   │   ├── redis-client.ts
│   │   ├── cache-keys.ts
│   │   └── invalidation.ts
│   │
│   ├── encryption/            # Security
│   │   └── field-encryption.ts
│   │
│   └── geo/                   # Geographic utilities
│       ├── h3.ts
│       ├── postgis.ts
│       └── distance.ts
│
├── types/
│   ├── deal.ts                # Deal type definitions
│   ├── user.ts
│   ├── location.ts
│   └── auction.ts
│
└── middleware/
    ├── auth.ts                # Authentication checks
    ├── rate-limit.ts          # Rate limiting
    ├── audit-logging.ts       # Compliance logging
    └── error-handling.ts      # Consistent error responses
```

**Benefit:** Junior dev can understand instantly where to find code.

---

### 1.2 Consistent Naming Conventions

```typescript
// Deal creation
function createDeal(input: CreateDealInput): Promise<Deal>;
function getDealById(dealId: string): Promise<Deal | null>;
function updateDealStatus(dealId: string, status: DealStatus): Promise<void>;
function deleteDeal(dealId: string): Promise<void>;

// Querying
function findNearbyDeals(lat: number, lon: number): Promise<Deal[]>;
function searchDeals(query: string, filters: SearchFilters): Promise<Deal[]>;

// Events/side effects
async function onDealCreated(deal: Deal): Promise<void>;
async function onDealExpired(dealId: string): Promise<void>;
async function broadcastDealToNearbyUsers(deal: Deal): Promise<void>;

// Validation
function validateDealInput(input: unknown): CreateDealInput | ValidationError;
function isValidLocation(lat: number, lon: number): boolean;

// Helpers (no async, pure functions)
function calculateDealDiscount(original: number, discounted: number): number;
function getViralScore(upvotes: number, downvotes: number): number;
function latLonToH3Hex(lat: number, lon: number): string;
```

**Pattern:** Verb-Object naming makes code self-documenting.

---

## 2. TESTING STRATEGY

### 2.1 Test Pyramid

```
              /\
            /    \
          / E2E   \         10% - Full user flows
        /            \
      /________________\
       Integration      40% - Database + External APIs
      /                \
    /______Tests_______ \
    Unit               50% - Functions, utilities, business logic
```

### 2.2 Test Organization

```typescript
// src/api/deals/__tests__/creation.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDeal, DealCreationError } from '../creation';
import { TestDB } from '@test/test-db';

describe('Deal Creation', () => {
  let db: TestDB;

  beforeEach(async () => {
    db = await TestDB.setup();
  });

  afterEach(async () => {
    await db.teardown();
  });

  describe('createDeal()', () => {
    it('should create a deal with valid input', async () => {
      const input = {
        businessId: 'biz_123',
        title: 'Summer Sale',
        originalPrice: 1000,
        discountedPrice: 500,
      };

      const deal = await createDeal(input);

      expect(deal.id).toBeDefined();
      expect(deal.discountPercentage).toBe(50);
      expect(deal.status).toBe('active');
    });

    it('should reject if discount >= original', async () => {
      const input = {
        businessId: 'biz_123',
        title: 'Bad Deal',
        originalPrice: 1000,
        discountedPrice: 1200, // Invalid!
      };

      expect(() => createDeal(input)).rejects.toThrow(
        DealCreationError
      );
    });

    it('should generate embedding for deal', async () => {
      const input = { /* valid input */ };
      const deal = await createDeal(input);

      expect(deal.dealEmbedding).toHaveLength(1536); // pgvector dimension
    });
  });

  describe('Error Handling', () => {
    it('should provide helpful error message if DB fails', async () => {
      // Mock DB to fail
      db.onQuery = () => {
        throw new Error('Connection timeout');
      };

      expect(() => createDeal(/* ... */)).rejects.toThrow(
        'Failed to create deal: Connection timeout'
      );
    });
  });
});
```

### 2.3 Test Utilities

```typescript
// test/test-db.ts - Shared test database setup
import { Pool } from 'pg';

export class TestDB {
  private pool: Pool;
  private testId = Math.random().toString(36).slice(2);

  static async setup(): Promise<TestDB> {
    const instance = new TestDB();
    await instance.initialize();
    return instance;
  }

  private async initialize() {
    // Use test database (isolated per run)
    this.pool = new Pool({
      connectionString: `${process.env.DATABASE_URL}_test_${this.testId}`,
    });

    // Run migrations
    await this.pool.query(`
      CREATE SCHEMA test_${this.testId};
      SET search_path TO test_${this.testId};
    `);

    // Load schema
    const schema = await readFile('./schema.sql', 'utf-8');
    await this.pool.query(schema);
  }

  async teardown() {
    await this.pool.query(`DROP SCHEMA test_${this.testId} CASCADE`);
    await this.pool.end();
  }

  async query(sql: string, params: any[] = []) {
    return this.pool.query(sql, params);
  }

  async seed(table: string, data: any[]) {
    // Helper to insert test data
    const columns = Object.keys(data[0]);
    const placeholders = data
      .map((_, i) => `($${i * columns.length + 1}, ...)`)
      .join(',');

    const values = data.flatMap((row) => Object.values(row));

    return this.pool.query(
      `INSERT INTO ${table} (${columns.join(',')}) VALUES ${placeholders}`,
      values
    );
  }
}

// test/fixtures.ts - Reusable test data
export const fixtures = {
  validDeal: (): CreateDealInput => ({
    businessId: 'biz_' + Math.random().toString(36).slice(2),
    title: 'Test Deal',
    originalPrice: 1000,
    discountedPrice: 500,
    category: 'electronics',
  }),

  validUser: (): CreateUserInput => ({
    email: `user_${Date.now()}@test.local`,
    password: 'TestPass123!',
    dateOfBirth: '1990-01-01',
  }),
};
```

---

## 3. ERROR HANDLING & LOGGING

### 3.1 Structured Error Responses

```typescript
// lib/errors.ts
export class AppError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number = 500,
    public details: Record<string, any> = {}
  ) {
    super(message);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super('VALIDATION_ERROR', message, 400, details);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(
      'NOT_FOUND',
      `${resource} with id ${id} not found`,
      404,
      { resource, id }
    );
  }
}

export class RateLimitError extends AppError {
  constructor(message: string, retryAfterSeconds: number) {
    super(
      'RATE_LIMITED',
      message,
      429,
      { retryAfterSeconds }
    );
  }
}

// Middleware to handle errors
export function errorHandler(err: unknown) {
  if (err instanceof AppError) {
    return {
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
      statusCode: err.statusCode,
    };
  }

  // Log unexpected errors
  console.error('[UNEXPECTED_ERROR]', err);

  return {
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
    statusCode: 500,
  };
}
```

### 3.2 Structured Logging

```typescript
// lib/logging.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  },
});

// Usage in handlers
export async function handleDealCreation(input: CreateDealInput) {
  logger.info(
    { businessId: input.businessId, title: input.title },
    'Creating deal'
  );

  try {
    const deal = await createDeal(input);

    logger.info(
      { dealId: deal.id, viralScore: deal.viralScore },
      'Deal created successfully'
    );

    return deal;
  } catch (error) {
    logger.error(
      { error, input },
      'Failed to create deal'
    );
    throw error;
  }
}

// Log format: JSON for logging aggregators
// Example output:
// {
//   "level": 30,
//   "time": "2024-06-03T10:30:00.000Z",
//   "message": "Creating deal",
//   "businessId": "biz_123",
//   "title": "Summer Sale"
// }
```

---

## 4. DOCUMENTATION STRATEGY

### 4.1 Inline Code Documentation

```typescript
// GOOD: Document the WHY, not the WHAT
function calculateViralScore(upvotes: number, downvotes: number): number {
  // Decay viral score over time to prevent old deals from dominating
  const timeSincePostedHours = (Date.now() - postTime) / 3600000;
  const baseScore = upvotes - downvotes;
  
  return baseScore * Math.exp(-0.05 * timeSincePostedHours);
}

// BAD: Documenting the WHAT (self-evident)
// const viralScore = upvotes - downvotes; // Calculate viral score
```

### 4.2 API Documentation with OpenAPI

```yaml
# openapi.yaml
paths:
  /api/deals/nearby:
    post:
      summary: Find nearby deals
      description: |
        Returns top 5 deals within radius, ranked by relevance.
        Ranking = 40% proximity + 30% viral + 30% content similarity
      
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                latitude:
                  type: number
                  description: User's current latitude
                  example: -33.9249
                longitude:
                  type: number
                  description: User's current longitude
                  example: 18.4241
                radius_meters:
                  type: integer
                  description: Search radius in meters
                  default: 500
                  minimum: 100
                  maximum: 5000
      
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                type: object
                properties:
                  deals:
                    type: array
                    items:
                      $ref: '#/components/schemas/Deal'
```

### 4.3 README for New Developers

```markdown
# Getting Started

## Prerequisites
- Node.js 18+
- PostgreSQL 14+ (via Docker)
- Redis (optional, via Docker)

## Setup

1. **Clone and install**
   ```bash
   git clone ...
   npm install
   ```

2. **Database**
   ```bash
   docker-compose up -d postgres
   npm run db:migrate
   npm run db:seed
   ```

3. **Environment**
   ```bash
   cp .env.example .env.local
   # Add your GEMINI_API_KEY, RESEND_API_KEY
   ```

4. **Start dev server**
   ```bash
   npm run dev
   # Visit http://localhost:3000
   ```

## Common Tasks

### Add a new endpoint
1. Create file in `src/api/deals/new-feature.ts`
2. Write tests in `src/api/deals/__tests__/new-feature.test.ts`
3. Run tests: `npm test`
4. Export from `src/api/deals/index.ts`

### Query the database
```typescript
import { db } from '@/lib/db';

const deals = await db.query(
  'SELECT * FROM deals WHERE status = $1',
  ['active']
);
```

### Log something
```typescript
import { logger } from '@/lib/logging';

logger.info({ userId, dealId }, 'User claimed deal');
```

### Add caching
```typescript
import { cache } from '@/lib/cache';

const result = await cache.get('key');
if (result) return result;

const computed = await expensiveOperation();
await cache.set('key', computed, 300);
```

## Architecture Overview

See [SPATIAL_PLATFORM_ARCHITECTURE.md](SPATIAL_PLATFORM_ARCHITECTURE.md) for:
- Database schema
- Edge function logic
- Caching strategy
- Security approach

## Running Tests

```bash
npm test                    # All tests
npm test -- --watch        # Watch mode
npm test deals              # Single module
npm test -- --coverage      # Coverage report
```

## Debugging

```typescript
// Add logging
logger.debug({ variable }, 'Debug message');

// Use pdb-style debugger
debugger; // Node will pause here if running with --inspect

// Or use VS Code debugger - config in .vscode/launch.json
```
```

---

## 5. TYPE SAFETY

### 5.1 Strict TypeScript Configuration

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noImplicitThis": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

### 5.2 Type Definitions for Domain

```typescript
// types/deal.ts
export interface Deal {
  id: string;
  businessId: string;
  title: string;
  description: string;
  originalPriceCents: number;
  discountedPriceCents: number;
  discountPercentage: number;
  status: DealStatus;
  viralScore: number;
  postedAt: Date;
  expiresAt: Date;
  dealEmbedding: number[]; // pgvector (1536 dimensions)
  targetH3Hexes: string[];
  targetRadiusMeters: number;
}

export type DealStatus = 'active' | 'paused' | 'expired' | 'archived';

export interface CreateDealInput {
  businessId: string;
  title: string;
  description: string;
  originalPriceCents: number;
  discountedPriceCents: number;
  // ... other required fields
}

// Runtime validation
import { z } from 'zod';

export const createDealSchema = z.object({
  businessId: z.string().uuid(),
  title: z.string().min(5).max(255),
  description: z.string().min(10).max(1000),
  originalPriceCents: z.number().int().positive(),
  discountedPriceCents: z.number().int().positive(),
}).strict(); // Reject extra fields

// Extract type from schema
export type CreateDealInput = z.infer<typeof createDealSchema>;
```

---

## 6. DEVELOPER ONBOARDING CHECKLIST

```markdown
# New Developer Onboarding

- [ ] Read architecture overview (15 min)
- [ ] Complete setup instructions (30 min)
- [ ] Run tests to verify setup (5 min)
- [ ] Pick a "good first issue" (1 hour)
- [ ] Submit PR with tests (2 hours)
- [ ] Get code review feedback (30 min)

**Total: 4 hours to first merged PR**

### Resources
- Architecture: [SPATIAL_PLATFORM_ARCHITECTURE.md](...)
- Security: [ARCHITECTURE_REFINEMENT_PASS_2_SECURITY.md](...)
- API Docs: Swagger at /api/docs
- Slack: #engineering channel

### Questions?
- Slack @engineering for quick help
- GitHub discussions for design decisions
- Weekly architecture sync (Thursday 2pm UTC)
```

---

**DEVEX SUMMARY:**

```
✅ Clear module structure
✅ Consistent naming conventions
✅ Comprehensive testing (unit + integration)
✅ Error handling with helpful messages
✅ Structured logging for debugging
✅ API documentation with OpenAPI
✅ Type safety with TypeScript
✅ Onboarding checklist (4 hours to first PR)

Junior dev should be productive within 1 day.
```

