"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, X, Download } from "lucide-react";
import { cn } from "@/lib/utils";

function isVideoUrl(url: string): boolean {
  if (!url) return false;
  return /\.(mp4|webm|mov|m4v|ogg)(\?.*)?$/i.test(url) || url.includes('/videos/') || url.includes('video');
}

function parseImageUrls(raw: string): string[] {
  if (!raw) return [];
  const trimmed = raw.trim();

  // 1. JSON Array string
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.filter((u) => typeof u === "string" && u.length > 0);
    } catch {
      /* fallback */
    }
  }

  // 2. Comma separated
  if (trimmed.includes(",") && !trimmed.startsWith("data:")) {
    const parts = trimmed.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length > 1) return parts;
  }

  // 3. Single URL
  return [trimmed];
}

export function PostImage({ url, className = "" }: { url: string; className?: string }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (!url) return null;

  const isVideo = isVideoUrl(url);

  if (isVideo) {
    return (
      <div className={cn("overflow-hidden rounded-2xl border border-slate-200 bg-black shadow-xs", className)}>
        <video
          src={url}
          controls
          playsInline
          preload="metadata"
          className="max-h-[500px] w-full rounded-2xl object-contain bg-black"
        />
      </div>
    );
  }

  const urls = parseImageUrls(url);

  if (urls.length === 0) return null;

  // Single Image
  if (urls.length === 1) {
    const single = urls[0];
    return (
      <>
        <div
          onClick={() => setLightboxIndex(0)}
          className={cn(
            "block overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-50 shadow-xs group cursor-pointer",
            className
          )}
        >
          <img
            src={single}
            alt="Post attachment"
            decoding="async"
            loading="lazy"
            className="max-h-[500px] w-full object-cover group-hover:scale-[1.01] transition-transform duration-200"
            onError={(e) => {
              (e.currentTarget.parentElement as HTMLElement).style.display = "none";
            }}
          />
        </div>

        {lightboxIndex !== null && (
          <LightboxModal
            urls={urls}
            index={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
            onNavigate={(i) => setLightboxIndex(i)}
          />
        )}
      </>
    );
  }

  // Two Images: 50 / 50 split
  if (urls.length === 2) {
    return (
      <>
        <div className={cn("grid grid-cols-2 gap-2 rounded-2xl overflow-hidden border border-slate-200/80", className)}>
          {urls.map((imgUrl, i) => (
            <div
              key={i}
              onClick={() => setLightboxIndex(i)}
              className="relative aspect-square cursor-pointer overflow-hidden bg-slate-100 group"
            >
              <img
                src={imgUrl}
                alt={`Photo ${i + 1}`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              />
            </div>
          ))}
        </div>

        {lightboxIndex !== null && (
          <LightboxModal
            urls={urls}
            index={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
            onNavigate={(i) => setLightboxIndex(i)}
          />
        )}
      </>
    );
  }

  // Three Images: 1 big left, 2 stacked right
  if (urls.length === 3) {
    return (
      <>
        <div className={cn("grid grid-cols-3 gap-2 rounded-2xl overflow-hidden border border-slate-200/80 aspect-[16/10]", className)}>
          <div
            onClick={() => setLightboxIndex(0)}
            className="col-span-2 h-full cursor-pointer overflow-hidden bg-slate-100 group relative"
          >
            <img
              src={urls[0]}
              alt="Photo 1"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            />
          </div>
          <div className="flex flex-col gap-2 h-full">
            {urls.slice(1, 3).map((imgUrl, idx) => (
              <div
                key={idx + 1}
                onClick={() => setLightboxIndex(idx + 1)}
                className="flex-1 cursor-pointer overflow-hidden bg-slate-100 group relative"
              >
                <img
                  src={imgUrl}
                  alt={`Photo ${idx + 2}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
              </div>
            ))}
          </div>
        </div>

        {lightboxIndex !== null && (
          <LightboxModal
            urls={urls}
            index={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
            onNavigate={(i) => setLightboxIndex(i)}
          />
        )}
      </>
    );
  }

  // Four or More Images: 2x2 collage with "+N more" badge on the 4th
  const visible = urls.slice(0, 4);
  const remaining = urls.length - 4;

  return (
    <>
      <div className={cn("grid grid-cols-2 gap-2 rounded-2xl overflow-hidden border border-slate-200/80", className)}>
        {visible.map((imgUrl, i) => (
          <div
            key={i}
            onClick={() => setLightboxIndex(i)}
            className="relative aspect-video cursor-pointer overflow-hidden bg-slate-100 group"
          >
            <img
              src={imgUrl}
              alt={`Photo ${i + 1}`}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            />
            {i === 3 && remaining > 0 && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-extrabold text-xl">
                +{remaining} more
              </div>
            )}
          </div>
        ))}
      </div>

      {lightboxIndex !== null && (
        <LightboxModal
          urls={urls}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={(i) => setLightboxIndex(i)}
        />
      )}
    </>
  );
}

function LightboxModal({
  urls,
  index,
  onClose,
  onNavigate,
}: {
  urls: string[];
  index: number;
  onClose: () => void;
  onNavigate: (i: number) => void;
}) {
  const current = urls[index];

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-between p-4 sm:p-6 animate-in fade-in duration-150"
    >
      <div className="w-full flex items-center justify-between text-white max-w-5xl" onClick={(e) => e.stopPropagation()}>
        <span className="text-xs font-bold text-slate-400">
          Photo {index + 1} of {urls.length}
        </span>
        <div className="flex items-center gap-2">
          <a
            href={current}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white"
            title="Download original"
          >
            <Download className="h-5 w-5" />
          </a>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-rose-500/30 text-white hover:text-rose-400 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
      </div>

      <div className="relative flex-1 w-full max-w-5xl flex items-center justify-center my-4" onClick={(e) => e.stopPropagation()}>
        {urls.length > 1 && (
          <button
            onClick={() => onNavigate((index - 1 + urls.length) % urls.length)}
            className="absolute left-2 sm:left-4 z-10 p-3 rounded-full bg-slate-900/80 hover:bg-amber-400 hover:text-slate-950 text-white transition-all shadow-xl"
            title="Previous"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}

        <img
          src={current}
          alt={`Photo ${index + 1}`}
          className="max-h-[80vh] max-w-full object-contain rounded-xl shadow-2xl animate-in zoom-in-95 duration-200"
        />

        {urls.length > 1 && (
          <button
            onClick={() => onNavigate((index + 1) % urls.length)}
            className="absolute right-2 sm:right-4 z-10 p-3 rounded-full bg-slate-900/80 hover:bg-amber-400 hover:text-slate-950 text-white transition-all shadow-xl"
            title="Next"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}
      </div>

      <div className="text-center text-xs text-slate-400">
        Click anywhere outside or press ESC to close.
      </div>
    </div>
  );
}
