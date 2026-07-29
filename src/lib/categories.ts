// Canonical business category list — shared between the home page's
// category chips, business signup, and the /categories/[slug] pages, so
// there's one source of truth instead of three different lists that used
// to drift out of sync (home chips, customer-onboarding interests, and an
// unused signup-form draft).
export const BUSINESS_CATEGORIES = [
  "Technology",
  "Construction",
  "Healthcare",
  "Legal",
  "Finance",
  "Logistics",
  "Retail",
  "Education",
  "Agriculture",
  "Real Estate",
  "Marketing",
  "Consulting",
  "Manufacturing",
  "Tourism",
  "Plumbing",
  "Electrical",
  "Cleaning",
  "Renovations",
  "Hospitality",
  "Other",
];

export function categoryToSlug(category: string): string {
  return category
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Best-effort reverse lookup — a slug like "real-estate" maps back to
// "Real Estate" if it's one of our known categories, otherwise falls back
// to a title-cased version of the slug so businesses with a free-text
// industry value outside this list still resolve to a readable page.
export function slugToCategory(slug: string): string {
  const known = BUSINESS_CATEGORIES.find((c) => categoryToSlug(c) === slug);
  if (known) return known;
  return slug
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
