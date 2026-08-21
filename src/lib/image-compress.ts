/**
 * Client-side image compression. Resizes large photos down and re-encodes as
 * JPEG before upload — turns a multi-MB phone photo into ~100-300KB, so uploads
 * are fast, never time out, and stay well under server size limits.
 *
 * Safe by design: animated GIFs and non-images pass through untouched, and if
 * the compressed result isn't smaller (or anything fails) the original is used.
 */
export async function compressImage(
  file: File,
  opts: { maxDim?: number; quality?: number } = {}
): Promise<File> {
  const { maxDim = 1600, quality = 0.82 } = opts;

  // Don't touch non-raster images or animated GIFs (canvas would drop frames).
  if (typeof window === 'undefined') return file;
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file;

  try {
    const bitmap = await createImageBitmap(file);
    let { width, height } = bitmap;

    if (Math.max(width, height) > maxDim) {
      const scale = maxDim / Math.max(width, height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close?.();
      return file;
    }
    // Fill with white to prevent transparent PNGs turning black when saved as JPEG
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', quality)
    );

    // Only use the compressed version if it's actually smaller.
    if (!blob || blob.size >= file.size) return file;

    const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
    return new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() });
  } catch {
    return file; // any failure → fall back to the original file
  }
}

/** fetch() with an abort timeout so uploads never hang forever. */
export async function fetchWithTimeout(
  input: RequestInfo,
  init: RequestInit = {},
  timeoutMs = 45000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
