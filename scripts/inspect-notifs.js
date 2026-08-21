const { neon } = require('@neondatabase/serverless');

const url = 'process.env.DATABASE_URL';
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
