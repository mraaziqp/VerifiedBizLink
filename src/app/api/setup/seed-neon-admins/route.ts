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
import db from '@/lib/db';
import { hash } from 'bcryptjs';

const adminAccounts = [
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    email: 'ramone@verifiedbizlink.co.za',
    fullName: 'Ramone - Lead Admin',
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

    const results = [];

    // Create admin accounts directly in Neon database
    for (const account of adminAccounts) {
      try {
        // Use password that matches the user's email pattern or a default
        const defaultPassword = 'Admin@123';
        const passwordHash = await hash(defaultPassword, 12);

        const result = await db`
          INSERT INTO users (id, email, full_name, role, password_hash, vetting_score, created_at, updated_at)
          VALUES (${account.id}, ${account.email}, ${account.fullName}, ${account.role}, ${passwordHash}, 100, NOW(), NOW())
          ON CONFLICT (email) DO UPDATE SET
            role = ${account.role},
            full_name = ${account.fullName},
            vetting_score = 100,
            updated_at = NOW()
          RETURNING id, email, role
        `;

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

    return NextResponse.json(
      {
        success: true,
        message: 'Neon admin accounts created successfully',
        admins_created: results.filter((r) => r.status === 'created').length,
        results,
        credentials: {
          ramone: {
            email: 'ramone@verifiedbizlink.co.za',
            role: 'admin',
            access: 'All vetting and verification tools',
            password: 'Admin@123',
          },
          wesley: {
            email: 'wesley@verifiedbizlink.co.za',
            role: 'banker',
            access: 'Banking and compliance tools',
            password: 'Admin@123',
          },
          superAdmin: {
            email: 'mraaziqp@gmail.com',
            role: 'admin',
            access: 'All tools and full access',
            password: 'Admin@123',
          },
        },
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
