"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  FileText, CheckCircle2, XCircle, Clock, Info, Loader2, Eye,
  FileCheck, AlertCircle, RefreshCw, Star, User2, Building2, Download,
  Search, SlidersHorizontal, ArrowUpDown, AlertTriangle, Filter, X,
  TrendingUp, TrendingDown, Minus,
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow, differenceInDays } from "date-fns";

// ─── Types ─────────────────────────────────────────────────────────────────

interface DocItem {
  id: string;
  name: string;
  doc_type: string;
  status: string;
  grade: number;
  review_notes: string;
  reviewed_at: string | null;
  uploaded_at: string | null;
  file_data?: string | null;
  file_url?: string | null;
}

interface Business {
  id: string;
  company_name: string;
  industry: string;
  reg_number: string;
  vat_number: string;
  status: string;
  trust_score: number;
  description: string;
  website: string;
  phone: string;
  address: string;
  submitted_at: string | null;
  verified_at: string | null;
  review_notes: string;
  owner_name: string;
  owner_email: string;
  owner_avatar: string;
  doc_count: number;
  documents: DocItem[] | null;
  user_id?: string;
}

// ─── Constants ─────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  verified: "bg-green-100 text-green-700 border-green-200",
  reviewing: "bg-blue-100 text-blue-700 border-blue-200",
  pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
  unregistered: "bg-gray-100 text-gray-600",
};

const DOC_STATUS_COLORS: Record<string, string> = {
  uploaded: "bg-blue-50 text-blue-700",
  reviewing: "bg-yellow-50 text-yellow-700",
  approved: "bg-green-50 text-green-700",
  rejected: "bg-red-50 text-red-700",
};

const TRUST_BAND = (score: number) =>
  score >= 80
    ? { label: "High", icon: TrendingUp, color: "text-green-600" }
    : score >= 40
    ? { label: "Medium", icon: Minus, color: "text-yellow-600" }
    : { label: "Low", icon: TrendingDown, color: "text-red-500" };

// ─── Helpers ───────────────────────────────────────────────────────────────

