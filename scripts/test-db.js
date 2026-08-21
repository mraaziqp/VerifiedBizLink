const { neon } = require('@neondatabase/serverless');

const url = 'process.env.DATABASE_URL';

(async () => {
  try {
    const sql = neon(url);
    const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
    console.log('Connected successfully!');
    console.log('Existing tables (' + tables.length + '):', tables.map(r => r.table_name).join(', '));
  } catch (e) {
    console.error('Connection error:', e);
  }
})();
