/**
 * Seed Admin Accounts in Supabase Auth
 *
 * POST /api/setup/seed-admin-auth
 *
 * Creates admin accounts in Supabase Auth + Neon database
 *
 * Body: { "setupSecret": "dev-seed-secret-2024-vbl" }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import db from '@/lib/db';

const adminAccounts = [
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    email: 'ramoen@verifiedbizlink.co.za',
    password: 'Ramoen@123456',
    fullName: 'Ramoen - Lead Admin',
    role: 'admin',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    email: 'wesley@verifiedbizlink.co.za',
    password: 'Wesley@123456',
    fullName: 'Wesley - Banking Specialist',
    role: 'banker',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'mraaziqp@gmail.com',
    password: 'SuperAdmin@123456',
    fullName: 'Super Admin - Owner',
    role: 'admin',
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

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: 'Server error: Supabase credentials not configured' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const results = [];

    // Create admin accounts in both Supabase Auth and Neon
    for (const account of adminAccounts) {
      try {
        // 1. Create in Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: account.email,
          password: account.password,
          email_confirm: true,
          user_metadata: {
            full_name: account.fullName,
            role: account.role,
          },
        });

        if (authError) {
          // If user already exists, try to just update
          if (authError.message.includes('already exists')) {
            // Get existing user
            const { data: userData, error: getError } = await supabase.auth.admin.getUserById(account.id);
            if (!getError && userData?.user) {
              results.push({
                email: account.email,
                role: account.role,
                status: 'exists',
                message: 'User already exists in Supabase Auth',
                userId: userData.user.id,
              });
            } else {
              results.push({
                email: account.email,
                status: 'error',
                message: authError.message,
              });
            }
            continue;
          } else {
            results.push({
              email: account.email,
              status: 'error',
              message: authError.message,
            });
            continue;
          }
        }

        const userId = authData?.user?.id || account.id;

        // 2. Create/Update in Neon database
        try {
          await db`
            INSERT INTO users (id, email, full_name, role, email_verified, vetting_score, created_at, updated_at)
            VALUES (${userId}, ${account.email}, ${account.fullName}, ${account.role}, true, 100, NOW(), NOW())
            ON CONFLICT (email) DO UPDATE SET
              role = ${account.role},
              full_name = ${account.fullName},
              email_verified = true,
              vetting_score = 100,
              updated_at = NOW()
            RETURNING id, email, role
          `;

          results.push({
            email: account.email,
            role: account.role,
            status: 'created',
            message: 'Created in Supabase Auth and Neon',
            userId,
          });
        } catch (dbError: any) {
          results.push({
            email: account.email,
            status: 'partial',
            message: `Created in Supabase Auth but failed in Neon: ${dbError.message}`,
          });
        }
      } catch (error: any) {
        results.push({
          email: account.email,
          status: 'error',
          message: error.message,
        });
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Admin accounts setup complete',
        admins_created: results.filter((r) => r.status === 'created').length,
        results,
        credentials: {
          ramoen: {
            email: 'ramoen@verifiedbizlink.co.za',
            password: 'Ramoen@123456',
            role: 'admin',
            access: 'All vetting and verification tools',
          },
          wesley: {
            email: 'wesley@verifiedbizlink.co.za',
            password: 'Wesley@123456',
            role: 'banker',
            access: 'Banking and compliance tools',
          },
          superAdmin: {
            email: 'mraaziqp@gmail.com',
            password: 'SuperAdmin@123456',
            role: 'admin',
            access: 'All tools and full access',
          },
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error seeding admin auth:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to seed admin accounts' },
      { status: 500 }
    );
  }
}
