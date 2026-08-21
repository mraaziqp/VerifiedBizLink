const { neon } = require('@neondatabase/serverless');

const url = 'process.env.DATABASE_URL';
const sql = neon(url);

(async () => {
  try {
    const users = await sql`
      SELECT id, email, full_name, avatar_url, role
      FROM users
      WHERE email = 'mraaziqp@gmail.com'
    `;
    console.log('Developer Admin:', users);

    const businesses = await sql`
      SELECT id, user_id, company_name, logo_url
      FROM businesses
      WHERE user_id = ${users[0].id}
    `;
    console.log('Admin Business:', businesses);
  } catch (e) {
    console.error('Error:', e.message);
  }
})();
