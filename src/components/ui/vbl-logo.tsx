import { cn } from "@/lib/utils";

interface VBLLogoProps {
  /** "icon" = square monogram only; "full" = icon + text; "text" = text only */
  variant?: "icon" | "full" | "text";
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  /** Force light or dark text (only applies to variant="full" and "text") */
  theme?: "light" | "dark";
}

const iconSizes = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 52,
  xl: 72,
};

const textSizes = {
  xs: "text-sm",
  sm: "text-base",
  md: "text-xl",
  lg: "text-2xl",
  xl: "text-4xl",
};

const subTextSizes = {
  xs: "text-[8px]",
  sm: "text-[9px]",
  md: "text-[10px]",
  lg: "text-xs",
  xl: "text-sm",
};

/** Inline SVG - the VBL icon mark (no image load required) */
function VBLIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="VerifiedBizLink logo mark"
      role="img"
      style={{ display: "block", flexShrink: 0 }}
    >
      {/* Outer rounded square */}
      <rect width="200" height="200" rx="36" fill="#0a0a0a" />
      {/* Gold border ring */}
      <rect x="4" y="4" width="192" height="192" rx="33" stroke="#F5A800" strokeWidth="3" fill="none" opacity="0.85" />
      {/* White V chevron */}
      <path
        d="M42 55 L78 138 L100 85 L122 138 L158 55"
        stroke="white"
        strokeWidth="16"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Gold location pin body */}
      <path
        d="M100 150 C82 150 70 138 70 124 C70 105 100 84 100 84 C100 84 130 105 130 124 C130 138 118 150 100 150Z"
        fill="#F5A800"
      />
      {/* Pin hole */}
      <circle cx="100" cy="122" r="9" fill="#0a0a0a" />
      {/* Soft glow shadow under pin */}
      <ellipse cx="100" cy="166" rx="22" ry="6" fill="#F5A800" opacity="0.25" />
    </svg>
  );
}

export function VBLLogo({
  variant = "full",
  size = "md",
  className,
  theme = "light",
}: VBLLogoProps) {
  const px = iconSizes[size];

  const Icon = <VBLIcon size={px} />;

  if (variant === "icon") return <div className={cn("inline-flex", className)}>{Icon}</div>;

  const textColor = theme === "dark" ? "text-gray-900" : "text-white";
  const subColor = theme === "dark" ? "text-gray-500" : "text-white/60";

  if (variant === "text") {
    return (
      <div className={cn("inline-flex flex-col", className)}>
        <span className={cn("font-extrabold tracking-tight leading-none", textSizes[size], textColor)}>
          Verified<span className="text-primary">Biz</span>Link
        </span>
        <span className={cn("font-semibold tracking-widest uppercase leading-none mt-0.5", subTextSizes[size], subColor)}>
          Trusted Network
        </span>
      </div>
    );
  }

  return (
    <div className={cn("inline-flex items-center gap-2.5", className)}>
      {Icon}
      <div className="flex flex-col">
        <span className={cn("font-extrabold tracking-tight leading-none", textSizes[size], textColor)}>
          Verified<span className="text-primary">Biz</span>Link
        </span>
        <span className={cn("font-semibold tracking-widest uppercase leading-none mt-0.5", subTextSizes[size], subColor)}>
          Trusted Network
        </span>
      </div>
    </div>
  );
}
