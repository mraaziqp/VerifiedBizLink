/**
 * Seed Admin Account Passwords
 *
 * POST /api/setup/seed-passwords
 *
 * Sets password hashes for all admin accounts to enable direct database authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import db from '@/lib/db';

const adminAccounts = [
  {
    email: 'ramoen@verifiedbizlink.co.za',
    password: 'Ramoen@123456',
  },
  {
    email: 'wesley@verifiedbizlink.co.za',
    password: 'Wesley@123456',
  },
  {
    email: 'mraaziqp@gmail.com',
    password: 'SuperAdmin@123456',
  },
];

const demoAccounts = [
  {
    email: 'sarah@nexgen.com',
    password: 'Pass@123',
  },
  {
    email: 'elena@arcticlogistics.com',
    password: 'Pass@123',
  },
  {
    email: 'marcus@thornecapital.com',
    password: 'Pass@123',
  },
  {
    email: 'jin@quantumcyber.com',
    password: 'Pass@123',
  },
  {
    email: 'robert@foxlogistics.com',
    password: 'Pass@123',
  },
  {
    email: 'owner@apexdynamics.com',
    password: 'Pass@123',
  },
  {
    email: 'ceo@skylinerealty.com',
    password: 'Pass@123',
  },
];

const shareholderAccounts = [
  {
    email: 'shareholder1@vbl.com',
    password: 'Share@123',
  },
  {
    email: 'shareholder2@vbl.com',
    password: 'Share@123',
  },
  {
    email: 'shareholder3@vbl.com',
    password: 'Share@123',
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

    const results = {
      admins_updated: 0,
      demo_users_updated: 0,
      shareholders_updated: 0,
      errors: [] as any[],
    };

    // Seed admin passwords
    for (const account of adminAccounts) {
      try {
        const passwordHash = await hash(account.password, 12);
        await db`
          UPDATE users
          SET password_hash = ${passwordHash}, updated_at = NOW()
          WHERE email = ${account.email}
        `;
        results.admins_updated++;
      } catch (error: any) {
        results.errors.push({
          email: account.email,
          error: error.message,
        });
      }
    }

    // Seed demo user passwords
    for (const account of demoAccounts) {
      try {
        const passwordHash = await hash(account.password, 12);
        await db`
          UPDATE users
          SET password_hash = ${passwordHash}, updated_at = NOW()
          WHERE email = ${account.email}
        `;
        results.demo_users_updated++;
      } catch (error: any) {
        results.errors.push({
          email: account.email,
          error: error.message,
        });
      }
    }

    // Seed shareholder passwords
    for (const account of shareholderAccounts) {
      try {
        const passwordHash = await hash(account.password, 12);
        await db`
          UPDATE users
          SET password_hash = ${passwordHash}, updated_at = NOW()
          WHERE email = ${account.email}
        `;
        results.shareholders_updated++;
      } catch (error: any) {
        results.errors.push({
          email: account.email,
          error: error.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'All user passwords have been seeded',
      results,
      credentials: {
        admins: [
          { email: 'ramoen@verifiedbizlink.co.za', password: 'Ramoen@123456', role: 'admin' },
          { email: 'wesley@verifiedbizlink.co.za', password: 'Wesley@123456', role: 'banker' },
          { email: 'mraaziqp@gmail.com', password: 'SuperAdmin@123456', role: 'admin' },
        ],
        demo_users: demoAccounts,
        shareholders: shareholderAccounts,
      },
    });
  } catch (error: any) {
    console.error('Error seeding passwords:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to seed passwords' },
      { status: 500 }
    );
  }
}