function GradeStars({ grade }: { grade: number }) {
  const filled = Math.round((grade / 100) * 5);
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${i < filled ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`}
        />
      ))}
    </div>
  );
}

function UrgencyBadge({
  submittedAt,
  status,
}: {
  submittedAt: string | null;
  status: string;
}) {
  if (!submittedAt || status !== "pending") return null;
  const days = differenceInDays(new Date(), new Date(submittedAt));
  if (days < 3) return null;
  return (
    <Badge className="inline-flex items-center self-start bg-red-100 text-red-700 border-red-200 gap-1 text-[11px] px-2 py-0.5 h-5 font-semibold leading-none whitespace-nowrap">
      <AlertTriangle className="h-3 w-3" />
      {days}d waiting
    </Badge>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────

export function VettingDesk() {
  const { toast } = useToast();

  // ── Server data ──
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Filters ──
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [industryFilter, setIndustryFilter] = useState("all");
  const [docsFilter, setDocsFilter] = useState("all"); // all | has-docs | no-docs
  const [trustFilter, setTrustFilter] = useState("all"); // all | high | medium | low
  const [sortBy, setSortBy] = useState("newest");

  // ── Review dialog ──
  const [selectedBiz, setSelectedBiz] = useState<Business | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [trustScore, setTrustScore] = useState(50);
  const [userScore, setUserScore] = useState(50);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<DocItem | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [docUpdating, setDocUpdating] = useState<string | null>(null);
  const [docGrades, setDocGrades] = useState<Record<string, number>>({});
  const [docNotes, setDocNotes] = useState<Record<string, string>>({});

  // ─── Fetch ───────────────────────────────────────────────────────────────

  const fetchBusinesses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/businesses");
      if (res.ok) {
        const data = await res.json();
        setBusinesses(data.businesses || []);
      }
    } catch {
      toast({ title: "Failed to load businesses", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchBusinesses();
  }, [fetchBusinesses]);

  const fetchBusinessDetails = async (id: string): Promise<Business | null> => {
    const res = await fetch(`/api/admin/businesses/${id}`);
    if (res.ok) {
      const data = await res.json();
      return data.business as Business;
    }
    return null;
  };

  // ─── Actions ─────────────────────────────────────────────────────────────

  const handleUpdateStatus = async (
    id: string,
    newStatus: string,
    notes?: string,
    score?: number
  ) => {
    setUpdating(id);
    try {
      const res = await fetch(`/api/admin/businesses/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          reviewNotes: notes || "",
          trustScore: score,
        }),
      });
      if (res.ok) {
        toast({
          title: `Business ${newStatus}`,
          description: `Status updated to ${(newStatus || 'pending').toUpperCase()} successfully.`,
        });
        fetchBusinesses();
        if (dialogOpen) setDialogOpen(false);
      } else {
        const data = await res.json();
        toast({ title: "Update failed", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Update failed", variant: "destructive" });
    } finally {
      setUpdating(null);
    }
  };

  const handleUpdateUserScore = async (userId: string, score: number) => {
    if (!userId) return;
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vettingScore: score }),
    });
    if (res.ok) {
      toast({
        title: "User Score Updated",
        description: `Customer verification score set to ${score}.`,
      });
    }
  };

  const handleReviewDoc = async (
    docId: string,
    status: string,
    grade: number,
    notes: string
  ) => {
    setDocUpdating(docId);
    try {
      const res = await fetch(`/api/admin/documents/${docId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, grade, reviewNotes: notes }),
      });
      if (res.ok) {
        toast({ title: "Document Updated", description: `Status set to ${status}.` });
        if (selectedBiz) {
          const fresh = await fetchBusinessDetails(selectedBiz.id);
          if (fresh) setSelectedBiz(fresh);
        }
      } else {
        toast({ title: "Failed to update document", variant: "destructive" });
      }
    } catch {
      toast({ title: "Failed to update document", variant: "destructive" });
    } finally {
      setDocUpdating(null);
    }
  };

  const openReview = async (biz: Business) => {
    setUpdating(biz.id);
    const fresh = await fetchBusinessDetails(biz.id);
    setUpdating(null);
    const target = fresh || biz;
    setSelectedBiz(target);
    setReviewNotes(target.review_notes || "");
    setTrustScore(target.trust_score || 50);
    setUserScore(50);
    const grades: Record<string, number> = {};
    const notes: Record<string, string> = {};
    (target.documents || []).forEach((d) => {
      grades[d.id] = d.grade ?? 0;
      notes[d.id] = d.review_notes ?? "";
    });
    setDocGrades(grades);
    setDocNotes(notes);
    setDialogOpen(true);
  };

  // ─── Derived filter data ──────────────────────────────────────────────────

  const industries = useMemo(() => {
    const set = new Set(businesses.map((b) => b.industry).filter(Boolean));
    return Array.from(set).sort();
  }, [businesses]);

  const filteredAndSorted = useMemo(() => {
    let list = [...businesses];

    if (statusFilter !== "all") list = list.filter((b) => b.status === statusFilter);

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (b) =>
          b.company_name?.toLowerCase().includes(q) ||
          b.owner_name?.toLowerCase().includes(q) ||
          b.owner_email?.toLowerCase().includes(q) ||
          b.industry?.toLowerCase().includes(q) ||
          b.reg_number?.toLowerCase().includes(q) ||
          b.vat_number?.toLowerCase().includes(q)
      );
    }

    if (industryFilter !== "all") list = list.filter((b) => b.industry === industryFilter);

    if (docsFilter === "has-docs") list = list.filter((b) => (b.doc_count || 0) > 0);
    if (docsFilter === "no-docs") list = list.filter((b) => (b.doc_count || 0) === 0);

    if (trustFilter === "high") list = list.filter((b) => (b.trust_score || 0) >= 80);
    if (trustFilter === "medium")
      list = list.filter((b) => (b.trust_score || 0) >= 40 && (b.trust_score || 0) < 80);
    if (trustFilter === "low") list = list.filter((b) => (b.trust_score || 0) < 40);

    switch (sortBy) {
      case "newest":
        list.sort((a, b) =>
          (b.submitted_at || b.id) > (a.submitted_at || a.id) ? 1 : -1
        );
        break;
      case "oldest":
        list.sort((a, b) =>
          (a.submitted_at || a.id) > (b.submitted_at || b.id) ? 1 : -1
        );
        break;
      case "trust-high":
        list.sort((a, b) => (b.trust_score || 0) - (a.trust_score || 0));
        break;
      case "trust-low":
        list.sort((a, b) => (a.trust_score || 0) - (b.trust_score || 0));
        break;
      case "most-docs":
        list.sort((a, b) => (b.doc_count || 0) - (a.doc_count || 0));
        break;
      case "az":
        list.sort((a, b) => a.company_name.localeCompare(b.company_name));
        break;
    }

    return list;
  }, [businesses, statusFilter, search, industryFilter, docsFilter, trustFilter, sortBy]);

  const activeFilterCount = [
    statusFilter !== "all",
    search.trim() !== "",
    industryFilter !== "all",
    docsFilter !== "all",
    trustFilter !== "all",
  ].filter(Boolean).length;

  const clearFilters = () => {
    setStatusFilter("all");
    setSearch("");
    setIndustryFilter("all");
    setDocsFilter("all");
    setTrustFilter("all");
    setSortBy("newest");
  };

  // ─── Stats counts ─────────────────────────────────────────────────────────

  const pendingCount = businesses.filter((b) => b.status === "pending").length;
  const reviewingCount = businesses.filter((b) => b.status === "reviewing").length;
  const verifiedCount = businesses.filter((b) => b.status === "verified").length;
  const rejectedCount = businesses.filter((b) => b.status === "rejected").length;
  const urgentCount = businesses.filter(
    (b) =>
      b.status === "pending" &&
      b.submitted_at &&
      differenceInDays(new Date(), new Date(b.submitted_at)) >= 3
  ).length;

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl border border-dashed">
        <Loader2 className="h-8 w-8 text-primary animate-spin mb-2" />
        <p className="text-sm text-gray-500 font-medium">Fetching verification queue...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Stats cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {(
          [
            {
              label: "All",
              value: businesses.length,
              color: "bg-gray-50 border-gray-200",
              text: "text-gray-700",
              filter: "all",
            },
            {
              label: "Pending",
              value: pendingCount,
              color: "bg-yellow-50 border-yellow-200",
              text: "text-yellow-700",
              filter: "pending",
            },
            {
              label: "Reviewing",
              value: reviewingCount,
              color: "bg-blue-50 border-blue-200",
              text: "text-blue-700",
              filter: "reviewing",
            },
            {
              label: "Verified",
              value: verifiedCount,
              color: "bg-green-50 border-green-200",
              text: "text-green-700",
              filter: "verified",
            },
            {
              label: "Rejected",
              value: rejectedCount,
              color: "bg-red-50 border-red-200",
              text: "text-red-700",
              filter: "rejected",
            },
          ] as const
        ).map((stat) => (
          <button
            key={stat.filter}
            onClick={() => setStatusFilter(stat.filter)}
            className={`rounded-xl border p-3 text-left transition-all hover:shadow-sm ${stat.color} ${
              statusFilter === stat.filter ? "ring-2 ring-primary/40 shadow-sm" : ""
            }`}
          >
            <p className="text-2xl font-extrabold text-gray-900">{stat.value}</p>
            <p className={`text-xs font-bold uppercase tracking-wide mt-0.5 ${stat.text}`}>
              {stat.label}
            </p>
            {stat.filter === "pending" && urgentCount > 0 && (
              <p className="text-[10px] text-red-600 font-bold mt-1 flex items-center gap-1">
                <AlertTriangle className="h-2.5 w-2.5" />
                {urgentCount} urgent
              </p>
            )}
          </button>
        ))}
      </div>

      {/* ── Filter bar ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border shadow-sm p-4 space-y-3">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-gray-400" />
            <span className="text-sm font-bold text-gray-700">Filters &amp; Search</span>
            {activeFilterCount > 0 && (
              <Badge className="bg-primary/10 text-primary border-primary/20 font-bold text-xs h-5 px-2">
                {activeFilterCount} active
              </Badge>
            )}
          </div>
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs text-gray-500 hover:text-gray-700 rounded-lg"
              onClick={clearFilters}
            >
              <X className="h-3 w-3" /> Clear all
            </Button>
          )}
        </div>

        {/* Row 1: Search + Sort */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search company, owner, reg/VAT number..."
              className="pl-9 rounded-xl border-gray-200 h-9 text-sm"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4 text-gray-400 shrink-0" />
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="rounded-xl h-9 text-sm border-gray-200 flex-1">
                <SelectValue placeholder="Sort by…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest submitted first</SelectItem>
                <SelectItem value="oldest">Oldest submitted first (urgent)</SelectItem>
                <SelectItem value="trust-high">Trust score: High → Low</SelectItem>
                <SelectItem value="trust-low">Trust score: Low → High</SelectItem>
                <SelectItem value="most-docs">Most documents first</SelectItem>
                <SelectItem value="az">Company name A → Z</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Row 2: Industry + Trust band + Docs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Select value={industryFilter} onValueChange={setIndustryFilter}>
            <SelectTrigger className="rounded-xl h-9 text-sm border-gray-200">
              <SelectValue placeholder="All industries" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Industries</SelectItem>
              {industries.map((ind) => (
                <SelectItem key={ind} value={ind}>
                  {ind}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={trustFilter} onValueChange={setTrustFilter}>
            <SelectTrigger className="rounded-xl h-9 text-sm border-gray-200">
              <SelectValue placeholder="Trust score" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Trust Scores</SelectItem>
              <SelectItem value="high">High (80–100)</SelectItem>
              <SelectItem value="medium">Medium (40–79)</SelectItem>
              <SelectItem value="low">Low (0–39)</SelectItem>
            </SelectContent>
          </Select>

          <Select value={docsFilter} onValueChange={setDocsFilter}>
            <SelectTrigger className="rounded-xl h-9 text-sm border-gray-200">
              <SelectValue placeholder="Documents" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All (with &amp; without docs)</SelectItem>
              <SelectItem value="has-docs">Has uploaded documents</SelectItem>
              <SelectItem value="no-docs">No documents uploaded</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Row 3: Status pills */}
        <div className="flex gap-2 flex-wrap items-center pt-1 border-t">
          <Filter className="h-3.5 w-3.5 text-gray-400 mt-0.5" />
          {(
            ["all", "pending", "reviewing", "verified", "rejected", "unregistered"] as const
          ).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-full px-3 py-1 text-xs font-bold transition-all border ${
                statusFilter === s
                  ? s === "all"
                    ? "bg-gray-900 text-white border-gray-900"
                    : `${STATUS_COLORS[s]} border-current ring-2 ring-offset-1 ring-current/30`
                  : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
              }`}
            >
              {s === "all" ? "All Statuses" : (s || '').charAt(0).toUpperCase() + (s || '').slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* ── Results summary ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 font-medium">
          <span className="font-bold text-gray-900">{filteredAndSorted.length}</span>{" "}
          application{filteredAndSorted.length !== 1 && "s"}
          {activeFilterCount > 0 ? " matching filters" : " total"}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 rounded-xl h-8 text-xs"
          onClick={fetchBusinesses}
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border overflow-x-auto">
        <Table>
          <TableHeader className="bg-gray-50/80">
            <TableRow>
              <TableHead className="font-bold text-gray-600 w-3 pl-4" />
              <TableHead className="font-bold text-gray-600">Business</TableHead>
              <TableHead className="font-bold text-gray-600">Owner</TableHead>
              <TableHead className="font-bold text-gray-600">Status</TableHead>
              <TableHead className="font-bold text-gray-600">Trust Score</TableHead>
              <TableHead className="font-bold text-gray-600">Docs</TableHead>
              <TableHead className="font-bold text-gray-600">Submitted</TableHead>
              <TableHead className="text-right font-bold text-gray-600 pr-4">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSorted.map((item) => {
              const band = TRUST_BAND(item.trust_score || 0);
              const BandIcon = band.icon;
              const isUrgent =
                item.status === "pending" &&
                !!item.submitted_at &&
                differenceInDays(new Date(), new Date(item.submitted_at)) >= 3;

              return (
                <TableRow
                  key={item.id}
                  className={`hover:bg-gray-50/60 transition-colors ${
                    isUrgent ? "bg-red-50/30" : ""
                  }`}
                >
                  {/* Priority bar */}
                  <TableCell className="pl-4 pr-1 w-2">
                    {isUrgent && (
                      <div
                        className="w-1.5 h-8 bg-red-500 rounded-full mx-auto"
                        title="Urgent — pending > 3 days"
                      />
                    )}
                    {!isUrgent && item.status === "reviewing" && (
                      <div className="w-1.5 h-8 bg-blue-400 rounded-full mx-auto" />
                    )}
                  </TableCell>

                  {/* Business */}
                  <TableCell>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">{item.company_name}</span>
                        {isUrgent && (
                          <Badge className="bg-red-100 text-red-600 border-red-200 text-[10px] px-1.5 h-4 font-bold">
                            Urgent
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 font-medium">
                        {item.industry || "General B2B"}
                      </span>
                      {(item.reg_number || item.vat_number) && (
                        <span className="text-[10px] text-gray-300 font-mono mt-0.5">
                          {item.reg_number ? `Reg: ${item.reg_number}` : ""}
                          {item.reg_number && item.vat_number ? " · " : ""}
                          {item.vat_number ? `VAT: ${item.vat_number}` : ""}
                        </span>
                      )}
                    </div>
                  </TableCell>

                  {/* Owner */}
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-gray-800">{item.owner_name}</span>
                      <span className="text-xs text-gray-400">{item.owner_email}</span>
                    </div>
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    <Badge
                      className={`${STATUS_COLORS[item.status] || STATUS_COLORS.unregistered} font-bold`}
                    >
                      {item.status === "pending" && <Clock className="h-3 w-3 mr-1" />}
                      {item.status === "verified" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                      {item.status === "rejected" && <XCircle className="h-3 w-3 mr-1" />}
                      {item.status === "reviewing" && <Eye className="h-3 w-3 mr-1" />}
                      {(item.status || 'pending').charAt(0).toUpperCase() + (item.status || 'pending').slice(1)}
                    </Badge>
                  </TableCell>

                  {/* Trust Score */}
                  <TableCell>
                    <div className="flex items-center gap-2 min-w-[80px]">
                      <Progress value={item.trust_score || 0} className="w-14 h-1.5" />
                      <div className="flex items-center gap-0.5">
                        <BandIcon className={`h-3 w-3 ${band.color}`} />
                        <span className="text-sm font-bold text-gray-700">
                          {item.trust_score || 0}
                        </span>
                      </div>
                    </div>
                  </TableCell>

                  {/* Docs */}
                  <TableCell>
                    <div
                      className={`flex items-center gap-1 ${
                        item.doc_count === 0 ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      <FileCheck className="h-4 w-4" />
                      <span className="text-sm font-bold">{item.doc_count || 0}</span>
                    </div>
                  </TableCell>

                  {/* Submitted */}
                  <TableCell>
                    <div className="flex flex-col items-start gap-1 leading-none">
                      <span className="text-xs text-gray-500 font-medium leading-tight">
                        {item.submitted_at
                          ? formatDistanceToNow(new Date(item.submitted_at), {
                              addSuffix: true,
                            })
                          : "Not submitted"}
                      </span>
                      <UrgencyBadge
                        submittedAt={item.submitted_at}
                        status={item.status}
                      />
                    </div>
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-right pr-4">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg gap-1 font-bold h-8 px-2.5"
                        onClick={() => openReview(item)}
                        disabled={updating === item.id}
                      >
                        {updating === item.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Eye className="h-3.5 w-3.5" />
                        )}
                        <span className="hidden sm:inline">Review</span>
                      </Button>
                      {item.status !== "reviewing" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg h-8 w-8 p-0"
                          title="Set to Reviewing"
                          onClick={() => handleUpdateStatus(item.id, "reviewing")}
                          disabled={updating === item.id}
                        >
                          <Info className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {item.status !== "verified" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg h-8 w-8 p-0"
                          title="Approve & Verify"
                          onClick={() => handleUpdateStatus(item.id, "verified")}
                          disabled={updating === item.id}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {item.status !== "rejected" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg h-8 w-8 p-0"
                          title="Reject"
                          onClick={() => handleUpdateStatus(item.id, "rejected")}
                          disabled={updating === item.id}
                        >
                          <XCircle className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}

            {filteredAndSorted.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="h-40 text-center">
                  <div className="flex flex-col items-center gap-3 text-gray-400">
                    <AlertCircle className="h-10 w-10 opacity-40" />
                    <div>
                      <p className="font-bold text-gray-600">No businesses match your filters</p>
                      <p className="text-sm text-gray-400 mt-1">
                        Try adjusting your search or filter criteria
                      </p>
                    </div>
                    {activeFilterCount > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl gap-1"
                        onClick={clearFilters}
                      >
                        <X className="h-3.5 w-3.5" /> Clear all filters
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Full Review Dialog ─────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Review: {selectedBiz?.company_name}
              {selectedBiz && (
                <Badge className={`${STATUS_COLORS[selectedBiz.status]} text-xs ml-2`}>
                  {(selectedBiz?.status || 'pending').toUpperCase()}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Review business details, documents, and scoring before taking status actions.
            </DialogDescription>
          </DialogHeader>

          {selectedBiz && (
            <Tabs defaultValue="details" className="space-y-4">
              <TabsList className="bg-gray-100 rounded-xl p-1">
                <TabsTrigger value="details" className="rounded-lg font-bold">
                  Business Details
                </TabsTrigger>
                <TabsTrigger value="documents" className="rounded-lg font-bold">
                  Documents ({selectedBiz.doc_count || 0})
                </TabsTrigger>
                <TabsTrigger value="scoring" className="rounded-lg font-bold">
                  Scoring
                </TabsTrigger>
              </TabsList>

              {/* Details Tab */}
              <TabsContent value="details" className="space-y-4 mt-0">
                <div className="grid grid-cols-2 gap-3 bg-gray-50 p-4 rounded-xl">
                  {(
                    [
                      { label: "Industry", value: selectedBiz.industry || "N/A" },
                      { label: "Reg. Number", value: selectedBiz.reg_number || "N/A", mono: true },
                      { label: "VAT Number", value: selectedBiz.vat_number || "N/A", mono: true },
                      { label: "Phone", value: selectedBiz.phone || "N/A" },
                    ] as { label: string; value: string; mono?: boolean }[]
                  ).map(({ label, value, mono }) => (
                    <div key={label}>
                      <p className="text-xs font-bold text-gray-400 uppercase">{label}</p>
                      <p className={`font-bold text-gray-900 ${mono ? "font-mono" : ""}`}>{value}</p>
                    </div>
                  ))}
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase">Owner</p>
                    <p className="font-bold text-gray-900">{selectedBiz.owner_name}</p>
                    <p className="text-xs text-gray-500">{selectedBiz.owner_email}</p>
                  </div>
                  {selectedBiz.website && (
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase">Website</p>
                      <a
                        href={selectedBiz.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-primary text-sm hover:underline"
                      >
                        {selectedBiz.website}
                      </a>
                    </div>
                  )}
                  {selectedBiz.address && (
                    <div className="col-span-2">
                      <p className="text-xs font-bold text-gray-400 uppercase">Address</p>
                      <p className="font-medium text-gray-900">{selectedBiz.address}</p>
                    </div>
                  )}
                  {selectedBiz.submitted_at && (
                    <div className="col-span-2">
                      <p className="text-xs font-bold text-gray-400 uppercase">Submitted</p>
                      <div className="font-medium text-gray-900 flex items-center gap-2 flex-wrap">
                        <span>
                          {formatDistanceToNow(new Date(selectedBiz.submitted_at), {
                            addSuffix: true,
                          })}
                        </span>
                        {selectedBiz.status === "pending" &&
                          differenceInDays(
                            new Date(),
                            new Date(selectedBiz.submitted_at)
                          ) >= 3 && (
                            <Badge className="bg-red-100 text-red-600 border-red-200 text-[10px]">
                              <AlertTriangle className="h-2.5 w-2.5 mr-1" />
                              Urgent —{" "}
                              {differenceInDays(
                                new Date(),
                                new Date(selectedBiz.submitted_at)
                              )}{" "}
                              days waiting
                            </Badge>
                          )}
                      </div>
                    </div>
                  )}
                </div>

                {selectedBiz.description && (
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <p className="text-xs font-bold text-gray-400 uppercase mb-2">
                      Business Description
                    </p>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {selectedBiz.description}
                    </p>
                  </div>
                )}

                {selectedBiz.review_notes && (
                  <div className="bg-yellow-50 border border-yellow-100 p-4 rounded-xl">
                    <p className="text-xs font-bold text-yellow-600 uppercase mb-1">
                      Previous Review Notes
                    </p>
                    <p className="text-sm text-gray-700">{selectedBiz.review_notes}</p>
                  </div>
                )}

                <div>
                  <Label className="font-bold">New Review Notes</Label>
                  <Textarea
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Add detailed review notes here..."
                    className="mt-1 rounded-xl min-h-[80px]"
                  />
                </div>
              </TabsContent>

              {/* Documents Tab */}
              <TabsContent value="documents" className="space-y-3 mt-0">
                {!selectedBiz.documents || selectedBiz.documents.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-xl">
                    <FileText className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p className="font-medium">No documents uploaded yet.</p>
                  </div>
                ) : (
                  selectedBiz.documents.map((doc) => (
                    <Card key={doc.id} className="border shadow-none">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <FileCheck className="h-5 w-5 text-primary shrink-0" />
                            <div>
                              <p className="font-bold text-gray-900 text-sm">{doc.name}</p>
                              <p className="text-xs text-gray-400">
                                {doc.doc_type}
                                {doc.uploaded_at
                                  ? ` · Uploaded ${formatDistanceToNow(new Date(doc.uploaded_at), { addSuffix: true })}`
                                  : " · Not yet uploaded"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {doc.file_data && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs text-blue-600 hover:bg-blue-50 rounded-lg font-bold gap-1"
                                onClick={() => setPreviewDoc(doc)}
                              >
                                <Eye className="h-3.5 w-3.5" /> View
                              </Button>
                            )}
                            <Badge
                              className={
                                DOC_STATUS_COLORS[doc.status] || "bg-gray-100 text-gray-600"
                              }
                            >
                              {doc.status}
                            </Badge>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-bold text-gray-500 uppercase">
                              Grade: {docGrades[doc.id] ?? (doc.grade || 0)}/100
                            </Label>
                            <GradeStars grade={docGrades[doc.id] ?? (doc.grade || 0)} />
                          </div>
                          <Slider
                            value={[docGrades[doc.id] ?? (doc.grade || 0)]}
                            onValueChange={([v]: number[]) =>
                              setDocGrades((prev) => ({ ...prev, [doc.id]: v }))
                            }
                            max={100}
                            step={5}
                          />
                        </div>

                        <div>
                          <Label className="text-xs font-bold text-gray-500 uppercase">
                            Document Notes
                          </Label>
                          <Input
                            value={docNotes[doc.id] ?? (doc.review_notes || "")}
                            onChange={(e) =>
                              setDocNotes((prev) => ({ ...prev, [doc.id]: e.target.value }))
                            }
                            placeholder="Notes about this document..."
                            className="rounded-xl h-9 text-sm mt-1"
                          />
                        </div>

                        <div className="flex gap-2 pt-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-200 hover:bg-red-50 rounded-lg font-bold text-xs"
                            disabled={docUpdating === doc.id}
                            onClick={() =>
                              handleReviewDoc(
                                doc.id,
                                "rejected",
                                docGrades[doc.id] ?? 0,
                                docNotes[doc.id] ?? ""
                              )
                            }
                          >
                            {docUpdating === doc.id ? (
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            ) : (
                              <XCircle className="h-3 w-3 mr-1" />
                            )}
                            Reject
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-blue-600 border-blue-200 hover:bg-blue-50 rounded-lg font-bold text-xs"
                            disabled={docUpdating === doc.id}
                            onClick={() =>
                              handleReviewDoc(
                                doc.id,
                                "reviewing",
                                docGrades[doc.id] ?? 0,
                                docNotes[doc.id] ?? ""
                              )
                            }
                          >
                            <Info className="h-3 w-3 mr-1" /> In Review
                          </Button>
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-xs"
                            disabled={docUpdating === doc.id}
                            onClick={() =>
                              handleReviewDoc(
                                doc.id,
                                "approved",
                                docGrades[doc.id] ?? 0,
                                docNotes[doc.id] ?? ""
                              )
                            }
                          >
                            {docUpdating === doc.id ? (
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            ) : (
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                            )}
                            Approve
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              {/* Scoring Tab */}
              <TabsContent value="scoring" className="space-y-5 mt-0">
                <Card className="border shadow-none bg-gray-50">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-primary" />
                      <p className="font-bold text-gray-900">Business Trust Score</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <Label className="text-xs font-bold text-gray-500 uppercase">
                          Score: {trustScore}/100
                        </Label>
                        <div className="flex gap-1 flex-wrap">
                          {(
                            [
                              ["verified", 95],
                              ["reviewing", 65],
                              ["pending", 35],
                              ["rejected", 10],
                            ] as [string, number][]
                          ).map(([s, val]) => (
                            <Button
                              key={s}
                              size="sm"
                              variant="outline"
                              className={`rounded-lg text-xs font-bold h-7 px-2 ${STATUS_COLORS[s]}`}
                              onClick={() => setTrustScore(val)}
                            >
                              {(s || '').charAt(0).toUpperCase() + (s || '').slice(1)}
                            </Button>
                          ))}
                        </div>
                      </div>
                      <Slider
                        value={[trustScore]}
                        onValueChange={([v]: number[]) => setTrustScore(v)}
                        max={100}
                        step={1}
                      />
                      <Progress value={trustScore} className="h-2" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border shadow-none bg-gray-50">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-center gap-2">
                      <User2 className="h-4 w-4 text-blue-600" />
                      <p className="font-bold text-gray-900">
                        Customer / User Verification Score
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-gray-500 uppercase">
                        Score: {userScore}/100
                      </Label>
                      <Slider
                        value={[userScore]}
                        onValueChange={([v]: number[]) => setUserScore(v)}
                        max={100}
                        step={1}
                      />
                      <Progress value={userScore} className="h-2" />
                    </div>
                    <Button
                      variant="outline"
                      className="rounded-xl font-bold h-9 text-sm border-blue-200 text-blue-600 hover:bg-blue-50"
                      onClick={() =>
                        selectedBiz.user_id &&
                        handleUpdateUserScore(selectedBiz.user_id, userScore)
                      }
                    >
                      Save Customer Score
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}

          {/* Document Preview Sub-Dialog */}
          {previewDoc && (
            <Dialog
              open={!!previewDoc}
              onOpenChange={(open) => {
                if (!open) setPreviewDoc(null);
              }}
            >
              <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
                <DialogHeader className="px-6 pt-5 pb-4 border-b shrink-0">
                  <DialogTitle className="flex items-center justify-between">
                    <span className="truncate pr-4">{previewDoc.name}</span>
                    {previewDoc.file_data && (
                      <a
                        href={previewDoc.file_data}
                        download={previewDoc.file_url || previewDoc.name}
                        className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline shrink-0"
                      >
                        <Download className="h-3.5 w-3.5" /> Download
                      </a>
                    )}
                  </DialogTitle>
                  <DialogDescription className="sr-only">
                    Preview and download the selected business verification document.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex-1 overflow-auto p-4 bg-gray-50">
                  {previewDoc.file_data?.startsWith("data:image/") ? (
                    <img
                      src={previewDoc.file_data}
                      alt={previewDoc.name}
                      className="max-w-full mx-auto rounded-xl shadow-sm object-contain"
                    />
                  ) : previewDoc.file_data?.startsWith("data:application/pdf") ? (
                    <iframe
                      src={previewDoc.file_data}
                      title={previewDoc.name}
                      className="w-full rounded-xl border-0"
                      style={{ minHeight: "70vh" }}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-2">
                      <FileText className="h-12 w-12 opacity-30" />
                      <p className="font-medium">Preview not available</p>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          )}

          <DialogFooter className="gap-2 pt-4 border-t mt-2 flex-wrap">
            <Button
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50 rounded-xl font-bold"
              onClick={() =>
                selectedBiz &&
                handleUpdateStatus(selectedBiz.id, "rejected", reviewNotes, trustScore)
              }
              disabled={!!updating}
            >
              <XCircle className="h-4 w-4 mr-2" /> Reject
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold"
              onClick={() =>
                selectedBiz &&
                handleUpdateStatus(selectedBiz.id, "reviewing", reviewNotes, trustScore)
              }
              disabled={!!updating}
            >
              <Info className="h-4 w-4 mr-2" /> Set to Reviewing
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold"
              onClick={() =>
                selectedBiz &&
                handleUpdateStatus(selectedBiz.id, "verified", reviewNotes, trustScore)
              }
              disabled={!!updating}
            >
              {updating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Verify &amp; Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
