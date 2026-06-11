/**
 * Seed Neon Database - Create Admin Accounts
 *
 * This script creates admin accounts in the Neon PostgreSQL database
 * with proper roles and RLS policies.
 *
 * Usage:
 * DATABASE_URL="..." npm run ts-node scripts/seed-neon-admins.ts
 *
 * Or via API:
 * POST /api/setup/seed-neon-admins
 * Body: { "setupSecret": "dev-seed-secret-2024-vbl" }
 */

import { Pool } from 'pg';

const adminAccounts = [
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    email: 'ramoen@verifiedbizlink.co.za',
    fullName: 'Ramoen - Lead Admin',
    role: 'admin',
    description: 'Admin - All vetting and verification tools',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    email: 'wesley@verifiedbizlink.co.za',
    fullName: 'Wesley - Banking Specialist',
    role: 'banker',
    description: 'Banker - Banking and compliance tools',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'mraaziqp@gmail.com',
    fullName: 'Super Admin - Owner',
    role: 'admin',
    description: 'Super Admin - All tools and full access',
  },
];

async function seedNeonAdmins() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ Error: DATABASE_URL environment variable not set');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: databaseUrl,
  });

  try {
    console.log('🌱 Starting Neon admin account seeding...\n');

    // Create admin accounts
    for (const account of adminAccounts) {
      try {
        const result = await pool.query(
          `INSERT INTO public.users (id, email, full_name, role, created_at, updated_at)
           VALUES ($1, $2, $3, $4, NOW(), NOW())
           ON CONFLICT (email) DO UPDATE SET
             role = $4,
             full_name = $3,
             updated_at = NOW()
           RETURNING id, email, role`,
          [account.id, account.email, account.fullName, account.role]
        );

        console.log(`✅ Created: ${account.email}`);
        console.log(`   Role: ${account.role}`);
        console.log(`   Access: ${account.description}\n`);
      } catch (error: any) {
        console.error(`❌ Error creating ${account.email}:`);
        console.error(error.message);
        console.log('');
      }
    }

    // Enable RLS on tables
    console.log('🔐 Configuring Row Level Security (RLS)...\n');

    const rlsQueries = [
      'ALTER TABLE public.users ENABLE ROW LEVEL SECURITY',
      'ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY',
      'ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY',
      'ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY',
      'ALTER TABLE public.saved_posts ENABLE ROW LEVEL SECURITY',
      'ALTER TABLE public.following ENABLE ROW LEVEL SECURITY',
      'ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY',
      'ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY',
    ];

    for (const query of rlsQueries) {
      try {
        await pool.query(query);
        const tableName = query.match(/table\s+(\S+)/)?.[1];
        console.log(`✅ RLS enabled: ${tableName}`);
      } catch (error: any) {
        if (!error.message.includes('already enabled')) {
          console.warn(`⚠️  RLS on ${query}: ${error.message}`);
        }
      }
    }

    console.log('\n🔑 Creating RLS Policies...\n');

    // Create RLS policies
    const policies = [
      {
        name: 'Users can view all profiles',
        query: `CREATE POLICY "Users can view all profiles" ON public.users
                FOR SELECT TO authenticated
                USING (true)`,
      },
      {
        name: 'Users can update own profile',
        query: `CREATE POLICY "Users can update own profile" ON public.users
                FOR UPDATE TO authenticated
                USING (auth.uid()::text = id::text)
                WITH CHECK (auth.uid()::text = id::text)`,
      },
      {
        name: 'Anyone can view posts',
        query: `CREATE POLICY "Anyone can view posts" ON public.posts
                FOR SELECT TO authenticated
                USING (true)`,
      },
      {
        name: 'Users can manage own posts',
        query: `CREATE POLICY "Users can manage own posts" ON public.posts
                FOR ALL TO authenticated
                USING (user_id::text = auth.uid()::text)
                WITH CHECK (user_id::text = auth.uid()::text)`,
      },
      {
        name: 'Anyone can view comments',
        query: `CREATE POLICY "Anyone can view comments" ON public.comments
                FOR SELECT TO authenticated
                USING (true)`,
      },
      {
        name: 'Users can manage own comments',
        query: `CREATE POLICY "Users can manage own comments" ON public.comments
                FOR ALL TO authenticated
                USING (user_id::text = auth.uid()::text)
                WITH CHECK (user_id::text = auth.uid()::text)`,
      },
      {
        name: 'Users can manage own favorites',
        query: `CREATE POLICY "Users can manage own favorites" ON public.favorites
                FOR ALL TO authenticated
                USING (user_id::text = auth.uid()::text)
                WITH CHECK (user_id::text = auth.uid()::text)`,
      },
      {
        name: 'Users can see own notifications',
        query: `CREATE POLICY "Users can only see own notifications" ON public.user_notifications
                FOR SELECT TO authenticated
                USING (user_id::text = auth.uid()::text)`,
      },
    ];

    for (const policy of policies) {
      try {
        await pool.query(policy.query);
        console.log(`✅ Policy created: ${policy.name}`);
      } catch (error: any) {
        if (!error.message.includes('already exists')) {
          console.warn(`⚠️  ${policy.name}: ${error.message}`);
        }
      }
    }

    console.log('\n📊 Admin Access Matrix:\n');

    // Display admin access matrix
    const result = await pool.query(`
      SELECT
        email,
        full_name,
        role,
        CASE WHEN role = 'admin' THEN 'All admin tools' ELSE 'Banking tools' END as access_level
      FROM public.users
      WHERE role IN ('admin', 'banker')
      ORDER BY role DESC, email
    `);

    if (result.rows.length > 0) {
      console.table(result.rows);
    }

    console.log('\n✅ Admin Account Seeding Complete!\n');
    console.log('Admin Credentials:');
    console.log('─'.repeat(70));
    adminAccounts.forEach((account) => {
      console.log(`\n${account.fullName}`);
      console.log(`Email:    ${account.email}`);
      console.log(`Role:     ${account.role}`);
      console.log(`Access:   ${account.description}`);
    });

    console.log('\n✅ All systems configured and ready!\n');
  } catch (error) {
    console.error('❌ Fatal error during seeding:');
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  seedNeonAdmins();
}

export default seedNeonAdmins;
