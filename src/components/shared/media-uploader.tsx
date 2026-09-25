'use client';

import React, { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { UploadCloud, FileVideo, Image as ImageIcon, AlertCircle, CheckCircle2, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface MediaUploaderProps {
  type: 'image' | 'video';
  onUploadComplete: (url: string, metadata: { name: string; size: number; type: string }) => void;
  onError?: (error: string) => void;
  maxSizeMB?: number;
  endpoint?: string;
  className?: string;
  label?: string;
}

const ALLOWED_VIDEO_MIMES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/ogg', 'video/x-matroska'];
const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_BYTES = 5 * 1024 * 1024; // Strict 5MB limit

/**
 * Bulletproof MediaUploader dropzone component.
 * Strictly blocks files > 5MB and validates MIME types on the client
 * BEFORE any network request is initiated.
 */
export function MediaUploader({
  type,
  onUploadComplete,
  onError,
  maxSizeMB = 5,
  endpoint = '/api/upload',
  className,
  label,
}: MediaUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const maxAllowedBytes = maxSizeMB * 1024 * 1024;

  const validateAndUpload = async (file: File) => {
    setErrorMessage(null);

    // 1. Strict Size Validation (< 5MB)
    if (file.size > maxAllowedBytes) {
      const actualMB = (file.size / (1024 * 1024)).toFixed(1);
      const err = `File size (${actualMB}MB) strictly exceeds the ${maxSizeMB}MB limit. Please compress your file before uploading.`;
      setErrorMessage(err);
      onError?.(err);
      return;
    }

    // 2. Strict MIME Type Validation
    if (type === 'video') {
      // Strictly reject images when video is requested
      if (file.type.startsWith('image/')) {
        const err = 'Invalid file type: Images cannot be uploaded into a video field. Please upload an MP4, WebM, or MOV video.';
        setErrorMessage(err);
        onError?.(err);
        return;
      }
      if (!ALLOWED_VIDEO_MIMES.includes(file.type)) {
        const err = `Unsupported video format (${file.type || 'unknown'}). Allowed: MP4, WebM, MOV.`;
        setErrorMessage(err);
        onError?.(err);
        return;
      }
    } else {
      // Strictly reject videos when image is requested
      if (file.type.startsWith('video/')) {
        const err = 'Invalid file type: Videos cannot be uploaded into an image field. Please upload a JPEG, PNG, or WebP.';
        setErrorMessage(err);
        onError?.(err);
        return;
      }
      if (!ALLOWED_IMAGE_MIMES.includes(file.type)) {
        const err = `Unsupported image format (${file.type || 'unknown'}). Allowed: JPEG, PNG, WebP, GIF.`;
        setErrorMessage(err);
        onError?.(err);
        return;
      }
    }

    // Client-side preview
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    // 3. Network Upload
    setIsUploading(true);
    setProgress(20);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);

      setProgress(50);
      const res = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      setProgress(100);

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Server rejected file upload');
      }

      setUploadedFile({ name: file.name, size: file.size });
      onUploadComplete(data.url, {
        name: file.name,
        size: file.size,
        type: file.type,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setErrorMessage(msg);
      onError?.(msg);
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      validateAndUpload(files[0]);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      validateAndUpload(files[0]);
    }
  };

  const clearSelection = () => {
    setPreviewUrl(null);
    setUploadedFile(null);
    setErrorMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const acceptedMimeString = type === 'video'
    ? 'video/mp4,video/webm,video/quicktime'
    : 'image/jpeg,image/png,image/webp,image/gif';

  return (
    <div className={cn('w-full space-y-2', className)}>
      {label && (
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
          {label}
        </label>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedMimeString}
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Dropzone Container */}
      {!previewUrl && !uploadedFile ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            'flex flex-col items-center justify-center p-6 sm:p-8 rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer bg-slate-50/50 hover:bg-slate-50',
            isDragging
              ? 'border-slate-900 bg-slate-100 ring-4 ring-slate-900/10'
              : 'border-slate-300 hover:border-slate-400'
          )}
        >
          <div className="h-12 w-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-xs mb-3">
            {type === 'video' ? (
              <FileVideo className="h-6 w-6 text-slate-700" />
            ) : (
              <ImageIcon className="h-6 w-6 text-slate-700" />
            )}
          </div>

          <p className="text-sm font-bold text-slate-900">
            Click to upload or drag &amp; drop {type}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {type === 'video' ? 'MP4, WebM, MOV' : 'JPEG, PNG, WebP'} (Strict {maxSizeMB}MB max limit)
          </p>
        </div>
      ) : (
        <div className="relative rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center gap-3">
            {/* Preview Box */}
            <div className="h-16 w-16 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
              {type === 'image' && previewUrl ? (
                <img src={previewUrl} alt="Upload preview" className="h-full w-full object-cover" />
              ) : (
                <FileVideo className="h-8 w-8 text-slate-700" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">
                {uploadedFile?.name || 'File selected'}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {uploadedFile ? `${(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB` : 'Ready'}
              </p>
              {isUploading && (
                <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className="bg-slate-900 h-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}
            </div>

            {!isUploading && (
              <button
                type="button"
                onClick={clearSelection}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            )}

            {isUploading && <Loader2 className="h-5 w-5 animate-spin text-slate-900 shrink-0" />}
          </div>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold animate-slide-up">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}
