/**
 * Display helper utilities for user/business name handling
 * Rule: Business accounts show ONLY business name, not owner name
 *       Customer accounts show ONLY customer name
 */

import type { User, Business } from "@/types";

/**
 * Get the public display name for a user based on their account type
 * @param user - The user object
 * @param business - Optional business object (required for business accounts)
 * @returns The name that should be displayed publicly
 */
export function getDisplayName(
  user: User | null | undefined,
  business?: Business | null
): string {
  if (!user) return "Unknown User";

  // Business account - show ONLY business name
  if (user.accountType === "business") {
    return business?.businessName || user.businessName || "Unknown Business";
  }

  // Customer account - show ONLY personal name
  return user.name || "Unknown User";
}

/**
 * Get avatar initials from the appropriate display name
 * @param user - The user object
 * @param business - Optional business object
 * @returns Single letter initial (uppercase)
 */
export function getInitials(
  user: User | null | undefined,
  business?: Business | null
): string {
  const displayName = getDisplayName(user, business);
  return displayName.charAt(0).toUpperCase();
}

/**
 * Check if a user is a business account
 * @param user - The user object
 * @returns true if this is a business account
 */
export function isBusinessAccount(user: User | null | undefined): boolean {
  return user?.accountType === "business";
}

/**
 * Check if a user is a customer account
 * @param user - The user object
 * @returns true if this is a customer account
 */
export function isCustomerAccount(user: User | null | undefined): boolean {
  return user?.accountType === "customer";
}

/**
 * Get the owner/contact person name (internal use only - for admin/backend)
 * Should NEVER be shown in public views for business accounts
 * @param user - The user object
 * @returns The personal name of the account owner
 */
export function getOwnerName(user: User | null | undefined): string {
  return user?.name || "Unknown";
}

/**
 * Get full business information (for internal/admin views only)
 * Not for public display
 * @param user - The user object
 * @param business - Optional business object
 * @returns Object with all name fields
 */
export function getFullBusinessInfo(
  user: User | null | undefined,
  business?: Business | null
): {
  displayName: string;
  ownerName: string;
  businessName: string;
} {
  if (!user) {
    return {
      displayName: "Unknown",
      ownerName: "Unknown",
      businessName: "Unknown",
    };
  }

  return {
    displayName: getDisplayName(user, business),
    ownerName: user.name || "Unknown",
    businessName: business?.businessName || user.businessName || "N/A",
  };
}

/**
 * Get a URL-safe slug for a business or customer
 * @param user - The user object
 * @param business - Optional business object
 * @returns URL-safe slug of the display name
 */
export function getDisplayNameSlug(
  user: User | null | undefined,
  business?: Business | null
): string {
  const displayName = getDisplayName(user, business);
  return displayName
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]/g, "")
    .substring(0, 50);
}

/**
 * Format a complete profile header (for use in various components)
 * @param user - The user object
 * @param business - Optional business object
 * @returns Formatted string for display
 */
export function formatProfileHeader(
  user: User | null | undefined,
  business?: Business | null
): string {
  const displayName = getDisplayName(user, business);

  if (!user) return displayName;

  // For business accounts, include verification status if available
  if (isBusinessAccount(user)) {
    const status = business?.status === "verified" ? "✓ Verified" : "";
    return status ? `${displayName} ${status}` : displayName;
  }

  // For customers, return just the name
  return displayName;
}

/**
 * Get the appropriate CSS class for highlighting business vs customer accounts
 * @param user - The user object
 * @returns CSS class name for styling
 */
export function getAccountTypeClass(user: User | null | undefined): string {
  if (!user) return "account-unknown";
  return user.accountType === "business" ? "account-business" : "account-customer";
}

/**
 * Get a description of what type of account this is (for UI labels)
 * @param user - The user object
 * @returns "Business" or "Individual"
 */
export function getAccountTypeLabel(user: User | null | undefined): string {
  if (!user) return "Unknown";
  return user.accountType === "business" ? "Business" : "Individual";
}
