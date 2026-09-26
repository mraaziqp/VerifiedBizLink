import { NextRequest, NextResponse } from 'next/server';
import { Storage } from '@google-cloud/storage';
import { MEDIA_MAX_BYTES, sniffMedia } from '@/lib/media-sniff';

const MAX_BYTES = MEDIA_MAX_BYTES; // Strict 5MB limit
const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_VIDEO_MIMES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/ogg', 'video/x-matroska'];

/**
 * Next.js API Route Handler: /api/upload
 * Strictly enforces 5MB limit and MIME type validation server-side.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const requestedType = (formData.get('type') as string) || 'image';

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file payload provided' },
        { status: 400 }
      );
    }

    // 1. Strict File Size Validation (< 5MB)
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        {
          success: false,
          error: `File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds strict 5MB limit. Please compress the file.`,
        },
        { status: 400 }
      );
    }

    // 2. Strict MIME Validation
    if (requestedType === 'video') {
      if (file.type.startsWith('image/')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid file: Image files cannot be uploaded to a video target.',
          },
          { status: 400 }
        );
      }
      if (!ALLOWED_VIDEO_MIMES.includes(file.type)) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid video format (${file.type}). Allowed: MP4, WebM, MOV.`,
          },
          { status: 400 }
        );
      }
    } else {
      if (file.type.startsWith('video/')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid file: Video files cannot be uploaded to an image target.',
          },
          { status: 400 }
        );
      }
      if (!ALLOWED_IMAGE_MIMES.includes(file.type)) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid image format (${file.type}). Allowed: JPEG, PNG, WebP.`,
          },
          { status: 400 }
        );
      }
    }

    // 3. Content check: the bytes must be what the label claims. File.type
    //    is client-controlled; the detected type is what we store and serve.
    const buffer = Buffer.from(await file.arrayBuffer());
    const sniffed = sniffMedia(buffer);
    if (!sniffed || sniffed.kind !== (requestedType === 'video' ? 'video' : 'image')) {
      return NextResponse.json(
        { success: false, error: requestedType === 'video' ? 'That file is not a playable video (MP4, WebM or MOV).' : 'That file is not a valid image (JPEG, PNG, WebP or GIF).' },
        { status: 400 },
      );
    }

    // 3. Storage persistence (GCP/Firebase Storage or Data URL)
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
        const folder = requestedType === 'video' ? 'videos' : 'images';
        const destination = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
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
          method: 'storage',
        });
      } catch (gcsError) {
        console.warn('GCS upload error, using data URL fallback:', gcsError);
      }
    }

    // Fallback: Data URL
    const dataUrl = `data:${sniffed.mime};base64,${buffer.toString('base64')}`;

    return NextResponse.json({
      success: true,
      url: dataUrl,
      fileName: file.name,
      type: sniffed.mime,
      size: file.size,
      method: 'dataurl',
    });
  } catch (error) {
    console.error('Upload API route error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Server upload failure',
      },
      { status: 500 }
    );
  }
}
