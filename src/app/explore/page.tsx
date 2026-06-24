'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { MapPin, Search, Loader2, AlertCircle, Filter, Navigation, Phone, Globe, Star, ArrowLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

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

const INDUSTRY_COLORS: Record<string, string> = {
  retail: 'bg-blue-100 text-blue-800',
  technology: 'bg-purple-100 text-purple-800',
  services: 'bg-green-100 text-green-800',
  manufacturing: 'bg-orange-100 text-orange-800',
  finance: 'bg-yellow-100 text-yellow-800',
  healthcare: 'bg-red-100 text-red-800',
  hospitality: 'bg-pink-100 text-pink-800',
  real_estate: 'bg-indigo-100 text-indigo-800',
  education: 'bg-teal-100 text-teal-800',
  other: 'bg-gray-100 text-gray-800',
};

const STATUS_COLORS: Record<string, string> = {
  verified: 'text-green-600',
  reviewing: 'text-blue-600',
  pending: 'text-yellow-600',
  rejected: 'text-red-600',
};

export default function ExplorePage() {
  const { toast } = useToast();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [filteredBusinesses, setFilteredBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('verified');
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [radius, setRadius] = useState(5); // km

  // Get user location
  useEffect(() => {
    if (!navigator.geolocation) {
      toast({ title: 'Geolocation not supported', description: 'Please enable location services', variant: 'destructive' });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
      },
      () => {
        toast({ title: 'Location access denied', description: 'Please enable location to see nearby businesses', variant: 'destructive' });
        // Default to Johannesburg, SA
        setUserLocation({ lat: -26.2023, lng: 28.0436 });
      }
    );
  }, [toast]);

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
        toast({ title: 'Failed to load businesses', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };

    fetchBusinesses();
  }, [toast]);

  // Calculate distance and filter businesses
  useEffect(() => {
    if (!userLocation) return;

    let filtered = businesses.filter(b => {
      if (selectedStatus !== 'all' && b.status !== selectedStatus) return false;
      if (selectedIndustry !== 'all' && b.industry !== selectedIndustry) return false;
      if (searchQuery && !b.company_name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });

    // Calculate distances
    filtered = filtered.map(b => ({
      ...b,
      distance: calculateDistance(
        userLocation.lat,
        userLocation.lng,
        b.latitude || 0,
        b.longitude || 0
      ),
    }));

    // Filter by radius
    filtered = filtered.filter(b => (b.distance || 0) <= radius);

    // Sort by distance
    filtered.sort((a, b) => (a.distance || 0) - (b.distance || 0));

    setFilteredBusinesses(filtered);
  }, [businesses, userLocation, searchQuery, selectedIndustry, selectedStatus, radius]);

  // Calculate distance using Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in km
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

  const handleNavigate = (business: Business) => {
    if (business.latitude && business.longitude) {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${business.latitude},${business.longitude}`,
        '_blank'
      );
    }
  };

  const industries = Array.from(new Set(businesses.map(b => b.industry))).sort();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Navigation */}
      <div className="bg-slate-900/80 backdrop-blur border-b border-slate-700 px-4 py-2">
        <Link href="/" className="flex items-center gap-2 text-yellow-400 hover:text-yellow-300 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>
      </div>

      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 border-b border-slate-600 sticky top-12 z-40">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-6">
            <MapPin className="h-8 w-8 text-yellow-400" />
            <div>
              <h1 className="text-3xl font-bold text-white">Explore Businesses</h1>
              <p className="text-slate-300 text-sm">Discover verified businesses around you</p>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
              <Input
                placeholder="Search businesses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-slate-700 text-white border-slate-600 placeholder-slate-400"
              />
            </div>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="border border-slate-600 rounded-lg px-4 py-2 bg-slate-700 text-white"
            >
              <option value="all">All Status</option>
              <option value="verified">Verified Only</option>
              <option value="reviewing">Under Review</option>
            </select>

            <select
              value={selectedIndustry}
              onChange={(e) => setSelectedIndustry(e.target.value)}
              className="border border-slate-600 rounded-lg px-4 py-2 bg-slate-700 text-white"
            >
              <option value="all">All Industries</option>
              {industries.map(industry => (
                <option key={industry} value={industry}>
                  {industry.charAt(0).toUpperCase() + industry.slice(1)}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-yellow-400" />
              <select
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                className="border border-slate-600 rounded-lg px-4 py-2 bg-slate-700 text-white flex-1"
              >
                <option value={1}>1 km away</option>
                <option value={5}>5 km away</option>
                <option value={10}>10 km away</option>
                <option value={25}>25 km away</option>
                <option value={50}>50 km away</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Map Section */}
          <div className="lg:col-span-2">
            <Card className="h-96 md:h-full bg-slate-800 border-slate-600">
              <CardContent className="p-0 h-full">
                <div
                  ref={mapRef}
                  id="map"
                  className="w-full h-full rounded-lg bg-slate-700 flex items-center justify-center"
                >
                  <div className="text-center">
                    <AlertCircle className="h-12 w-12 text-slate-400 mx-auto mb-2" />
                    <p className="text-slate-300 text-sm">Map functionality requires Leaflet.js library</p>
                    <p className="text-slate-400 text-xs mt-2">Install: npm install leaflet react-leaflet</p>
                    <div className="mt-4 bg-yellow-500/10 rounded-lg p-4 text-left text-sm border border-yellow-500/20">
                      <p className="font-semibold text-yellow-400 mb-2">Current Location:</p>
                      {userLocation ? (
                        <>
                          <p className="text-yellow-300">Lat: {userLocation.lat.toFixed(4)}</p>
                          <p className="text-yellow-300">Lng: {userLocation.lng.toFixed(4)}</p>
                        </>
                      ) : (
                        <p className="text-yellow-300">Detecting location...</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Business List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">
                {filteredBusinesses.length} Businesses
              </h2>
            </div>

            {filteredBusinesses.length === 0 ? (
              <Card className="bg-slate-800 border-slate-600">
                <CardContent className="p-6 text-center">
                  <AlertCircle className="h-12 w-12 text-slate-400 mx-auto mb-2" />
                  <p className="text-slate-300">No businesses found in your area</p>
                  <p className="text-slate-400 text-sm mt-1">Try increasing the search radius or changing filters</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredBusinesses.map(business => (
                  <Card
                    key={business.id}
                    className={`cursor-pointer transition-all bg-slate-800 border-slate-600 ${
                      selectedBusiness?.id === business.id
                        ? 'ring-2 ring-yellow-400 shadow-lg shadow-yellow-400/20'
                        : 'hover:border-yellow-400/30'
                    }`}
                    onClick={() => setSelectedBusiness(business)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-white text-sm">{business.company_name}</h3>
                          <p className="text-xs text-slate-400 mt-1">{business.address}</p>
                        </div>
                        {business.distance !== undefined && (
                          <div className="text-right">
                            <p className="font-semibold text-blue-600 text-sm">
                              {business.distance.toFixed(1)} km
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mb-3">
                        <span
                          className={`text-xs font-semibold px-2 py-1 rounded ${
                            INDUSTRY_COLORS[business.industry] || INDUSTRY_COLORS.other
                          }`}
                        >
                          {business.industry}
                        </span>
                        <span className={`text-xs font-semibold px-2 py-1 rounded ${business.status === 'verified' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                          {business.status === 'verified' ? '✓ Verified' : business.status.toUpperCase()}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-slate-700">
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                          <span className="text-sm font-semibold text-white">{business.trust_score}%</span>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNavigate(business);
                          }}
                          className="gap-1"
                        >
                          <Navigation className="h-4 w-4" />
                          Navigate
                        </Button>
                      </div>

                      {business.phone && (
                        <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                          <Phone className="h-3 w-3" />
                          {business.phone}
                        </div>
                      )}

                      {business.website && (
                        <div className="flex items-center gap-2 mt-1 text-xs text-yellow-400 hover:text-yellow-300">
                          <Globe className="h-3 w-3" />
                          <a href={business.website} target="_blank" rel="noopener noreferrer" className="hover:underline">
                            Visit Website
                          </a>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
