'use client';

import { useState, useRef } from 'react';
import { Upload, X, Check } from 'lucide-react';
import { compressImage, fetchWithTimeout } from '@/lib/image-compress';

interface ImageUploaderProps {
  onImageSelect?: (imageUrl: string) => void;
  onImagesSelect?: (imageUrls: string[]) => void;
  onUploadStateChange?: (uploading: boolean) => void;
  maxSize?: number;
  buttonClassName?: string;
  multiple?: boolean;
  /** Optional visible text next to the icon — without it this is an
   * icon-only control, which is easy to lose against a custom background
   * if buttonClassName doesn't also set a color (see gallery page fix). */
  label?: string;
}

export function ImageUploader({
  onImageSelect,
  onImagesSelect,
  onUploadStateChange,
  maxSize = 10 * 1024 * 1024,
  buttonClassName = 'text-gray-500 hover:text-gray-700',
  multiple = false,
  label,
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;

    setError(null);
    setSuccess(false);

    // Validate file sizes and types
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const validFiles: File[] = [];

    for (const f of files) {
      if (f.size > maxSize) {
        setError(`"${f.name}" exceeds ${maxSize / 1024 / 1024}MB limit`);
        return;
      }
      if (!allowedTypes.includes(f.type)) {
        setError(`"${f.name}" has invalid type. Allowed: JPEG, PNG, WebP, GIF`);
        return;
      }
      validFiles.push(f);
    }

    if (validFiles.length === 0) return;

    setUploading(true);
    onUploadStateChange?.(true);

    try {
      // Preview the first file
      const first = validFiles[0];
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPreview(ev.target?.result as string);
      };
      reader.readAsDataURL(first);

      const uploadedUrls: string[] = [];

      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        if (validFiles.length > 1) {
          setUploadProgress(`${i + 1}/${validFiles.length}`);
        }

        // Compress/resize before upload — fast, smooth, never gets stuck on big photos
        const compressed = await compressImage(file, { maxDim: 1600, quality: 0.82 });

        const formData = new FormData();
        formData.append('file', compressed);
        formData.append('bucket', 'posts');

        const response = await fetchWithTimeout('/api/media/upload', {
          method: 'POST',
          body: formData,
        }, 45000);

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `Upload failed for ${file.name}`);
        }

        const data = await response.json();
        if (data.success && data.url) {
          uploadedUrls.push(data.url);
        }
      }

      if (uploadedUrls.length > 0) {
        setSuccess(true);
        if (uploadedUrls[0]) onImageSelect?.(uploadedUrls[0]);
        onImagesSelect?.(uploadedUrls);

        // Reset after 2 seconds
        setTimeout(() => {
          setSuccess(false);
          setUploadProgress(null);
          setPreview(null);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }, 2000);
      }
    } catch (err) {
      const aborted = err instanceof DOMException && err.name === 'AbortError';
      const message = aborted
        ? 'Upload timed out — check your connection and try again.'
        : err instanceof Error ? err.message : 'Upload failed';
      setError(message);
      setPreview(null);
    } finally {
      setUploading(false);
      setUploadProgress(null);
      onUploadStateChange?.(false);
    }
  };

  return (
    <div className="relative">
      <input
        ref={fileInputRef}
        type="file"
        multiple={multiple}
        accept="image/*"
        onChange={handleFileSelect}
        disabled={uploading}
        className="hidden"
        aria-label="Upload image"
      />

      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className={`relative p-2 rounded transition-colors ${label ? 'flex items-center justify-center gap-2' : ''} ${buttonClassName} ${
          uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        }`}
        title="Upload image"
      >
        {uploading ? (
          <div className="animate-spin">
            <Upload size={20} />
          </div>
        ) : success ? (
          <Check size={20} className="text-green-500" />
        ) : (
          <Upload size={20} />
        )}
        {label && (
          <span className="font-medium">
            {uploading ? (uploadProgress ? `Uploading (${uploadProgress})…` : 'Uploading…') : success ? 'Uploaded' : label}
          </span>
        )}
      </button>

      {/* Error message */}
      {error && (
        <div className="absolute bottom-full left-0 mb-2 bg-red-100 text-red-700 text-sm px-3 py-2 rounded whitespace-nowrap">
          <div className="flex items-center gap-2">
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-red-700 hover:text-red-900"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Preview */}
      {preview && (
        <div className="absolute bottom-full left-0 mb-2 bg-gray-800 rounded overflow-hidden">
          <img
            src={preview}
            alt="Preview"
            className="w-24 h-24 object-cover"
          />
          <div className="text-xs text-gray-300 p-2 text-center">
            {uploading ? 'Uploading...' : 'Ready'}
          </div>
        </div>
      )}
    </div>
  );
}
