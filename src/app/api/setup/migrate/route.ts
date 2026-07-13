import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// POST /api/setup/migrate — add new columns and tables safely (idempotent)
export async function POST(request: NextRequest) {
  const incomingSecret = request.headers.get('x-setup-secret');
  const expectedSecret = process.env.SETUP_SECRET;
  if (!expectedSecret || !incomingSecret || incomingSecret !== expectedSecret) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    // --- Core schema fixes ---
    await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255)`;
    await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS location VARCHAR(255) DEFAULT ''`;
    await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS connections_count INTEGER DEFAULT 0`;
    await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS vetting_score INTEGER DEFAULT 0`;

    // --- Existing columns (v1) ---
    await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT ''`;
    await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50) DEFAULT ''`;
    await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth DATE`;
    await db`ALTER TABLE documents ADD COLUMN IF NOT EXISTS grade INTEGER DEFAULT 0`;
    await db`ALTER TABLE documents ADD COLUMN IF NOT EXISTS review_notes TEXT DEFAULT ''`;
    await db`ALTER TABLE documents ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ`;
    await db`ALTER TABLE documents ADD COLUMN IF NOT EXISTS reviewed_by UUID`;

    // --- v2: Support tickets ---
    await db`
      CREATE TABLE IF NOT EXISTS support_tickets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        name VARCHAR(120) NOT NULL,
        email VARCHAR(255) NOT NULL,
        category VARCHAR(60) NOT NULL,
        subject VARCHAR(120) NOT NULL,
        message TEXT NOT NULL,
        status VARCHAR(30) DEFAULT 'open',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        responded_at TIMESTAMPTZ,
        responded_by UUID
      )
    `;

    // --- v2: Deletion requests ---
    await db`
      CREATE TABLE IF NOT EXISTS deletion_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
        status VARCHAR(30) DEFAULT 'pending',
        scheduled_for TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        cancelled_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ
      )
    `;

    // --- v2: Ads ---
    await db`
      CREATE TABLE IF NOT EXISTS ads (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
        title VARCHAR(120) NOT NULL,
        description TEXT NOT NULL,
        business_name VARCHAR(120) NOT NULL,
        cta_text VARCHAR(60) DEFAULT 'Learn More',
        cta_url TEXT NOT NULL,
        badge VARCHAR(60),
        is_boosted BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        boost_expires_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        expires_at TIMESTAMPTZ
      )
    `;

    // --- v2: Ad settings (global toggle) ---
    await db`
      CREATE TABLE IF NOT EXISTS ad_settings (
        key VARCHAR(60) PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    // Insert default ads_enabled = true if not present
    await db`
      INSERT INTO ad_settings (key, value, updated_at)
      VALUES ('ads_enabled', 'true', NOW())
      ON CONFLICT (key) DO NOTHING
    `;

    // --- Vetting & Admin Tables ---
    // Ensure businesses table has all required columns for vetting
    await db`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS company_name VARCHAR(255)`;
    await db`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS industry VARCHAR(255) DEFAULT ''`;
    await db`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS reg_number VARCHAR(255) DEFAULT ''`;
    await db`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS vat_number VARCHAR(255) DEFAULT ''`;
    await db`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'unregistered'`;
    await db`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS trust_score INTEGER DEFAULT 0`;
    await db`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS description TEXT DEFAULT ''`;
    await db`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS website VARCHAR(255) DEFAULT ''`;
    await db`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS phone VARCHAR(50) DEFAULT ''`;
    await db`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS address TEXT DEFAULT ''`;
    await db`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ`;
    await db`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ`;
    await db`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS reviewed_by UUID`;
    await db`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS review_notes TEXT DEFAULT ''`;
    await db`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS connections_count INTEGER DEFAULT 0`;

    // --- v3: Business reviews ---
    await db`
      CREATE TABLE IF NOT EXISTS business_reviews (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
        reviewer_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
        rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
        title VARCHAR(120) NOT NULL DEFAULT '',
        body TEXT DEFAULT '',
        helpful_count INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(business_id, reviewer_id)
      )
    `;

    await db`CREATE INDEX IF NOT EXISTS idx_business_reviews_business_id ON business_reviews (business_id)`;
    await db`CREATE INDEX IF NOT EXISTS idx_business_reviews_reviewer_id ON business_reviews (reviewer_id)`;

    // --- v4: Email verification ---
    await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE`;
    await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_token TEXT`;

    // --- v5: Payments ---
    await db`
      CREATE TABLE IF NOT EXISTS payments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
        plan_type VARCHAR(50) NOT NULL,
        amount INTEGER NOT NULL,
        currency VARCHAR(10) DEFAULT 'ZAR',
        status VARCHAR(50) DEFAULT 'pending',
        stripe_intent_id VARCHAR(255),
        transaction_id VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        completed_at TIMESTAMPTZ
      )
    `;

    // --- v5: User Preferences ---
    await db`
      CREATE TABLE IF NOT EXISTS user_preferences (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
        email_notifications BOOLEAN DEFAULT TRUE,
        push_notifications BOOLEAN DEFAULT TRUE,
        marketing_emails BOOLEAN DEFAULT FALSE,
        dark_mode BOOLEAN DEFAULT FALSE,
        language VARCHAR(10) DEFAULT 'en',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    // --- v6: Password recovery, verification expiry, and Payfast support ---
    await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_token_expires_at TIMESTAMPTZ`;
    await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token TEXT`;
    await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMPTZ`;

    await db`ALTER TABLE payments ALTER COLUMN plan_type DROP NOT NULL`.catch(() => {});
    await db`ALTER TABLE payments ADD COLUMN IF NOT EXISTS reference VARCHAR(100) UNIQUE`;
    await db`ALTER TABLE payments ADD COLUMN IF NOT EXISTS description TEXT`;
    await db`ALTER TABLE payments ADD COLUMN IF NOT EXISTS ad_id UUID`;
    await db`ALTER TABLE payments ADD COLUMN IF NOT EXISTS payfast_reference VARCHAR(100)`;

    return NextResponse.json({
      success: true,
      message: 'Migration v6 applied: password recovery, verification expiry, and Payfast support columns added.',
    });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json({ error: 'Migration failed', detail: String(error) }, { status: 500 });
  }
}
