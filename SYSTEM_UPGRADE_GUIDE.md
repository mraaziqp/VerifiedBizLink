# 🚀 VerifiedBizLink System Upgrade Guide

## Phase 1: Foundation Layer ✅ COMPLETE

### What's Been Implemented

#### 1. **Date of Birth Field on Signup** ✅
- New date input field on `/signup` page
- Validation: users cannot select future dates
- Stored securely in `date_of_birth` column
- Explanation: "We use this to verify eligibility for age-restricted promotions"

**Files Modified:**
- `src/app/signup/page.tsx` — Added DOB input field
- `src/app/api/auth/signup/route.ts` — Added dateOfBirth parameter

#### 2. **Age Calculator Utility** ✅
- `src/lib/age-calculator.ts` — Complete age calculation library

```typescript
calculateAge(dateOfBirth)  // Returns: number
isOldEnough(dateOfBirth, minAge)  // Returns: boolean
formatDOB(dateOfBirth)  // Returns: formatted string
getAgeCategory(dateOfBirth)  // Returns: age demographic
isValidDOB(dateOfBirth)  // Returns: validation result
```

**Usage Example:**
```typescript
import { calculateAge, isOldEnough } from '@/lib/age-calculator';

const age = calculateAge('1990-05-15'); // 34
const canViewWineAds = isOldEnough('1990-05-15', 21); // true
```

#### 3. **Business Tier System** ✅
- `src/lib/tier-features.ts` — Complete tier configuration

**Tiers Available:**
| Tier | Price | Listings | Ads | Storage | Support | Exposure |
|------|-------|----------|-----|---------|---------|----------|
| Free | R0 | 1 | 0 | 1GB | None | 0.5x |
| Standard | R49.99/mo | 5 | 5 | 10GB | Email | 1.0x |
| Premium | R99.99/mo | 20 | Unlimited | 100GB | Phone 24/7 | 1.5x |
| Enterprise | Custom | Unlimited | Unlimited | 1TB | Dedicated | 2.0x |

**Usage Example:**
```typescript
import { getTierByName, hasTierFeature, formatPrice } from '@/lib/tier-features';

const tier = getTierByName('premium');
const hasApi = hasTierFeature('premium', 'apiAccess'); // true
const price = formatPrice(9999); // "R99.99"
```

#### 4. **Admin Dashboard - 3 Personas** ✅

**Orchestrator Portal** (`/admin/orchestrator`)
- **Color Scheme:** Gold & Obsidian
- **Focus:** Business metrics & revenue
- **Features:**
  - Revenue trend charts (monthly tracking)
  - Business tier distribution (pie chart)
  - Key metrics: Users, Businesses, Health, Revenue
  - Tier breakdown with per-tier revenue
  - Quick actions: Export reports, view businesses

**Architect Portal** (`/admin/architect`)
- **Color Scheme:** Neon Green & Charcoal
- **Focus:** System configuration & algorithms
- **Features:**
  - Infrastructure monitoring (DB, API, cache)
  - Feature flag toggles (enable/disable features)
  - ML algorithm management & versioning
  - Targeting rule configuration
  - System health alerts

**Enforcer Portal** (`/admin/enforcer`)
- **Color Scheme:** Crimson Red & Gunmetal
- **Focus:** Content moderation & compliance
- **Features:**
  - Content review queue (approve/reject)
  - Fraud alert system (high/medium severity)
  - Compliance checklist (POPI, Age, Content Policy)
  - Tabbed interface (Content/Fraud/Compliance)
  - Action audit log

---

## Phase 2: Advertisement System (Coming Next)

### Overview
Complete ad creation, management, and delivery system with targeting rules and analytics.

### Key Components

#### 2.1 Ad Creation Wizard
- Multi-step form: Type → Content → Targeting → Scheduling → Budget
- Ad types: Product, Service, Promotion, Event
- Real-time preview of targeting reach

#### 2.2 Ad Management Dashboard
- View all ads with performance metrics
- Edit/pause/resume/duplicate ads
- Schedule ads for future dates
- Set daily and monthly budgets
- Track spend vs. budget

