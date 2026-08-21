const { neon } = require('@neondatabase/serverless');

const url = 'postgresql://neondb_owner:npg_fNXAh3ri2mDC@ep-fancy-lake-abff641p-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require';

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
