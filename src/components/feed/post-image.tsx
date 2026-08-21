"use client";

function isVideoUrl(url: string): boolean {
  if (!url) return false;
  return /\.(mp4|webm|mov|m4v|ogg)(\?.*)?$/i.test(url) || url.includes('/videos/') || url.includes('video');
}

export function PostImage({ url, className = "" }: { url: string; className?: string }) {
  if (!url) return null;

  const isVideo = isVideoUrl(url);

  if (isVideo) {
    return (
      <div className={`overflow-hidden rounded-2xl border border-slate-200 bg-black shadow-xs ${className}`}>
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

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`block overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-50 shadow-xs group cursor-pointer ${className}`}
    >
      <img
        src={url}
        alt="Post attachment"
        loading="lazy"
        className="max-h-[500px] w-full object-cover group-hover:scale-[1.01] transition-transform duration-200"
        onError={(e) => {
          (e.currentTarget.parentElement as HTMLElement).style.display = "none";
        }}
      />
    </a>
  );
}
