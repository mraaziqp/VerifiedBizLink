import db from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET all admin users
export async function GET() {
  try {
    const admins = await db`
      SELECT id, email, username, role, created_at
      FROM admin_users
      ORDER BY created_at DESC
    `;

    return NextResponse.json(admins);
  } catch (error) {
    console.error('Error fetching admins:', error);
    return NextResponse.json({ error: 'Failed to fetch admins' }, { status: 500 });
  }
}

// POST create new admin
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, username, role } = body;

    if (!email || !username) {
      return NextResponse.json({ error: 'Email and username required' }, { status: 400 });
    }

    // Generate temporary password
    const tempPassword = Math.random().toString(36).slice(-8);

    const result = await db`
      INSERT INTO admin_users (email, username, role, password_hash, status)
      VALUES (${email}, ${username}, ${role || 'admin'}, crypt(${tempPassword}, gen_salt('bf')), 'active')
      RETURNING id, email, username, role, created_at
    `;

    // TODO: Send welcome email with temp password

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error('Error creating admin:', error);
    return NextResponse.json({ error: 'Failed to create admin' }, { status: 500 });
  }
}
