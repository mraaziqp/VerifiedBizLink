-- 007_monitoring_system.sql
-- API ingestion and monitoring system for all apps

-- API Keys table (for authentication)
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  key_hash VARCHAR(255) NOT NULL UNIQUE,
  app_name VARCHAR(255) NOT NULL,
  environment VARCHAR(50) DEFAULT 'production', -- production, staging, development
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_app_name ON api_keys(app_name);

-- Application logs table (ingestion endpoint writes here)
CREATE TABLE IF NOT EXISTS application_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
  app_name VARCHAR(255) NOT NULL,
  environment VARCHAR(50) DEFAULT 'production',
  log_level VARCHAR(20) NOT NULL, -- INFO, WARN, ERROR, FATAL, DEBUG
  message TEXT NOT NULL,
  error_code VARCHAR(50),
  error_stack TEXT,
  endpoint VARCHAR(255),
  method VARCHAR(10), -- GET, POST, PUT, DELETE, etc.
  status_code INTEGER,
  response_time_ms INTEGER,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  metadata JSONB DEFAULT '{}', -- extra context as JSON
  created_at TIMESTAMPTZ DEFAULT NOW(),
  indexed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_logs_app_name ON application_logs(app_name);
CREATE INDEX IF NOT EXISTS idx_logs_level ON application_logs(log_level);
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON application_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_error ON application_logs(error_code) WHERE log_level = 'ERROR';

-- Alert rules table (defines what triggers alerts)
CREATE TABLE IF NOT EXISTS alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  app_name VARCHAR(255),
  log_level VARCHAR(20),
  error_code_pattern VARCHAR(255),
  condition VARCHAR(50), -- 'count_exceeds', 'response_time_exceeds', 'error_rate_exceeds'
  threshold INTEGER, -- number of errors, milliseconds, percentage
  time_window_minutes INTEGER DEFAULT 5, -- check last N minutes
  enabled BOOLEAN DEFAULT TRUE,
  notify_admin BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alerts table (stores triggered alerts)
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID REFERENCES alert_rules(id) ON DELETE CASCADE,
  app_name VARCHAR(255) NOT NULL,
  severity VARCHAR(20), -- INFO, WARNING, ERROR, CRITICAL
  title VARCHAR(255) NOT NULL,
  description TEXT,
  affected_users INTEGER DEFAULT 0,
  log_samples JSONB DEFAULT '[]', -- sample of logs that triggered alert
  status VARCHAR(50) DEFAULT 'open', -- open, acknowledged, resolved
  acknowledged_by UUID REFERENCES users(id) ON DELETE SET NULL,
  acknowledged_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  agent_suggested_fix TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_app_name ON alerts(app_name);

-- Add columns to audit_logs for better monitoring (if they don't exist)
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS resource_type VARCHAR(100);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS resource_id VARCHAR(255);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS status VARCHAR(50);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS old_value JSONB;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS new_value JSONB;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS details TEXT;
