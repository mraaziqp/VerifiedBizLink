'use client';

import { useState, useRef } from 'react';
import { Upload, X, Check } from 'lucide-react';

interface ImageUploaderProps {
  onImageSelect?: (imageUrl: string) => void;
  maxSize?: number;
  buttonClassName?: string;
}

export function ImageUploader({
  onImageSelect,
  maxSize = 10 * 1024 * 1024,
  buttonClassName = 'text-gray-500 hover:text-gray-700',
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setSuccess(false);

    // Validate file size
    if (file.size > maxSize) {
      setError(`File size exceeds ${maxSize / 1024 / 1024}MB limit`);
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Allowed: JPEG, PNG, WebP, GIF');
      return;
    }

    setUploading(true);

    try {
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Upload file
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bucket', 'posts');

      const response = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        onImageSelect?.(data.url);

        // Reset after 2 seconds
        setTimeout(() => {
          setSuccess(false);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }, 2000);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      setError(message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        disabled={uploading}
        className="hidden"
        aria-label="Upload image"
      />

      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className={`relative p-2 rounded transition-colors ${buttonClassName} ${
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
