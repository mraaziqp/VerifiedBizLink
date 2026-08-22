const { neon } = require('@neondatabase/serverless');

const url = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_fNXAh3ri2mDC@ep-fancy-lake-abff641p-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require';
const sql = neon(url);

(async () => {
  try {
    const bizList = await sql`
      SELECT b.id, b.user_id, b.company_name, b.status, u.email, u.role, u.full_name
      FROM businesses b
      JOIN users u ON u.id = b.user_id
    `;
    console.log('ALL BUSINESSES IN DB:', bizList);
  } catch (e) {
    console.error('Error:', e.message);
  }
})();
