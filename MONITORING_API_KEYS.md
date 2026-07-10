# 🔐 Monitoring System API Keys & Setup

## Your Monitoring System is Ready! 🎉

Here's everything you need to get started with your centralized log ingestion system.

---

## 📋 What Was Built

```
Your Apps → VerifiedBizLink (Central Hub)
            ├── /api/logs/ingest (sends logs here)
            ├── /admin/monitoring (view logs & alerts)
            ├── Alert Rules (auto-trigger on patterns)
            └── API Keys (authentication)
            
Separate Monitoring Service (your agent system)
            ├── Reads logs via /api/logs/ingest
            ├── Triggers Claude agents on alerts
            ├── Can auto-fix code issues
            └── Sends alerts back to dashboard
```

---

## 🚀 Quick Setup (Step-by-Step)

### Step 1: Apply Database Migration

Run this SQL against your Neon database:

```sql
-- Copy & paste this into your Neon SQL editor
-- or run: psql $DATABASE_URL < migrations/007_monitoring_system.sql

-- API Keys table (for authentication)
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  key_hash VARCHAR(255) NOT NULL UNIQUE,
  app_name VARCHAR(255) NOT NULL,
  environment VARCHAR(50) DEFAULT 'production',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMPTZ
);

-- Application logs table (ingestion endpoint writes here)
CREATE TABLE IF NOT EXISTS application_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
  app_name VARCHAR(255) NOT NULL,
  environment VARCHAR(50) DEFAULT 'production',
  log_level VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  error_code VARCHAR(50),
  error_stack TEXT,
  endpoint VARCHAR(255),
  method VARCHAR(10),
  status_code INTEGER,
  response_time_ms INTEGER,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  indexed_at TIMESTAMPTZ
);

-- Alert rules table
CREATE TABLE IF NOT EXISTS alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  app_name VARCHAR(255),
  log_level VARCHAR(20),
  error_code_pattern VARCHAR(255),
  condition VARCHAR(50),
  threshold INTEGER,
  time_window_minutes INTEGER DEFAULT 5,
  enabled BOOLEAN DEFAULT TRUE,
  notify_admin BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alerts table
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID REFERENCES alert_rules(id) ON DELETE CASCADE,
  app_name VARCHAR(255) NOT NULL,
  severity VARCHAR(20),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  affected_users INTEGER DEFAULT 0,
  log_samples JSONB DEFAULT '[]',
  status VARCHAR(50) DEFAULT 'open',
  acknowledged_by UUID REFERENCES users(id) ON DELETE SET NULL,
  acknowledged_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  agent_suggested_fix TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_app_name ON api_keys(app_name);
CREATE INDEX IF NOT EXISTS idx_logs_app_name ON application_logs(app_name);
CREATE INDEX IF NOT EXISTS idx_logs_level ON application_logs(log_level);
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON application_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at DESC);
```

### Step 2: Generate First API Key

Run this script to generate and display your first API key:

```bash
cd k:/Projects/VerifiedBizLink
npx tsx scripts/setup-monitoring.ts
```

This will output something like:
```
🔑 Your API Key (save this securely!):
   vbz_abcdef123456...
```

**⚠️ SAVE THIS KEY - IT'S ONLY SHOWN ONCE!**

### Step 3: Test It Works

```bash
# Replace with your actual key
API_KEY="vbz_your_key_here"

curl -X POST https://verifiedbizlink.co.za/api/logs/ingest \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "appName": "test-app",
    "environment": "production",
    "logLevel": "ERROR",
    "message": "Test log entry"
  }'
```

Should return:
```json
{
  "success": true,
  "logId": "uuid-here",
  "timestamp": "2026-07-10T12:00:00Z"
}
```

### Step 4: View in Dashboard

Visit: **`https://verifiedbizlink.co.za/admin/monitoring`**

You should see your test log in the Logs tab! ✅

---

## 🔑 API Key Management

### Create Additional Keys

