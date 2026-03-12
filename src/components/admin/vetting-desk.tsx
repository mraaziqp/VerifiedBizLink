"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FileText, CheckCircle2, XCircle, Clock, Info, Loader2, Eye,
  FileCheck, AlertCircle, RefreshCw, Star, User2, Building2,
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { formatDistanceToNow } from "date-fns";

interface DocItem {
  id: string;
  name: string;
  doc_type: string;
  status: string;
  grade: number;
  review_notes: string;
  reviewed_at: string | null;
  uploaded_at: string;
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

const statusColors: Record<string, string> = {
  verified: "bg-green-100 text-green-700 hover:bg-green-100 border-green-200",
  reviewing: "bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200",
  pending: "bg-yellow-100 text-yellow-700 hover:bg-yellow-100 border-yellow-200",
  rejected: "bg-red-100 text-red-700 hover:bg-red-100 border-red-200",
  unregistered: "bg-gray-100 text-gray-700 hover:bg-gray-100",
};

const docStatusColors: Record<string, string> = {
  uploaded: "bg-blue-50 text-blue-700",
  reviewing: "bg-yellow-50 text-yellow-700",
  approved: "bg-green-50 text-green-700",
  rejected: "bg-red-50 text-red-700",
};

function GradeStars({ grade }: { grade: number }) {
  const filled = Math.round((grade / 100) * 5);
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`h-3.5 w-3.5 ${i < filled ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`} />
      ))}
    </div>
  );
}

