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
    await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT FALSE`;
    await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_reason TEXT DEFAULT ''`;
    await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ`;
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
    // Whether a sales agent assisted this signup, and who — tracked at
    // signup time for the Agent Sign Up / Agent Sales admin dashboards.
    await db`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS assisted_signup BOOLEAN DEFAULT FALSE`;
    await db`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS assisted_by TEXT`;
    // Which staff account actually did the assisting — free-text assisted_by
    // is what the signer-upper typed, this is the accountable employee.
    await db`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS assisted_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL`;

    // --- Moderation: warnings, strikes, bans, unverify — one append-only
    // trail so a user's disciplinary history survives status changes. ---
    await db`
      CREATE TABLE IF NOT EXISTS moderation_actions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
        action VARCHAR(30) NOT NULL,
        reason TEXT DEFAULT '',
        issued_by UUID REFERENCES users(id) ON DELETE SET NULL,
        issued_by_name VARCHAR(255) DEFAULT '',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    await db`CREATE INDEX IF NOT EXISTS idx_moderation_actions_user ON moderation_actions(user_id)`;
    await db`CREATE INDEX IF NOT EXISTS idx_moderation_actions_created ON moderation_actions(created_at DESC)`;

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

    // --- v7: Dynamic tiers, site settings, ad credits ---
    await db`
      CREATE TABLE IF NOT EXISTS tiers (
        key VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        price INTEGER NOT NULL DEFAULT 0,
        ad_limit INTEGER NOT NULL DEFAULT 0,
        monthly_ad_credits INTEGER NOT NULL DEFAULT 0,
        features JSONB NOT NULL DEFAULT '[]',
        note TEXT,
        sort_order INTEGER NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    await db`
      INSERT INTO tiers (key, name, price, ad_limit, monthly_ad_credits, features, note, sort_order)
      VALUES
        ('free', 'Free', 0, 0, 0, '["Basic business listing","Up to 10 network connections","Standard trust badge","1 post per day"]', NULL, 1),
        ('standard', 'Standard', 299, 1, 14, '["Enhanced business profile","Unlimited connections","Priority discovery listing","Unlimited posts","1 active ad","Basic analytics"]', NULL, 2),
        ('premium', 'Premium', 699, 5, 45, '["Everything in Standard","Gold Verified badge (fast-tracked)","Boosted ad placement","5 active ads","Full analytics dashboard","AI content assistant (unlimited)","Priority vetting review","Dedicated account manager"]', NULL, 3),
        ('premium_half', 'Premium Trial', 0, 3, 21, '["Gold Verified badge eligibility","Up to 3 active ads","Enhanced analytics","AI content assistant","Priority vetting review"]', '2-week trial — half of Premium features', 4)
      ON CONFLICT (key) DO NOTHING
    `;

    await db`
      CREATE TABLE IF NOT EXISTS site_settings (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    await db`
      INSERT INTO site_settings (key, value)
      VALUES ('home_hero_image_url', '/hero-cape-town.jpg'), ('home_hero_opacity', '0.16')
      ON CONFLICT (key) DO NOTHING
    `;

    await db`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS ad_credits INTEGER NOT NULL DEFAULT 0`;
    await db`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS credits_last_topped_up_at TIMESTAMPTZ`;
    await db`ALTER TABLE ads ADD COLUMN IF NOT EXISTS duration_days INTEGER`;

    // --- v8: tiers.is_purchasable (trial tier is auto-granted, never bought) ---
    await db`ALTER TABLE tiers ADD COLUMN IF NOT EXISTS is_purchasable BOOLEAN NOT NULL DEFAULT true`;
    await db`UPDATE tiers SET is_purchasable = false WHERE key = 'premium_half'`;
    await db`
      INSERT INTO tiers (key, name, price, ad_limit, monthly_ad_credits, features, sort_order, is_purchasable)
      VALUES (
        'verified', 'Verified Business', 99, 0, 0,
        '["CIPC & SARS verification","Verified trust badge","Customer reviews & ratings","Trust Score","Priority support"]',
        2, true
      )
      ON CONFLICT (key) DO NOTHING
    `;
    await db`UPDATE tiers SET sort_order = 3 WHERE key = 'standard'`;
    await db`UPDATE tiers SET sort_order = 4 WHERE key = 'premium'`;
    await db`UPDATE tiers SET sort_order = 5 WHERE key = 'premium_half'`;

    // --- v9: real notification/privacy preference persistence ---
    // These backed the Settings > Notifications and Settings > Privacy pages,
    // which previously POSTed to an endpoint that silently discarded the data.
    await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_preferences JSONB`;
    await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS privacy_settings JSONB`;

    // --- v10: real TOTP 2FA + session tracking (backed Settings > Security,
    // which previously had a fake toggle and a single hardcoded fake session) ---
    await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_secret TEXT`;
    await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN NOT NULL DEFAULT false`;
    await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_backup_codes JSONB`;
    await db`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        user_agent TEXT,
        ip_address TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        revoked_at TIMESTAMPTZ
      )
    `;
    await db`CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id)`;

    // --- v11: real monthly recurring billing via PayFast subscriptions
    // (previously one-time payments only) ---
    await db`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS payfast_token TEXT`;
    await db`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS subscription_status TEXT`;
    await db`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS last_billed_at TIMESTAMPTZ`;

    // --- v12: Tiers - R49 once-off verification badge + R99 Verified, R299 Standard, R699 Premium monthly tiers ---
    await db`
      INSERT INTO tiers (key, name, price, ad_limit, monthly_ad_credits, features, note, sort_order, is_purchasable, is_active)
      VALUES
        ('verified', 'Verified Business', 99, 0, 0, '["CIPC & ID document verification","Official Verified Trust Badge","Customer reviews & ratings","Trust Score calculation","Priority search placement","Email support"]', 'Essential verification & monthly tools', 1, true, true)
      ON CONFLICT (key) DO UPDATE SET
        name = EXCLUDED.name,
        price = 99,
        note = EXCLUDED.note,
        features = EXCLUDED.features,
        sort_order = 1,
        is_purchasable = true,
        is_active = true
    `;
    await db`UPDATE tiers SET sort_order = 2, price = 299, is_active = true, is_purchasable = true WHERE key = 'standard'`;
    await db`UPDATE tiers SET sort_order = 3, price = 699, is_active = true, is_purchasable = true WHERE key = 'premium'`;
    await db`UPDATE tiers SET is_purchasable = false, is_active = false WHERE key = 'free'`;
    await db`UPDATE tiers SET is_purchasable = false, is_active = false WHERE key = 'premium_half'`;

    // --- v13: Sales Agent Banking Details & Enhanced Commission Payouts ---
    await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_name TEXT`;
    await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS account_number TEXT`;
    await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS account_type TEXT`;
    await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS branch_code TEXT`;
    await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS account_holder_name TEXT`;
    await db`ALTER TABLE commission_payouts ADD COLUMN IF NOT EXISTS payout_method TEXT DEFAULT 'EFT'`;
    await db`ALTER TABLE commission_payouts ADD COLUMN IF NOT EXISTS notified_agent_at TIMESTAMPTZ`;

    return NextResponse.json({
      success: true,
      message: 'Migration v13 applied: Sales agent banking details and enhanced payout columns configured.',
    });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json({ error: 'Migration failed', detail: String(error) }, { status: 500 });
  }
}
