import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getSession, createSession, sessionCookieOptions } from '@/lib/auth';
import db from '@/lib/db';

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB (client compresses well below this)
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

    // Prefer Supabase Storage (lightweight URL); fall back to base64 in the DB.
    let storedUrl = '';
    try {
      // Built here, inside the existing fallback, so a missing Supabase key
      // degrades to the base64 path instead of failing the build at import.
      const supabase = getSupabaseAdmin();
      const ext = (file.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
      const path = `${session.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from('avatars')
        .upload(path, buffer, { contentType: file.type, upsert: true });
      if (!error) {
        storedUrl = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
      } else {
        console.error('[avatar] Supabase upload failed, using base64 fallback:', error.message);
      }
    } catch (e) {
      console.error('[avatar] Supabase threw, using base64 fallback:', e);
    }

    if (!storedUrl) {
      storedUrl = `data:${file.type};base64,${Buffer.from(buffer).toString('base64')}`;
    }

    const updated = await db`
      UPDATE users SET avatar_url = ${storedUrl}, updated_at = NOW()
      WHERE id = ${session.id}
      RETURNING id, email, full_name, role, avatar_url, headline, email_verified
    `;

    // A Supabase URL is short enough for the JWT; base64 is not, so keep it
    // empty in that case (/api/auth/me always reads avatar_url fresh from DB).
    // This reissues the JWT for the SAME session (not a new login) — carry
    // over session.sid rather than registering a new user_sessions row.
    const token = await createSession({
      id: updated[0].id,
      email: updated[0].email,
      fullName: updated[0].full_name,
      role: updated[0].role,
      avatarUrl: storedUrl.startsWith('http') ? storedUrl : '',
      headline: updated[0].headline || '',
      emailVerified: updated[0].email_verified ?? session.emailVerified ?? false,
    }, session.sid);

    const response = NextResponse.json({ avatarUrl: storedUrl, success: true });
    response.cookies.set('vbl_session', token, sessionCookieOptions(request.headers.get('host')));
    return response;
  } catch (error) {
    console.error('Avatar upload error:', error);
    return NextResponse.json({ error: 'Failed to upload avatar' }, { status: 500 });
  }
}
