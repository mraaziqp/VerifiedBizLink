/**
 * Seed Neon Database Admin Accounts
 *
 * POST /api/setup/seed-neon-admins
 *
 * Creates admin accounts in Neon with proper roles and RLS policies
 *
 * Body:
 * {
 *   "setupSecret": "dev-seed-secret-2024-vbl"
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { setupSecret } = body;

    // Verify setup secret
    if (!setupSecret || setupSecret !== process.env.SETUP_SECRET) {
      return NextResponse.json({ error: 'Forbidden - Invalid setup secret' }, { status: 403 });
    }

    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      return NextResponse.json(
        { error: 'Server error: DATABASE_URL not configured' },
        { status: 500 }
      );
    }

    const pool = new Pool({
      connectionString: databaseUrl,
    });

    const results = [];
    const client = await pool.connect();

    try {
      // Create admin accounts
      for (const account of adminAccounts) {
        try {
          const result = await client.query(
            `INSERT INTO public.users (id, email, full_name, role, created_at, updated_at)
             VALUES ($1, $2, $3, $4, NOW(), NOW())
             ON CONFLICT (email) DO UPDATE SET
               role = $4,
               full_name = $3,
               updated_at = NOW()
             RETURNING id, email, role`,
            [account.id, account.email, account.fullName, account.role]
          );

          results.push({
            email: account.email,
            role: account.role,
            status: 'created',
            description: account.description,
          });
        } catch (error: any) {
          results.push({
            email: account.email,
            status: 'error',
            message: error.message,
          });
        }
      }

      // Enable RLS on tables
      const tables = [
        'users',
        'posts',
        'comments',
        'favorites',
        'saved_posts',
        'following',
        'user_notifications',
        'search_history',
      ];

      for (const table of tables) {
        try {
          await client.query(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`);
        } catch (error: any) {
          if (!error.message.includes('already enabled')) {
            console.warn(`RLS on ${table}: ${error.message}`);
          }
        }
      }

      // Create RLS policies
      const policies = [
        `CREATE POLICY "Users can view all profiles" ON public.users
         FOR SELECT TO authenticated USING (true)`,
        `CREATE POLICY "Users can update own profile" ON public.users
         FOR UPDATE TO authenticated
         USING (auth.uid()::text = id::text)
         WITH CHECK (auth.uid()::text = id::text)`,
        `CREATE POLICY "Anyone can view posts" ON public.posts
         FOR SELECT TO authenticated USING (true)`,
        `CREATE POLICY "Users can manage own posts" ON public.posts
         FOR ALL TO authenticated
         USING (user_id::text = auth.uid()::text)
         WITH CHECK (user_id::text = auth.uid()::text)`,
        `CREATE POLICY "Anyone can view comments" ON public.comments
         FOR SELECT TO authenticated USING (true)`,
        `CREATE POLICY "Users can manage own comments" ON public.comments
         FOR ALL TO authenticated
         USING (user_id::text = auth.uid()::text)
         WITH CHECK (user_id::text = auth.uid()::text)`,
        `CREATE POLICY "Users can manage own favorites" ON public.favorites
         FOR ALL TO authenticated
         USING (user_id::text = auth.uid()::text)
         WITH CHECK (user_id::text = auth.uid()::text)`,
        `CREATE POLICY "Users can only see own notifications" ON public.user_notifications
         FOR SELECT TO authenticated
         USING (user_id::text = auth.uid()::text)`,
      ];

      for (const policy of policies) {
        try {
          await client.query(policy);
        } catch (error: any) {
          if (!error.message.includes('already exists')) {
            console.warn(`Policy creation: ${error.message}`);
          }
        }
      }

      // Get admin access matrix
      const matrixResult = await client.query(`
        SELECT
          email,
          full_name,
          role,
          CASE WHEN role = 'admin' THEN 'All admin tools' ELSE 'Banking tools' END as access_level
        FROM public.users
        WHERE role IN ('admin', 'banker')
        ORDER BY role DESC, email
      `);

      return NextResponse.json(
        {
          success: true,
          message: 'Neon admin accounts created successfully',
          admins_created: results.filter((r) => r.status === 'created').length,
          results,
          credentials: {
            ramoen: {
              email: 'ramoen@verifiedbizlink.co.za',
              role: 'admin',
              access: 'All vetting and verification tools',
            },
            wesley: {
              email: 'wesley@verifiedbizlink.co.za',
              role: 'banker',
              access: 'Banking and compliance tools',
            },
            superAdmin: {
              email: 'mraaziqp@gmail.com',
              role: 'admin',
              access: 'All tools and full access',
            },
          },
          access_matrix: matrixResult.rows,
          rls_enabled: true,
          policies_created: true,
        },
        { status: 200 }
      );
    } finally {
      client.release();
      await pool.end();
    }
  } catch (error: any) {
    console.error('Error seeding Neon admins:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to seed admin accounts' },
      { status: 500 }
    );
  }
}
