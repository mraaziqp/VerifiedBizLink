import { NextRequest, NextResponse } from 'next/server';
import { getSession, createSession, sessionCookieOptions } from '@/lib/auth';
import { Storage } from '@google-cloud/storage';
import db from '@/lib/db';

const MAX_SIZE_BYTES = 5 * 1024 * 1024;
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
      return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    let storedUrl = '';

    const bucketName =
      process.env.GCP_STORAGE_BUCKET ||
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
      'verified-biz-link.firebasestorage.app';

    if (process.env.GCP_CLIENT_EMAIL && process.env.GCP_PRIVATE_KEY) {
      try {
        const storage = new Storage({
          projectId: process.env.GCP_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          credentials: {
            client_email: process.env.GCP_CLIENT_EMAIL,
            private_key: process.env.GCP_PRIVATE_KEY.replace(/\\n/g, '\n'),
          },
        });

        const ext = (file.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
        const destination = `avatars/${session.id}/${Date.now()}.${ext}`;
        const bucket = storage.bucket(bucketName);
        const gcsFile = bucket.file(destination);

        await gcsFile.save(Buffer.from(buffer), {
          contentType: file.type,
          resumable: false,
          metadata: { cacheControl: 'public, max-age=31536000' },
        });

        storedUrl = `https://storage.googleapis.com/${bucketName}/${destination}`;
      } catch (gcsError) {
        console.warn('Avatar GCS upload note, falling back to data URL:', gcsError);
      }
    }

    if (!storedUrl) {
      storedUrl = `data:${file.type};base64,${Buffer.from(buffer).toString('base64')}`;
    }

    const updated = await db`
      UPDATE users SET avatar_url = ${storedUrl}, updated_at = NOW()
      WHERE id = ${session.id}
      RETURNING id, email, full_name, role, avatar_url, headline, email_verified
    `;

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
