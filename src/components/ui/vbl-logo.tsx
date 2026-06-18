import Image from "next/image";
import { cn } from "@/lib/utils";
import { useState } from "react";

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

/** SVG-based VBL icon fallback */
function VBLIconSVG({ size, theme }: { size: number; theme?: "light" | "dark" }) {
  const color = theme === "dark" ? "#1f2937" : "#FCD34D";
  const bgColor = theme === "dark" ? "#FCD34D" : "#1f2937";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 52 52"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", flexShrink: 0 }}
    >
      <rect width="52" height="52" rx="8" fill={bgColor} />
      <text
        x="26"
        y="32"
        fontSize="28"
        fontWeight="bold"
        textAnchor="middle"
        fill={color}
        fontFamily="sans-serif"
      >
        VB
      </text>
    </svg>
  );
}

/** Image-based VBL icon mark with fallback */
function VBLIcon({ size, theme }: { size: number; theme?: "light" | "dark" }) {
  const [imageError, setImageError] = useState(false);

  if (imageError) {
    return <VBLIconSVG size={size} theme={theme} />;
  }

  return (
    <Image
      src="/vbl-logo.png"
      alt="VerifiedBizLink logo"
      width={size}
      height={size}
      style={{ display: "block", flexShrink: 0 }}
      priority
      onError={() => setImageError(true)}
    />
  );
}

export function VBLLogo({
  variant = "full",
  size = "md",
  className,
  theme = "light",
}: VBLLogoProps) {
  const px = iconSizes[size];

  const Icon = <VBLIcon size={px} theme={theme} />;

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
