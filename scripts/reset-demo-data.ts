/**
 * Demo data reset — removes all fake seed data and creates 2 clean test users.
 * Keeps: Ramone, Wesley, Developer Admin (real accounts).
 * Run with:  npx tsx scripts/reset-demo-data.ts
 */
import { neon } from '@neondatabase/serverless';
import { hash } from 'bcryptjs';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const sql = neon(process.env.DATABASE_URL!);

// Emails to KEEP — everything else gets removed
const KEEP_EMAILS = [
  'ramone8711@gmail.com',
  'mraaziqp@gmail.com',
  'wesley.bosman@verifiedbizlink.temp',
];

async function reset() {
  console.log('Resetting demo data...\n');

  // 1. Find IDs of users to keep
  const keepUsers = await sql`SELECT id FROM users WHERE email = ANY(${KEEP_EMAILS})`;
  const keepIds = keepUsers.map((u: any) => u.id);
  console.log(`Keeping ${keepIds.length} core accounts.`);

  // 2. Delete everything belonging to users NOT in the keep list
  //    Order matters — children before parents
  await sql`DELETE FROM post_likes WHERE user_id NOT IN (SELECT id FROM users WHERE email = ANY(${KEEP_EMAILS}))`;
  await sql`DELETE FROM post_comments WHERE user_id NOT IN (SELECT id FROM users WHERE email = ANY(${KEEP_EMAILS}))`;
  await sql`DELETE FROM posts WHERE user_id NOT IN (SELECT id FROM users WHERE email = ANY(${KEEP_EMAILS}))`;
  await sql`DELETE FROM connections WHERE requester_id NOT IN (SELECT id FROM users WHERE email = ANY(${KEEP_EMAILS})) OR receiver_id NOT IN (SELECT id FROM users WHERE email = ANY(${KEEP_EMAILS}))`;
  await sql`DELETE FROM notifications WHERE user_id NOT IN (SELECT id FROM users WHERE email = ANY(${KEEP_EMAILS}))`;
  await sql`DELETE FROM compliance_reports WHERE reporter_id NOT IN (SELECT id FROM users WHERE email = ANY(${KEEP_EMAILS})) OR reported_user_id NOT IN (SELECT id FROM users WHERE email = ANY(${KEEP_EMAILS}))`;

  // Delete documents linked to businesses that will be removed
  await sql`
    DELETE FROM documents
    WHERE business_id IN (
      SELECT b.id FROM businesses b
      WHERE b.user_id NOT IN (SELECT id FROM users WHERE email = ANY(${KEEP_EMAILS}))
    )
  `;
  await sql`DELETE FROM businesses WHERE user_id NOT IN (SELECT id FROM users WHERE email = ANY(${KEEP_EMAILS}))`;

  // Delete posts/comments/notifications for kept users (clean slate for demo)
  await sql`DELETE FROM post_likes`;
  await sql`DELETE FROM post_comments`;
  await sql`DELETE FROM posts`;
  await sql`DELETE FROM notifications`;

  // Now delete the fake users
  await sql`DELETE FROM users WHERE email != ALL(${KEEP_EMAILS})`;

  console.log('✓  Fake users and all associated data removed.');

  // 3. Create 2 test business users
  const testUsers = [
    {
      email: 'testa@demo.verifiedbizlink.com',
      password: 'TestA1234',
      fullName: 'Test User A',
      role: 'business',
      headline: 'Demo Business Owner — VerifiedBizLink',
      avatarSeed: 'testusera',
    },
    {
      email: 'testb@demo.verifiedbizlink.com',
      password: 'TestB1234',
      fullName: 'Test User B',
      role: 'business',
      headline: 'Demo Business Owner — VerifiedBizLink',
      avatarSeed: 'testuserb',
    },
  ];

  for (const u of testUsers) {
    const passwordHash = await hash(u.password, 12);
    await sql`
      INSERT INTO users (email, password_hash, full_name, role, headline, avatar_url)
      VALUES (
        ${u.email},
        ${passwordHash},
        ${u.fullName},
        ${u.role},
        ${u.headline},
        ${'https://picsum.photos/seed/' + u.avatarSeed + '/200/200'}
      )
      ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        full_name     = EXCLUDED.full_name,
        role          = EXCLUDED.role,
        headline      = EXCLUDED.headline,
        updated_at    = NOW()
    `;
    console.log(`✓  ${u.fullName} <${u.email}>  pw: ${u.password}`);
  }

  console.log('\n--- Summary ---');
  const allUsers = await sql`SELECT email, full_name, role FROM users ORDER BY role, full_name`;
  allUsers.forEach((u: any) => console.log(`  ${u.full_name} <${u.email}> [${u.role}]`));
  console.log('\nDone.');
}

reset().catch((err) => {
  console.error('Reset failed:', err);
  process.exit(1);
});
