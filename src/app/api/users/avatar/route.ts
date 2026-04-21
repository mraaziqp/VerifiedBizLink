import { NextRequest, NextResponse } from 'next/server';
import { getSession, createSession } from '@/lib/auth';
import db from '@/lib/db';

const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get('avatar') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Only JPEG, PNG, WebP, GIF allowed.' }, { status: 400 });
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: 'File too large (max 2MB)' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const dataUri = `data:${file.type};base64,${base64}`;

    const updated = await db`
      UPDATE users SET avatar_url = ${dataUri}, updated_at = NOW()
      WHERE id = ${session.id}
      RETURNING id, email, full_name, role, avatar_url, headline
    `;

    // Refresh JWT with new avatar
    const token = await createSession({
      id: updated[0].id,
      email: updated[0].email,
      fullName: updated[0].full_name,
      role: updated[0].role,
      avatarUrl: updated[0].avatar_url || '',
      headline: updated[0].headline || '',
    });

    const response = NextResponse.json({ avatarUrl: dataUri, success: true });
    response.cookies.set('vbl_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });
    return response;
  } catch (error) {
    console.error('Avatar upload error:', error);
    return NextResponse.json({ error: 'Failed to upload avatar' }, { status: 500 });
  }
}
