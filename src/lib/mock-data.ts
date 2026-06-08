// Centralized mock data for development and testing
// This file contains all mock data used across the application

export const MOCK_TIERS = [
  {
    id: "1",
    name: "Free",
    price_usd: 0,
    price_zar: 0,
    description: "For new businesses",
    billing_interval: "monthly",
    is_active: true,
    display_order: 1,
  },
  {
    id: "2",
    name: "Verified Business",
    price_usd: 99,
    price_zar: 1500,
    description: "Build trust and credibility",
    billing_interval: "monthly",
    is_active: true,
    display_order: 2,
  },
  {
    id: "3",
    name: "Premium Business",
    price_usd: 299,
    price_zar: 4500,
    description: "For growing SMEs",
    billing_interval: "monthly",
    is_active: true,
    display_order: 3,
  },
  {
    id: "4",
    name: "Enterprise Partner",
    price_usd: 999,
    price_zar: 15000,
    description: "For established brands",
    billing_interval: "monthly",
    is_active: true,
    display_order: 4,
  },
];

export const MOCK_USERS = [
  { 
    id: "1", 
    email: "john@company.com", 
    name: "John Smith", 
    business_name: "ABC Consulting", 
    current_tier: "Premium", 
    status: "active", 
    created_at: "2026-01-15" 
  },
  { 
    id: "2", 
    email: "sarah@business.co.za", 
    name: "Sarah Johnson", 
    business_name: "Sarah Consulting", 
    current_tier: "Verified", 
    status: "active", 
    created_at: "2026-02-20" 
  },
  { 
    id: "3", 
    email: "mike@startup.com", 
    name: "Mike Chen", 
    business_name: "Tech Startup", 
    current_tier: "Free", 
    status: "pending", 
    created_at: "2026-05-10" 
  },
  { 
    id: "4", 
    email: "lisa@services.com", 
    name: "Lisa Martinez", 
    business_name: "Premium Services", 
    current_tier: "Enterprise", 
    status: "active", 
    created_at: "2026-03-05" 
  },
  { 
    id: "5", 
    email: "david@business.org", 
    name: "David Brown", 
    business_name: "Brown Industries", 
    current_tier: "Premium", 
    status: "active", 
    created_at: "2026-04-12" 
  },
];

export const MOCK_SPECIALS = [
  {
    id: "1",
    business_name: "Cape Coffee Co",
    title: "50% Off Espresso",
    discount_percent: 50,
    expires_at: new Date(Date.now() + 4 * 3600000).toISOString(),
    tier: "Premium",
  },
  {
    id: "2",
    business_name: "Tech Solutions",
    title: "Free Consultation",
    discount_percent: 100,
    expires_at: new Date(Date.now() + 8 * 3600000).toISOString(),
    tier: "Enterprise",
  },
  {
    id: "3",
    business_name: "Meals Express",
    title: "30% Lunch Specials",
    discount_percent: 30,
    expires_at: new Date(Date.now() + 6 * 3600000).toISOString(),
    tier: "Verified",
  },
  {
    id: "4",
    business_name: "Beauty Salon Pro",
    title: "Buy 1 Get 1 Free",
    discount_percent: 100,
    expires_at: new Date(Date.now() + 2 * 3600000).toISOString(),
    tier: "Premium",
  },
  {
    id: "5",
    business_name: "Auto Repair Hub",
    title: "Free Oil Change",
    discount_percent: 100,
    expires_at: new Date(Date.now() + 5 * 3600000).toISOString(),
    tier: "Verified",
  },
];

export const MOCK_RECOMMENDATIONS = [
  {
    id: "1",
    name: "Trusted Accountants",
    category: "Finance",
    reason: "Recommended for startups",
    rating: 4.8,
    location: "Cape Town CBD",
    verified: true,
    tier: "Premium",
  },
  {
    id: "2",
    name: "Legal Services Pro",
    category: "Legal",
    reason: "Complements your business",
    rating: 4.9,
    location: "Maitland",
    verified: true,
    tier: "Enterprise",
  },
  {
    id: "3",
    name: "Marketing Experts",
    category: "Marketing",
    reason: "Trending in your area",
    rating: 4.6,
    location: "Plattekloof",
    verified: true,
    tier: "Premium",
  },
  {
    id: "4",
    name: "IT Solutions",
    category: "Technology",
    reason: "Many connections use this",
    rating: 4.7,
    location: "Sandton",
    verified: true,
    tier: "Verified",
  },
];
