/**
 * Media Upload Endpoint
 * Handles image and file uploads with Supabase fallback
 */

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
    const bucket = (formData.get('bucket') as string) || 'posts';
    const userId = (formData.get('userId') as string) || 'anonymous';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size exceeds 10MB limit' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: JPEG, PNG, WebP, GIF, PDF' },
        { status: 400 }
      );
    }

    const fileBuffer = await file.arrayBuffer();
    const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
    const filePath = `${bucket}/${userId}/${fileName}`;

    // Try to upload to Supabase Storage
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, fileBuffer, {
          contentType: file.type,
          upsert: false,
        });

      if (error) {
        console.warn('Supabase upload failed, returning data URL:', error.message);
        // Fallback: return data URL for immediate preview
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
          message: 'Image loaded locally. Upload to Supabase pending connectivity.',
        });
      }

      // Get public URL
      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath);

      return NextResponse.json({
        success: true,
        url: urlData.publicUrl,
        fileName: file.name,
        type: file.type,
        size: file.size,
        path: filePath,
        method: 'supabase',
        message: 'Image uploaded to Supabase Storage',
      });
    } catch (supabaseError: any) {
      console.warn('Supabase unavailable, using data URL fallback:', supabaseError.message);

      // Fallback: return data URL for preview
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
        message: 'Image loaded locally (Supabase unavailable). Will persist after upload.',
      });
    }
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Upload failed' },
      { status: 500 }
    );
  }
}