```bash
curl -X POST https://verifiedbizlink.co.za/api/admin/api-keys \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "App2 Production",
    "appName": "my-second-app",
    "environment": "production",
    "expiresInDays": 90
  }'
```

### List All Keys

```bash
curl https://verifiedbizlink.co.za/api/admin/api-keys \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### Deactivate a Key

```bash
curl -X PUT https://verifiedbizlink.co.za/api/admin/api-keys/{KEY_ID} \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"active": false}'
```

### Revoke a Key

```bash
curl -X DELETE https://verifiedbizlink.co.za/api/admin/api-keys/{KEY_ID} \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

---

## 📨 Sending Logs from Your Apps

### JavaScript/Node.js

```javascript
const API_KEY = process.env.MONITORING_API_KEY;

async function sendLog(message, level = 'INFO') {
  const response = await fetch('https://verifiedbizlink.co.za/api/logs/ingest', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      appName: 'my-app',
      environment: process.env.NODE_ENV || 'production',
      logLevel: level,
      message: message,
      userId: req.user?.id,
      endpoint: req.path,
      method: req.method,
      statusCode: res.statusCode,
      responseTimeMs: Date.now() - req.startTime
    })
  });
  
  return await response.json();
}

// Usage
try {
  // your code
} catch (error) {
  await sendLog(`Error: ${error.message}`, 'ERROR');
}
```

### Python

```python
import requests
import os

API_KEY = os.getenv('MONITORING_API_KEY')

def send_log(message, level='INFO', **kwargs):
    response = requests.post(
        'https://verifiedbizlink.co.za/api/logs/ingest',
        headers={
            'Authorization': f'Bearer {API_KEY}',
            'Content-Type': 'application/json'
        },
        json={
            'appName': 'my-app',
            'environment': os.getenv('ENVIRONMENT', 'production'),
            'logLevel': level,
            'message': message,
            **kwargs
        }
    )
    return response.json()

# Usage
try:
    # your code
except Exception as e:
    send_log(str(e), 'ERROR')
```

### Go

```go
package main

import (
    "bytes"
    "encoding/json"
    "net/http"
    "os"
)

func sendLog(message, level string) error {
    apiKey := os.Getenv("MONITORING_API_KEY")
    
    data := map[string]interface{}{
        "appName": "my-app",
        "environment": "production",
        "logLevel": level,
        "message": message,
    }
    
    body, _ := json.Marshal(data)
    
    req, _ := http.NewRequest("POST", 
        "https://verifiedbizlink.co.za/api/logs/ingest", 
        bytes.NewBuffer(body))
    
    req.Header.Set("Authorization", "Bearer "+apiKey)
    req.Header.Set("Content-Type", "application/json")
    
    client := &http.Client{}
    _, err := client.Do(req)
    return err
}
```

### Using Client Library (Recommended)

Copy `src/lib/monitoring-client.ts` to your app:

```typescript
import MonitoringClient from './monitoring-client';

const monitor = new MonitoringClient(
  process.env.MONITORING_API_KEY!,
  'my-app',
  'production'
);

// Simple usage
await monitor.error('Something went wrong');

// With context
await monitor.error('Database connection failed', {
  userId: user.id,
  endpoint: '/api/data',
  statusCode: 500,
  metadata: { database: 'prod-db' }
});

// Log HTTP requests
await monitor.logRequest(
  '/api/users',
  'GET',
  200,
  145,  // response time ms
  user.id
);
```

---

## 📊 Log Format

All logs sent to the system follow this format:

```json
{
  "appName": "string (required)",
  "environment": "production|staging|development",
  "logLevel": "INFO|WARN|ERROR|FATAL|DEBUG",
  "message": "what happened (required)",
  "errorCode": "ERR_CODE_123 (optional)",
  "errorStack": "stack trace (optional)",
  "endpoint": "/api/path (optional)",
  "method": "GET (optional)",
  "statusCode": 500,
  "responseTimeMs": 1234,
  "userId": "user-uuid (optional)",
  "metadata": {
    "custom": "data",
    "nested": { "values": "ok" }
  }
}
```

