import { NextRequest, NextResponse } from 'next/server';
import { hash, compare } from 'bcryptjs';
import { getSession, isStaff } from '@/lib/auth';
import db from '@/lib/db';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || !isStaff(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const user = await db`
      SELECT id, email, full_name, role, headline
      FROM users
      WHERE id = ${session.id}
      LIMIT 1
    `;

    if (!user[0]) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user: user[0] });
  } catch (error) {
    console.error('Get admin settings error:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || !isStaff(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { currentPassword, newEmail, newPassword } = await request.json();

    // Verify current password
    const user = await db`
      SELECT password_hash
      FROM users
      WHERE id = ${session.id}
      LIMIT 1
    `;

    if (!user[0]) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const passwordValid = await compare(currentPassword, user[0].password_hash);
    if (!passwordValid) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 });
    }

    // Prepare updates
    const updates: Record<string, any> = { updated_at: new Date() };

    // Update email if provided
    if (newEmail && newEmail !== session.email) {
      // Check if email already exists
      const existing = await db`
        SELECT id FROM users WHERE email = ${newEmail.toLowerCase().trim()} AND id != ${session.id} LIMIT 1
      `;
      if (existing.length > 0) {
        return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
      }
      updates.email = newEmail.toLowerCase().trim();
    }

    // Update password if provided
    if (newPassword) {
      if (newPassword.length < 8) {
        return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 });
      }
      updates.password_hash = await hash(newPassword, 12);
    }

    // If nothing to update
    if (Object.keys(updates).length === 1) {
      return NextResponse.json({ error: 'No changes provided' }, { status: 400 });
    }

    // Build dynamic SQL
    const setClause = Object.keys(updates)
      .map((key, i) => `${key} = $${i + 1}`)
      .join(', ');
    const values = Object.values(updates);

    const result = await db(
      db`UPDATE users SET ${setClause} WHERE id = ${session.id} RETURNING id, email, full_name, role, headline`,
      ...values
    ).catch(async () => {
      // Fallback: update one field at a time
      for (const [key, value] of Object.entries(updates)) {
        if (key !== 'updated_at') {
          await db`UPDATE users SET ${key} = ${value} WHERE id = ${session.id}`;
        }
      }
      return db`SELECT id, email, full_name, role, headline FROM users WHERE id = ${session.id} LIMIT 1`;
    });

    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully',
      user: result[0],
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('Update admin settings error:', errorMsg);
    return NextResponse.json({ error: 'Failed to update settings', detail: errorMsg }, { status: 500 });
  }
}
