"use client";

import { compressImage, fetchWithTimeout } from "@/lib/image-compress";
import { SidebarLeft } from "@/components/layout/sidebar-left";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { VerificationCelebration } from "@/components/ui/verification-celebration";
import { TrustScoreInfo } from "@/components/ui/trust-score-info";
import {
  ShieldCheck, FileCheck, Building, AlertCircle,
  Loader2, Upload, PencilLine, Save, Eye, Download, FileText,
} from "lucide-react";

import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/auth-context";
import Link from "next/link";

interface Document {
  id: string;
  name: string;
  status: string;
  doc_type?: string;
  file_data?: string | null;
  file_url?: string | null;
}

interface Business {
  id: string;
  company_name: string;
  industry: string;
  reg_number: string;
  vat_number: string;
  description: string;
  website: string;
  phone: string;
  address: string;
  status: string;
  submitted_at: string | null;
  trust_score?: number;
  review_notes?: string | null;
  documents?: Document[];
  queue?: { ticketNumber: string; position: number; total: number } | null;
}

const REQUIRED_DOCS = [
  { name: "CIPC Registration Certificate", docType: "cipc" },
  { name: "Identity Proof of Directors", docType: "id_proof" },
  { name: "Proof of Bank Account (Bank Letter / Statement)", docType: "bank_proof" },
  { name: "Proof of Operating Address (Letterhead / Lease / Utility Bill)", docType: "business_proof" },
];

