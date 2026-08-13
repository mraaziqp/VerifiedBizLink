import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file size (max 5MB for faster uploads)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size exceeds 5MB limit' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: JPEG, PNG, WebP, GIF' },
        { status: 400 }
      );
    }

    // Try to upload to Supabase first for efficiency
    try {
      // Built here, inside the existing fallback, so missing Supabase config
      // degrades to base64 rather than failing the build at import time.
      const supabase = getSupabaseAdmin();
      const fileBuffer = await file.arrayBuffer();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}-${file.name}`;

      const { data, error } = await supabase.storage
        .from('media')
        .upload(`images/${fileName}`, fileBuffer, {
          contentType: file.type,
          upsert: false,
        });

      if (!error && data) {
        const { data: { publicUrl } } = supabase.storage
          .from('media')
          .getPublicUrl(`images/${fileName}`);

        return NextResponse.json({
          success: true,
          url: publicUrl,
          fileName: file.name,
          type: file.type,
          size: file.size,
          method: 'supabase',
        }, { status: 200 });
      }

      // Supabase returned an error object (e.g. bad URL, missing/private bucket).
      // Log it loudly so the misconfiguration is visible instead of silently
      // degrading every upload to base64.
      console.error(
        '[media/upload] Supabase upload failed, falling back to base64. Reason:',
        error?.message || 'unknown error',
        '| bucket "media" must exist & be public, and NEXT_PUBLIC_SUPABASE_URL must be valid.'
      );
    } catch (supabaseError) {
      console.error('[media/upload] Supabase threw, falling back to base64:', supabaseError);
    }

    // Fallback to base64 data URL if Supabase fails
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
