'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  MapPin,
  Search,
  Loader2,
  AlertCircle,
  Filter,
  Navigation,
  Phone,
  Globe,
  Star,
  ArrowLeft,
  Sparkles,
  ChevronRight,
  ExternalLink,
  Grid3X3,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GoldCheckmark } from '@/components/ui/gold-checkmark';
import { SubpageNav } from '@/components/layout/subpage-nav';
import { matchesQuery } from '@/lib/search';

interface Business {
  id: string;
  company_name: string;
  industry: string;
  address: string;
  phone?: string;
  website?: string;
  trust_score: number;
  latitude?: number;
  longitude?: number;
  distance?: number;
  status: 'verified' | 'reviewing' | 'pending' | 'rejected';
}

const INDUSTRY_ICONS: Record<string, string> = {
  retail: '🛍️',
  technology: '💻',
  services: '🔧',
  manufacturing: '🏭',
  finance: '💰',
  healthcare: '🏥',
  hospitality: '🏨',
  real_estate: '🏠',
  education: '📚',
  other: '💼',
};

const INDUSTRY_COLORS: Record<string, string> = {
  retail: 'from-blue-500 to-blue-600',
  technology: 'from-purple-500 to-purple-600',
  services: 'from-green-500 to-green-600',
  manufacturing: 'from-orange-500 to-orange-600',
  finance: 'from-yellow-500 to-yellow-600',
  healthcare: 'from-red-500 to-red-600',
  hospitality: 'from-pink-500 to-pink-600',
  real_estate: 'from-indigo-500 to-indigo-600',
  education: 'from-teal-500 to-teal-600',
  other: 'from-gray-500 to-gray-600',
};

export default function ExplorePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="animate-spin h-10 w-10 text-yellow-400 mx-auto mb-4" />
            <p className="text-slate-300">Loading explore directory...</p>
          </div>
        </div>
      }
    >
      <ExploreContent />
    </Suspense>
  );
}

