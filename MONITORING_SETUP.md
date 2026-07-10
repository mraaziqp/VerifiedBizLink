# VerifiedBizLink Monitoring & Log Ingestion System

A centralized monitoring system for all your applications with real-time alerting and agent-assisted issue resolution.

## Architecture

```
Your Apps (Any language/framework)
    ↓
[Log Ingestion API] → https://verifiedbizlink.co.za/api/logs/ingest
    ↓
[Postgres Database] (application_logs table)
    ↓
[Alert Engine] (watches for patterns, triggers alerts)
    ↓
[Dashboard] → https://verifiedbizlink.co.za/admin/monitoring
    ↓
[Agent Integration] (Claude agent can receive alerts and help fix)
```

## Setup Instructions

### 1. Initialize the Database

Run the migration to create tables:

```bash
# Apply the migration
psql $DATABASE_URL < migrations/007_monitoring_system.sql
```

Tables created:
- `api_keys` - Authentication for external apps
- `application_logs` - All logs from all apps
- `alert_rules` - Rules that trigger alerts
- `alerts` - Triggered alerts with status tracking

### 2. Generate Your First API Key

Visit the monitoring dashboard and click "Generate New Key":
```
https://verifiedbizlink.co.za/admin/monitoring
```

Or use the API:

```bash
curl -X POST https://verifiedbizlink.co.za/api/admin/api-keys \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "name": "MyApp Production",
    "appName": "my-external-app",
    "environment": "production",
    "expiresInDays": 90
  }'
```

Response:
```json
{
  "success": true,
  "key": "vbz_abcdef123456...",
  "warning": "Save this key securely. You will not be able to view it again."
}
```

**⚠️ Important:** Save this key securely. It will only be shown once!

### 3. Send Logs from Your App

#### Using cURL (any app):

```bash
curl -X POST https://verifiedbizlink.co.za/api/logs/ingest \
  -H "Authorization: Bearer vbz_YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "appName": "my-external-app",
    "environment": "production",
    "logLevel": "ERROR",
    "message": "Database connection failed",
    "errorCode": "DB_CONN_TIMEOUT",
    "errorStack": "Error: Connection timeout...",
    "endpoint": "/api/users",
    "method": "GET",
    "statusCode": 500,
    "responseTimeMs": 5000,
    "userId": "user-123",
    "metadata": {
      "database": "prod-db",
      "retries": 3
    }
  }'
```

#### Using Node.js/JavaScript:

```javascript
// monitoring.js
const API_KEY = process.env.MONITORING_API_KEY;
const LOG_ENDPOINT = 'https://verifiedbizlink.co.za/api/logs/ingest';

async function sendLog(logData) {
  try {
    const response = await fetch(LOG_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        appName: 'my-app',
        environment: process.env.NODE_ENV || 'production',
        logLevel: logData.level || 'INFO',
        message: logData.message,
        errorCode: logData.errorCode,
        errorStack: logData.stack,
        endpoint: logData.endpoint,
        method: logData.method,
        statusCode: logData.statusCode,
        responseTimeMs: logData.responseTime,
        userId: logData.userId,
        metadata: logData.metadata || {}
      })
    });

    return await response.json();
  } catch (error) {
    console.error('Failed to send log:', error);
  }
}

module.exports = { sendLog };
```

Usage in your Express app:

```javascript
const express = require('express');
const { sendLog } = require('./monitoring');
const app = express();

// Error handling middleware
app.use((err, req, res, next) => {
  sendLog({
    level: 'ERROR',
    message: err.message,
    errorCode: err.code,
    stack: err.stack,
    endpoint: req.path,
    method: req.method,
    statusCode: 500,
    userId: req.user?.id,
    responseTime: Date.now() - req.startTime
  });

  res.status(500).json({ error: 'Internal server error' });
});
```

#### Using Python:

