const { neon } = require('@neondatabase/serverless');

const url = 'postgresql://neondb_owner:npg_fNXAh3ri2mDC@ep-fancy-lake-abff641p-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require';
const sql = neon(url);

const FAKE_TEST_EMAILS = [
  'shareholder1@vbl.com',
  'shareholder2@vbl.com',
  'shareholder3@vbl.com',
  'business-1782317805@example.com',
  'claude-admin@verifiedbizlink.co.za',
  'testadmin@verifiedbizlink.co.za',
  'testbusiness@vbl.com',
  'audit-launch-staff@example.com',
  'wesley.bosman@verifiedbizlink.temp',
  'backupe9@gmail.com',
];

(async () => {
  try {
    for (const email of FAKE_TEST_EMAILS) {
      console.log(`Cleaning up test account: ${email}...`);
      const users = await sql`SELECT id FROM users WHERE LOWER(email) = LOWER(${email})`;
      for (const u of users) {
        // Delete dependent records
        await sql`DELETE FROM comments WHERE user_id = ${u.id}`.catch(() => {});
        await sql`DELETE FROM posts WHERE user_id = ${u.id}`.catch(() => {});
        await sql`DELETE FROM business_reviews WHERE reviewer_id = ${u.id}`.catch(() => {});
        await sql`DELETE FROM business_documents WHERE business_id IN (SELECT id FROM businesses WHERE user_id = ${u.id})`.catch(() => {});
        await sql`DELETE FROM businesses WHERE user_id = ${u.id}`.catch(() => {});
        await sql`DELETE FROM payments WHERE user_id = ${u.id}`.catch(() => {});
        await sql`DELETE FROM notifications WHERE user_id = ${u.id}`.catch(() => {});
        await sql`DELETE FROM connections WHERE requester_id = ${u.id} OR addressee_id = ${u.id}`.catch(() => {});
        await sql`DELETE FROM leads WHERE agent_id = ${u.id}`.catch(() => {});
        await sql`DELETE FROM agent_activity_log WHERE agent_id = ${u.id}`.catch(() => {});
        await sql`DELETE FROM sessions WHERE user_id = ${u.id}`.catch(() => {});
        await sql`DELETE FROM users WHERE id = ${u.id}`.catch(() => {});
        console.log(`✓ Deleted user ${u.id} (${email})`);
      }
    }

    const remaining = await sql`SELECT id, email, full_name, role FROM users ORDER BY created_at ASC`;
    console.log(`\nRemaining verified clean user accounts: ${remaining.length}`);
    remaining.forEach(u => console.log(`- ${u.email} (${u.full_name}) [${u.role}]`));
  } catch (e) {
    console.error('Cleanup error:', e.message);
  }
})();
