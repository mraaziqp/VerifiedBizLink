# Monitoring System - Quick Start Guide

Your centralized log ingestion and monitoring system is now ready! 🎉

## What You've Built

A complete monitoring infrastructure where:
- ✅ All your apps send logs to `https://verifiedbizlink.co.za/api/logs/ingest`
- ✅ Real-time alerts trigger when issues occur
- ✅ Dashboard at `https://verifiedbizlink.co.za/admin/monitoring` shows everything
- ✅ Claude agents can receive alerts and help fix issues

## Setup Steps (5 minutes)

### 1. Initialize the Database

```bash
# Navigate to the VerifiedBizLink directory
cd k:/Projects/VerifiedBizLink

# Apply database migration
psql $DATABASE_URL < migrations/007_monitoring_system.sql

# OR if using Neon:
psql "postgresql://user:password@host/database" < migrations/007_monitoring_system.sql
```

### 2. Generate Your First API Key

Run the setup script:

```bash
npm run typecheck  # Verify TypeScript
npx tsx scripts/setup-monitoring.ts
```

This will output your API key. **Save it securely!**

### 3. Test the Ingestion API

```bash
# Replace with your actual API key
API_KEY="vbz_your_key_here"

curl -X POST https://verifiedbizlink.co.za/api/logs/ingest \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "appName": "test-app",
    "environment": "production",
    "logLevel": "ERROR",
    "message": "Test error message"
  }'
```

Expected response:
```json
{
  "success": true,
  "logId": "uuid-here",
  "timestamp": "2026-07-10T12:00:00Z"
}
```

### 4. View in Dashboard

Visit: `https://verifiedbizlink.co.za/admin/monitoring`

You should see your test log in the "Logs" tab!

## API Endpoints

### Ingestion (Your apps use this)
```
POST /api/logs/ingest
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

Body:
{
  "appName": "your-app",
  "environment": "production",
  "logLevel": "ERROR",           // INFO, WARN, ERROR, FATAL, DEBUG
  "message": "what happened",
  "errorCode": "ERR_DB_001",     // optional
  "errorStack": "...",           // optional
  "endpoint": "/api/users",      // optional
  "method": "GET",               // optional
  "statusCode": 500,             // optional
  "responseTimeMs": 5000,        // optional
  "userId": "user-123",          // optional
  "metadata": {                  // optional custom data
    "database": "prod-db"
  }
}
```

### Fetch Logs (Admin/Monitoring service)
```
GET /api/logs/ingest
Query params:
  - appName: filter by app
  - logLevel: filter by level (INFO, WARN, ERROR, FATAL, DEBUG)
  - limit: 1-1000 (default 100)
  - offset: pagination (default 0)
  - hours: lookback window (default 24)
```

### API Key Management (Admin only)
```
POST /api/admin/api-keys - Create key
GET /api/admin/api-keys - List keys
PUT /api/admin/api-keys/{id} - Activate/deactivate
DELETE /api/admin/api-keys/{id} - Revoke
```

### Alert Management (Admin only)
```
POST /api/admin/alerts - Create rule
GET /api/admin/alerts - Get rules/alerts
PUT /api/admin/alerts/{id} - Acknowledge/resolve
```

## Integrate with Your External Apps

### Option 1: Using the Client Library (Recommended)

Copy the monitoring client to your external app:

```typescript
// Copy src/lib/monitoring-client.ts to your app

import MonitoringClient from './monitoring-client';

const monitor = new MonitoringClient(
  process.env.MONITORING_API_KEY,
  'my-app',
  'production'
);

// Log errors
try {
  // your code
} catch (error) {
  await monitor.error('Something failed', {
    userId: user.id,
    endpoint: '/api/users',
    statusCode: 500
  });
}

// Log HTTP requests
await monitor.logRequest(
  '/api/data',
  'GET',
  200,
  145,
  user.id
);
```

### Option 2: Direct HTTP (Any Language)

```bash
# JavaScript/Node.js
const API_KEY = 'vbz_your_key';

fetch('https://verifiedbizlink.co.za/api/logs/ingest', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    appName: 'my-app',
    logLevel: 'ERROR',
    message: 'Error message'
  })
});
```

