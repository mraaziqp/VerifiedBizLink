"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Crown,
  Gift,
  Loader2,
  Megaphone,
  RotateCcw,
  Search,
  ShieldCheck,
  Smartphone,
  Sparkles,
  UserX,
} from "lucide-react";
import { AdminCard, StatCard } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AnimatedTabs, type TabItem } from "@/components/ui/animated-tabs";
import { useToast } from "@/hooks/use-toast";
import { formatRandAmount } from "@/lib/format-number";
import { cn } from "@/lib/utils";

interface TierOption {
  key: string;
  name: string;
  price: number;
  adLimit: number;
  monthlyAdCredits: number;
  note?: string | null;
  isActive: boolean;
  isPurchasable: boolean;
}

interface PosPlanOption {
  plan_key: string;
  name: string;
  monthly_price_rand: number;
  max_tills: number;
  max_staff: number;
}

interface AdminBusinessRow {
  id: string;
  user_id: string;
  company_name: string;
  industry: string;
  reg_number: string | null;
  status: string;
  badge_source: string | null;
  documents_reviewed_at: string | null;
  verification_paid: boolean;
  package_type: string | null;
  subscription_status: string | null;
  trial_package: string | null;
  trial_ends_at: string | null;
  auto_renew: boolean | null;
  next_billing_at: string | null;
  ad_credits: number | null;
  unlimited_ad_credits: boolean;
  has_payfast_token: boolean;
  tier_grant_type: string | null;
  tier_granted_at: string | null;
  tier_grant_note: string | null;
  owner_name: string | null;
  owner_email: string;
  owner_role: string;
  owner_suspended: boolean;
  pos_plan_key: string | null;
  pos_status: string | null;
  pos_trial_ends_at: string | null;
  pos_renews_at: string | null;
  pos_granted_free: boolean;
  pos_granted_reason: string | null;
  pos_has_payfast: boolean;
}

type SegmentFilter = "all" | "granted" | "paid" | "timed" | "free";
type ModalPlatformMode = "complimentary" | "timed_free" | "remove" | "keep";
type ModalPosAction = "keep" | "grant_free" | "revoke";
type DowngradeReasonCategory = "non_payment" | "terms_violation" | "fraud" | "requested" | "admin_discretion";

const DOWNGRADE_CATEGORIES: { id: DowngradeReasonCategory; label: string; desc: string; defaultReason: string }[] = [
  {
    id: "non_payment",
    label: "Non-Payment / Unpaid Renewal",
    desc: "Moves account to Free Profile. Billing screen displays Pay Now / Restore Plan button so they can re-subscribe.",
    defaultReason: "Subscription payment was not received after billing due date. Account moved to Free Profile so merchant can settle or re-subscribe.",
  },
  {
    id: "terms_violation",
    label: "Terms of Service Violation",
    desc: "Revokes paid tier immediately for violation of platform terms or marketplace policies.",
    defaultReason: "Violation of VerifiedBizLink terms of service or merchant conduct guidelines.",
  },
  {
    id: "fraud",
    label: "Suspicious or Fraudulent Activity",
    desc: "Revokes tier and badges for security audit and compliance investigation.",
    defaultReason: "Suspicious payment activity, chargeback dispute, or fraudulent business documentation.",
  },
  {
    id: "requested",
    label: "Merchant Requested Downgrade",
    desc: "Customer contacted support requesting immediate cancellation and return to Free.",
    defaultReason: "Merchant requested account cancellation and return to Free Profile.",
  },
  {
    id: "admin_discretion",
    label: "Admin / Promotional Ending",
    desc: "Complimentary or promotional tier has ended.",
    defaultReason: "Promotional complimentary tier ended. Account returned to Free Profile.",
  },
];

const QUICK_REASONS = [
  "Complimentary VIP / Partner plan",
  "Founder goodwill / promotional grant",
  "Onboarding support free period",
  "Temporary promotional access",
  "Promotional / complimentary period ended",
];

function effectiveTierOf(b: AdminBusinessRow, nowMs: number): string {
  if (
    nowMs > 0 &&
    b.trial_package &&
    b.trial_ends_at &&
    new Date(b.trial_ends_at).getTime() > nowMs
  ) {
    return b.trial_package;
  }
  return b.package_type || "free";
}

function isOwnerAccount(b: AdminBusinessRow): boolean {
  return b.tier_grant_type === "owner";
}

function isComplimentaryGrant(b: AdminBusinessRow, nowMs: number): boolean {
  return (
    (b.tier_grant_type === "complimentary" || b.tier_grant_type === "timed_free") &&
    effectiveTierOf(b, nowMs) !== "free"
  );
}

