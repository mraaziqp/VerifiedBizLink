export interface HomeCategory {
  name: string;
  count: number;
}

export interface HomeStats {
  verifiedBusinesses: number;
  avgTrustScore: number;
  activeConnections: number;
  openSupportTickets: number;
}

export interface HomeBusiness {
  userId: string;
  businessId: string;
  displayName: string;
  headline: string;
  companyName: string;
  industry: string;
  trustScore: number;
  connectionCount: number;
  avatarUrl: string;
  avgRating: number;
  reviewCount: number;
}

export interface HomeOverviewResponse {
  stats: HomeStats;
  categories: HomeCategory[];
  businesses: HomeBusiness[];
}
