'use client';

import { useState, useRef } from 'react';
import { ref, uploadBytesResumable, getDownloadURL, UploadTask } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { Video, Pause, Play, X, CheckCircle2, AlertCircle, Loader2, UploadCloud, Film } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface VideoUploaderProps {
  userId: string;
  businessId?: string;
  onUploadComplete: (videoUrl: string, metadata: { name: string; size: number; duration?: number; thumbnailUrl?: string }) => void;
  maxSizeMB?: number; // Default 100MB
}

/** Helper to capture a video frame as a JPEG data URL thumbnail */
async function captureVideoFrame(videoFile: File): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;
      video.src = URL.createObjectURL(videoFile);

      video.onloadeddata = () => {
        video.currentTime = Math.min(1.0, (video.duration || 2) / 2);
      };

      video.onseeked = () => {
        const canvas = document.createElement('canvas');
        canvas.width = Math.min(640, video.videoWidth || 640);
        canvas.height = Math.round(canvas.width * (video.videoHeight / video.videoWidth || 9 / 16));
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          URL.revokeObjectURL(video.src);
          resolve(dataUrl);
        } else {
          URL.revokeObjectURL(video.src);
          resolve(null);
        }
      };

      video.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export function VideoUploader({
  userId,
  businessId,
  onUploadComplete,
  maxSizeMB = 100,
}: VideoUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const uploadTaskRef = useRef<UploadTask | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    // Validate MIME type
    const validMimeTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
    if (!validMimeTypes.includes(selected.type)) {
      setError('Please select a valid video format (MP4, WebM, or MOV).');
      return;
    }

    // Validate file size
    if (selected.size > maxSizeMB * 1024 * 1024) {
      setError(`Video size exceeds the ${maxSizeMB}MB limit.`);
      return;
    }

    setError(null);
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));

    // Capture thumbnail
    const thumb = await captureVideoFrame(selected);
    if (thumb) setThumbnailUrl(thumb);
  };

  const startUpload = async () => {
    if (!file) return;

    setError(null);
    setIsUploading(true);
    setIsPaused(false);

    // If Firebase Storage is initialized and available
    if (storage) {
      try {
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const storagePath = `videos/${userId}/${Date.now()}_${sanitizedName}`;
        const storageRef = ref(storage, storagePath);

        const uploadTask = uploadBytesResumable(storageRef, file, {
          contentType: file.type,
          customMetadata: {
            uploadedBy: userId,
            businessId: businessId || '',
          },
        });

        uploadTaskRef.current = uploadTask;

        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
            setProgress(pct);
            if (snapshot.state === 'paused') setIsPaused(true);
            if (snapshot.state === 'running') setIsPaused(false);
          },
          (err) => {
            setIsUploading(false);
            setIsPaused(false);
            setError(err.message || 'Upload failed. Falling back to direct signed URL.');
          },
          async () => {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            setDownloadUrl(url);
            setIsUploading(false);
            onUploadComplete(url, { name: file.name, size: file.size, thumbnailUrl: thumbnailUrl || undefined });
          }
        );
        return;
      } catch (fbErr) {
        console.warn('Firebase client upload fallback to Signed URL:', fbErr);
      }
    }

    // Fallback: Upload via GCS Signed URL
    try {
      const signedRes = await fetch('/api/media/signed-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type,
          folder: 'videos',
        }),
      });

      if (!signedRes.ok) {
        const resJson = await signedRes.json().catch(() => ({}));
        throw new Error(resJson.error || 'Could not obtain upload URL.');
      }

      const { signedUrl, publicUrl } = await signedRes.json();

      // Perform direct PUT to Google Cloud Storage
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', signedUrl, true);
      xhr.setRequestHeader('Content-Type', file.type);

      xhr.upload.onprogress = (evt) => {
        if (evt.lengthComputable) {
          const pct = Math.round((evt.loaded / evt.total) * 100);
          setProgress(pct);
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200 || xhr.status === 204) {
          setDownloadUrl(publicUrl);
          setIsUploading(false);
          onUploadComplete(publicUrl, { name: file.name, size: file.size, thumbnailUrl: thumbnailUrl || undefined });
        } else {
          setError(`Upload failed with status code ${xhr.status}`);
          setIsUploading(false);
        }
      };

      xhr.onerror = () => {
        setError('Network error during video upload.');
        setIsUploading(false);
      };

      xhr.send(file);
    } catch (gcsErr) {
      setError(gcsErr instanceof Error ? gcsErr.message : 'Upload failed');
      setIsUploading(false);
    }
  };

  const togglePause = () => {
    if (!uploadTaskRef.current) return;
    if (isPaused) {
      uploadTaskRef.current.resume();
      setIsPaused(false);
    } else {
      uploadTaskRef.current.pause();
      setIsPaused(true);
    }
  };

  const cancelUpload = () => {
    if (uploadTaskRef.current) {
      uploadTaskRef.current.cancel();
      uploadTaskRef.current = null;
    }
    setFile(null);
    setPreviewUrl(null);
    setThumbnailUrl(null);
    setProgress(0);
    setIsUploading(false);
    setIsPaused(false);
    setError(null);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-sm">
      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime"
        className="hidden"
        onChange={handleFileChange}
      />

      {!file ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-amber-300 hover:border-amber-500 rounded-2xl cursor-pointer bg-amber-50/40 hover:bg-amber-50/70 transition-all group"
        >
          <div className="h-13 w-13 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <Film className="h-6 w-6 text-amber-600" />
          </div>
          <p className="text-sm font-extrabold text-slate-900">Click or drag video to upload</p>
          <p className="text-xs text-slate-500 mt-1 font-medium">MP4, WebM or MOV (Up to {maxSizeMB}MB)</p>
        </div>
      ) : (
        <div className="space-y-4">
          {previewUrl && (
            <div className="relative aspect-video rounded-xl bg-black overflow-hidden max-h-64 mx-auto border border-slate-200 shadow-xs">
              <video src={previewUrl} controls className="w-full h-full object-contain" />
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-slate-700 px-0.5">
            <span className="font-bold text-slate-900 truncate max-w-[220px]">{file.name}</span>
            <span className="text-slate-500 font-semibold">{(file.size / (1024 * 1024)).toFixed(1)} MB</span>
          </div>

          {isUploading && (
            <div className="space-y-2 bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
              <div className="flex items-center justify-between text-xs">
                <span className="text-amber-600 font-extrabold">{progress}% uploaded</span>
                <span className="text-slate-600 font-bold">{isPaused ? 'Paused' : 'Streaming to Cloud Storage...'}</span>
              </div>
              <Progress value={progress} className="h-2.5 bg-slate-200" />
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 p-3 rounded-xl border border-red-200 font-medium">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {downloadUrl && (
            <div className="flex items-center gap-2 text-xs text-emerald-800 bg-emerald-50 p-3 rounded-xl border border-emerald-200 font-semibold">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>Video ready! Attached to your post.</span>
            </div>
          )}

          {/* Action Buttons with High Contrast */}
          <div className="flex items-center gap-2 pt-1">
            {!isUploading && !downloadUrl && (
              <Button
                onClick={startUpload}
                className="flex-1 bg-amber-400 text-slate-950 hover:bg-amber-500 font-extrabold h-11 rounded-xl shadow-md shadow-amber-400/20 text-sm active:scale-98"
              >
                Upload Video
              </Button>
            )}

            {isUploading && uploadTaskRef.current && (
              <Button
                onClick={togglePause}
                className={`flex-1 font-extrabold h-11 rounded-xl shadow-sm text-sm flex items-center justify-center gap-2 transition-all ${
                  isPaused
                    ? 'bg-amber-400 text-slate-950 hover:bg-amber-500'
                    : 'bg-slate-900 text-amber-400 hover:bg-slate-800'
                }`}
              >
                {isPaused ? <Play className="h-4 w-4 fill-slate-950 text-slate-950" /> : <Pause className="h-4 w-4 fill-amber-400 text-amber-400" />}
                <span>{isPaused ? 'Resume Upload' : 'Pause Upload'}</span>
              </Button>
            )}

            <Button
              variant="outline"
              onClick={cancelUpload}
              className="border-slate-200 bg-slate-50 hover:bg-red-50 text-slate-700 hover:text-red-600 hover:border-red-200 h-11 px-4 rounded-xl font-bold text-xs shrink-0 transition-all flex items-center gap-1.5"
              title="Cancel video"
            >
              <X className="h-4 w-4" />
              <span>Cancel</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
