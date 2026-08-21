import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Role check: Only business accounts and staff can upload media
    if (session.role === 'customer') {
      return NextResponse.json({ error: 'Customers cannot upload video media' }, { status: 403 });
    }

    const { fileName, contentType, folder = 'videos' } = await request.json();

    if (!fileName || !contentType) {
      return NextResponse.json({ error: 'fileName and contentType are required' }, { status: 400 });
    }

    const allowedTypes = [
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif'
    ];

    if (!allowedTypes.includes(contentType)) {
      return NextResponse.json({ error: 'Unsupported media format' }, { status: 400 });
    }

    const projectId = process.env.GCP_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.GCP_CLIENT_EMAIL;
    const privateKey = process.env.GCP_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const bucketName = process.env.GCP_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'verifiedbizlink-media';

    // If Google Cloud credentials are not yet configured in .env, return informative error
    if (!clientEmail || !privateKey) {
      return NextResponse.json({
        error: 'Google Cloud Storage credentials are not configured. Please set GCP_CLIENT_EMAIL and GCP_PRIVATE_KEY in .env.local',
        configured: false
      }, { status: 503 });
    }

    const { Storage } = await import('@google-cloud/storage');
    const storage = new Storage({
      projectId,
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
    });

    const cleanFileName = `${folder}/${session.id}/${Date.now()}_${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const file = storage.bucket(bucketName).file(cleanFileName);

    // Generate V4 Signed URL valid for 15 minutes
    const [signedUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: Date.now() + 15 * 60 * 1000,
      contentType,
    });

    const publicUrl = `https://storage.googleapis.com/${bucketName}/${cleanFileName}`;

    return NextResponse.json({
      signedUrl,
      publicUrl,
      fileName: cleanFileName,
    });
  } catch (error) {
    console.error('Signed URL generation failed:', error);
    return NextResponse.json({ error: 'Could not generate upload URL' }, { status: 500 });
  }
}