```python
# monitoring.py
import requests
import json
import os

API_KEY = os.getenv('MONITORING_API_KEY')
LOG_ENDPOINT = 'https://verifiedbizlink.co.za/api/logs/ingest'

def send_log(log_data):
    headers = {
        'Authorization': f'Bearer {API_KEY}',
        'Content-Type': 'application/json'
    }
    
    payload = {
        'appName': 'my-python-app',
        'environment': os.getenv('ENVIRONMENT', 'production'),
        'logLevel': log_data.get('level', 'INFO'),
        'message': log_data['message'],
        'errorCode': log_data.get('errorCode'),
        'errorStack': log_data.get('stack'),
        'endpoint': log_data.get('endpoint'),
        'method': log_data.get('method'),
        'statusCode': log_data.get('statusCode'),
        'responseTimeMs': log_data.get('responseTime'),
        'userId': log_data.get('userId'),
        'metadata': log_data.get('metadata', {})
    }
    
    try:
        response = requests.post(LOG_ENDPOINT, json=payload, headers=headers)
        return response.json()
    except Exception as e:
        print(f'Failed to send log: {e}')

# Usage
try:
    # Do something
    pass
except Exception as e:
    send_log({
        'level': 'ERROR',
        'message': str(e),
        'errorCode': type(e).__name__,
        'endpoint': '/api/endpoint',
        'method': 'GET',
        'statusCode': 500
    })
```

#### Using Go:

```go
// monitoring.go
package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
)

const LogEndpoint = "https://verifiedbizlink.co.za/api/logs/ingest"

type LogData struct {
	AppName       string                 `json:"appName"`
	Environment   string                 `json:"environment"`
	LogLevel      string                 `json:"logLevel"`
	Message       string                 `json:"message"`
	ErrorCode     string                 `json:"errorCode,omitempty"`
	ErrorStack    string                 `json:"errorStack,omitempty"`
	Endpoint      string                 `json:"endpoint,omitempty"`
	Method        string                 `json:"method,omitempty"`
	StatusCode    int                    `json:"statusCode,omitempty"`
	ResponseTimeMs int                   `json:"responseTimeMs,omitempty"`
	UserID        string                 `json:"userId,omitempty"`
	Metadata      map[string]interface{} `json:"metadata,omitempty"`
}

func SendLog(logData LogData) error {
	apiKey := os.Getenv("MONITORING_API_KEY")
	
	jsonData, err := json.Marshal(logData)
	if err != nil {
		return err
	}

	req, err := http.NewRequest("POST", LogEndpoint, bytes.NewBuffer(jsonData))
	if err != nil {
		return err
	}

	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", apiKey))
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	return nil
}
```

### 4. Set Up Alert Rules

Visit the monitoring dashboard and create alert rules:

```bash
curl -X POST https://verifiedbizlink.co.za/api/admin/alerts \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Too many database errors",
    "appName": "my-external-app",
    "logLevel": "ERROR",
    "condition": "count_exceeds",
    "threshold": 5,
    "timeWindowMinutes": 5,
    "enabled": true
  }'
```

Alert rule conditions:
- `count_exceeds` - Alert if N errors occur in time window
- `response_time_exceeds` - Alert if response time > N ms
- `error_rate_exceeds` - Alert if error rate > N%

### 5. Monitor in Real-Time

Dashboard URL: `https://verifiedbizlink.co.za/admin/monitoring`

Features:
- **Alerts tab**: View all triggered alerts, acknowledge/resolve them
- **Logs tab**: View real-time logs from all apps
- **API Keys tab**: Manage API keys for different apps
- **Stats tab**: Quick metrics (open alerts, recent errors, active keys)

## API Reference

### Log Ingestion Endpoint

**POST** `/api/logs/ingest`

Headers:
```
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
```

Body:
```json
{
  "appName": "string (required)",
  "environment": "production|staging|development (optional, default: production)",
  "logLevel": "INFO|WARN|ERROR|FATAL|DEBUG (required)",
  "message": "string (required)",
  "errorCode": "string (optional)",
  "errorStack": "string (optional)",
  "endpoint": "string (optional) - e.g., /api/users",
  "method": "string (optional) - e.g., GET, POST",
  "statusCode": "number (optional)",
  "responseTimeMs": "number (optional)",
  "userId": "string (optional) - user that triggered this",
  "metadata": "object (optional) - custom data"
}
```