function daysRemaining(iso: string | null | undefined, nowMs: number): number | null {
  if (!iso || nowMs <= 0) return null;
  const ms = new Date(iso).getTime() - nowMs;
  if (Number.isNaN(ms)) return null;
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

function formatDateShort(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
}

export default function BusinessTierManager({ initialSearch = "" }: { initialSearch?: string }) {
  const { toast } = useToast();
  const [businesses, setBusinesses] = useState<AdminBusinessRow[]>([]);
  const [tiers, setTiers] = useState<TierOption[]>([]);
  const [posPlans, setPosPlans] = useState<PosPlanOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [nowMs, setNowMs] = useState<number>(0);

  const [search, setSearch] = useState(initialSearch);
  const [segment, setSegment] = useState<SegmentFilter>("all");
  const [tierFilter, setTierFilter] = useState<string>("all");

  // Active modal state
  const [selected, setSelected] = useState<AdminBusinessRow | null>(null);
  const [platformMode, setPlatformMode] = useState<ModalPlatformMode>("complimentary");
  const [targetTierKey, setTargetTierKey] = useState<string>("standard");
  const [durationDays, setDurationDays] = useState<number>(30);
  const [customExpiresAt, setCustomExpiresAt] = useState<string>("");
  const [grantVerifiedBadge, setGrantVerifiedBadge] = useState<boolean>(true);
  const [revokeAdminBadge, setRevokeAdminBadge] = useState<boolean>(false);
  const [downgradeCategory, setDowngradeCategory] = useState<DowngradeReasonCategory>("non_payment");
  const [syncMonthlyCredits, setSyncMonthlyCredits] = useState<boolean>(true);
  const [bonusAdCredits, setBonusAdCredits] = useState<string>("0");

  const [posAction, setPosAction] = useState<ModalPosAction>("keep");
  const [posPlanKey, setPosPlanKey] = useState<string>("starter");
  const [posDurationMode, setPosDurationMode] = useState<"indefinite" | "timed">("indefinite");
  const [posDurationDays, setPosDurationDays] = useState<number>(30);
  const [posExemptFees, setPosExemptFees] = useState<boolean>(false);

  // Adjust the end date of an existing free grant (or make it permanent).
  const [expiryFor, setExpiryFor] = useState<AdminBusinessRow | null>(null);
  const [expiryDate, setExpiryDate] = useState<string>("");
  const [expiryPermanent, setExpiryPermanent] = useState<boolean>(false);
  const [expiryReason, setExpiryReason] = useState<string>("");
  const [expirySaving, setExpirySaving] = useState<boolean>(false);

  const [reason, setReason] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialSearch) setSearch(initialSearch);
  }, [initialSearch]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [bizRes, tierRes, posRes] = await Promise.all([
        fetch("/api/admin/businesses?includeDocs=false", { cache: "no-store" }),
        fetch("/api/admin/tiers", { cache: "no-store" }),
        fetch("/api/admin/pos?view=plans", { cache: "no-store" }),
      ]);

      setNowMs(Date.now());

      if (bizRes.ok) {
        const d = await bizRes.json();
        setBusinesses(d.businesses || []);
      }
      if (tierRes.ok) {
        const d = await tierRes.json();
        setTiers(d.tiers || []);
      }
      if (posRes.ok) {
        const d = await posRes.json();
        setPosPlans(d.plans || []);
      }
    } catch (err) {
      console.error("Failed to load business tier manager data:", err);
      toast({
        title: "Failed to load businesses",
        description: "Check your connection and refresh.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const tierMap = useMemo(
    () => new Map(tiers.map((t) => [t.key, t])),
    [tiers],
  );

  const assignableTiers = useMemo(
    () => tiers.filter((t) => t.key !== "free" && t.key !== "premium_half"),
    [tiers],
  );

  const stats = useMemo(() => {
    let compCount = 0;
    let paidCount = 0;
    let timedCount = 0;
    let freeCount = 0;
    let posFreeCount = 0;

    for (const b of businesses) {
      const eff = effectiveTierOf(b, nowMs);
      const isTimed =
        b.tier_grant_type === "timed_free" ||
        Boolean(nowMs > 0 && b.trial_package && b.trial_ends_at && new Date(b.trial_ends_at).getTime() > nowMs);
      if (isTimed) timedCount += 1;
      if (isComplimentaryGrant(b, nowMs)) {
        compCount += 1;
      } else if (eff !== "free" && b.subscription_status === "active") {
        paidCount += 1;
      }
      if (eff === "free") freeCount += 1;
      if (b.pos_granted_free && (b.pos_status === "active" || b.pos_status === "trial")) {
        posFreeCount += 1;
      }
    }
    return {
      total: businesses.length,
      compCount,
      paidCount,
      timedCount,
      freeCount,
      posFreeCount,
    };
  }, [businesses, nowMs]);

  const filteredBusinesses = useMemo(() => {
    const q = search.trim().toLowerCase();
    return businesses.filter((b) => {
      const eff = effectiveTierOf(b, nowMs);
      if (tierFilter !== "all" && eff !== tierFilter) return false;

      if (segment === "granted") {
        const hasGranted = isComplimentaryGrant(b, nowMs) || b.pos_granted_free;
        if (!hasGranted) return false;
      } else if (segment === "paid") {
        if (eff === "free" || isComplimentaryGrant(b, nowMs) || b.subscription_status !== "active") {
          return false;
        }
      } else if (segment === "timed") {
        const isTimed =
          b.tier_grant_type === "timed_free" ||
          Boolean(nowMs > 0 && b.trial_package && b.trial_ends_at && new Date(b.trial_ends_at).getTime() > nowMs);
        if (!isTimed) return false;
      } else if (segment === "free") {
        if (eff !== "free") return false;
      }

      if (!q) return true;
      return (
        (b.company_name || "").toLowerCase().includes(q) ||
        (b.owner_email || "").toLowerCase().includes(q) ||
        (b.owner_name || "").toLowerCase().includes(q) ||
        (b.reg_number || "").toLowerCase().includes(q) ||
        (b.tier_grant_note || "").toLowerCase().includes(q)
      );
    });
  }, [businesses, nowMs, search, segment, tierFilter]);

  const segmentTabs: TabItem<SegmentFilter>[] = [
    { id: "all", label: "All Businesses", icon: Building2, badge: stats.total },
    { id: "granted", label: "Free / Complimentary", icon: Gift, badge: stats.compCount },
    { id: "paid", label: "Paid Plans", icon: CreditCard, badge: stats.paidCount },
    { id: "timed", label: "Timed Trials / Grants", icon: Clock, badge: stats.timedCount },
    { id: "free", label: "On Free Profile", icon: Sparkles, badge: stats.freeCount },
  ];

  const openManageModal = (biz: AdminBusinessRow, presetMode?: ModalPlatformMode) => {
    const eff = effectiveTierOf(biz, nowMs);
    const defaultTier =
      eff !== "free" && tierMap.has(eff)
        ? eff
        : assignableTiers.find((t) => t.key === "standard")?.key ||
          assignableTiers[0]?.key ||
          "standard";

    setSelected(biz);
    setPlatformMode(presetMode ?? "complimentary");
    setTargetTierKey(defaultTier);
    setDurationDays(30);
    setCustomExpiresAt("");
    setGrantVerifiedBadge(biz.status !== "verified");
    setRevokeAdminBadge(false);
    setSyncMonthlyCredits(true);
    setBonusAdCredits("0");
    setPosAction("keep");
    setPosPlanKey(biz.pos_plan_key || posPlans[0]?.plan_key || "starter");
    setPosDurationMode("indefinite");
    setPosDurationDays(30);
    setPosExemptFees(false);
    if (presetMode === "remove") {
      setPlatformMode("remove");
      setDowngradeCategory("non_payment");
      setReason(DOWNGRADE_CATEGORIES[0].defaultReason);
    } else {
      setPlatformMode(presetMode ?? "complimentary");
      setDowngradeCategory("non_payment");
      setReason("Complimentary plan granted by admin");
    }
  };

  const selectedTierObj = tierMap.get(targetTierKey);
  const canRevokeUnvettedBadge = Boolean(
    selected &&
      selected.status === "verified" &&
      ["admin_grant", "subscription"].includes(selected.badge_source || "") &&
      !selected.documents_reviewed_at &&
      !selected.verification_paid,
  );

  const handleApplyChanges = async () => {
    if (!selected) return;
    if (reason.trim().length < 3) {
      toast({
        title: "Reason required",
        description: "Please enter at least 3 characters for the audit log.",
        variant: "destructive",
      });
      return;
    }
    if (platformMode === "keep" && posAction === "keep") {
      toast({
        title: "No changes selected",
        description: "Choose a platform tier action or a POS plan action to apply.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        reason: reason.trim(),
        cancelPayfast: true,
      };

      if (platformMode !== "keep") {
        payload.mode = platformMode;
        if (platformMode === "complimentary" || platformMode === "timed_free") {
          payload.tierKey = targetTierKey;
          payload.grantVerifiedBadge = grantVerifiedBadge;
          payload.syncMonthlyCredits = syncMonthlyCredits;
          payload.bonusAdCredits = Math.max(0, Math.trunc(Number(bonusAdCredits) || 0));
          if (platformMode === "timed_free") {
            if (customExpiresAt) {
              payload.expiresAt = new Date(`${customExpiresAt}T23:59:59Z`).toISOString();
            } else {
              payload.durationDays = durationDays;
            }
          }
        } else if (platformMode === "remove") {
          payload.downgradeReasonCategory = downgradeCategory;
          payload.revokeAdminBadge = revokeAdminBadge && canRevokeUnvettedBadge;
        }
      }

      if (posAction !== "keep") {
        payload.posAction = posAction;
        if (posAction === "grant_free") {
          payload.posPlanKey = posPlanKey;
          payload.posExemptFees = posExemptFees;
          if (posDurationMode === "timed") {
            payload.posDurationDays = posDurationDays;
          }
        }
      }

      const res = await fetch(`/api/admin/businesses/${selected.id}/tier`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          title: "Could not apply tier change",
          description: data.error || "Please review the fields and try again.",
          variant: "destructive",
        });
        return;
      }

      const messages: string[] = [];
      if (platformMode === "remove") {
        messages.push(`Moved "${selected.company_name}" to Free Profile`);
      } else if (platformMode === "timed_free") {
        messages.push(`Granted free ${selectedTierObj?.name || targetTierKey} (${durationDays}d / timed)`);
      } else if (platformMode === "complimentary") {
        messages.push(`Granted complimentary ${selectedTierObj?.name || targetTierKey} plan`);
      }
      if (data.grantedCredits > 0) {
        messages.push(`+${data.grantedCredits} ad credits added`);
      }
      if (posAction === "grant_free") {
        messages.push(`POS (${posPlanKey}) activated free`);
      } else if (posAction === "revoke") {
        messages.push("POS plan removed");
      }
      if (data.requiresManualPayfastCancellation) {
        messages.push("Note: Cancel old PayFast recurring billing manually in PayFast");
      }

      toast({
        title: "Business tier updated",
        description: messages.join(" • "),
      });
      setSelected(null);
      await loadData();
    } catch {
      toast({
        title: "Network error",
        description: "Could not save tier update.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI Strip */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        <StatCard
          label="Total Businesses"
          value={loading ? "…" : stats.total}
          icon={Building2}
          loading={loading}
        />
        <StatCard
          label="Complimentary Grants"
          value={loading ? "…" : stats.compCount}
          icon={Gift}
          gradient="from-emerald-500 to-teal-500"
          loading={loading}
        />
        <StatCard
          label="Paid Subscriptions"
          value={loading ? "…" : stats.paidCount}
          icon={Crown}
          gradient="from-blue-500 to-cyan-500"
          loading={loading}
        />
        <StatCard
          label="POS Free Plans"
          value={loading ? "…" : stats.posFreeCount}
          icon={Smartphone}
          gradient="from-amber-500 to-yellow-500"
          loading={loading}
        />
        <StatCard
          label="On Free Profile"
          value={loading ? "…" : stats.freeCount}
          icon={Sparkles}
          loading={loading}
        />
      </div>

      {/* Filter Tabs & Search Controls */}
      <AnimatedTabs<SegmentFilter>
        tabs={segmentTabs}
        activeTab={segment}
        onChange={setSegment}
        variant="pill"
      />

      <AdminCard className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by business name, owner email, owner name, reg number, or grant note..."
              className="pl-10 rounded-xl border-slate-200 bg-white text-slate-900"
            />
          </div>
          <select
            aria-label="Filter by tier"
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none"
          >
            <option value="all">All Tiers</option>
            {tiers.map((t) => (
              <option key={t.key} value={t.key}>
                {t.name} ({t.key})
              </option>
            ))}
          </select>
          <Button
            variant="outline"
            onClick={loadData}
            disabled={loading}
            className="gap-2 rounded-xl border-slate-200"
          >
            <RotateCcw className={cn("h-4 w-4", loading && "animate-spin")} /> Refresh
          </Button>
        </div>
      </AdminCard>

      {/* Main Businesses Table */}
      <AdminCard className="p-0 overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-5 py-3">
          <p className="text-sm font-bold text-slate-900">
            Showing {filteredBusinesses.length} of {businesses.length} business{businesses.length === 1 ? "" : "es"}
          </p>
          <span className="text-xs text-slate-500">
            Grant complimentary plans, promo trials, ad credits &amp; POS access — or downgrade to Free
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-14 text-slate-500">
            <Loader2 className="mr-2 h-6 w-6 animate-spin text-slate-800" /> Loading businesses…
          </div>
        ) : filteredBusinesses.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Building2 className="mx-auto mb-2 h-10 w-10 text-slate-300" />
            <p className="font-bold text-slate-800">No businesses match your filters</p>
            <p className="mt-1 text-xs text-slate-400">Clear the search box or switch filter tabs.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/60 text-xs font-bold uppercase tracking-wider text-slate-600">
                  <th className="px-5 py-3.5">Business &amp; Owner</th>
                  <th className="px-5 py-3.5">Verification</th>
                  <th className="px-5 py-3.5">Platform Tier &amp; Grant</th>
                  <th className="px-5 py-3.5">Credits / Ads</th>
                  <th className="px-5 py-3.5">POS Plan</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBusinesses.map((b) => {
                  const eff = effectiveTierOf(b, nowMs);
                  const tierInfo = tierMap.get(eff);
                  const comp = isComplimentaryGrant(b, nowMs);
                  const remaining = b.tier_grant_type === "timed_free" ? daysRemaining(b.next_billing_at || b.trial_ends_at, nowMs) : null;
                  const onPaidOrGranted = eff !== "free";
                  const posActive = b.pos_status === "active" || b.pos_status === "trial";

                  return (
                    <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-slate-900">
                          {b.company_name || "Unnamed Business"}
                        </div>
                        <div className="text-xs text-slate-500">
                          {b.owner_name || "Owner"} • <span className="font-mono">{b.owner_email}</span>
                        </div>
                        {b.industry && (
                          <div className="text-[11px] text-slate-400 mt-0.5">{b.industry}</div>
                        )}
                      </td>

                      <td className="px-5 py-3.5">
                        {b.status === "verified" ? (
                          <div>
                            <Badge className="bg-emerald-50 text-emerald-800 border border-emerald-200 gap-1">
                              <CheckCircle2 className="h-3 w-3" /> Verified
                            </Badge>
                            <p className="text-[10px] text-slate-500 mt-1">
                              via {b.badge_source === "vetting_review" ? "Docs Review" : b.badge_source === "admin_grant" ? "Admin Grant" : b.badge_source || "Paid"}
                            </p>
                          </div>
                        ) : (
                          <Badge className="bg-slate-100 text-slate-700 border border-slate-200 capitalize">
                            {b.status || "unregistered"}
                          </Badge>
                        )}
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge
                            className={cn(
                              "font-bold border",
                              eff === "premium"
                                ? "bg-amber-50 text-amber-900 border-amber-300"
                                : eff === "standard"
                                  ? "bg-cyan-50 text-cyan-800 border-cyan-200"
                                  : eff === "verified"
                                    ? "bg-indigo-50 text-indigo-800 border-indigo-200"
                                    : eff === "free"
                                      ? "bg-slate-100 text-slate-700 border-slate-200"
                                      : "bg-purple-50 text-purple-800 border-purple-200",
                            )}
                          >
                            {tierInfo?.name || eff}
                          </Badge>

                          {isOwnerAccount(b) && (
                            <Badge className="bg-amber-100 text-amber-950 border border-amber-300 gap-1" title="Owner account: permanent Premium, never billed">
                              <Crown className="h-3 w-3" /> Owner · forever
                            </Badge>
                          )}

                          {comp && (
                            <Badge className="bg-emerald-100 text-emerald-900 border border-emerald-200 gap-1">
                              <Gift className="h-3 w-3" />
                              {b.tier_grant_type === "timed_free"
                                ? remaining !== null
                                  ? `${remaining}d free`
                                  : "Timed Free"
                                : "Free Comp"}
                            </Badge>
                          )}

                          {!comp && onPaidOrGranted && b.has_payfast_token && (
                            <Badge className="bg-blue-50 text-blue-800 border border-blue-200">
                              PayFast
                            </Badge>
                          )}

                          {b.subscription_status === "renewal_overdue" && (
                            <Badge className="bg-rose-50 text-rose-800 border border-rose-200">
                              Overdue
                            </Badge>
                          )}
                        </div>
                        {b.tier_grant_type === "timed_free" && (b.next_billing_at || b.trial_ends_at) && (
                          <p className="mt-1 text-[11px] text-slate-600">
                            Free until {formatDateShort(b.next_billing_at || b.trial_ends_at)}
                          </p>
                        )}
                        {b.tier_grant_note && (
                          <p className="mt-1 max-w-xs truncate text-[11px] text-slate-500" title={b.tier_grant_note}>
                            Note: {b.tier_grant_note}
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-xs">
                        <div className="font-semibold text-slate-800 flex items-center gap-1">
                          <Megaphone className="h-3.5 w-3.5 text-slate-400" />
                          {b.unlimited_ad_credits ? (
                            <span className="text-emerald-700">Unlimited credits</span>
                          ) : (
                            <span>{Number(b.ad_credits || 0)} credits</span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Ad limit: {tierInfo?.adLimit ?? 0}
                        </div>
                      </td>

                      <td className="px-5 py-3.5 text-xs">
                        {b.pos_plan_key ? (
                          <div>
                            <Badge
                              className={cn(
                                "border",
                                b.pos_granted_free && posActive
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                  : posActive
                                    ? "bg-blue-50 text-blue-800 border-blue-200"
                                    : "bg-slate-100 text-slate-600 border-slate-200",
                              )}
                            >
                              {b.pos_plan_key} • {b.pos_granted_free ? `comp (${b.pos_status})` : b.pos_status}
                            </Badge>
                            {b.pos_trial_ends_at && b.pos_status === "trial" && (
                              <p className="text-[10px] text-slate-500 mt-0.5">
                                Ends {formatDateShort(b.pos_trial_ends_at)}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">No POS</span>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <Button
                            size="sm"
                            onClick={() => openManageModal(b, "complimentary")}
                            className="h-8 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs gap-1"
                          >
                            <Gift className="h-3.5 w-3.5" />
                            {onPaidOrGranted ? "Manage Tier" : "Grant Free Tier"}
                          </Button>

                          {(b.tier_grant_type === "timed_free" || b.tier_grant_type === "complimentary") && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setExpiryFor(b);
                                const current = b.next_billing_at || b.trial_ends_at;
                                setExpiryDate(current ? new Date(current).toISOString().slice(0, 10) : "");
                                setExpiryPermanent(b.tier_grant_type === "complimentary");
                                setExpiryReason("");
                              }}
                              className="h-8 rounded-lg text-xs font-semibold gap-1"
                              title="Change when this free plan ends, or make it permanent"
                            >
                              <Calendar className="h-3.5 w-3.5" /> Adjust expiry
                            </Button>
                          )}

                          {(onPaidOrGranted || posActive) && !isOwnerAccount(b) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openManageModal(b, onPaidOrGranted ? "remove" : "keep")}
                              className="h-8 rounded-lg border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold gap-1"
                              title="Downgrade active tier to Free (non-payment, terms violation, or cancellation)"
                            >
                              <UserX className="h-3.5 w-3.5" /> Downgrade to Free
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>

      {/* Adjust expiry of a free grant */}
      <Dialog open={!!expiryFor} onOpenChange={(open) => { if (!open && !expirySaving) setExpiryFor(null); }}>
        <DialogContent className="max-w-md rounded-3xl bg-white p-6">
          {expiryFor && (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg font-black">Adjust free plan end date</DialogTitle>
                <DialogDescription className="text-xs">
                  {expiryFor.company_name} — currently{" "}
                  {expiryFor.tier_grant_type === "complimentary"
                    ? "free with no end date"
                    : `free until ${formatDateShort(expiryFor.next_billing_at || expiryFor.trial_ends_at)}`}
                  . The owner is notified of the change.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <label className="flex items-center gap-2 font-semibold">
                  <input type="checkbox" checked={expiryPermanent} onChange={(e) => setExpiryPermanent(e.target.checked)} />
                  No end date (free forever)
                </label>
                {!expiryPermanent && (
                  <label className="block text-xs font-bold text-slate-700">
                    Free until
                    <Input
                      type="date"
                      value={expiryDate}
                      min={nowMs ? new Date(nowMs + 86_400_000).toISOString().slice(0, 10) : undefined}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      className="mt-1 rounded-xl"
                    />
                  </label>
                )}
                <Input
                  value={expiryReason}
                  onChange={(e) => setExpiryReason(e.target.value)}
                  placeholder="Reason (for the audit log)"
                  className="rounded-xl"
                  aria-label="Reason"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setExpiryFor(null)} disabled={expirySaving} className="rounded-xl text-xs">Cancel</Button>
                <Button
                  disabled={expirySaving || (!expiryPermanent && !expiryDate) || expiryReason.trim().length < 3}
                  className="rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs"
                  onClick={async () => {
                    setExpirySaving(true);
                    const res = await fetch(`/api/admin/businesses/${expiryFor.id}/tier`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        mode: "set_expiry",
                        permanent: expiryPermanent,
                        expiresAt: expiryPermanent ? null : new Date(`${expiryDate}T23:59:59Z`).toISOString(),
                        reason: expiryReason,
                      }),
                    });
                    const data = await res.json().catch(() => ({}));
                    setExpirySaving(false);
                    if (!res.ok) {
                      toast({ title: "Not changed", description: data.error, variant: "destructive" });
                      return;
                    }
                    toast({ title: expiryPermanent ? "Free plan made permanent" : `Free until ${formatDateShort(data.expiresAt)}` });
                    setExpiryFor(null);
                    loadData();
                  }}
                >
                  {expirySaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Grant / Manage / Remove Modal */}
      <Dialog open={!!selected} onOpenChange={(open) => { if (!open && !submitting) setSelected(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <Crown className="h-5 w-5 text-amber-500" />
                  Manage Business Tier &amp; Free Plans
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-600">
                  <strong className="text-slate-900">{selected.company_name}</strong> ({selected.owner_email}) — Currently on{" "}
                  <strong className="uppercase">{effectiveTierOf(selected, nowMs)}</strong>
                  {isComplimentaryGrant(selected, nowMs) ? " (Complimentary Grant)" : ""}
                  {selected.pos_plan_key ? ` • POS: ${selected.pos_plan_key} (${selected.pos_status})` : ""}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5 mt-2">
                {(selected.has_payfast_token || selected.pos_has_payfast) && (
                  <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3.5 text-xs text-amber-950 flex items-start gap-2.5">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Active PayFast recurring token on file</p>
                      <p className="mt-0.5">
                        Granting a complimentary plan or moving this business to Free will automatically attempt to cancel their PayFast recurring billing so they are not charged.
                      </p>
                    </div>
                  </div>
                )}

                {/* Section 1: Platform Business Tier */}
                <div className="rounded-2xl border border-slate-200 p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-slate-900">1. Platform Membership Tier</h3>
                    <span className="text-[11px] text-slate-500">Controls ads, studio &amp; verification features</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {([
                      { id: "complimentary", label: "Free Forever (Comp)", desc: "No charge until removed" },
                      { id: "timed_free", label: "Timed Free Plan", desc: "Auto-returns to Free" },
                      { id: "remove", label: "Downgrade to Free", desc: "Non-payment, violation or cancel" },
                      { id: "keep", label: "Leave Unchanged", desc: "Only update POS" },
                    ] as const).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setPlatformMode(opt.id);
                          if (opt.id === "remove") {
                            setDowngradeCategory("non_payment");
                            setReason(DOWNGRADE_CATEGORIES[0].defaultReason);
                          }
                        }}
                        className={cn(
                          "rounded-xl border p-2.5 text-left transition-all",
                          platformMode === opt.id
                            ? opt.id === "remove"
                              ? "border-rose-500 bg-rose-50 ring-1 ring-rose-500"
                              : "border-amber-500 bg-amber-50 ring-1 ring-amber-500"
                            : "border-slate-200 bg-white hover:bg-slate-50",
                        )}
                      >
                        <div className="text-xs font-bold text-slate-900">{opt.label}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{opt.desc}</div>
                      </button>
                    ))}
                  </div>

                  {(platformMode === "complimentary" || platformMode === "timed_free") && (
                    <div className="space-y-4 pt-1">
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-2">
                          Choose Tier to Grant for Free (R0 to business)
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {assignableTiers.map((t) => (
                            <button
                              key={t.key}
                              type="button"
                              onClick={() => setTargetTierKey(t.key)}
                              className={cn(
                                "rounded-xl border p-3 text-left transition-all",
                                targetTierKey === t.key
                                  ? "border-slate-900 bg-slate-900 text-white"
                                  : "border-slate-200 bg-white hover:border-slate-300",
                              )}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-black">{t.name}</span>
                                <span
                                  className={cn(
                                    "text-[10px] line-through",
                                    targetTierKey === t.key ? "text-slate-400" : "text-slate-400",
                                  )}
                                >
                                  {formatRandAmount(t.price, 0)}
                                </span>
                              </div>
                              <div
                                className={cn(
                                  "text-[11px] font-bold mt-0.5",
                                  targetTierKey === t.key ? "text-emerald-300" : "text-emerald-700",
                                )}
                              >
                                Free (R0 comp)
                              </div>
                              <div
                                className={cn(
                                  "text-[10px] mt-1",
                                  targetTierKey === t.key ? "text-slate-300" : "text-slate-500",
                                )}
                              >
                                {t.adLimit} ads • {t.monthlyAdCredits} ad-days/mo
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {platformMode === "timed_free" && (
                        <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-2.5">
                          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5" /> Free Access Duration
                          </label>
                          <div className="flex flex-wrap gap-1.5">
                            {[7, 14, 30, 90, 180, 365].map((days) => (
                              <button
                                key={days}
                                type="button"
                                onClick={() => {
                                  setDurationDays(days);
                                  setCustomExpiresAt("");
                                }}
                                className={cn(
                                  "rounded-lg px-2.5 py-1 text-xs font-bold border transition-colors",
                                  !customExpiresAt && durationDays === days
                                    ? "bg-slate-900 text-white border-slate-900"
                                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100",
                                )}
                              >
                                {days} days
                              </button>
                            ))}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-slate-500 whitespace-nowrap">Or exact end date:</span>
                            <Input
                              type="date"
                              value={customExpiresAt}
                              onChange={(e) => setCustomExpiresAt(e.target.value)}
                              className="h-8 text-xs bg-white rounded-lg max-w-[180px]"
                            />
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <label className="flex items-start gap-2 rounded-xl border border-slate-200 p-3 cursor-pointer hover:bg-slate-50">
                          <input
                            type="checkbox"
                            checked={grantVerifiedBadge}
                            onChange={(e) => setGrantVerifiedBadge(e.target.checked)}
                            className="mt-0.5 rounded"
                          />
                          <div className="text-xs">
                            <div className="font-bold text-slate-900 flex items-center gap-1">
                              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                              Grant Verified Trust Badge
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {selected.status === "verified"
                                ? "Already verified — keeps existing status."
                                : "Marks business verified (admin grant)."}
                            </div>
                          </div>
                        </label>

                        <label className="flex items-start gap-2 rounded-xl border border-slate-200 p-3 cursor-pointer hover:bg-slate-50">
                          <input
                            type="checkbox"
                            checked={syncMonthlyCredits}
                            onChange={(e) => setSyncMonthlyCredits(e.target.checked)}
                            disabled={!selectedTierObj || selectedTierObj.monthlyAdCredits <= 0}
                            className="mt-0.5 rounded"
                          />
                          <div className="text-xs">
                            <div className="font-bold text-slate-900">
                              Grant tier ad credits now (+{selectedTierObj?.monthlyAdCredits ?? 0})
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Credits the monthly allowance immediately.
                            </div>
                          </div>
                        </label>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">
                          Optional extra bonus ad credits
                        </label>
                        <Input
                          type="number"
                          min={0}
                          max={10000}
                          value={bonusAdCredits}
                          onChange={(e) => setBonusAdCredits(e.target.value)}
                          className="h-9 max-w-[160px] rounded-xl text-xs"
                        />
                      </div>
                    </div>
                  )}

                  {platformMode === "remove" && (
                    <div className="rounded-xl bg-rose-50/70 border border-rose-200 p-3.5 space-y-3 text-xs">
                      <div>
                        <p className="font-bold text-rose-900">
                          Downgrade &ldquo;{selected.company_name}&rdquo; back to Free Profile
                        </p>
                        <p className="text-rose-800 mt-0.5">
                          All company profile details, products, gallery images, documents, and sales history remain untouched. Features and ad limits revert to the Free tier.
                        </p>
                      </div>

                      <div>
                        <label className="font-bold text-rose-950 block mb-1.5">
                          Select Downgrade Reason / Policy Category:
                        </label>
                        <div className="space-y-1.5">
                          {DOWNGRADE_CATEGORIES.map((cat) => (
                            <label
                              key={cat.id}
                              className={cn(
                                "flex items-start gap-2.5 p-2 rounded-lg border cursor-pointer transition-colors",
                                downgradeCategory === cat.id
                                  ? "bg-white border-rose-400 ring-1 ring-rose-400"
                                  : "bg-white/60 border-rose-200 hover:bg-white",
                              )}
                            >
                              <input
                                type="radio"
                                name="downgrade_cat"
                                value={cat.id}
                                checked={downgradeCategory === cat.id}
                                onChange={() => {
                                  setDowngradeCategory(cat.id);
                                  setReason(cat.defaultReason);
                                }}
                                className="mt-0.5"
                              />
                              <div className="min-w-0 flex-1">
                                <span className="font-bold text-slate-900 block">{cat.label}</span>
                                <span className="text-[11px] text-slate-500 block leading-tight mt-0.5">
                                  {cat.desc}
                                </span>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>

                      {canRevokeUnvettedBadge && (
                        <label className="flex items-start gap-2 pt-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={revokeAdminBadge}
                            onChange={(e) => setRevokeAdminBadge(e.target.checked)}
                            className="mt-0.5"
                          />
                          <span className="text-rose-900 font-medium">
                            Also remove unvetted verification badge (badge was granted via{" "}
                            <span className="font-mono">{selected.badge_source}</span> with no document review)
                          </span>
                        </label>
                      )}
                    </div>
                  )}
                </div>

                {/* Section 2: POS Plan */}
                <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                      <Smartphone className="h-4 w-4 text-emerald-600" />
                      2. VerifiedBizLink POS Free Plan (Optional)
                    </h3>
                    <span className="text-[11px] text-slate-500">
                      {selected.pos_plan_key ? `Current: ${selected.pos_plan_key} (${selected.pos_status})` : "No POS yet"}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setPosAction("keep")}
                      className={cn(
                        "rounded-xl border px-3 py-2 text-xs font-bold",
                        posAction === "keep"
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 text-slate-700 hover:bg-slate-50",
                      )}
                    >
                      Keep POS as-is
                    </button>
                    <button
                      type="button"
                      onClick={() => setPosAction("grant_free")}
                      className={cn(
                        "rounded-xl border px-3 py-2 text-xs font-bold",
                        posAction === "grant_free"
                          ? "border-emerald-600 bg-emerald-600 text-white"
                          : "border-slate-200 text-slate-700 hover:bg-slate-50",
                      )}
                    >
                      Grant Free POS
                    </button>
                    <button
                      type="button"
                      disabled={!selected.pos_plan_key}
                      onClick={() => setPosAction("revoke")}
                      className={cn(
                        "rounded-xl border px-3 py-2 text-xs font-bold disabled:opacity-40",
                        posAction === "revoke"
                          ? "border-rose-600 bg-rose-600 text-white"
                          : "border-slate-200 text-rose-700 hover:bg-rose-50",
                      )}
                    >
                      Remove POS Access
                    </button>
                  </div>

                  {posAction === "grant_free" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">POS Plan</label>
                        <select
                          value={posPlanKey}
                          onChange={(e) => setPosPlanKey(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800"
                        >
                          {(posPlans.length
                            ? posPlans
                            : [
                                { plan_key: "starter", name: "Starter Till", monthly_price_rand: 99, max_tills: 1, max_staff: 2 },
                                { plan_key: "business", name: "Business Storefront", monthly_price_rand: 249, max_tills: 3, max_staff: 5 },
                                { plan_key: "enterprise", name: "Multi-Branch Enterprise", monthly_price_rand: 599, max_tills: 10, max_staff: 25 },
                              ]
                          ).map((p) => (
                            <option key={p.plan_key} value={p.plan_key}>
                              {p.name} ({p.max_tills} tills, R{p.monthly_price_rand}/mo -&gt; Free)
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="font-bold text-slate-700 block mb-1">POS Free Duration</label>
                        <div className="flex gap-2">
                          <select
                            value={posDurationMode}
                            onChange={(e) => setPosDurationMode(e.target.value as "indefinite" | "timed")}
                            className="flex-1 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium text-slate-800"
                          >
                            <option value="indefinite">Free forever (until removed)</option>
                            <option value="timed">Timed free period</option>
                          </select>
                          {posDurationMode === "timed" && (
                            <Input
                              type="number"
                              min={1}
                              max={3650}
                              value={posDurationDays}
                              onChange={(e) => setPosDurationDays(Number(e.target.value) || 30)}
                              aria-label="POS free days"
                              className="w-20 rounded-xl text-xs"
                            />
                          )}
                        </div>
                      </div>

                      <label className="sm:col-span-2 flex items-center gap-2 font-medium text-slate-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={posExemptFees}
                          onChange={(e) => setPosExemptFees(e.target.checked)}
                        />
                        Waive POS per-sale platform transaction fees (0% merchant fee exemption)
                      </label>
                    </div>
                  )}
                </div>

                {/* Section 3: Audit Reason */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-800 block">
                    Audit Reason / Internal Note <span className="text-rose-600">*</span>
                  </label>
                  <Input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Why is this free tier / tier change being applied?"
                    className="rounded-xl text-sm"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_REASONS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setReason(preset)}
                        className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] text-slate-600 hover:bg-slate-100"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSelected(null)}
                    disabled={submitting}
                    className="rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleApplyChanges}
                    disabled={submitting || reason.trim().length < 3 || (platformMode === "keep" && posAction === "keep")}
                    className={cn(
                      "rounded-xl font-bold gap-2",
                      platformMode === "remove"
                        ? "bg-rose-600 hover:bg-rose-700 text-white"
                        : "bg-slate-900 hover:bg-slate-800 text-white",
                    )}
                  >
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    {platformMode === "remove" ? "Confirm Downgrade to Free" : "Save Tier Assignment"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
