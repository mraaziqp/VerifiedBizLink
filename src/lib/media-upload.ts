import { supabase } from './supabase';

export async function uploadImage(
  userId: string,
  file: File,
  bucket: 'profile-pictures' | 'business-images' | 'post-media' = 'post-media'
): Promise<{ url: string; error?: string }> {
  try {
    // Validate file
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return { url: '', error: 'File too large (max 10MB)' };
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      return { url: '', error: 'Invalid file type. Use JPG, PNG, WebP, or GIF' };
    }

    // Create unique filename
    const ext = file.name.split('.').pop();
    const timestamp = Date.now();
    const filename = `${userId}/${timestamp}.${ext}`;

    // Upload to Supabase
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filename, file, { upsert: true });

    if (error) {
      return { url: '', error: error.message };
    }

    // Get public URL
    const { data: publicData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filename);

    return { url: publicData.publicUrl };
  } catch (err) {
    return { url: '', error: 'Upload failed' };
  }
}

export async function deleteImage(
  filePath: string,
  bucket: 'profile-pictures' | 'business-images' | 'post-media' = 'post-media'
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath]);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: 'Delete failed' };
  }
}
