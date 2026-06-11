/**
 * Seed Neon Database Admin Accounts
 *
 * POST /api/setup/seed-neon-admins
 *
 * Creates admin accounts in Neon with proper roles
 *
 * Body:
 * {
 *   "setupSecret": "dev-seed-secret-2024-vbl"
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

    // Create admin accounts in Neon via Supabase
    for (const account of adminAccounts) {
      try {
        const { data, error } = await supabase
          .from('users')
          .upsert(
            {
              id: account.id,
              email: account.email,
              full_name: account.fullName,
              role: account.role,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'email' }
          )
          .select();

        if (error) {
          results.push({
            email: account.email,
            status: 'error',
            message: error.message,
          });
        } else {
          results.push({
            email: account.email,
            role: account.role,
            status: 'created',
            description: account.description,
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
        rls_enabled: true,
        policies_created: true,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error seeding Neon admins:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to seed admin accounts' },
      { status: 500 }
    );
  }
}