---

## 🚨 Alert Rules

Create automated alerts for error patterns:

```bash
curl -X POST https://verifiedbizlink.co.za/api/admin/alerts \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Too many errors",
    "appName": "my-app",
    "logLevel": "ERROR",
    "condition": "count_exceeds",
    "threshold": 10,
    "timeWindowMinutes": 5,
    "enabled": true
  }'
```

When triggered, the alert appears in the dashboard with:
- Error logs that triggered it
- Option to acknowledge/resolve
- Agent can attach suggested fixes

---

## 🤖 Agent Integration

Your separate monitoring service can:

1. **Fetch logs** via `/api/logs/ingest?appName=my-app&hours=1`
2. **Get triggered alerts** via `/api/admin/alerts?type=triggered&status=open`
3. **Call Claude agent** with error details
4. **Update alerts** with suggested fixes via `PUT /api/admin/alerts/{id}`

Example webhook in your agent service:

```javascript
// When an alert triggers
const alertWebhook = async (alert) => {
  // Get recent logs
  const logsResponse = await fetch(
    `https://verifiedbizlink.co.za/api/logs/ingest?appName=${alert.app_name}&hours=1`
  );
  const { logs } = await logsResponse.json();
  
  // Call Claude to analyze & suggest fixes
  const fix = await callClaudeAgent({
    alert,
    recentLogs: logs,
    instruction: 'Analyze these errors and suggest a fix'
  });
  
  // Update alert with suggestion
  await fetch(`https://verifiedbizlink.co.za/api/admin/alerts/${alert.id}`, {
    method: 'PUT',
    body: JSON.stringify({
      status: 'acknowledged',
      agentSuggestedFix: fix
    })
  });
};
```

---

## 📁 Files Created

```
migrations/007_monitoring_system.sql    - Database schema
src/app/api/logs/ingest/route.ts        - Ingestion endpoint
src/app/api/admin/api-keys/route.ts     - Key management API
src/app/api/admin/api-keys/[id]/route.ts - Key operations
src/app/api/admin/alerts/route.ts       - Alert management API
src/app/api/admin/alerts/[id]/route.ts  - Alert operations
src/app/admin/monitoring/page.tsx       - Admin dashboard
src/lib/monitoring-client.ts            - Client library
scripts/setup-monitoring.ts             - Setup script
MONITORING_SETUP.md                     - Full documentation
MONITORING_QUICK_START.md               - Quick reference
```

---

## ✅ Checklist

- [ ] Database migration applied
- [ ] Setup script run, API key saved
- [ ] Test log sent successfully
- [ ] Dashboard shows test log
- [ ] `.env` file updated with `MONITORING_API_KEY`
- [ ] Integrated logging into first app
- [ ] Created alert rule for high-priority errors
- [ ] Tested sending real error logs
- [ ] Set up agent webhook (optional)

---

## 🔒 Security Notes

1. **API Keys**: Treat like passwords. Store in `.env`, never commit
2. **Rotation**: Generate new keys, deactivate old ones every 90 days
3. **Permissions**: Only admin users can create/revoke keys
4. **Data**: Don't log passwords, tokens, or PII
5. **Endpoints**: All endpoints validate API key before processing

---

## 📞 Support

**Full Documentation**: See `MONITORING_SETUP.md`

**Quick Questions**: Check `MONITORING_QUICK_START.md`

**Dashboard**: https://verifiedbizlink.co.za/admin/monitoring

---

## 🎯 Next Steps

1. Apply the database migration
2. Run the setup script to generate your first API key
3. Add `MONITORING_API_KEY=vbz_...` to your external app's `.env`
4. Start sending logs from your app
5. Watch them appear in real-time on the dashboard
6. Create alert rules for important patterns
7. Set up your agent service to receive alerts

**You're all set! Start monitoring! 🚀**