```python
# Python
import requests

API_KEY = 'vbz_your_key'

requests.post(
  'https://verifiedbizlink.co.za/api/logs/ingest',
  headers={
    'Authorization': f'Bearer {API_KEY}',
    'Content-Type': 'application/json'
  },
  json={
    'appName': 'my-app',
    'logLevel': 'ERROR',
    'message': 'Error message'
  }
)
```

```go
// Go
package main

import (
  "net/http"
  "bytes"
  "encoding/json"
)

client := &http.Client{}
data := map[string]string{
  "appName": "my-app",
  "logLevel": "ERROR",
  "message": "Error message",
}

body, _ := json.Marshal(data)
req, _ := http.NewRequest("POST", "https://verifiedbizlink.co.za/api/logs/ingest", bytes.NewBuffer(body))
req.Header.Set("Authorization", "Bearer vbz_your_key")
req.Header.Set("Content-Type", "application/json")
client.Do(req)
```

## Dashboard Features

### 🚨 Alerts Tab
- View all triggered alerts
- See error logs that triggered them
- Acknowledge / Resolve
- View agent-suggested fixes
- Status: Open → Acknowledged → Resolved

### 📋 Logs Tab
- Real-time log stream
- Filter by app, level, time
- See response times, status codes
- Search through log messages

### 🔑 API Keys Tab
- Create new API keys for apps
- See key status and usage
- Revoke/deactivate keys
- Expiration management

### 📊 Stats Tab
- Open alert count
- Recent error count
- Active API keys
- Quick health check

## Alert Rules (Optional)

Create rules to automatically alert on patterns:

```bash
curl -X POST https://verifiedbizlink.co.za/api/admin/alerts \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Too many database errors",
    "appName": "my-app",
    "logLevel": "ERROR",
    "condition": "count_exceeds",
    "threshold": 5,
    "timeWindowMinutes": 5,
    "enabled": true
  }'
```

Conditions:
- `count_exceeds` - Alert if N errors in time window
- `response_time_exceeds` - Alert if responses > N ms
- `error_rate_exceeds` - Alert if error rate > N%

## Architecture Diagram

```
External Apps                VerifiedBizLink
───────────────              ──────────────

app-1 ─┐
       ├─→ POST /api/logs/ingest ──→ application_logs table
app-2 ─┤                              │
       │                              ├─→ Alert Engine
app-3 ─┘                              │
                                      └─→ /admin/monitoring (Dashboard)
```

## Files Created

```
migrations/007_monitoring_system.sql   - Database schema
src/app/api/logs/ingest/route.ts        - Log ingestion endpoint
src/app/api/admin/api-keys/route.ts     - API key management
src/app/api/admin/alerts/route.ts       - Alert management
src/app/admin/monitoring/page.tsx       - Dashboard UI
src/lib/monitoring-client.ts            - Client library for apps
scripts/setup-monitoring.ts             - Setup script
MONITORING_SETUP.md                     - Full documentation
```

## Environment Variables

In your external apps' `.env` files:

```bash
# For sending logs
MONITORING_API_KEY=vbz_your_api_key_here
MONITORING_ENDPOINT=https://verifiedbizlink.co.za/api/logs/ingest
MONITORING_APP_NAME=your-app-name
```

## Troubleshooting

**❌ "Invalid API key" error**
- Check key format: should start with `vbz_`
- Verify it's in the Authorization header as `Bearer key`
- Check the key hasn't been revoked

**❌ No logs appearing in dashboard**
- Verify API key is active
- Check app name matches
- Ensure logs were sent with correct environment

**❌ Alerts not triggering**
- Check alert rule is enabled
- Verify threshold and time window
- Check error count exceeds threshold

## Next Steps

1. ✅ Database initialized
2. ✅ API key generated
3. ✅ Ingestion endpoint ready
4. 👉 **Start sending logs from your apps**
5. 👉 Create alert rules for important patterns
6. 👉 Set up agent integration for auto-fixes

## Support

For issues or questions, check:
1. MONITORING_SETUP.md - Full API documentation
2. src/lib/monitoring-client.ts - Client library examples
3. The dashboard for real-time log inspection

---

**Dashboard URL:** https://verifiedbizlink.co.za/admin/monitoring

Happy monitoring! 🚀