#### 2.3 Ad Analytics
- Real-time impressions tracking
- Click-through rate (CTR)
- Conversion tracking
- ROI calculations
- Performance by targeting segment

#### 2.4 Ad Targeting Rules
- Categories & industries
- Locations (cities/provinces)
- Age ranges
- Custom interests
- Geo-fence radius (in km)

### Database Schema
```sql
-- Advertisements table
CREATE TABLE advertisements (
  id UUID PRIMARY KEY,
  business_id UUID REFERENCES businesses,
  title VARCHAR(200),
  description TEXT,
  ad_type VARCHAR(50), -- product, service, promotion, event
  image_url VARCHAR(500),
  budget_cents INTEGER,
  daily_budget_cents INTEGER,
  is_active BOOLEAN,
  scheduled_start TIMESTAMP,
  scheduled_end TIMESTAMP,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Targeting rules
CREATE TABLE ad_targeting_rules (
  id UUID PRIMARY KEY,
  ad_id UUID REFERENCES advertisements,
  target_categories TEXT[],
  target_locations TEXT[],
  target_min_age INTEGER,
  target_max_age INTEGER,
  target_geo_radius_km INTEGER
);

-- Analytics
CREATE TABLE ad_analytics (
  id UUID PRIMARY KEY,
  ad_id UUID REFERENCES advertisements,
  date DATE,
  impressions INTEGER,
  clicks INTEGER,
  conversions INTEGER,
  spend_cents INTEGER
);
```

### New API Endpoints
```
POST /api/ads                          Create new ad
GET /api/ads                           List user's ads
PUT /api/ads/[id]                      Update ad
DELETE /api/ads/[id]                   Delete ad
POST /api/ads/[id]/pause               Pause ad
POST /api/ads/[id]/resume              Resume ad
GET /api/ads/[id]/analytics            Get ad analytics
PUT /api/ads/[id]/targeting            Update targeting
GET /api/ads/[id]/targeting/preview    Preview reach
```

### Timeline: 2-3 weeks

---

## Phase 3: Location Services & GPS Targeting

### Overview
Real-time location tracking with geo-fenced ads and nearby business discovery.