function ExploreContent() {
  const searchParams = useSearchParams();
  const industryParam = searchParams.get('industry') || searchParams.get('category');
  const queryParam = searchParams.get('query');

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [filteredBusinesses, setFilteredBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(() =>
    typeof navigator !== 'undefined' && !navigator.geolocation ? { lat: -26.2023, lng: 28.0436 } : null
  );
  const [searchQuery, setSearchQuery] = useState(queryParam || '');
  const [selectedIndustry, setSelectedIndustry] = useState(industryParam || 'all');
  const [radius, setRadius] = useState(25);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const locationAttempted = useRef(false);

  useEffect(() => {
    if (industryParam) {
      setSelectedIndustry(industryParam);
    }
    if (queryParam) {
      setSearchQuery(queryParam);
    }
  }, [industryParam, queryParam]);

  // Get user location silently
  useEffect(() => {
    if (locationAttempted.current) return;
    locationAttempted.current = true;

    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => {
        // Silent fallback to Johannesburg
        setUserLocation({ lat: -26.2023, lng: 28.0436 });
      },
      { timeout: 5000 }
    );
  }, []);

  // Fetch businesses
  useEffect(() => {
    const fetchBusinesses = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/explore/businesses');
        if (res.ok) {
          const data = await res.json();
          setBusinesses(data.businesses || []);
        }
      } catch (error) {
        console.error('Failed to fetch businesses:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBusinesses();
  }, []);

  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Calculate distance and filter businesses
  useEffect(() => {
    let filtered = businesses.filter((b) => {
      if (selectedIndustry !== 'all' && b.industry.toLowerCase() !== selectedIndustry.toLowerCase()) return false;
      if (searchQuery && !matchesQuery(b.company_name, searchQuery)) {
        return false;
      }
      return true;
    });

    // Distance is only meaningful when we know both where the visitor is
    // and where the business actually is. Businesses without geocoded
    // coordinates get `distance: undefined` rather than being silently
    // pinned to a fake location — a fictional distance previously caused
    // the radius filter below to hide them even from an exact name match.
    filtered = filtered.map((b) => ({
      ...b,
      distance:
        userLocation && b.latitude != null && b.longitude != null
          ? calculateDistance(userLocation.lat, userLocation.lng, b.latitude, b.longitude)
          : undefined,
    }));

    // Actively searching by name is a request for that specific business,
    // not "what's nearby" — the radius filter (and its dependency on
    // location resolving at all) shouldn't hide a real name match.
    if (!searchQuery) {
      filtered = filtered.filter((b) => b.distance === undefined || b.distance <= radius);
    }

    // Known distances first (closest first); unknown-location businesses
    // last rather than dropped.
    filtered.sort((a, b) => {
      if (a.distance === undefined && b.distance === undefined) return 0;
      if (a.distance === undefined) return 1;
      if (b.distance === undefined) return -1;
      return a.distance - b.distance;
    });

    setFilteredBusinesses(filtered);
  }, [businesses, userLocation, searchQuery, selectedIndustry, radius]);

  const handleNavigate = (business: Business) => {
    if (business.latitude && business.longitude) {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${business.latitude},${business.longitude}`,
        '_blank'
      );
    }
  };

  const industries = Array.from(new Set(businesses.map((b) => b.industry)))
    .sort()
    .filter((i) => i);

  const getTrustBadgeColor = (score: number): string => {
    if (score >= 95) return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
    if (score >= 85) return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
    if (score >= 70) return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
    return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin h-10 w-10 text-yellow-400 mx-auto mb-4" />
          <p className="text-slate-300">Discovering trusted businesses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Top Navigation & Back Button */}
      <SubpageNav title="Explore Businesses" />

      {/* Hero Section */}
      <div className="bg-gradient-to-b from-slate-800/50 to-transparent border-b border-slate-700/30 pb-12">
        <div className="max-w-7xl mx-auto px-4 pt-8 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-2xl">
              <MapPin className="h-6 w-6 text-slate-950" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white">Explore Verified Businesses</h1>
              <p className="text-slate-300 mt-1">
                Discover trusted companies verified by CIPC and SARS
              </p>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="mt-8 space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-500" />
              <Input
                placeholder="Search by business name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 bg-slate-800/50 border-slate-600 text-white placeholder-slate-500 focus:border-yellow-400 transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Industry Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Industry
                </label>
                <select
                  value={selectedIndustry}
                  onChange={(e) => setSelectedIndustry(e.target.value)}
                  className="w-full h-10 bg-slate-800/50 border border-slate-600 text-white rounded-lg px-3 focus:border-yellow-400 transition-colors"
                >
                  <option value="all">All Industries</option>
                  {industries.map((industry) => (
                    <option key={industry} value={industry}>
                      {INDUSTRY_ICONS[industry] || '💼'} {industry.charAt(0).toUpperCase() + industry.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Distance Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Search Radius
                </label>
                <select
                  value={radius}
                  onChange={(e) => setRadius(Number(e.target.value))}
                  className="w-full h-10 bg-slate-800/50 border border-slate-600 text-white rounded-lg px-3 focus:border-yellow-400 transition-colors"
                >
                  <option value={1}>1 km away</option>
                  <option value={5}>5 km away</option>
                  <option value={10}>10 km away</option>
                  <option value={25}>25 km away</option>
                  <option value={50}>50 km away</option>
                  <option value={500}>Nationwide</option>
                </select>
              </div>

              {/* View Mode Toggle */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  View Mode
                </label>
                <div className="flex gap-2 h-10">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`flex-1 rounded-lg border transition-all ${
                      viewMode === 'grid'
                        ? 'bg-yellow-500 border-yellow-400 text-slate-950'
                        : 'bg-slate-800/50 border-slate-600 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    <Grid3X3 className="h-4 w-4 inline mr-1" />
                    Grid
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`flex-1 rounded-lg border transition-all ${
                      viewMode === 'list'
                        ? 'bg-yellow-500 border-yellow-400 text-slate-950'
                        : 'bg-slate-800/50 border-slate-600 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    <Filter className="h-4 w-4 inline mr-1" />
                    List
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Results Count */}
          <div className="mt-6 flex items-center gap-2 text-slate-300">
            <Sparkles className="h-4 w-4 text-yellow-400" />
            <span className="font-medium">
              {filteredBusinesses.length} verified business{filteredBusinesses.length !== 1 ? 'es' : ''}
              {searchQuery && ` matching "${searchQuery}"`}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {filteredBusinesses.length === 0 ? (
          <div className="flex justify-center">
            <Card className="w-full md:w-1/2 bg-slate-800/50 border-slate-700/50">
              <CardContent className="p-12 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-700/30 rounded-full mb-4">
                  <AlertCircle className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">No businesses found</h3>
                <p className="text-slate-400 mb-6">
                  Try adjusting your search radius or filters to discover more verified businesses in your area.
                </p>
                <Button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedIndustry('all');
                    setRadius(50);
                  }}
                  className="bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-semibold"
                >
                  Clear Filters
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : viewMode === 'grid' ? (
          // Grid View
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBusinesses.map((business) => (
              <Card
                key={business.id}
                className="bg-gradient-to-br from-slate-800 to-slate-800/50 border-slate-700 hover:border-yellow-400/30 transition-all hover:shadow-lg hover:shadow-yellow-400/10 group overflow-hidden"
              >
                <CardContent className="p-6">
                  {/* Header with Industry */}
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className={`text-3xl bg-gradient-to-br ${
                        INDUSTRY_COLORS[business.industry] || INDUSTRY_COLORS.other
                      } bg-clip-text`}
                    >
                      {INDUSTRY_ICONS[business.industry] || '💼'}
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-bold border ${getTrustBadgeColor(business.trust_score)}`}>
                      {business.trust_score}% Trust
                    </div>
                  </div>

                  {/* Company Info */}
                  <h3 className="text-lg font-bold text-white mb-1 group-hover:text-yellow-400 transition-colors line-clamp-2 flex items-center gap-1.5">
                    <span className="line-clamp-2">{business.company_name}</span>
                    {business.status === 'verified' && <GoldCheckmark />}
                  </h3>
                  <p className="text-xs font-medium text-slate-400 mb-3">
                    {business.industry.charAt(0).toUpperCase() + business.industry.slice(1)}
                  </p>

                  {/* Address */}
                  <div className="flex gap-2 mb-4 text-sm text-slate-300">
                    <MapPin className="h-4 w-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <p className="line-clamp-2">{business.address}</p>
                  </div>

                  {/* Distance Badge */}
                  {business.distance !== undefined && (
                    <div className="mb-4 inline-flex items-center gap-1 text-xs font-semibold text-blue-400 bg-blue-400/10 px-3 py-1 rounded-full border border-blue-400/20">
                      <Navigation className="h-3 w-3" />
                      {business.distance < 1
                        ? '< 1 km away'
                        : `${business.distance.toFixed(1)} km away`}
                    </div>
                  )}

                  {/* Contact Info */}
                  <div className="space-y-2 mb-4 text-sm">
                    {business.phone && (
                      <a
                        href={`tel:${business.phone}`}
                        className="flex items-center gap-2 text-slate-300 hover:text-yellow-400 transition-colors"
                      >
                        <Phone className="h-4 w-4" />
                        <span className="line-clamp-1">{business.phone}</span>
                      </a>
                    )}
                    {business.website && (
                      <a
                        href={business.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-slate-300 hover:text-yellow-400 transition-colors"
                      >
                        <Globe className="h-4 w-4" />
                        <span className="line-clamp-1 text-xs">Visit website</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-4 border-t border-slate-700">
                    <Button
                      onClick={() => handleNavigate(business)}
                      variant="outline"
                      size="sm"
                      className="flex-1 border-slate-600 text-slate-300 hover:text-yellow-400 hover:border-yellow-400"
                    >
                      <Navigation className="h-4 w-4 mr-1" />
                      Navigate
                    </Button>
                    {business.website && (
                      <Button
                        asChild
                        size="sm"
                        className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-semibold"
                      >
                        <a href={business.website} target="_blank" rel="noopener noreferrer">
                          Visit <ChevronRight className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          // List View
          <div className="space-y-4">
            {filteredBusinesses.map((business) => (
              <Card
                key={business.id}
                className="bg-gradient-to-r from-slate-800 to-slate-800/30 border-slate-700 hover:border-yellow-400/30 transition-all hover:shadow-lg hover:shadow-yellow-400/10 group"
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between gap-6">
                    {/* Left: Icon + Company Info */}
                    <div className="flex-1 flex items-start gap-4">
                      <div
                        className={`text-3xl bg-gradient-to-br ${
                          INDUSTRY_COLORS[business.industry] || INDUSTRY_COLORS.other
                        } bg-clip-text flex-shrink-0`}
                      >
                        {INDUSTRY_ICONS[business.industry] || '💼'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-white mb-1 group-hover:text-yellow-400 transition-colors line-clamp-1 flex items-center gap-1.5">
                          <span className="line-clamp-1">{business.company_name}</span>
                          {business.status === 'verified' && <GoldCheckmark />}
                        </h3>
                        <p className="text-sm text-slate-400 mb-2 line-clamp-1">{business.address}</p>
                        <div className="flex flex-wrap gap-3">
                          {business.phone && (
                            <a
                              href={`tel:${business.phone}`}
                              className="text-xs text-slate-300 hover:text-yellow-400 transition-colors"
                            >
                              <Phone className="h-3 w-3 inline mr-1" />
                              {business.phone}
                            </a>
                          )}
                          {business.website && (
                            <a
                              href={business.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-slate-300 hover:text-yellow-400 transition-colors"
                            >
                              <Globe className="h-3 w-3 inline mr-1" />
                              Visit
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Trust Score + Distance */}
                    <div className="flex flex-col items-end gap-3 flex-shrink-0">
                      <div
                        className={`px-3 py-1 rounded-full text-sm font-bold border flex items-center gap-1 ${getTrustBadgeColor(
                          business.trust_score
                        )}`}
                      >
                        <Star className="h-3 w-3" />
                        {business.trust_score}%
                      </div>
                      {business.distance !== undefined && (
                        <div className="text-xs font-semibold text-blue-400 bg-blue-400/10 px-3 py-1 rounded-full border border-blue-400/20">
                          {business.distance < 1
                            ? '< 1 km'
                            : `${business.distance.toFixed(1)} km`}
                        </div>
                      )}
                      <Button
                        onClick={() => handleNavigate(business)}
                        size="sm"
                        className="bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-semibold"
                      >
                        <Navigation className="h-3 w-3 mr-1" />
                        Navigate
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
