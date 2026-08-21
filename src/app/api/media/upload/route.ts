import { NextRequest, NextResponse } from 'next/server';
import { Storage } from '@google-cloud/storage';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file size (max 15MB for images/media)
    if (file.size > 15 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size exceeds 15MB limit' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
      'video/mp4', 'video/webm', 'video/quicktime'
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: JPEG, PNG, WebP, GIF, MP4, WebM' },
        { status: 400 }
      );
    }

    // Try Google Cloud / Firebase Storage first
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

        const ext = file.name.split('.').pop() || 'bin';
        const destination = `media/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
        const bucket = storage.bucket(bucketName);
        const gcsFile = bucket.file(destination);

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        await gcsFile.save(buffer, {
          contentType: file.type,
          resumable: false,
          metadata: {
            cacheControl: 'public, max-age=31536000',
          },
        });

        const publicUrl = `https://storage.googleapis.com/${bucketName}/${destination}`;
        return NextResponse.json({
          success: true,
          url: publicUrl,
          fileName: file.name,
          type: file.type,
          size: file.size,
          method: 'gcs',
        });
      } catch (gcsError) {
        console.warn('GCS direct upload note, falling back to data URL:', gcsError);
      }
    }

    // High-performance fallback: Data URL
    const fileBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(fileBuffer);
    const base64 = buffer.toString('base64');
    const dataUrl = `data:${file.type};base64,${base64}`;

    return NextResponse.json({
      success: true,
      url: dataUrl,
      fileName: file.name,
      type: file.type,
      size: file.size,
      method: 'dataurl',
    }, { status: 200 });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed', success: false },
      { status: 500 }
    );
  }
}
