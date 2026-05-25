"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Shield, Globe, Phone, MapPin, Building2, Users,
  Star, CalendarCheck, ArrowLeft, Loader2, BadgeCheck,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { VBLLogo } from "@/components/ui/vbl-logo";
import { RatingSummary } from "@/components/ui/star-rating";
import { ReviewsList } from "@/components/reviews/reviews-list";
import { GoldCheckmark } from "@/components/ui/gold-checkmark";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import Link from "next/link";

interface BusinessProfile {
  id: string;
  companyName: string;
  industry: string;
  regNumber: string;
  vatNumber: string;
  status: string;
  trustScore: number;
  description: string;
  website: string;
  phone: string;
  address: string;
  verifiedAt: string | null;
  createdAt: string;
  userId: string;
  ownerName: string;
  headline: string;
  avatarUrl: string;
  location: string;
  avgRating: number;
  reviewCount: number;
  connectionCount: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  verified: { label: "Verified", color: "bg-green-100 text-green-800 border-green-200" },
  reviewing: { label: "Under Review", color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  pending: { label: "Pending", color: "bg-blue-100 text-blue-800 border-blue-200" },
  rejected: { label: "Not Verified", color: "bg-red-100 text-red-800 border-red-200" },
  unregistered: { label: "Unregistered", color: "bg-gray-100 text-gray-600 border-gray-200" },
};

export default function BusinessProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  const fetchBusiness = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/businesses/${id}`).catch(() => null);
    if (!res?.ok) { setLoading(false); return; }
    const data = await res.json().catch(() => null);
    setBusiness(data?.business ?? null);
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchBusiness(); }, [fetchBusiness]);

  const handleConnect = async () => {
    if (!user) { router.push("/login"); return; }
    setConnecting(true);
    const res = await fetch("/api/connections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ receiverId: business!.userId }),
    }).catch(() => null);
    setConnecting(false);
    if (res?.ok) {
      toast({ title: "Connection request sent!", description: `Sent to ${business!.companyName}` });
    } else {
      toast({ title: "Could not send request", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background p-8">
        <Building2 className="h-16 w-16 text-foreground/20" />
        <h2 className="text-2xl font-black text-foreground">Business not found</h2>
        <Link href="/">
          <Button variant="outline">← Back to home</Button>
        </Link>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[business.status] ?? STATUS_CONFIG.unregistered;
  const isVerified = business.status === "verified";
  const isOwnBusiness = user?.id === business.userId;
  const initials = (business.companyName || business.ownerName || "?").slice(0, 1).toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      {/* Top nav bar */}
      <header
        className="sticky top-0 z-30 border-b border-border/50"
        style={{ background: "var(--background)" }}
      >
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-2 rounded-lg hover:bg-primary/10 text-foreground/60 hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <VBLLogo variant="full" size="xs" />
          <div className="w-9" /> {/* spacer */}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6 pb-24">
        {/* Hero card */}
        <Card className="overflow-hidden border-border">
          {/* Cover banner */}
          <div
            className="h-32 relative"
            style={{
              background: isVerified
                ? "linear-gradient(135deg, #0f172a 0%, #1a2340 60%, #0f172a 100%)"
                : "linear-gradient(135deg, #111 0%, #1e1e1e 100%)",
            }}
          >
            {isVerified && (
              <div className="absolute inset-0 opacity-10"
                style={{ background: "radial-gradient(ellipse at 30% 50%, #F5A800 0%, transparent 70%)" }} />
            )}
          </div>

          <CardContent className="pt-0 pb-6 px-6 -mt-10">
            <div className="flex items-end justify-between gap-4 flex-wrap">
              {/* Avatar */}
              <Avatar className="h-20 w-20 border-4 border-background shadow-xl">
                <AvatarImage src={business.avatarUrl || undefined} alt={business.companyName} />
                <AvatarFallback className="text-2xl font-black bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>

              {/* Actions */}
              <div className="flex items-center gap-2 mt-2">
                {!isOwnBusiness && user && (
                  <Button
                    onClick={handleConnect}
                    disabled={connecting}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold gap-2"
                  >
                    {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
                    Connect
                  </Button>
                )}
                {!user && (
                  <Link href="/login">
                    <Button className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold">
                      Sign in to Connect
                    </Button>
                  </Link>
                )}
              </div>
            </div>

            {/* Name & meta */}
            <div className="mt-4 space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-black text-foreground">{business.companyName}</h1>
                {isVerified && <GoldCheckmark />}
                <Badge className={`text-xs font-bold border ${statusCfg.color}`}>
                  {statusCfg.label}
                </Badge>
              </div>

              {business.headline && (
                <p className="text-foreground/70 text-sm">{business.headline}</p>
              )}

              {business.industry && (
                <p className="text-xs font-semibold text-primary uppercase tracking-widest">
                  {business.industry}
                </p>
              )}

              {/* Rating summary */}
              {business.reviewCount > 0 && (
                <RatingSummary
                  average={business.avgRating}
                  count={business.reviewCount}
                  size="md"
                  className="mt-1"
                />
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Main column */}
          <div className="lg:col-span-2 space-y-5">
            {/* About */}
            {business.description && (
              <Card className="border-border">
                <CardContent className="p-5 space-y-2">
                  <h2 className="font-black text-foreground">About</h2>
                  <p className="text-sm text-foreground/75 leading-relaxed">{business.description}</p>
                </CardContent>
              </Card>
            )}

            {/* Reviews */}
            <Card className="border-border">
              <CardContent className="p-5">
                <ReviewsList
                  businessId={business.id}
                  businessName={business.companyName}
                  canReview={!isOwnBusiness}
                />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Trust & Stats */}
            <Card className="border-border">
              <CardContent className="p-5 space-y-4">
                <h3 className="font-black text-foreground text-sm uppercase tracking-widest">
                  Trust &amp; Stats
                </h3>

                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-black text-foreground">{business.trustScore}</p>
                    <p className="text-xs text-foreground/50">Trust Score / 100</p>
                  </div>
                </div>

                {business.reviewCount > 0 && (
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                      <Star className="h-5 w-5 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-black text-foreground">{business.avgRating.toFixed(1)}</p>
                      <p className="text-xs text-foreground/50">{business.reviewCount} consumer reviews</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <Users className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-black text-foreground">{business.connectionCount}</p>
                    <p className="text-xs text-foreground/50">Connections</p>
                  </div>
                </div>

                {isVerified && business.verifiedAt && (
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                      <CalendarCheck className="h-5 w-5 text-green-500" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">
                        {format(new Date(business.verifiedAt), "d MMM yyyy")}
                      </p>
                      <p className="text-xs text-foreground/50">Verified on</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Contact */}
            {(business.website || business.phone || business.address || business.location) && (
              <Card className="border-border">
                <CardContent className="p-5 space-y-3">
                  <h3 className="font-black text-foreground text-sm uppercase tracking-widest">
                    Contact
                  </h3>

                  {business.website && (
                    <a
                      href={business.website.startsWith("http") ? business.website : `https://${business.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-primary hover:underline font-medium"
                    >
                      <Globe className="h-4 w-4 shrink-0" />
                      <span className="truncate">{business.website.replace(/^https?:\/\//, "")}</span>
                    </a>
                  )}

                  {business.phone && (
                    <div className="flex items-center gap-2 text-sm text-foreground/75">
                      <Phone className="h-4 w-4 shrink-0 text-primary" />
                      <span>{business.phone}</span>
                    </div>
                  )}

                  {(business.address || business.location) && (
                    <div className="flex items-start gap-2 text-sm text-foreground/75">
                      <MapPin className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                      <span>{business.address || business.location}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Business Registration */}
            {(business.regNumber || business.vatNumber) && (
              <Card className="border-border">
                <CardContent className="p-5 space-y-3">
                  <h3 className="font-black text-foreground text-sm uppercase tracking-widest">
                    Registration
                  </h3>
                  {business.regNumber && (
                    <div>
                      <p className="text-[10px] text-foreground/40 uppercase font-bold tracking-widest">
                        CIPC Reg No.
                      </p>
                      <p className="text-sm font-semibold text-foreground mt-0.5">
                        {business.regNumber}
                      </p>
                    </div>
                  )}
                  {business.vatNumber && (
                    <div>
                      <p className="text-[10px] text-foreground/40 uppercase font-bold tracking-widest">
                        VAT Number
                      </p>
                      <p className="text-sm font-semibold text-foreground mt-0.5">
                        {business.vatNumber}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
