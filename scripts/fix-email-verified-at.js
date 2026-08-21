const { neon } = require('@neondatabase/serverless');

const url = process.env.DATABASE_URL;
if (!url) { console.error('DATABASE_URL env var required'); process.exit(1); }
const sql = neon(url);

(async () => {
  try {
    // Ensure email_verified_at column exists
    await sql`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ
    `;
    console.log('✓ Ensured email_verified_at column exists');

    // Backfill: set email_verified_at for users who are already verified but have NULL
    const updated = await sql`
      UPDATE users
      SET email_verified_at = COALESCE(updated_at, NOW())
      WHERE email_verified = TRUE AND email_verified_at IS NULL
      RETURNING email
    `;
    console.log(`✓ Backfilled email_verified_at for ${updated.length} user(s):`, updated.map(u => u.email));
  } catch (e) {
    console.error('Error:', e.message);
  }
})();
