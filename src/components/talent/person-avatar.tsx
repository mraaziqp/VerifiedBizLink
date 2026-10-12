import { cn } from '@/lib/utils';

const initials = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map((p) => p.charAt(0).toUpperCase()).join('') || '?';

/**
 * A person's photo, or their initials when they have none — the one way a
 * candidate is pictured on the applicant board, in the drawer, and on a
 * talent card.
 */
export function PersonAvatar({
  name, src, size = 36, className,
}: { name: string | null | undefined; src?: string | null; size?: number; className?: string }) {
  const box = { width: size, height: size };
  if (src) {
    return (
      // Avatars live on several hosts (uploads, the avatar route for older
      // base64 ones); next/image would need each allow-listed for a thumbnail.
      <img
        src={src}
        alt=""
        loading="lazy"
        width={size}
        height={size}
        style={box}
        className={cn('shrink-0 rounded-full border border-slate-200 object-cover', className)}
      />
    );
  }
  return (
    <span
      aria-hidden
      style={{ ...box, fontSize: Math.max(11, Math.round(size * 0.36)) }}
      className={cn('flex shrink-0 items-center justify-center rounded-full bg-slate-900 font-black text-amber-400', className)}
    >
      {initials(name ?? '')}
    </span>
  );
}
