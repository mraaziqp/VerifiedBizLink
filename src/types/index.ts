// Comprehensive TypeScript type definitions for the application

// User Types
export interface User {
  id: string;
  email: string;
  name: string;
  business_name?: string;
  current_tier?: string;
  status: "active" | "pending" | "suspended" | "deleted";
  created_at: string;
  updated_at?: string;
}

// Tier Types
export interface Tier {
  id: string;
  name: string;
  price_usd: number;
  price_zar: number;
  description: string;
  billing_interval: "monthly" | "yearly";
  is_active: boolean;
  display_order: number;
  features?: string[];
  permissions?: Record<string, boolean>;
  created_at?: string;
  updated_at?: string;
}

// Business Types
export interface Business {
  id: string;
  businessName: string;
  businessCategory: string;
  businessDescription: string;
  businessPhone: string;
  businessEmail: string;
  businessWebsite?: string;
  primaryLocation: string;
  primaryProvince: string;
  serviceAreas: string[];
  serviceRadius: number;
  productsServices: string[];
  tier: string;
  status: "active" | "pending_verification" | "verified" | "suspended";
  created_at: string;
  updated_at?: string;
}

// Special/Promotion Types
export interface Special {
  id: string;
  business_name: string;
  title: string;
  discount_percent: number;
  expires_at: string;
  tier: "Free" | "Verified" | "Premium" | "Enterprise";
  created_at?: string;
}

// Recommendation Types
export interface Recommendation {
  id: string;
  name: string;
  category: string;
  reason: string;
  rating: number;
  location: string;
  verified: boolean;
  tier: "Free" | "Verified" | "Premium" | "Enterprise";
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  status: number;
}

// Error Types
export interface AppError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  statusCode: number;
}

// Form State Types
export interface FormState {
  isLoading: boolean;
  error: string | null;
  success: boolean;
  message?: string;
}

// Filter Types
export interface FilterOptions {
  tier?: string[];
  category?: string[];
  minRating?: number;
  maxDistance?: number;
  verified?: boolean;
  sortBy?: "rating" | "distance" | "relevance" | "date";
  sortOrder?: "asc" | "desc";
}

// Pagination Types
export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

// Table Column Types
export interface TableColumn<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: unknown, row: T) => React.ReactNode;
}

// Component Props Types
export interface LoadingProps {
  isLoading: boolean;
  message?: string;
}

export interface EmptyStateProps {
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface ModalProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  size?: "small" | "medium" | "large";
  closeButton?: boolean;
}
