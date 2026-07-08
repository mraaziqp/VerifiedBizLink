"use client";

export function PostImage({ url, className = "" }: { url: string; className?: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`block overflow-hidden rounded-xl border ${className}`}
    >
      <img
        src={url}
        alt="Post attachment"
        loading="lazy"
        className="max-h-[480px] w-full object-cover"
        onError={(e) => {
          // Hide the whole frame if the image URL is dead so old posts
          // never show a broken-image icon
          (e.currentTarget.parentElement as HTMLElement).style.display = "none";
        }}
      />
    </a>
  );
}