Response:
```json
{
  "success": true,
  "logId": "uuid",
  "timestamp": "2026-07-10T12:00:00Z"
}
```

### Fetch Logs Endpoint

**GET** `/api/logs/ingest`

Query params:
- `appName` - Filter by app (optional)
- `logLevel` - Filter by level (optional)
- `limit` - Number of logs (default: 100, max: 1000)
- `offset` - Pagination offset (default: 0)
- `hours` - How many hours back (default: 24)

### API Key Management

**POST** `/api/admin/api-keys` - Create new key
**GET** `/api/admin/api-keys` - List all keys
**PUT** `/api/admin/api-keys/{id}` - Activate/deactivate key
**DELETE** `/api/admin/api-keys/{id}` - Revoke key

### Alert Management

**POST** `/api/admin/alerts` - Create alert rule
**GET** `/api/admin/alerts` - Get alerts/rules
**PUT** `/api/admin/alerts/{id}` - Acknowledge/resolve alert

## Agent Integration

The monitoring system can trigger Claude agents to:
1. Analyze error patterns
2. Suggest fixes
3. Create pull requests with fixes
4. Monitor deployment

Set up webhook in your separate monitoring service:

```javascript
// In your monitoring service
async function onAlertTriggered(alert) {
  const response = await fetch('https://your-agent-service.com/webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      alert,
      logsUrl: `https://verifiedbizlink.co.za/api/logs/ingest?appName=${alert.app_name}`,
      dashboardUrl: 'https://verifiedbizlink.co.za/admin/monitoring'
    })
  });
}
```

## Environment Variables

Set these in your `.env` file:

```bash
# For external apps sending logs
MONITORING_API_KEY=vbz_your_api_key_here

# For VerifiedBizLink
DATABASE_URL=postgresql://...
```

## Security Best Practices

1. **API Keys**
   - Generate separate keys for each app/environment
   - Store keys in `.env` or secrets manager
   - Rotate keys every 90 days
   - Revoke unused keys

2. **Log Data**
   - Don't log passwords, tokens, or sensitive data
   - Sanitize user input before logging
   - Use metadata for structured logging

3. **Access Control**
   - Only admins can view dashboard
   - Only admins can create/revoke API keys
   - Monitor API key usage patterns

## Troubleshooting

**"Invalid API key" error:**
- Verify the Bearer token format: `Authorization: Bearer YOUR_KEY`
- Check the key hasn't been revoked
- Check the key hasn't expired

**Logs not appearing in dashboard:**
- Verify the app name matches
- Check log level filter
- Verify API key is active

**Alerts not triggering:**
- Check alert rule is enabled
- Verify error count threshold is correct
- Check time window is appropriate

## Examples

### Complete Express.js Integration

```javascript
const express = require('express');
const { sendLog } = require('./monitoring');

const app = express();

// Middleware to track request timing
app.use((req, res, next) => {
  req.startTime = Date.now();
  next();
});

// Your routes
app.get('/api/users', (req, res) => {
  try {
    // Your logic here
    res.json({ users: [] });
  } catch (error) {
    const responseTime = Date.now() - req.startTime;
    sendLog({
      level: 'ERROR',
      message: error.message,
      endpoint: req.path,
      method: req.method,
      statusCode: 500,
      responseTime,
      userId: req.user?.id
    });

    res.status(500).json({ error: 'Internal server error' });
  }
});

// Global error handler
app.use((err, req, res, next) => {
  const responseTime = Date.now() - req.startTime;
  sendLog({
    level: 'FATAL',
    message: err.message,
    errorCode: err.code,
    stack: err.stack,
    endpoint: req.path,
    method: req.method,
    statusCode: 500,
    responseTime,
    userId: req.user?.id
  });

  res.status(500).json({ error: 'Internal server error' });
});

app.listen(3000, () => console.log('Server running'));
```

---

For support or questions, reach out to the team.