### Key Features
- User location permission system (precise vs. approximate)
- Geo-fenced ads (show ads within X km of location)
- "Nearby deals" notifications
- Location-based business discovery
- Frequency capping (don't spam notifications)

### Database Schema
```sql
CREATE TABLE user_locations (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users,
  latitude FLOAT,
  longitude FLOAT,
  accuracy_meters FLOAT,
  is_precise BOOLEAN,
  last_updated TIMESTAMP
);

CREATE TABLE location_permissions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users,
  permission_level VARCHAR(20), -- none, approximate, precise
  granted_at TIMESTAMP
);

CREATE TABLE notification_frequency_cap (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users,
  notification_type VARCHAR(50),
  last_sent_at TIMESTAMP,
  count_today INTEGER
);
```

### New API Endpoints
```
POST /api/location/request-permission    Request location access
POST /api/location/update                Update user location
GET /api/location/nearby-businesses      Find nearby businesses
GET /api/notifications/nearby-deals      Get nearby promotions
```

### Timeline: 2 weeks

---

## Phase 4: ML Algorithms & Recommendations

### Overview
Intelligent recommendation engine, fraud detection, and fair exposure algorithm.

### Components

#### 4.1 Recommendation Engine
- Content-based filtering (similar categories)
- Collaborative filtering (user behavior patterns)
- Hybrid scoring (60% content, 40% collaborative)
- Daily batch recalculation

#### 4.2 Fraud Detection
- Click fraud detection (pattern analysis)
- Unusual spend patterns
- Content policy violations
- Automated flagging & investigation queue

#### 4.3 Fair Exposure Algorithm
- Track impressions per business per category
- Prevent monopolization (cap at 30% of impressions)
- Weight calculation for ad placement
- Daily recalculation at 2 AM UTC

#### 4.4 Business Similarity Matching
- Calculate similarity scores between businesses
- Used for: Related business recommendations, competitive analysis
- Cached for performance

### Database Schema
```sql
CREATE TABLE user_interactions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users,
  business_id UUID REFERENCES businesses,
  ad_id UUID REFERENCES advertisements,
  interaction_type VARCHAR(50), -- view, click, purchase, share
  engagement_score FLOAT,
  created_at TIMESTAMP
);

CREATE TABLE business_similarity (
  id UUID PRIMARY KEY,
  business_a_id UUID REFERENCES businesses,
  business_b_id UUID REFERENCES businesses,
  similarity_score FLOAT,
  reason TEXT,
  last_calculated TIMESTAMP
);

CREATE TABLE ad_fraud_flags (
  id UUID PRIMARY KEY,
  ad_id UUID REFERENCES advertisements,
  flag_type VARCHAR(50),
  severity VARCHAR(20), -- low, medium, high
  flagged_at TIMESTAMP,
  status VARCHAR(20) -- open, investigating, resolved
);

CREATE TABLE ad_exposure_state (
  id UUID PRIMARY KEY,
  business_id UUID REFERENCES businesses,
  category VARCHAR(100),
  impressions_this_week INTEGER,
  fair_share_percentage FLOAT,
  is_monopolizing BOOLEAN,
  last_recalculated TIMESTAMP
);
```

### Timeline: 3 weeks

---

## Phase 5: Admin Dashboard Final Upgrades

### Orchestrator Enhancements
- Detailed revenue breakdowns
- Cohort analysis (retention, churn)
- Business health scores
- Growth projections
- Tier upgrade/downgrade trends

### Architect Enhancements
- Algorithm performance dashboards
- A/B testing framework
- Performance optimization recommendations
- Data warehouse integration
- Custom report builder

### Enforcer Enhancements
- Advanced moderation dashboard
- User behavior analytics
- Repeat violation tracking
- Appeal management system
- Compliance audit logs

### Timeline: 2 weeks

---

## Database Migration Checklist

### Before Going Live
```sql
-- Run migrations in order:
1. Add columns to users table
   ALTER TABLE users ADD COLUMN date_of_birth DATE;
   ALTER TABLE users ADD COLUMN age_verified BOOLEAN DEFAULT FALSE;

2. Create business_tiers table
   CREATE TABLE business_tiers (...)

3. Create advertisement tables
   CREATE TABLE advertisements (...)
   CREATE TABLE ad_targeting_rules (...)
   CREATE TABLE ad_analytics (...)

4. Create location tables
   CREATE TABLE user_locations (...)
   CREATE TABLE location_permissions (...)
   CREATE TABLE notification_frequency_cap (...)

5. Create recommendation tables
   CREATE TABLE user_interactions (...)
   CREATE TABLE business_similarity (...)

6. Create fraud/compliance tables
   CREATE TABLE ad_fraud_flags (...)
   CREATE TABLE ad_exposure_state (...)

7. Create indexes
   CREATE INDEX idx_ads_business_id ON advertisements(business_id);
   CREATE INDEX idx_user_locations_user_id ON user_locations(user_id);
   -- etc...
```

### Zero-Downtime Deployment Strategy
1. Deploy code with feature flags disabled
2. Run migrations in staging
3. Verify with production-like data
4. Use blue-green deployment
5. Enable feature flags gradually
6. Monitor for issues before full rollout

---

## Environment Variables Required

```bash
# Ad System
MAX_ADS_PER_BUSINESS=50
DEFAULT_DAILY_BUDGET_CENTS=500
DEFAULT_MONTHLY_BUDGET_CENTS=10000
AD_APPROVAL_REQUIRED=true
AD_FRAUD_CHECK_ENABLED=true

# Location Services
NEXT_PUBLIC_MAP_API_KEY=           # Google Maps or Mapbox
MAX_LOCATION_HISTORY_RECORDS=100
DEFAULT_NEARBY_RADIUS_KM=10

# Recommendation Engine
ML_MODEL_UPDATE_INTERVAL_HOURS=24
RECOMMENDATION_ENGINE_VERSION=1
USE_COLLABORATIVE_FILTERING=true
USE_CONTENT_BASED_FILTERING=true

# Admin System
ADMIN_PERSONAS_ENABLED=true
AUDIT_LOG_RETENTION_DAYS=90

# Notifications
NOTIFICATION_FREQUENCY_CAP_DEFAULT=daily
GEO_NOTIFICATION_DEBOUNCE_MS=300000
```

---

## Testing Strategy

### Unit Tests
- Age calculator edge cases
- Tier feature lookups
- Distance calculations (haversine)
- Fraud detection logic
- Fair exposure weighting

### Integration Tests
- Ad creation → targeting → impression logging → analytics
- Location permission → nearby businesses display
- Tier upgrade → feature unlock
- User interaction logging → recommendations

### E2E Tests
- Business: Create ad → set targeting → view analytics
- User: Grant location → see nearby deals
- Admin: Review content → approve/reject

---

## Performance Optimization

### Caching Strategy
- Tier features: 5 min TTL
- Targeting rules: 1 hour TTL
- User preferences: 30 min TTL
- Nearby businesses index: 15 min TTL
- Algorithm models: Daily batch

### Database Optimization
- Aggressive indexing on ad_id, business_id, user_id
- Partitioning ad_analytics by date (for time-series queries)
- Data warehouse for analytics (separate from OLTP)
- Rollup tables for daily/weekly summaries

### Query Optimization
- Batch impression logging (async, debounced)
- Cron job for daily analytics rollups
- Pre-calculated exposure scores

---

## Monitoring & Alerts

### Metrics to Track
- Ad impressions per day
- Click-through rate (CTR)
- Conversion rate
- Cost per click (CPC)
- Cost per acquisition (CPA)
- Fraud detection rate
- Content approval rate
- System error rate

### Alerts to Set Up
- Unusual spend spike (> 200% daily average)
- High fraud detection rate (> 5%)
- Content approval backlog (> 10 pending)
- Location tracking failures (> 1%)
- Algorithm performance degradation

---

## Success Metrics

### Phase 1
- ✅ All new fields accessible
- ✅ Admin dashboards loading
- ✅ No performance degradation

### Phase 2
- 50+ ads created in first week
- 1,000+ daily impressions
- <10% fraudulent ads detected

### Phase 3
- 25% of users grant location permission
- 100+ nearby deals delivered daily
- <5% notification spam complaints

### Phase 4
- 30% improvement in ad click-through rate
- <1% fraud false positive rate
- All tiers equally visible (fair exposure)

### Phase 5
- Admin operational efficiency +40%
- Compliance audit 100% passing
- Zero data breaches

---

## Next Immediate Steps

1. **Test Signup with DOB**
   ```bash
   Go to: http://localhost:9002/signup
   Fill in date of birth
   Verify it saves
   ```

2. **Test Admin Dashboards**
   ```bash
   Login with: mraaziqp@gmail.com
   Visit: http://localhost:9002/admin
   Should redirect to: http://localhost:9002/admin/orchestrator
   Try: architect/enforcer routes
   ```

3. **Deploy & Test on Production**
   - Merge to main (done ✅)
   - Redeploy on Vercel
   - Test with real users

4. **Gather Feedback**
   - Admin feedback on dashboard usability
   - User feedback on DOB collection
   - Performance metrics

---

## Questions & Support

- **Admin Portal Issues?** Check your email domain for persona detection
- **Tier System Customization?** Edit `src/lib/tier-features.ts`
- **Need to Debug?** Check network tab in dev tools (F12)
- **Building the APK?** Tier system setup is prerequisite for mobile

---

**Status:** Phase 1 ✅ COMPLETE | Phase 2-5 PLANNED
**Last Updated:** June 3, 2026
**Next Milestone:** Phase 2 (Ad System) - June 10, 2026
