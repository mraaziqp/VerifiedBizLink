import { cn } from "@/lib/utils";

/** Twitter-style verification seal — scalloped badge shape with a gold gradient. */
export function GoldCheckmark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("inline-block h-4 w-4 shrink-0 drop-shadow-sm", className)}
      aria-label="Verified"
      role="img"
    >
      <defs>
        <linearGradient id="goldCheckmarkGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="50%" stopColor="#eab308" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>
      </defs>
      <path
        fill="url(#goldCheckmarkGradient)"
        d="M12 0.5l2.35 1.9 2.98-0.6 1.36 2.7 2.98 0.85-0.28 3.03 2.1 2.22-2.1 2.22 0.28 3.03-2.98 0.85-1.36 2.7-2.98-0.6L12 20.5l-2.35-1.9-2.98 0.6-1.36-2.7-2.98-0.85 0.28-3.03L0.5 10 2.6 7.78 2.32 4.75l2.98-0.85 1.36-2.7 2.98 0.6L12 0.5z"
      />
      <path
        fill="none"
        stroke="#fff"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 12l2.5 2.5L16 9"
      />
    </svg>
  );
}
