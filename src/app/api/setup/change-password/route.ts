/**
 * Change User Password Endpoint
 * POST /api/setup/change-password
 */

import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import db from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, newPassword, setupSecret } = body;

    // Verify setup secret
    if (!setupSecret || setupSecret !== process.env.SETUP_SECRET) {
      return NextResponse.json({ error: 'Forbidden - Invalid setup secret' }, { status: 403 });
    }

    if (!email || !newPassword) {
      return NextResponse.json({ error: 'Email and newPassword required' }, { status: 400 });
    }

    const passwordHash = await hash(newPassword, 12);

    await db`
      UPDATE users
      SET password_hash = ${passwordHash}, updated_at = NOW()
      WHERE LOWER(email) = LOWER(${email})
    `;

    return NextResponse.json({
      success: true,
      message: `Password updated for ${email}`,
    });
  } catch (error: any) {
    console.error('Error changing password:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to change password' },
      { status: 500 }
    );
  }
}
