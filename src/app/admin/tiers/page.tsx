"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Crown, SlidersHorizontal, Gift, Smartphone, ShieldAlert } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { AdminBackground, AdminCard, AdminPageHeader } from "@/components/admin/ui";
import { AnimatedTabs, type TabItem } from "@/components/ui/animated-tabs";
import { Button } from "@/components/ui/button";
import BusinessTierManager from "@/components/admin/business-tier-manager";
import TierManagement from "@/components/admin/tier-management";
import OwnerAccountsPanel from "@/components/admin/owner-accounts-panel";
import { FINANCE_ROLES, hasRole } from "@/lib/roles";

type TiersTab = "businesses" | "definitions";

export default function AdminTiersPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TiersTab>("businesses");
  const [initialSearch, setInitialSearch] = useState("");

  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const q = sp.get("q");
      const tab = sp.get("tab");
      if (q) setInitialSearch(q);
      if (tab === "definitions") setActiveTab("definitions");
    } catch {
      // Ignore invalid URL query params
    }
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <AdminBackground>
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-600">
          Loading Business Tier Management…
        </div>
      </AdminBackground>
    );
  }

  if (!hasRole(user.role, FINANCE_ROLES)) {
    return (
      <AdminBackground>
        <div className="mx-auto max-w-xl px-4 py-20 text-center">
          <AdminCard className="p-8 space-y-4">
            <ShieldAlert className="mx-auto h-10 w-10 text-rose-600" />
            <h1 className="text-xl font-black text-slate-900">Restricted Access</h1>
            <p className="text-sm text-slate-600">
              Only Platform Admins and Finance Administrators can assign free tiers or edit plan pricing.
            </p>
            <Button asChild variant="outline">
              <Link href="/admin">Back to Admin Dashboard</Link>
            </Button>
          </AdminCard>
        </div>
      </AdminBackground>
    );
  }

  const tabs: TabItem<TiersTab>[] = [
    { id: "businesses", label: "Business Tiers & Free Plans", icon: Gift },
    { id: "definitions", label: "Tier Definitions & Limits", icon: SlidersHorizontal },
  ];

  return (
    <AdminBackground>
      <AdminPageHeader
        title="Business Tiers & Free Plans"
        subtitle="Grant complimentary tiers or timed free plans to businesses, remove tiers back to Free, manage free POS access, and configure tier definitions."
      >
        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-emerald-200 text-emerald-800 hover:bg-emerald-50 font-bold"
          asChild
        >
          <Link href="/admin/pos">
            <Smartphone className="h-4 w-4" /> POS Oversight
          </Link>
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-slate-300 text-slate-800 hover:bg-slate-100 font-bold"
          asChild
        >
          <Link href="/admin">
            <ArrowLeft className="h-4 w-4" /> Back to Admin
          </Link>
        </Button>
      </AdminPageHeader>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <AnimatedTabs<TiersTab>
            tabs={tabs}
            activeTab={activeTab}
            onChange={setActiveTab}
            variant="pill"
          />
          <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900">
            <Crown className="h-3.5 w-3.5 text-amber-600" />
            Complimentary grants bypass PayFast charges automatically
          </div>
        </div>

        {activeTab === "businesses" ? (
          <>
            <OwnerAccountsPanel canEdit={user?.role === "admin"} />
            <BusinessTierManager initialSearch={initialSearch} />
          </>
        ) : (
          <TierManagement />
        )}
      </div>
    </AdminBackground>
  );
}
