
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function GoldCheckmark({ className }: { className?: string }) {
  return (
    <div className={cn("inline-flex items-center justify-center rounded-full bg-primary p-0.5 shadow-sm", className)}>
      <Check className="h-3 w-3 text-white stroke-[3px]" />
    </div>
  );
}
