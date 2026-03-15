/**
 * Seed script — upserts core platform users.
 * Run with:  npx tsx scripts/seed-users.ts
 */
import { neon } from '@neondatabase/serverless';
import { hash } from 'bcryptjs';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const sql = neon(process.env.DATABASE_URL!);

const users = [
  {
    email: 'ramone8711@gmail.com',
    password: 'ramone11',
    fullName: 'Ramone',
    role: 'admin',
    headline: 'Founder & Verifier — VerifiedBizLink',
  },
  {
    email: 'mraaziqp@gmail.com',
    password: '114477',
    fullName: 'Developer Admin',
    role: 'admin',
    headline: 'Developer Administrator — VerifiedBizLink',
  },
  {
    email: 'wesley.bosman@verifiedbizlink.temp',
    password: 'wesley11',
    fullName: 'Wesley Bosman',
    role: 'admin',
    headline: 'Legal Counsel & Administrator — VerifiedBizLink',
  },
];

async function seed() {
  console.log('Seeding users...\n');

  for (const u of users) {
    const passwordHash = await hash(u.password, 12);
    const avatarSeed = u.email.replace(/[^a-z0-9]/gi, '');

    await sql`
      INSERT INTO users (email, password_hash, full_name, role, headline, avatar_url)
      VALUES (
        ${u.email.toLowerCase().trim()},
        ${passwordHash},
        ${u.fullName},
        ${u.role},
        ${u.headline},
        ${'https://picsum.photos/seed/' + avatarSeed + '/200/200'}
      )
      ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        full_name     = EXCLUDED.full_name,
        role          = EXCLUDED.role,
        headline      = EXCLUDED.headline,
        updated_at    = NOW()
    `;

    console.log(`✓  ${u.fullName} <${u.email}>  [${u.role}]  pw: ${u.password}`);
  }

  console.log('\nDone.');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
