/**
 * Seed Admin Accounts Endpoint
 *
 * POST /api/setup/seed-accounts
 *
 * Body:
 * {
 *   "setupSecret": "your-setup-secret"
 * }
 *
 * Creates test accounts for:
 * - Ramone (admin)
 * - Wesley (banker)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { setupSecret } = body;

    // Verify setup secret
    if (!setupSecret || setupSecret !== process.env.SETUP_SECRET) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Server error: Supabase credentials missing' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const testAccounts = [
      {
        email: 'ramone@verifiedbizlink.co.za',
        password: 'TestPass123!',
        fullName: 'Ramone - Lead Admin',
        businessName: 'Ramone Verification Co',
        role: 'admin',
      },
      {
        email: 'wesley@verifiedbizlink.co.za',
        password: 'TestPass123!',
        fullName: 'Wesley - Banking Specialist',
        businessName: 'Wesley Banking Services',
        role: 'banker',
      },
    ];

    const results = [];

    for (const account of testAccounts) {
      try {
        // Create auth user
        const { data, error: authError } = await supabase.auth.admin.createUser({
          email: account.email,
          password: account.password,
          email_confirm: true,
        });

        if (authError) {
          if (authError.message.includes('already exists')) {
            results.push({
              email: account.email,
              status: 'exists',
              message: 'Account already exists',
            });
            continue;
          }
          throw authError;
        }

        const userId = data?.user?.id;
        if (!userId) {
          throw new Error('No user ID returned');
        }

        // Create user profile
        await supabase.from('users').insert([
          {
            id: userId,
            email: account.email,
            full_name: account.fullName,
            role: account.role,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ]);

        results.push({
          email: account.email,
          role: account.role,
          status: 'created',
          password: account.password,
        });
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
        message: 'Admin accounts seeding complete',
        results,
        credentials: {
          ramone: {
            email: 'ramone@verifiedbizlink.co.za',
            password: 'TestPass123!',
            role: 'admin',
          },
          wesley: {
            email: 'wesley@verifiedbizlink.co.za',
            password: 'TestPass123!',
            role: 'banker',
          },
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Seed failed' },
      { status: 500 }
    );
  }
}
