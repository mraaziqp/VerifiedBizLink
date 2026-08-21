const { neon } = require('@neondatabase/serverless');

const url = 'process.env.DATABASE_URL';
const sql = neon(url);

(async () => {
  try {
    const users = await sql`SELECT id, email, full_name, role FROM users LIMIT 5`;
    console.log('Found users:', users);
  } catch (e) {
    console.error('Query error:', e.message);
  }
})();
