import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

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
    } catch (supabaseError) {
      console.warn('Supabase upload failed, falling back to data URL:', supabaseError);
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
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Upload failed', success: false },
      { status: 500 }
    );
  }
}