export function VettingDesk() {
  const { toast } = useToast();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedBiz, setSelectedBiz] = useState<Business | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [trustScore, setTrustScore] = useState(50);
  const [userScore, setUserScore] = useState(50);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [docUpdating, setDocUpdating] = useState<string | null>(null);
  const [docGrades, setDocGrades] = useState<Record<string, number>>({});
  const [docNotes, setDocNotes] = useState<Record<string, string>>({});

  const fetchBusinesses = useCallback(async () => {
    setLoading(true);
    try {
      const url = `/api/admin/businesses${statusFilter !== "all" ? `?status=${statusFilter}` : ""}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setBusinesses(data.businesses || []);
      }
    } catch (err) {
      console.error("Failed to fetch businesses:", err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchBusinesses(); }, [fetchBusinesses]);

  const fetchBusinessDetails = async (id: string) => {
    const res = await fetch(`/api/admin/businesses/${id}`);
    if (res.ok) {
      const data = await res.json();
      return data.business as Business;
    }
    return null;
  };

  const handleUpdateStatus = async (id: string, newStatus: string, notes?: string, score?: number) => {
    setUpdating(id);
    try {
      const res = await fetch(`/api/admin/businesses/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, reviewNotes: notes || "", trustScore: score }),
      });
      if (res.ok) {
        toast({ title: `Business ${newStatus}`, description: `Status updated to ${newStatus.toUpperCase()} successfully.` });
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
      toast({ title: "User Score Updated", description: `Customer verification score set to ${score}.` });
    }
  };

  const handleReviewDoc = async (docId: string, status: string, grade: number, notes: string) => {
    setDocUpdating(docId);
    try {
      const res = await fetch(`/api/admin/documents/${docId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, grade, reviewNotes: notes }),
      });
      if (res.ok) {
        toast({ title: "Document Updated", description: `Document status set to ${status}.` });
        // refresh documents in selected business
        if (selectedBiz) {
          const fresh = await fetchBusinessDetails(selectedBiz.id);
          if (fresh) {
            setSelectedBiz(fresh);
          }
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
    // Initialize doc grades/notes from fresh data
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

  const pendingCount = businesses.filter((b) => b.status === "pending").length;
  const reviewingCount = businesses.filter((b) => b.status === "reviewing").length;
  const verifiedCount = businesses.filter((b) => b.status === "verified").length;

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
      {/* Header & Stats */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Vetting Desk</h2>
          <p className="text-gray-500 font-medium text-sm">{businesses.length} total business applications</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <Badge className="bg-yellow-100 text-yellow-700 px-3 py-1 font-bold">{pendingCount} New</Badge>
          <Badge className="bg-blue-100 text-blue-700 px-3 py-1 font-bold">{reviewingCount} Reviewing</Badge>
          <Badge variant="outline" className="px-3 py-1 font-bold text-green-700 border-green-200">{verifiedCount} Verified</Badge>
          <Button variant="outline" size="sm" className="gap-2 rounded-xl" onClick={fetchBusinesses}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Status Filter */}
      <div className="flex gap-2 flex-wrap">
        {["all","pending","reviewing","verified","rejected"].map((s) => (
          <Button key={s} variant={statusFilter === s ? "default" : "outline"} size="sm"
            className={`rounded-xl capitalize font-bold ${statusFilter === s ? "bg-gray-900 text-white" : ""}`}
            onClick={() => setStatusFilter(s)}>
            {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
          </Button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border overflow-x-auto">
        <Table>
          <TableHeader className="bg-gray-50/50">
            <TableRow>
              <TableHead className="font-bold">Business</TableHead>
              <TableHead className="font-bold">Owner</TableHead>
              <TableHead className="font-bold">Status</TableHead>
              <TableHead className="font-bold">Trust Score</TableHead>
              <TableHead className="font-bold">Docs</TableHead>
              <TableHead className="font-bold">Submitted</TableHead>
              <TableHead className="text-right font-bold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {businesses.map((item) => (
              <TableRow key={item.id} className="hover:bg-gray-50/50 transition-colors">
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-bold text-gray-900">{item.company_name}</span>
                    <span className="text-xs text-gray-500">{item.industry || "General B2B"}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-gray-800">{item.owner_name}</span>
                    <span className="text-xs text-gray-500">{item.owner_email}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={statusColors[item.status] || statusColors.unregistered}>
                    <Clock className="h-3 w-3 mr-1" />
                    {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Progress value={item.trust_score || 0} className="w-16 h-1.5" />
                    <span className="text-sm font-bold text-gray-700">{item.trust_score || 0}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <FileCheck className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-bold text-gray-700">{item.doc_count || 0}</span>
                  </div>
                </TableCell>
                <TableCell className="text-gray-600 font-medium text-sm">
                  {item.submitted_at ? formatDistanceToNow(new Date(item.submitted_at), { addSuffix: true }) : "Not submitted"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg gap-1 font-bold"
                      onClick={() => openReview(item)} disabled={updating === item.id}>
                      {updating === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                      Review
                    </Button>
                    {item.status !== "rejected" && (
                      <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg"
                        onClick={() => handleUpdateStatus(item.id, "rejected")} disabled={updating === item.id}>
                        <XCircle className="h-4 w-4" />
                      </Button>
                    )}
                    {item.status !== "verified" && (
                      <Button variant="ghost" size="sm" className="text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg"
                        onClick={() => handleUpdateStatus(item.id, "verified")} disabled={updating === item.id}>
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {businesses.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <AlertCircle className="h-8 w-8" />
                    <span className="font-medium">No businesses in this queue.</span>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Full Review Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Review: {selectedBiz?.company_name}
            </DialogTitle>
          </DialogHeader>

          {selectedBiz && (
            <Tabs defaultValue="details" className="space-y-4">
              <TabsList className="bg-gray-100 rounded-xl p-1">
                <TabsTrigger value="details" className="rounded-lg font-bold">Business Details</TabsTrigger>
                <TabsTrigger value="documents" className="rounded-lg font-bold">
                  Documents ({selectedBiz.doc_count || 0})
                </TabsTrigger>
                <TabsTrigger value="scoring" className="rounded-lg font-bold">Scoring</TabsTrigger>
              </TabsList>

              {/* Tab 1: Detail */}
              <TabsContent value="details" className="space-y-4 mt-0">
                <div className="grid grid-cols-2 gap-3 bg-gray-50 p-4 rounded-xl">
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase">Industry</p>
                    <p className="font-bold text-gray-900">{selectedBiz.industry || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase">Reg. Number</p>
                    <p className="font-mono font-bold text-gray-900">{selectedBiz.reg_number || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase">VAT Number</p>
                    <p className="font-mono font-bold text-gray-900">{selectedBiz.vat_number || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase">Phone</p>
                    <p className="font-bold text-gray-900">{selectedBiz.phone || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase">Owner</p>
                    <p className="font-bold text-gray-900">{selectedBiz.owner_name}</p>
                    <p className="text-xs text-gray-500">{selectedBiz.owner_email}</p>
                  </div>
                  {selectedBiz.website && (
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase">Website</p>
                      <p className="font-bold text-primary text-sm">{selectedBiz.website}</p>
                    </div>
                  )}
                  {selectedBiz.address && (
                    <div className="col-span-2">
                      <p className="text-xs font-bold text-gray-400 uppercase">Address</p>
                      <p className="font-medium text-gray-900">{selectedBiz.address}</p>
                    </div>
                  )}
                  <div className="col-span-2">
                    <p className="text-xs font-bold text-gray-400 uppercase">Current Status</p>
                    <Badge className={statusColors[selectedBiz.status]}>{selectedBiz.status.toUpperCase()}</Badge>
                  </div>
                </div>

                {selectedBiz.description && (
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <p className="text-xs font-bold text-gray-400 uppercase mb-1">Business Description</p>
                    <p className="text-sm text-gray-700">{selectedBiz.description}</p>
                  </div>
                )}

                <div>
                  <Label className="font-bold">Review Notes</Label>
                  <Textarea value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Add detailed review notes here..." className="mt-1 rounded-xl min-h-[80px]" />
                </div>
              </TabsContent>

              {/* Tab 2: Documents */}
              <TabsContent value="documents" className="space-y-3 mt-0">
                {(!selectedBiz.documents || selectedBiz.documents.length === 0) ? (
                  <div className="text-center py-10 text-gray-400">
                    <FileText className="h-10 w-10 mx-auto mb-2 opacity-40" />
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
                              <p className="text-xs text-gray-400">{doc.doc_type} · Uploaded {formatDistanceToNow(new Date(doc.uploaded_at), { addSuffix: true })}</p>
                            </div>
                          </div>
                          <Badge className={docStatusColors[doc.status] || "bg-gray-100 text-gray-600"}>
                            {doc.status}
                          </Badge>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-bold text-gray-500 uppercase">Document Grade: {docGrades[doc.id] ?? (doc.grade || 0)}/100</Label>
                            <GradeStars grade={docGrades[doc.id] ?? (doc.grade || 0)} />
                          </div>
                          <Slider
                            value={[docGrades[doc.id] ?? (doc.grade || 0)]}
                            onValueChange={([v]: number[]) => setDocGrades((prev) => ({ ...prev, [doc.id]: v }))}
                            max={100} step={5} className="w-full"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs font-bold text-gray-500 uppercase">Document Notes</Label>
                          <Input
                            value={docNotes[doc.id] ?? (doc.review_notes || "")}
                            onChange={(e) => setDocNotes((prev) => ({ ...prev, [doc.id]: e.target.value }))}
                            placeholder="Notes about this document..."
                            className="rounded-xl h-9 text-sm"
                          />
                        </div>

                        <div className="flex gap-2 pt-1">
                          <Button size="sm" variant="outline"
                            className="text-red-600 border-red-200 hover:bg-red-50 rounded-lg font-bold text-xs"
                            disabled={docUpdating === doc.id}
                            onClick={() => handleReviewDoc(doc.id, "rejected", docGrades[doc.id] ?? 0, docNotes[doc.id] ?? "")}>
                            {docUpdating === doc.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                            Reject
                          </Button>
                          <Button size="sm" variant="outline"
                            className="text-blue-600 border-blue-200 hover:bg-blue-50 rounded-lg font-bold text-xs"
                            disabled={docUpdating === doc.id}
                            onClick={() => handleReviewDoc(doc.id, "reviewing", docGrades[doc.id] ?? 0, docNotes[doc.id] ?? "")}>
                            <Info className="h-3 w-3 mr-1" />
                            Reviewing
                          </Button>
                          <Button size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-xs"
                            disabled={docUpdating === doc.id}
                            onClick={() => handleReviewDoc(doc.id, "approved", docGrades[doc.id] ?? 0, docNotes[doc.id] ?? "")}>
                            {docUpdating === doc.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
                            Approve
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              {/* Tab 3: Scoring */}
              <TabsContent value="scoring" className="space-y-5 mt-0">
                <Card className="border shadow-none bg-gray-50">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Building2 className="h-4 w-4 text-primary" />
                      <p className="font-bold text-gray-900">Business Trust Score</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold text-gray-500 uppercase">Score: {trustScore}/100</Label>
                        <div className="flex gap-1">
                          {["verified", "reviewing", "pending", "rejected"].map((s) => (
                            <Button key={s} size="sm" variant="outline"
                              className={`rounded-lg text-xs font-bold h-7 px-2 ${statusColors[s]}`}
                              onClick={() => setTrustScore(s === "verified" ? 95 : s === "reviewing" ? 65 : s === "pending" ? 35 : 10)}>
                              {s.charAt(0).toUpperCase() + s.slice(1)}
                            </Button>
                          ))}
                        </div>
                      </div>
                      <Slider value={[trustScore]} onValueChange={([v]: number[]) => setTrustScore(v)} max={100} step={1} className="w-full" />
                      <Progress value={trustScore} className="h-2" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border shadow-none bg-gray-50">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-center gap-2 mb-1">
                      <User2 className="h-4 w-4 text-blue-600" />
                      <p className="font-bold text-gray-900">Customer / User Verification Score</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold text-gray-500 uppercase">Score: {userScore}/100</Label>
                      </div>
                      <Slider value={[userScore]} onValueChange={([v]: number[]) => setUserScore(v)} max={100} step={1} className="w-full" />
                      <Progress value={userScore} className="h-2" />
                    </div>
                    <Button variant="outline"
                      className="rounded-xl font-bold h-9 text-sm border-blue-200 text-blue-600 hover:bg-blue-50"
                      onClick={() => selectedBiz.user_id && handleUpdateUserScore(selectedBiz.user_id, userScore)}>
                      Save Customer Score
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter className="gap-2 pt-2 border-t mt-0 flex-wrap">
            <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 rounded-xl font-bold"
              onClick={() => selectedBiz && handleUpdateStatus(selectedBiz.id, "rejected", reviewNotes, trustScore)}
              disabled={!!updating}>
              <XCircle className="h-4 w-4 mr-2" /> Reject
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold"
              onClick={() => selectedBiz && handleUpdateStatus(selectedBiz.id, "reviewing", reviewNotes, trustScore)}
              disabled={!!updating}>
              <Info className="h-4 w-4 mr-2" /> Set to Reviewing
            </Button>
            <Button className="bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold"
              onClick={() => selectedBiz && handleUpdateStatus(selectedBiz.id, "verified", reviewNotes, trustScore)}
              disabled={!!updating}>
              {updating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Verify & Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
