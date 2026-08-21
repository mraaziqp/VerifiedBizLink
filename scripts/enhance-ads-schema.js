const { neon } = require('@neondatabase/serverless');

const url = 'process.env.DATABASE_URL';
const sql = neon(url);

(async () => {
  try {
    console.log('Adding ad enhancement columns...');

    await sql`
      ALTER TABLE ads
      ADD COLUMN IF NOT EXISTS slot_placement VARCHAR(50) DEFAULT 'feed_inline',
      ADD COLUMN IF NOT EXISTS image_url TEXT,
      ADD COLUMN IF NOT EXISTS media_type VARCHAR(20) DEFAULT 'image',
      ADD COLUMN IF NOT EXISTS credits_spent INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'active',
      ADD COLUMN IF NOT EXISTS admin_notes TEXT;
    `;

    // Ensure ad_settings table has default keys
    await sql`
      INSERT INTO ad_settings (key, value, updated_at)
      VALUES
        ('ads_enabled', 'true', NOW()),
        ('feed_ad_frequency', '5', NOW()),
        ('top_banner_max', '3', NOW()),
        ('sidebar_spotlight_max', '2', NOW()),
        ('credit_cost_feed_day', '5', NOW()),
        ('credit_cost_banner_day', '10', NOW()),
        ('credit_cost_spotlight_day', '15', NOW())
      ON CONFLICT (key) DO NOTHING;
    `;

    console.log('✓ Successfully enhanced ads schema and placement settings!');
  } catch (e) {
    console.error('Migration error:', e.message);
  }
})();
