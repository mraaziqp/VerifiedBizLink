const { neon } = require('@neondatabase/serverless');

const url = 'postgresql://neondb_owner:npg_fNXAh3ri2mDC@ep-fancy-lake-abff641p-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require';
const sql = neon(url);

(async () => {
  try {
    const cols = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'notifications'
    `;
    console.log('NOTIFICATIONS COLS:', cols);
  } catch (e) {
    console.error('Error:', e.message);
  }
})();
