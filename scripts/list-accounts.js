const { neon } = require('@neondatabase/serverless');

const url = 'process.env.DATABASE_URL';
const sql = neon(url);

(async () => {
  try {
    const users = await sql`
      SELECT id, email, full_name, role, created_at, email_verified
      FROM users
      ORDER BY created_at ASC
    `;
    console.log('ALL USERS IN DB (' + users.length + '):');
    users.forEach(u => console.log(`- ID: ${u.id} | Email: ${u.email} | Name: ${u.full_name} | Role: ${u.role} | Verified: ${u.email_verified}`));

    const businesses = await sql`
      SELECT id, user_id, company_name, status, package_type, assisted_by
      FROM businesses
    `;
    console.log('\nALL BUSINESSES IN DB (' + businesses.length + '):');
    businesses.forEach(b => console.log(`- ID: ${b.id} | Name: ${b.company_name} | Status: ${b.status} | Tier: ${b.package_type} | UserID: ${b.user_id}`));
  } catch (e) {
    console.error('Error:', e.message);
  }
})();
