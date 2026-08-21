const { neon } = require('@neondatabase/serverless');

const url = 'postgresql://neondb_owner:npg_fNXAh3ri2mDC@ep-fancy-lake-abff641p-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require';
const sql = neon(url);

(async () => {
  try {
    const adCols = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'ads'
      ORDER BY ordinal_position
    `;
    console.log('ADS TABLE COLUMNS:', adCols);

    const bizCols = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'businesses' AND column_name LIKE '%credit%'
    `;
    console.log('BIZ CREDIT COLUMNS:', bizCols);

    const settings = await sql`
      SELECT * FROM ad_settings
    `.catch(() => []);
    console.log('AD SETTINGS:', settings);
  } catch (e) {
    console.error('Error:', e.message);
  }
})();
