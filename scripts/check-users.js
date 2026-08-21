const { neon } = require('@neondatabase/serverless');

const url = 'postgresql://neondb_owner:npg_fNXAh3ri2mDC@ep-fancy-lake-abff641p-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require';
const sql = neon(url);

(async () => {
  try {
    const users = await sql`SELECT id, email, full_name, role FROM users LIMIT 5`;
    console.log('Found users:', users);
  } catch (e) {
    console.error('Query error:', e.message);
  }
})();
