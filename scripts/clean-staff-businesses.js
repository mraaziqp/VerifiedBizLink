const { neon } = require('@neondatabase/serverless');

const url = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_fNXAh3ri2mDC@ep-fancy-lake-abff641p-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require';
const sql = neon(url);

(async () => {
  try {
    const adminUser = await sql`SELECT id FROM users WHERE email = 'mraaziqp@gmail.com'`;
    if (adminUser.length > 0) {
      const adminId = adminUser[0].id;
      await sql`DELETE FROM ads WHERE business_id IN (SELECT id FROM businesses WHERE user_id = ${adminId})`.catch(() => {});
      await sql`DELETE FROM business_reviews WHERE business_id IN (SELECT id FROM businesses WHERE user_id = ${adminId})`.catch(() => {});
      await sql`DELETE FROM businesses WHERE user_id = ${adminId}`.catch(() => {});
      console.log('✓ Successfully removed dummy business for Developer Admin');
    }

    const remaining = await sql`
      SELECT b.id, b.company_name, b.status, u.email, u.role
      FROM businesses b
      JOIN users u ON u.id = b.user_id
    `;
    console.log('\nRemaining real businesses in directory:', remaining);
  } catch (e) {
    console.error('Error:', e.message);
  }
})();
