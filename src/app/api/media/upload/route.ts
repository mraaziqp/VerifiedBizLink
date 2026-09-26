import { NextRequest, NextResponse } from 'next/server';
import { Storage } from '@google-cloud/storage';
import { MEDIA_MAX_BYTES, sniffMedia } from '@/lib/media-sniff';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // 5MB: the hosting platform rejects request bodies over ~6MB with a bare
    // 413/500 before this code runs, so a larger limit here only moved the
    // failure somewhere with no useful message. Large videos go straight to
    // storage through VideoUploader instead of through this route.
    if (file.size > MEDIA_MAX_BYTES) {
      return NextResponse.json(
        { error: `That file is ${(file.size / (1024 * 1024)).toFixed(1)}MB. The limit is 5MB.` },
        { status: 413 }
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

    // The bytes must match an allowed type; File.type alone is client-controlled.
    const buffer = Buffer.from(await file.arrayBuffer());
    const sniffed = sniffMedia(buffer);
    if (!sniffed || !allowedTypes.includes(sniffed.mime)) {
      return NextResponse.json({ error: 'That file is not a supported image or video.' }, { status: 400 });
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

        const ext = sniffed.ext;
        const destination = `media/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
        const bucket = storage.bucket(bucketName);
        const gcsFile = bucket.file(destination);

        await gcsFile.save(buffer, {
          contentType: sniffed.mime,
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
          type: sniffed.mime,
          size: file.size,
          method: 'gcs',
        });
      } catch (gcsError) {
        console.warn('GCS direct upload note, falling back to data URL:', gcsError);
      }
    }

    // High-performance fallback: Data URL
    const dataUrl = `data:${sniffed.mime};base64,${buffer.toString('base64')}`;

    return NextResponse.json({
      success: true,
      url: dataUrl,
      fileName: file.name,
      type: sniffed.mime,
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
