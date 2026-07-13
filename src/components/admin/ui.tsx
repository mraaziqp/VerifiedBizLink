"use client";

/**
 * Admin-page aliases for the shared glass design system in
 * @/components/shared/glass-ui — kept so existing imports across the
 * admin pages don't need to change. New code should import directly
 * from shared/glass-ui (the business dashboard pages do).
 */

export {
  GlassBackground as AdminBackground,
  GlassCard as AdminCard,
  GlassPageHeader as AdminPageHeader,
  SectionTitle,
  StatCard,
  glassInteractive,
} from "@/components/shared/glass-ui";
export type { StatCardProps } from "@/components/shared/glass-ui";
