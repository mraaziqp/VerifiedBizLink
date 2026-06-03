import Image from "next/image";
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

/** Image-based VBL icon mark */
function VBLIcon({ size }: { size: number }) {
  return (
    <Image
      src="/vbl-logo.png"
      alt="VerifiedBizLink logo"
      width={size}
      height={size}
      style={{ display: "block", flexShrink: 0 }}
      priority
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
