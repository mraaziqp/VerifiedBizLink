import { storage } from './firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

export async function uploadImage(
  userId: string,
  file: File,
  folder: 'profile-pictures' | 'business-images' | 'post-media' = 'post-media'
): Promise<{ url: string; error?: string }> {
  try {
    const maxSize = 25 * 1024 * 1024;
    if (file.size > maxSize) {
      return { url: '', error: 'File too large (max 25MB)' };
    }

    // Try Firebase Storage first
    if (storage) {
      try {
        const ext = file.name.split('.').pop() || 'bin';
        const timestamp = Date.now();
        const path = `${folder}/${userId}/${timestamp}.${ext}`;
        const storageRef = ref(storage, path);

        const snapshot = await uploadBytes(storageRef, file, {
          contentType: file.type,
        });

        const downloadUrl = await getDownloadURL(snapshot.ref);
        return { url: downloadUrl };
      } catch (fbError) {
        console.warn('Firebase upload error, trying backend route:', fbError);
      }
    }

    // Fallback: Use /api/media/upload
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/media/upload', { method: 'POST', body: formData });
    const data = await res.json();
    if (res.ok && data.url) {
      return { url: data.url };
    }

    return { url: '', error: data.error || 'Upload failed' };
  } catch (err) {
    return { url: '', error: err instanceof Error ? err.message : 'Upload failed' };
  }
}

export async function deleteImage(
  filePath: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (storage && filePath.includes('firebasestorage')) {
      const storageRef = ref(storage, filePath);
      await deleteObject(storageRef);
    }
    return { success: true };
  } catch {
    return { success: false, error: 'Delete failed' };
  }
}
