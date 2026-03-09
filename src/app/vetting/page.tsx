
"use client";

import { SidebarLeft } from "@/components/layout/sidebar-left";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ShieldCheck, FileCheck, Building, ArrowRight, AlertCircle, Loader2, Upload } from "lucide-react";
import { useUser, useFirestore, useDoc } from "@/firebase";
import { doc, updateDoc, setDoc, serverTimestamp, arrayUnion } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export default function VettingPage() {
  const { user, loading: authLoading } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch Business Profile
  const businessRef = (db && user) ? doc(db, "businesses", user.uid) : null;
  const { data: business, loading: businessLoading } = useDoc(businessRef);

  const handleStartVetting = async () => {
    if (!db || !user) return;
    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, "businesses", user.uid), {
        status: "pending",
        submittedAt: serverTimestamp()
      });
      toast({
        title: "Vetting Started",
        description: "Your business is now in the verification queue.",
      });
    } catch (e: any) {
      toast({
        title: "Error",
        description: "Could not start vetting. Ensure your profile is complete.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUploadDoc = async (docName: string) => {
    if (!db || !user) return;
    try {
      await updateDoc(doc(db, "businesses", user.uid), {
        verificationDocuments: arrayUnion(docName),
      });
      toast({
        title: "Document Uploaded",
        description: `${docName} has been added to your profile.`,
      });
    } catch (e) {
      toast({
        title: "Upload Failed",
        variant: "destructive"
      });
    }
  };

  if (authLoading || businessLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-10 w-10 text-primary animate-spin" />
      </div>
    );
  }

  const statusColors: any = {
    verified: "bg-green-100 text-green-700 border-green-200",
    pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
    reviewing: "bg-blue-100 text-blue-700 border-blue-200",
    rejected: "bg-red-100 text-red-700 border-red-200",
  };

  const progressValue = business?.status === 'verified' ? 100 : business?.status === 'reviewing' ? 60 : 30;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          <aside className="md:col-span-3 sticky top-6">
            <SidebarLeft />
          </aside>

          <main className="md:col-span-9 space-y-6">
            <div className="bg-primary/10 border border-primary/20 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="bg-primary p-3 rounded-2xl shadow-lg shadow-primary/20">
                  <ShieldCheck className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Vetting Hub</h1>
                  <p className="text-gray-600 font-medium">
                    {business ? `Managing ${business.companyName}` : "Register your business to start vetting."}
                  </p>
                </div>
              </div>
              <Button 
                onClick={handleStartVetting}
                disabled={isSubmitting || business?.status === 'pending' || business?.status === 'reviewing'}
                className="bg-gray-900 text-white hover:bg-black rounded-xl px-8 h-12 font-bold"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {business?.status === 'verified' ? "Re-Verify Business" : "Start New Vetting"}
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {/* Current Status */}
                <Card className="border-none shadow-sm">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Business Status</CardTitle>
                      <Badge className={statusColors[business?.status || 'pending']}>
                        {business?.status?.toUpperCase() || "UNREGISTERED"}
                      </Badge>
                    </div>
                    <CardDescription>
                      {business?.submittedAt ? `Last update: ${business.submittedAt.toDate().toLocaleDateString()}` : "No vetting history found."}
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
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-gray-50 rounded-2xl border border-dashed flex flex-col gap-1">
                        <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Entity Verification</span>
                        <span className="text-sm font-bold text-gray-900 flex items-center gap-2">
                          {business?.status === 'verified' ? <FileCheck className="h-4 w-4 text-green-500" /> : <Loader2 className="h-4 w-4 text-yellow-500 animate-spin" />}
                          {business?.status === 'verified' ? "Passed" : "Processing"}
                        </span>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-2xl border border-dashed flex flex-col gap-1">
                        <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Documents Provided</span>
                        <span className="text-sm font-bold text-gray-900 flex items-center gap-2">
                          <FileCheck className="h-4 w-4 text-blue-500" />
                          {business?.verificationDocuments?.length || 0} Files
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Requirements */}
                <Card className="border-none shadow-sm">
                  <CardHeader>
                    <CardTitle>Required Documentation</CardTitle>
                    <CardDescription>Upload required files to speed up your verification.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    {[
                      { name: "CIPC Registration Certificate", key: "cipc" },
                      { name: "VAT Compliance Letter", key: "vat" },
                      { name: "Identity Proof of Directors", key: "id" },
                    ].map((docItem, i) => {
                      const isUploaded = business?.verificationDocuments?.includes(docItem.name);
                      return (
                        <div key={i} className="flex items-center justify-between p-6 border-t first:border-t-0 hover:bg-gray-50/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="bg-gray-100 p-2 rounded-lg">
                              <Building className="h-5 w-5 text-gray-500" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-900">{docItem.name}</p>
                              <p className="text-xs text-gray-500 font-medium">Required for Gold Status</p>
                            </div>
                          </div>
                          <Button 
                            variant={isUploaded ? "secondary" : "outline"} 
                            size="sm" 
                            className="rounded-xl font-bold gap-2"
                            onClick={() => handleUploadDoc(docItem.name)}
                            disabled={isUploaded}
                          >
                            {isUploaded ? <FileCheck className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
                            {isUploaded ? "Uploaded" : "Upload"}
                          </Button>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar Info */}
              <div className="space-y-6">
                <Card className="bg-gray-900 text-white border-none shadow-lg">
                  <CardContent className="p-6 space-y-4">
                    <h3 className="text-lg font-bold">Why Vetting Matters</h3>
                    <div className="space-y-3">
                      {[
                        "Unlock Global Trade Networks",
                        "Higher Placement in Search",
                        "Instant Trust with Partners",
                        "Exclusive Premium Groups"
                      ].map((item, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-gray-300">
                          <div className="mt-1 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                          <span className="font-medium">{item}</span>
                        </div>
                      ))}
                    </div>
                    <Button variant="outline" className="w-full border-gray-700 text-white hover:bg-gray-800 rounded-xl">
                      Learn More <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>

                <div className="p-6 bg-yellow-50 rounded-2xl border border-yellow-200 flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-yellow-700 font-bold text-sm">
                    <AlertCircle className="h-4 w-4" />
                    Help & Support
                  </div>
                  <p className="text-xs text-yellow-600 font-medium">Need help with registration? Our compliance officers are available 24/7 for business accounts.</p>
                  <Button variant="link" className="text-xs text-yellow-700 font-bold p-0 h-auto justify-start underline">Contact Agent</Button>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