export default function VettingPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [business, setBusiness] = useState<Business | null>(null);
  const [businessLoading, setBusinessLoading] = useState(true);
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<Document | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const fileInputRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  const [profileForm, setProfileForm] = useState({
    companyName: "",
    industry: "",
    regNumber: "",
    vatNumber: "",
    description: "",
    website: "",
    phone: "",
    address: "",
  });

  const fetchBusiness = (showCelebrationIfVerified = false) => {
    setBusinessLoading(true);
    fetch("/api/businesses")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.business) {
          setBusiness(data.business);
          setProfileForm({
            companyName: data.business.company_name || "",
            industry: data.business.industry || "",
            regNumber: data.business.reg_number || "",
            vatNumber: data.business.vat_number || "",
            description: data.business.description || "",
            website: data.business.website || "",
            phone: data.business.phone || "",
            address: data.business.address || "",
          });
          if (showCelebrationIfVerified && data.business.status === "verified") {
            const key = `vbl_celebrated_${data.business.id}`;
            if (!sessionStorage.getItem(key)) {
              sessionStorage.setItem(key, "1");
              setShowCelebration(true);
            }
          }
        }
      })
      .finally(() => setBusinessLoading(false));
  };

  useEffect(() => {
    if (!user) { setBusinessLoading(false); return; }
    fetchBusiness(true);
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      const res = await fetch("/api/businesses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: profileForm.companyName,
          industry: profileForm.industry,
          regNumber: profileForm.regNumber,
          vatNumber: profileForm.vatNumber,
          description: profileForm.description,
          website: profileForm.website,
          phone: profileForm.phone,
          address: profileForm.address,
        }),
      });
      if (res.ok) {
        fetchBusiness();
        setShowProfileEditor(false);
        toast({ title: "Profile Saved", description: "Your business information has been updated." });
      } else {
        const d = await res.json();
        toast({ title: "Error", description: d.error || "Could not save profile.", variant: "destructive" });
      }
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleStartVetting = async () => {
    if (!user) return;
    if (!business) {
      toast({ title: "Complete Your Profile First", description: "Please save your business profile before submitting for vetting.", variant: "destructive" });
      setShowProfileEditor(true);
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/businesses/submit", { method: "POST" });
      if (res.ok) {
        setBusiness((prev) => prev ? { ...prev, status: "pending", submitted_at: new Date().toISOString() } : prev);
        toast({ title: "Vetting Started", description: "Your business is now in the verification queue." });
      } else {
        const d = await res.json();
        toast({ title: "Error", description: d.error || "Could not start vetting.", variant: "destructive" });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUploadDoc = async (docName: string, docType: string, file: File) => {
    if (!user) return;
    setUploadingDoc(docName);
    try {
      // Image docs (photos of certificates) get compressed; PDFs pass through.
      const prepared = await compressImage(file, { maxDim: 2000, quality: 0.85 });
      const formData = new FormData();
      formData.append('file', prepared);
      formData.append('docName', docName);
      formData.append('docType', docType);

      const res = await fetchWithTimeout("/api/businesses/documents", {
        method: "POST",
        body: formData,
      }, 45000);
      if (res.ok) {
        fetchBusiness();
        toast({ title: "Document Uploaded", description: `${docName} has been securely stored.` });
      } else {
        const d = await res.json().catch(() => ({}));
        toast({ title: "Upload Failed", description: d.error || "Could not upload document.", variant: "destructive" });
      }
    } catch (err) {
      const aborted = err instanceof DOMException && err.name === 'AbortError';
      toast({ title: "Upload Failed", description: aborted ? "Upload timed out — please retry." : "Could not upload document.", variant: "destructive" });
    } finally {
      setUploadingDoc(null);
    }
  };

  if (authLoading || businessLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-10 w-10 text-primary animate-spin" />
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    verified: "bg-green-100 text-green-700 border-green-200",
    pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
    reviewing: "bg-blue-100 text-blue-700 border-blue-200",
    rejected: "bg-red-100 text-red-700 border-red-200",
    unregistered: "bg-gray-100 text-gray-600 border-gray-200",
  };

  const uploadedDocNames = (business?.documents || []).map((d) => d.name);
  const uploadedDocsMap = new Map((business?.documents || []).map((d) => [d.name, d]));
  const progressValue =
    business?.status === "verified" ? 100 :
    business?.status === "reviewing" ? 65 :
    business?.status === "pending" ? 35 : 10;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          <aside className="hidden md:block md:col-span-3 sticky top-6">
            <SidebarLeft />
          </aside>

          <main className="md:col-span-9 space-y-6">
            {/* Header */}
            <div className="bg-primary/10 border border-primary/20 rounded-2xl p-5 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="bg-primary p-3 rounded-2xl shadow-lg shadow-primary/20">
                  <ShieldCheck className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Vetting Hub</h1>
                  <p className="text-gray-600 font-medium text-sm">
                    {business ? business.company_name : "No business profile yet"}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  className="rounded-xl font-bold gap-2"
                  onClick={() => setShowProfileEditor((v) => !v)}
                >
                  <PencilLine className="h-4 w-4" />
                  {showProfileEditor ? "Close Editor" : "Edit Profile"}
                </Button>
                <Button
                  onClick={handleStartVetting}
                  disabled={
                    isSubmitting ||
                    business?.status === "pending" ||
                    business?.status === "reviewing"
                  }
                  className="bg-gray-900 text-white hover:bg-black rounded-xl px-6 h-10 font-bold"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {business?.status === "verified" ? "Re-Verify" : "Submit for Vetting"}
                </Button>
              </div>
            </div>

            {/* Inline Business Profile Editor */}
            {showProfileEditor && (
              <Card className="border-none shadow-sm">
                <CardHeader className="border-b pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <Building className="h-5 w-5 text-primary" />
                    Business Profile
                  </CardTitle>
                  <CardDescription>Fill in your company details accurately. This information is reviewed during vetting.</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <form onSubmit={handleSaveProfile} className="space-y-5">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Company Name *</Label>
                        <Input required value={profileForm.companyName}
                          onChange={(e) => setProfileForm((p) => ({ ...p, companyName: e.target.value }))}
                          placeholder="Acme Corp (Pty) Ltd" className="rounded-xl h-11" />
                      </div>
                      <div className="space-y-2">
                        <Label>Industry</Label>
                        <Input value={profileForm.industry}
                          onChange={(e) => setProfileForm((p) => ({ ...p, industry: e.target.value }))}
                          placeholder="Technology & AI" className="rounded-xl h-11" />
                      </div>
                      <div className="space-y-2">
                        <Label>CIPC Registration Number *</Label>
                        <Input required value={profileForm.regNumber}
                          onChange={(e) => setProfileForm((p) => ({ ...p, regNumber: e.target.value }))}
                          placeholder="2024/123456/07" className="rounded-xl h-11 font-mono" />
                      </div>
                      <div className="space-y-2">
                        <Label>VAT Number</Label>
                        <Input value={profileForm.vatNumber}
                          onChange={(e) => setProfileForm((p) => ({ ...p, vatNumber: e.target.value }))}
                          placeholder="4123456789" className="rounded-xl h-11 font-mono" />
                      </div>
                      <div className="space-y-2">
                        <Label>Website</Label>
                        <Input type="url" value={profileForm.website}
                          onChange={(e) => setProfileForm((p) => ({ ...p, website: e.target.value }))}
                          placeholder="https://yourcompany.com" className="rounded-xl h-11" />
                      </div>
                      <div className="space-y-2">
                        <Label>Phone Number</Label>
                        <Input type="tel" value={profileForm.phone}
                          onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))}
                          placeholder="+27 21 555 0100" className="rounded-xl h-11" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Business Description</Label>
                      <Textarea value={profileForm.description}
                        onChange={(e) => setProfileForm((p) => ({ ...p, description: e.target.value }))}
                        placeholder="Describe your company products, services, and target market..."
                        className="rounded-xl min-h-[90px] resize-none" maxLength={500} />
                    </div>
                    <div className="space-y-2">
                      <Label>Business Address</Label>
                      <Input value={profileForm.address}
                        onChange={(e) => setProfileForm((p) => ({ ...p, address: e.target.value }))}
                        placeholder="15 Innovation Drive, Cape Town, 8001" className="rounded-xl h-11" />
                    </div>
                    <div className="flex justify-end">
                      <Button type="submit" disabled={isSavingProfile}
                        className="bg-primary text-gray-900 hover:bg-yellow-400 font-bold px-8 h-11 rounded-xl gap-2">
                        {isSavingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Save Business Profile
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {/* Status Card */}
                <Card className="border-none shadow-sm">
                  <CardHeader>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <CardTitle>Business Status</CardTitle>
                      <Badge className={statusColors[business?.status || "unregistered"]}>
                        {(business?.status || "UNREGISTERED").toUpperCase()}
                      </Badge>
                    </div>
                    <CardDescription>
                      {business?.submitted_at
                        ? `Submitted: ${new Date(business.submitted_at).toLocaleDateString()}`
                        : "Not yet submitted for vetting."}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm font-bold">
                        <span className="text-gray-500">Validation Progress</span>
                        <span className="text-primary">{progressValue}% Complete</span>
                      </div>
                      <Progress value={progressValue} className="h-2.5 bg-gray-100" />
                    </div>
                    {business?.status === "rejected" && business.review_notes && (
                      <div className="p-4 bg-red-50 rounded-2xl border border-dashed border-red-300 space-y-1">
                        <span className="text-xs text-red-700 font-bold uppercase tracking-wider">Why this was rejected</span>
                        <p className="text-sm text-gray-700">{business.review_notes}</p>
                      </div>
                    )}
                    {business?.queue && (
                      <div className="p-4 bg-yellow-50 rounded-2xl border border-dashed border-yellow-300 flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex flex-col gap-1">
                          <span className="text-xs text-yellow-700 font-bold uppercase tracking-wider">Verification Queue</span>
                          <span className="text-sm font-mono font-bold text-gray-900">Ticket {business.queue.ticketNumber}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-primary leading-none">#{business.queue.position}</p>
                          <p className="text-xs text-gray-500 mt-1">of {business.queue.total} in queue</p>
                        </div>
                      </div>
                    )}
                    {business && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-4 bg-gray-50 rounded-2xl border border-dashed flex flex-col gap-1">
                          <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Reg. Number</span>
                          <span className="text-sm font-mono font-bold text-gray-900">{business.reg_number || "—"}</span>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-2xl border border-dashed flex flex-col gap-1">
                          <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">VAT Number</span>
                          <span className="text-sm font-mono font-bold text-gray-900">{business.vat_number || "—"}</span>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-2xl border border-dashed flex flex-col gap-1">
                          <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Documents</span>
                          <span className="text-sm font-bold text-gray-900 flex items-center gap-2">
                            <FileCheck className="h-4 w-4 text-blue-500" />
                            {uploadedDocNames.length} Uploaded
                          </span>
                        </div>
                        {business.trust_score !== undefined && business.trust_score > 0 && (
                          <div className="p-4 bg-gray-50 rounded-2xl border border-dashed flex flex-col gap-1">
                            <span className="text-xs text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1">
                              Trust Score
                              <TrustScoreInfo score={business.trust_score} />
                            </span>
                            <span className="text-sm font-bold text-primary">{business.trust_score}/100</span>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Required Documentation */}
                <Card className="border-none shadow-sm">
                  <CardHeader>
                    <CardTitle>Required Documentation</CardTitle>
                    <CardDescription>Record your documents to speed up verification.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    {REQUIRED_DOCS.map((docItem, i) => {
                      const uploadedDoc = uploadedDocsMap.get(docItem.name);
                      const uploaded = !!uploadedDoc;
                      const uploading = uploadingDoc === docItem.name;
                      const docStatusBadge: Record<string, string> = {
                        approved: "bg-green-100 text-green-700",
                        reviewing: "bg-blue-100 text-blue-700",
                        rejected: "bg-red-100 text-red-700",
                        uploaded: "bg-gray-100 text-gray-600",
                      };
                      return (
                        <div key={i} className="flex items-center justify-between p-5 border-t first:border-t-0 hover:bg-gray-50/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${uploaded ? "bg-green-50" : "bg-gray-100"}`}>
                              <Building className={`h-5 w-5 ${uploaded ? "text-green-600" : "text-gray-500"}`} />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-900">{docItem.name}</p>
                              <p className="text-xs text-gray-500 font-medium">PDF, JPG or PNG · max 5 MB</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {uploaded && uploadedDoc && (
                              <>
                                <Badge className={docStatusBadge[uploadedDoc.status] || "bg-gray-100 text-gray-600"}>
                                  {uploadedDoc.status.charAt(0).toUpperCase() + uploadedDoc.status.slice(1)}
                                </Badge>
                                {uploadedDoc.file_data && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="rounded-xl font-bold gap-1 h-8 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                    onClick={() => setPreviewFile(uploadedDoc)}
                                  >
                                    <Eye className="h-4 w-4" />
                                    View
                                  </Button>
                                )}
                              </>
                            )}
                            {/* Hidden file input tied to ref */}
                            <input
                              ref={(el) => {
                                if (el) fileInputRefs.current.set(docItem.docType, el);
                                else fileInputRefs.current.delete(docItem.docType);
                              }}
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png,.webp"
                              className="sr-only"
                              disabled={uploading}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleUploadDoc(docItem.name, docItem.docType, file);
                                e.target.value = '';
                              }}
                            />
                            <Button
                              variant={uploaded ? "outline" : "outline"}
                              size="sm"
                              className="rounded-xl font-bold gap-2"
                              disabled={uploading}
                              onClick={() => fileInputRefs.current.get(docItem.docType)?.click()}
                            >
                              {uploading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Upload className="h-4 w-4" />
                              )}
                              {uploading ? "Uploading…" : uploaded ? "Re-upload" : "Upload"}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </div>

              {/* Right sidebar */}
              <div className="space-y-6">
                <Card className="bg-gray-900 text-white border-none shadow-lg">
                  <CardContent className="p-6 space-y-4">
                    <h3 className="text-lg font-bold">Why Vetting Matters</h3>
                    <div className="space-y-3">
                      {["Unlock Trade Networks","Higher Placement in Search","Instant Trust with Partners","Exclusive Verified Groups"].map((item, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-gray-300">
                          <div className="mt-1 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                          <span className="font-medium">{item}</span>
                        </div>
                      ))}
                    </div>
                    <Link href="/contact" className="block">
                      <Button className="w-full rounded-xl bg-primary text-gray-900 hover:bg-yellow-400 font-bold shadow-lg shadow-primary/20">
                        Learn More
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
                <div className="p-5 bg-yellow-50 rounded-2xl border border-yellow-200 flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-yellow-700 font-bold text-sm">
                    <AlertCircle className="h-4 w-4" />
                    Help & Support
                  </div>
                  <p className="text-xs text-yellow-600 font-medium">Need help? Our compliance officers are available for business accounts.</p>
                  <Link href="/contact" className="text-xs text-yellow-700 font-bold underline hover:text-yellow-800 transition-colors">
                    Contact Compliance Agent
                  </Link>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* Verification Celebration Modal */}
      {showCelebration && business && (
        <VerificationCelebration
          companyName={business.company_name}
          trustScore={business.trust_score}
          onClose={() => setShowCelebration(false)}
        />
      )}

      {/* Document Preview Dialog */}
      {previewFile && (
        <Dialog open={!!previewFile} onOpenChange={(open) => { if (!open) setPreviewFile(null); }}>
          <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
            <DialogHeader className="px-6 pt-5 pb-4 border-b shrink-0">
              <DialogTitle className="flex items-center justify-between">
                <span className="truncate pr-4">{previewFile.name}</span>
                {previewFile.file_data && (
                  <a
                    href={previewFile.file_data}
                    download={previewFile.file_url || previewFile.name}
                    className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline shrink-0"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download
                  </a>
                )}
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-auto p-4 bg-gray-50">
              {previewFile.file_data?.startsWith("data:image/") ? (
                <img
                  src={previewFile.file_data}
                  alt={previewFile.name}
                  className="max-w-full mx-auto rounded-xl shadow-sm object-contain"
                />
              ) : previewFile.file_data?.startsWith("data:application/pdf") ? (
                <iframe
                  src={previewFile.file_data}
                  title={previewFile.name}
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
    </div>
  );
}
