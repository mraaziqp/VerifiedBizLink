#!/usr/bin/env tsx

/**
 * Setup script for monitoring system
 * Run: npx tsx scripts/setup-monitoring.ts
 */

import db from '@/lib/db';
import crypto from 'crypto';

function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

function generateApiKey(): string {
  return `vbz_${crypto.randomBytes(32).toString('hex')}`;
}

async function setupMonitoring() {
  console.log('🔧 Setting up monitoring system...\n');

  try {
    // Step 1: Create tables
    console.log('1️⃣  Creating database tables...');

    // Create api_keys table
    await db`
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
      )
    `;
    console.log('   ✅ Created api_keys table');

    // Create application_logs table
    await db`
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
      )
    `;
    console.log('   ✅ Created application_logs table');

    // Create alert_rules table
    await db`
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
      )
    `;
    console.log('   ✅ Created alert_rules table');

    // Create alerts table
    await db`
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
      )
    `;
    console.log('   ✅ Created alerts table');

    // Create indexes
    await db`CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash)`;
    await db`CREATE INDEX IF NOT EXISTS idx_api_keys_app_name ON api_keys(app_name)`;
    await db`CREATE INDEX IF NOT EXISTS idx_logs_app_name ON application_logs(app_name)`;
    await db`CREATE INDEX IF NOT EXISTS idx_logs_level ON application_logs(log_level)`;
    await db`CREATE INDEX IF NOT EXISTS idx_logs_created_at ON application_logs(created_at DESC)`;
    await db`CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status)`;
    await db`CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at DESC)`;
    console.log('   ✅ Created database indexes\n');

    // Step 2: Generate initial API key
    console.log('2️⃣  Generating initial API key...');
    const plainKey = generateApiKey();
    const keyHash = hashApiKey(plainKey);

    const result = await db`
      INSERT INTO api_keys (
        name,
        key_hash,
        app_name,
        environment,
        active,
        expires_at,
        created_at
      ) VALUES (
        'Default External App',
        ${keyHash},
        'external-app',
        'production',
        true,
        ${new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()},
        NOW()
      )
      RETURNING id, created_at
    `;
    console.log('   ✅ Generated API key\n');

    // Step 3: Display setup info
    console.log('🎉 Setup complete!\n');
    console.log('📋 Setup Summary:');
    console.log('─'.repeat(60));
    console.log('\n🔑 Your API Key (save this securely!):\n');
    console.log(`   ${plainKey}\n`);
    console.log('⚠️  Important: This key will only be shown once!\n');
    console.log('📝 Next steps:\n');
    console.log('   1. Save this API key to your .env file:');
    console.log('      MONITORING_API_KEY=' + plainKey + '\n');
    console.log('   2. Visit the monitoring dashboard:');
    console.log('      https://verifiedbizlink.co.za/admin/monitoring\n');
    console.log('   3. Start sending logs from your apps:');
    console.log('      Authorization: Bearer ' + plainKey + '\n');
    console.log('   4. Read MONITORING_SETUP.md for full documentation\n');
    console.log('─'.repeat(60));

  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

// Run setup
setupMonitoring();
