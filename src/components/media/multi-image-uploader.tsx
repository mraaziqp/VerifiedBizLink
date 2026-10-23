'use client';

import React, { useState, useRef, useCallback } from 'react';
import {
  UploadCloud, X, CheckCircle2, AlertCircle, Loader2, Image as ImageIcon,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { compressImage, fetchWithTimeout } from '@/lib/image-compress';
import { cn } from '@/lib/utils';

export interface UploadedMediaItem {
  url: string;
  fileName: string;
  size: number;
}

interface QueuedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  previewUrl: string;
  status: 'pending' | 'compressing' | 'uploading' | 'done' | 'error';
  progress: number;
  uploadedUrl?: string;
  error?: string;
}

export interface MultiImageUploaderProps {
  onUploadsComplete?: (items: UploadedMediaItem[]) => void;
  onSingleUploadComplete?: (item: UploadedMediaItem) => void;
  maxFiles?: number;
  maxSizeMB?: number;
  autoUpload?: boolean;
  className?: string;
  dropzoneClassName?: string;
  label?: string;
  description?: string;
}

const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export function MultiImageUploader({
  onUploadsComplete,
  onSingleUploadComplete,
  maxFiles = 20,
  maxSizeMB = 15,
  autoUpload = true,
  className,
  dropzoneClassName,
  label = 'Upload multiple photos at once',
  description = 'Drag & drop up to 20 images, or click to browse (JPEG, PNG, WebP)',
}: MultiImageUploaderProps) {
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const uploadSingleItem = useCallback(async (item: QueuedFile): Promise<UploadedMediaItem | null> => {
    try {
      // Step 1: Compress in browser
      setQueue((prev) =>
        prev.map((q) => (q.id === item.id ? { ...q, status: 'compressing', progress: 15 } : q))
      );

      const compressed = await compressImage(item.file, { maxDim: 1600, quality: 0.82 });

      setQueue((prev) =>
        prev.map((q) => (q.id === item.id ? { ...q, status: 'uploading', progress: 40 } : q))
      );

      // Step 2: Upload to backend
      const formData = new FormData();
      formData.append('file', compressed);
      formData.append('bucket', 'gallery');

      const res = await fetchWithTimeout('/api/media/upload', {
        method: 'POST',
        body: formData,
      }, 45000);

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Upload failed');
      }

      const uploaded: UploadedMediaItem = {
        url: data.url,
        fileName: item.name,
        size: data.size || compressed.size,
      };

      setQueue((prev) =>
        prev.map((q) =>
          q.id === item.id
            ? { ...q, status: 'done', progress: 100, uploadedUrl: data.url }
            : q
        )
      );

      onSingleUploadComplete?.(uploaded);
      return uploaded;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setQueue((prev) =>
        prev.map((q) => (q.id === item.id ? { ...q, status: 'error', error: msg } : q))
      );
      return null;
    }
  }, [onSingleUploadComplete]);

  const processQueue = useCallback(async (filesToUpload: QueuedFile[]) => {
    setIsProcessing(true);
    const completedItems: UploadedMediaItem[] = [];

    // Concurrent batching (3 files at once to maintain smooth browser performance)
    const concurrency = 3;
    const pool = [...filesToUpload];

    while (pool.length > 0) {
      const batch = pool.splice(0, concurrency);
      const results = await Promise.all(batch.map((item) => uploadSingleItem(item)));
      results.forEach((res) => {
        if (res) completedItems.push(res);
      });
    }

    setIsProcessing(false);
    if (completedItems.length > 0) {
      onUploadsComplete?.(completedItems);
    }
  }, [uploadSingleItem, onUploadsComplete]);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    const newFiles = Array.from(fileList);
    const validFiles: QueuedFile[] = [];

    for (const file of newFiles) {
      if (!ALLOWED_MIMES.includes(file.type)) continue;
      if (file.size > maxSizeMB * 1024 * 1024) continue;
      if (queue.length + validFiles.length >= maxFiles) break;

      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const previewUrl = URL.createObjectURL(file);

      validFiles.push({
        id,
        file,
        name: file.name,
        size: file.size,
        previewUrl,
        status: 'pending',
        progress: 0,
      });
    }

    if (validFiles.length === 0) return;

    setQueue((prev) => [...prev, ...validFiles]);

    if (autoUpload) {
      void processQueue(validFiles);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const removeQueueItem = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setQueue((prev) => {
      const item = prev.find((q) => q.id === id);
      if (item?.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
      return prev.filter((q) => q.id !== id);
    });
  };

  const clearCompleted = () => {
    setQueue((prev) => prev.filter((q) => q.status !== 'done'));
  };

  const doneCount = queue.filter((q) => q.status === 'done').length;
  const pendingCount = queue.filter((q) => q.status === 'pending' || q.status === 'uploading' || q.status === 'compressing').length;

  return (
    <div className={cn('space-y-4 w-full', className)}>
      {/* Dropzone Container */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          'group relative flex flex-col items-center justify-center p-6 sm:p-8 rounded-3xl border-2 border-dashed cursor-pointer transition-all duration-200 select-none text-center',
          isDragging
            ? 'border-amber-400 bg-amber-500/10 scale-[1.01]'
            : 'border-slate-300 hover:border-amber-400 bg-white hover:bg-amber-50/30 shadow-xs',
          dropzoneClassName
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ALLOWED_MIMES.join(',')}
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />

        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 text-slate-950 shadow-md shadow-amber-400/20 group-hover:scale-110 transition-transform">
          <UploadCloud className="h-7 w-7" />
        </div>

        <h3 className="mt-3 text-base font-extrabold text-slate-900">
          {label}
        </h3>
        <p className="mt-1 max-w-sm text-xs text-slate-500 font-medium">
          {description}
        </p>

        <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-[11px] font-bold text-amber-900">
          <Plus className="h-3.5 w-3.5" /> Select multiple photos (up to {maxFiles})
        </div>
      </div>

      {/* Upload Queue Grid & Status */}
      {queue.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 pb-2 border-b border-slate-100">
            <span className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-amber-500" />
              {isProcessing
                ? `Uploading ${queue.length - doneCount} remaining photos…`
                : `${queue.length} photo${queue.length === 1 ? '' : 's'} in queue (${doneCount} complete)`}
            </span>

            {doneCount > 0 && (
              <button
                type="button"
                onClick={clearCompleted}
                className="text-amber-700 hover:text-amber-900 transition-colors"
              >
                Clear completed
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {queue.map((item) => (
              <div
                key={item.id}
                className="group relative aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-50 flex flex-col justify-end p-2"
              >
                <img
                  src={item.previewUrl}
                  alt={item.name}
                  className="absolute inset-0 h-full w-full object-cover"
                />

                {/* Dark gradient for readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                {/* Status Badge */}
                <div className="absolute top-2 left-2 z-10">
                  {item.status === 'done' && (
                    <span className="flex items-center gap-1 rounded-full bg-emerald-500/90 text-white px-2 py-0.5 text-[10px] font-bold shadow-xs">
                      <CheckCircle2 className="h-3 w-3" /> Done
                    </span>
                  )}
                  {item.status === 'error' && (
                    <span className="flex items-center gap-1 rounded-full bg-rose-500/90 text-white px-2 py-0.5 text-[10px] font-bold shadow-xs">
                      <AlertCircle className="h-3 w-3" /> Failed
                    </span>
                  )}
                  {(item.status === 'uploading' || item.status === 'compressing') && (
                    <span className="flex items-center gap-1 rounded-full bg-amber-500/90 text-slate-950 px-2 py-0.5 text-[10px] font-bold shadow-xs">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      {item.status === 'compressing' ? 'Optimizing' : 'Uploading'}
                    </span>
                  )}
                </div>

                {/* Remove button */}
                <button
                  type="button"
                  onClick={(e) => removeQueueItem(item.id, e)}
                  className="absolute top-2 right-2 z-10 h-6 w-6 rounded-full bg-black/60 text-white hover:bg-rose-600 flex items-center justify-center transition-colors"
                  aria-label="Remove photo"
                >
                  <X className="h-3.5 w-3.5" />
                </button>

                {/* File info footer */}
                <div className="relative z-10 min-w-0">
                  <p className="truncate text-[11px] font-bold text-white leading-tight">
                    {item.name}
                  </p>
                  <p className="text-[10px] text-slate-300">
                    {formatSize(item.size)}
                  </p>

                  {/* Individual progress bar */}
                  {item.status === 'uploading' && (
                    <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/30">
                      <div
                        className="h-full bg-amber-400 transition-all duration-300"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {!autoUpload && pendingCount > 0 && (
            <div className="pt-2 flex justify-end">
              <Button
                onClick={() => processQueue(queue.filter((q) => q.status === 'pending'))}
                disabled={isProcessing}
                className="bg-amber-400 text-slate-950 hover:bg-amber-300 font-bold gap-2 rounded-xl"
              >
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                Upload {pendingCount} Photo{pendingCount === 1 ? '' : 's'}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
