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
    // --- Existing columns (v1) ---
    await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT ''`;
    await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50) DEFAULT ''`;
    await db`ALTER TABLE documents ADD COLUMN IF NOT EXISTS grade INTEGER DEFAULT 0`;
    await db`ALTER TABLE documents ADD COLUMN IF NOT EXISTS review_notes TEXT DEFAULT ''`;
    await db`ALTER TABLE documents ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ`;
    await db`ALTER TABLE documents ADD COLUMN IF NOT EXISTS reviewed_by UUID`;
    await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS vetting_score INTEGER DEFAULT 0`;

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

    return NextResponse.json({
      success: true,
      message: 'Migration v2 applied: support_tickets, deletion_requests, ads, ad_settings tables created.',
    });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json({ error: 'Migration failed', detail: String(error) }, { status: 500 });
  }
}
